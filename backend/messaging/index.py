import json
import os
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

SCHEMA = 't_p80499285_psot_realization_pro'

def get_db_connection():
    '''Создает подключение к БД'''
    dsn = os.environ['DATABASE_URL']
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление системой обмена сообщениями
    Поддерживает: получение чатов, отправку сообщений, создание чатов, межкорпоративные связи
    '''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Требуется авторизация'}),
            'isBase64Encoded': False
        }
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        user_id = int(user_id)
        print(f'[DEBUG] Looking for user_id={user_id}')
        cursor.execute(f'SELECT company_id, role FROM {SCHEMA}.users WHERE id = %s', (user_id,))
        user = cursor.fetchone()
        print(f'[DEBUG] Found user: {user}')
        
        if not user:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Пользователь не найден'}),
                'isBase64Encoded': False
            }
        
        company_id = user['company_id']
        user_role = user['role']
        print(f'[DEBUG] User role={user_role}, company_id={company_id}')
        
        params = event.get('queryStringParameters', {}) or {}
        action = params.get('action', 'list_chats')
        print(f'[DEBUG] Action={action}')
        
        if action == 'list_chats':
            result = list_user_chats(cursor, user_id, company_id)
        elif action == 'get_messages':
            chat_id = params.get('chat_id')
            if not chat_id:
                raise ValueError('Требуется chat_id')
            result = get_chat_messages(cursor, int(chat_id), user_id)
        elif action == 'send_message':
            body = json.loads(event.get('body', '{}'))
            result = send_message(cursor, conn, body, user_id, company_id)
        elif action == 'create_chat':
            body = json.loads(event.get('body', '{}'))
            result = create_chat(cursor, conn, body, user_id, company_id)
        elif action == 'list_users':
            result = list_company_users(cursor, company_id)
        elif action == 'list_intercorp':
            if user_role != 'superadmin':
                raise ValueError('Доступ запрещен')
            result = list_intercorp_connections(cursor)
        elif action == 'create_intercorp':
            if user_role != 'superadmin':
                raise ValueError('Доступ запрещен')
            body = json.loads(event.get('body', '{}'))
            result = create_intercorp_connection(cursor, conn, body, user_id)
        elif action == 'list_companies':
            if user_role != 'superadmin':
                raise ValueError('Доступ запрещен')
            cursor.execute(f'SELECT id, name FROM {SCHEMA}.organizations ORDER BY name')
            result = {'companies': [dict(r) for r in cursor.fetchall()]}
        elif action == 'list_all_users':
            print(f'[DEBUG] list_all_users: user_role={user_role}')
            if user_role not in ['admin', 'superadmin']:
                raise ValueError('Доступ запрещен')
            cursor.execute(f'''
                SELECT u.id, u.fio, u.email, u.role, u.company_id, o.name as company_name 
                FROM {SCHEMA}.users u
                LEFT JOIN {SCHEMA}.organizations o ON u.company_id = o.id
                ORDER BY u.fio
            ''')
            users_list = [dict(r) for r in cursor.fetchall()]
            print(f'[DEBUG] Found {len(users_list)} users')
            result = {'users': users_list}
        elif action == 'mass_message':
            body = json.loads(event.get('body', '{}'))
            result = send_mass_message(cursor, conn, body, user_id, user_role)
        else:
            raise ValueError(f'Неизвестное действие: {action}')
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(result, default=str),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        print(f'[ERROR] Exception: {type(e).__name__}: {str(e)}')
        import traceback
        print(f'[ERROR] Traceback: {traceback.format_exc()}')
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def list_user_chats(cursor, user_id: int, company_id: int) -> Dict[str, Any]:
    '''Получить список чатов пользователя'''
    cursor.execute(f'''
        SELECT DISTINCT 
            c.id, c.name, c.type, c.created_at,
            (SELECT COUNT(*) FROM {SCHEMA}.messages WHERE chat_id = c.id AND is_read = false AND sender_id != %s) as unread_count,
            (SELECT message_text FROM {SCHEMA}.messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT created_at FROM {SCHEMA}.messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
        FROM {SCHEMA}.chats c
        INNER JOIN {SCHEMA}.chat_participants cp ON c.id = cp.chat_id
        WHERE cp.user_id = %s AND cp.is_active = true AND c.is_active = true
        ORDER BY last_message_time DESC NULLS LAST
    ''', (user_id, user_id))
    
    chats = [dict(row) for row in cursor.fetchall()]
    return {'chats': chats}

def get_chat_messages(cursor, chat_id: int, user_id: int) -> Dict[str, Any]:
    '''Получить сообщения чата'''
    cursor.execute(f'''
        SELECT cp.chat_id FROM {SCHEMA}.chat_participants cp 
        WHERE cp.chat_id = %s AND cp.user_id = %s AND cp.is_active = true
    ''', (chat_id, user_id))
    
    if not cursor.fetchone():
        raise ValueError('Доступ к чату запрещен')
    
    cursor.execute(f'''
        SELECT 
            m.id, m.message_text, m.created_at, m.is_read,
            m.sender_id, u.fio as sender_name, o.name as sender_company
        FROM {SCHEMA}.messages m
        INNER JOIN {SCHEMA}.users u ON m.sender_id = u.id
        INNER JOIN {SCHEMA}.organizations o ON m.sender_company_id = o.id
        WHERE m.chat_id = %s AND m.is_removed = false
        ORDER BY m.created_at ASC
    ''', (chat_id,))
    
    messages = [dict(row) for row in cursor.fetchall()]
    
    cursor.execute(f'''
        UPDATE {SCHEMA}.messages SET is_read = true 
        WHERE chat_id = %s AND sender_id = %s AND is_read = false
    ''', (chat_id, user_id))
    
    return {'messages': messages}

def send_message(cursor, conn, body: Dict[str, Any], user_id: int, company_id: int) -> Dict[str, Any]:
    '''Отправить сообщение в чат'''
    chat_id = body.get('chat_id')
    message_text = body.get('message_text', '').strip()
    
    if not chat_id or not message_text:
        raise ValueError('Требуется chat_id и message_text')
    
    cursor.execute(f'''
        SELECT cp.chat_id FROM {SCHEMA}.chat_participants cp 
        WHERE cp.chat_id = %s AND cp.user_id = %s AND cp.is_active = true
    ''', (chat_id, user_id))
    
    if not cursor.fetchone():
        raise ValueError('Доступ к чату запрещен')
    
    cursor.execute(f'''
        INSERT INTO {SCHEMA}.messages (chat_id, sender_id, sender_company_id, message_text)
        VALUES (%s, %s, %s, %s)
        RETURNING id, created_at
    ''', (chat_id, user_id, company_id, message_text))
    
    result = cursor.fetchone()
    conn.commit()
    
    return {'success': True, 'message_id': result['id'], 'created_at': result['created_at']}

def create_chat(cursor, conn, body: Dict[str, Any], user_id: int, company_id: int) -> Dict[str, Any]:
    '''Создать новый чат'''
    chat_name = body.get('name', '').strip()
    chat_type = body.get('type', 'internal')
    participant_ids = body.get('participant_ids', [])
    
    if not chat_name:
        raise ValueError('Требуется название чата')
    
    if chat_type not in ['internal', 'intercorp', 'direct']:
        raise ValueError('Неверный тип чата')
    
    if not participant_ids or user_id not in participant_ids:
        participant_ids.append(user_id)
    
    cursor.execute(f'''
        INSERT INTO {SCHEMA}.chats (name, type, company_id, created_by)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    ''', (chat_name, chat_type, company_id, user_id))
    
    chat_id = cursor.fetchone()['id']
    
    for pid in participant_ids:
        cursor.execute(f'SELECT company_id FROM {SCHEMA}.users WHERE id = %s', (pid,))
        participant = cursor.fetchone()
        if participant:
            cursor.execute(f'''
                INSERT INTO {SCHEMA}.chat_participants (chat_id, user_id, company_id)
                VALUES (%s, %s, %s)
            ''', (chat_id, pid, participant['company_id']))
    
    conn.commit()
    
    return {'success': True, 'chat_id': chat_id}

def list_company_users(cursor, company_id: int) -> Dict[str, Any]:
    '''Получить список пользователей своей компании'''
    cursor.execute(f'''
        SELECT id, fio, email, position FROM {SCHEMA}.users 
        WHERE company_id = %s
        ORDER BY fio
    ''', (company_id,))
    
    users = [dict(row) for row in cursor.fetchall()]
    return {'users': users}

def list_intercorp_connections(cursor) -> Dict[str, Any]:
    '''Получить список межкорпоративных связей'''
    cursor.execute(f'''
        SELECT 
            ic.id, ic.company1_id, ic.company2_id, ic.created_at, ic.is_active,
            o1.name as company1_name, o2.name as company2_name,
            u.fio as created_by_name
        FROM {SCHEMA}.intercorp_connections ic
        INNER JOIN {SCHEMA}.organizations o1 ON ic.company1_id = o1.id
        INNER JOIN {SCHEMA}.organizations o2 ON ic.company2_id = o2.id
        LEFT JOIN {SCHEMA}.users u ON ic.created_by = u.id
        ORDER BY ic.created_at DESC
    ''')
    
    connections = [dict(row) for row in cursor.fetchall()]
    return {'connections': connections}

def create_intercorp_connection(cursor, conn, body: Dict[str, Any], user_id: int) -> Dict[str, Any]:
    '''Создать межкорпоративную связь'''
    company1_id = body.get('company1_id')
    company2_id = body.get('company2_id')
    
    if not company1_id or not company2_id:
        raise ValueError('Требуется company1_id и company2_id')
    
    if company1_id == company2_id:
        raise ValueError('Компании должны быть разными')
    
    c1, c2 = (company1_id, company2_id) if company1_id < company2_id else (company2_id, company1_id)
    
    cursor.execute(f'''
        INSERT INTO {SCHEMA}.intercorp_connections (company1_id, company2_id, created_by)
        VALUES (%s, %s, %s)
        ON CONFLICT (company1_id, company2_id) DO NOTHING
        RETURNING id
    ''', (c1, c2, user_id))
    
    result = cursor.fetchone()
    conn.commit()
    
    if result:
        return {'success': True, 'connection_id': result['id']}
    else:
        return {'success': True, 'message': 'Связь уже существует'}

def send_mass_message(cursor, conn, body: Dict[str, Any], user_id: int, user_role: str) -> Dict[str, Any]:
    '''Массовая отправка сообщений пользователям'''
    if user_role not in ['admin', 'superadmin']:
        raise ValueError('Доступ запрещен')
    
    user_ids = body.get('user_ids', [])
    message_text = body.get('message_text', '').strip()
    delivery_type = body.get('delivery_type', 'internal')
    
    if not user_ids or not message_text:
        raise ValueError('Требуется user_ids и message_text')
    
    cursor.execute(f'SELECT company_id FROM {SCHEMA}.users WHERE id = %s', (user_id,))
    sender_info = cursor.fetchone()
    if not sender_info:
        raise ValueError('Отправитель не найден')
    
    sender_company_id = sender_info['company_id']
    sent_count = 0
    
    for recipient_id in user_ids:
        cursor.execute(f'SELECT company_id FROM {SCHEMA}.users WHERE id = %s', (recipient_id,))
        recipient = cursor.fetchone()
        if not recipient:
            continue
        
        recipient_company_id = recipient['company_id']
        
        cursor.execute(f'''
            SELECT id FROM {SCHEMA}.chats 
            WHERE type = 'direct' 
              AND created_by = %s
              AND id IN (
                SELECT chat_id FROM {SCHEMA}.chat_participants WHERE user_id = %s
              )
              AND id IN (
                SELECT chat_id FROM {SCHEMA}.chat_participants WHERE user_id = %s
              )
            LIMIT 1
        ''', (user_id, user_id, recipient_id))
        
        existing_chat = cursor.fetchone()
        
        if existing_chat:
            chat_id = existing_chat['id']
        else:
            cursor.execute(f'SELECT fio FROM {SCHEMA}.users WHERE id = %s', (recipient_id,))
            recipient_name = cursor.fetchone()['fio']
            
            cursor.execute(f'''
                INSERT INTO {SCHEMA}.chats (name, type, company_id, created_by)
                VALUES (%s, 'direct', %s, %s)
                RETURNING id
            ''', (f'Сообщение для {recipient_name}', sender_company_id, user_id))
            
            chat_id = cursor.fetchone()['id']
            
            cursor.execute(f'''
                INSERT INTO {SCHEMA}.chat_participants (chat_id, user_id, company_id)
                VALUES (%s, %s, %s), (%s, %s, %s)
            ''', (chat_id, user_id, sender_company_id, chat_id, recipient_id, recipient_company_id))
        
        cursor.execute(f'''
            INSERT INTO {SCHEMA}.messages (chat_id, sender_id, sender_company_id, message_text)
            VALUES (%s, %s, %s, %s)
        ''', (chat_id, user_id, sender_company_id, message_text))
        
        sent_count += 1
    
    conn.commit()
    return {'success': True, 'sent_count': sent_count}