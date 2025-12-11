import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление личными сообщениями между пользователями
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами: request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        sender_id = body_data.get('senderId')
        receiver_id = body_data.get('receiverId')
        message_text = body_data.get('message')
        
        if not sender_id or not receiver_id or not message_text:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'Missing required fields'})
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        # Получаем organization_id отправителя
        cur.execute(f"""
            SELECT organization_id 
            FROM t_p80499285_psot_realization_pro.users 
            WHERE id = {sender_id}
        """)
        sender_row = cur.fetchone()
        
        if not sender_row:
            cur.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'Sender not found'})
            }
        
        sender_org_id = sender_row[0]
        
        # Проверяем или создаем личный чат между двумя пользователями
        cur.execute(f"""
            SELECT c.id 
            FROM t_p80499285_psot_realization_pro.chats c
            WHERE c.type = 'private'
            AND EXISTS (
                SELECT 1 FROM t_p80499285_psot_realization_pro.chat_participants cp1
                WHERE cp1.chat_id = c.id AND cp1.user_id = {sender_id}
            )
            AND EXISTS (
                SELECT 1 FROM t_p80499285_psot_realization_pro.chat_participants cp2
                WHERE cp2.chat_id = c.id AND cp2.user_id = {receiver_id}
            )
            LIMIT 1
        """)
        
        chat_row = cur.fetchone()
        
        if chat_row:
            chat_id = chat_row[0]
        else:
            # Создаем новый личный чат
            cur.execute(f"""
                INSERT INTO t_p80499285_psot_realization_pro.chats 
                (name, type, organization_id, created_by, created_at, is_active)
                VALUES ('Private Chat', 'private', {sender_org_id}, {sender_id}, NOW(), true)
                RETURNING id
            """)
            chat_id = cur.fetchone()[0]
            
            # Добавляем участников
            cur.execute(f"""
                INSERT INTO t_p80499285_psot_realization_pro.chat_participants 
                (chat_id, user_id, organization_id, joined_at, is_active)
                VALUES ({chat_id}, {sender_id}, {sender_org_id}, NOW(), true)
            """)
            
            cur.execute(f"""
                SELECT organization_id 
                FROM t_p80499285_psot_realization_pro.users 
                WHERE id = {receiver_id}
            """)
            receiver_org_row = cur.fetchone()
            receiver_org_id = receiver_org_row[0] if receiver_org_row else sender_org_id
            
            cur.execute(f"""
                INSERT INTO t_p80499285_psot_realization_pro.chat_participants 
                (chat_id, user_id, organization_id, joined_at, is_active)
                VALUES ({chat_id}, {receiver_id}, {receiver_org_id}, NOW(), true)
            """)
        
        # Экранируем текст сообщения
        message_text_escaped = message_text.replace("'", "''")
        
        # Создаем сообщение
        cur.execute(f"""
            INSERT INTO t_p80499285_psot_realization_pro.messages 
            (chat_id, sender_id, sender_organization_id, message_text, created_at, is_read, is_removed)
            VALUES ({chat_id}, {sender_id}, {sender_org_id}, '{message_text_escaped}', NOW(), false, false)
            RETURNING id
        """)
        
        message_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True, 
                'messageId': message_id,
                'chatId': chat_id
            })
        }
    
    if method == 'GET':
        import psycopg2
        
        params = event.get('queryStringParameters') or {}
        user_id = params.get('userId')
        receiver_id = params.get('receiverId')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'User ID required'})
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        if receiver_id:
            # Отмечаем все непрочитанные сообщения как прочитанные
            cur.execute(f"""
                UPDATE t_p80499285_psot_realization_pro.messages m
                SET is_read = true
                WHERE m.is_read = false
                AND m.sender_id = {receiver_id}
                AND m.chat_id IN (
                    SELECT c.id FROM t_p80499285_psot_realization_pro.chats c
                    WHERE c.type = 'private'
                    AND EXISTS (
                        SELECT 1 FROM t_p80499285_psot_realization_pro.chat_participants cp1
                        WHERE cp1.chat_id = c.id AND cp1.user_id = {user_id}
                    )
                    AND EXISTS (
                        SELECT 1 FROM t_p80499285_psot_realization_pro.chat_participants cp2
                        WHERE cp2.chat_id = c.id AND cp2.user_id = {receiver_id}
                    )
                )
            """)
            conn.commit()
            
            # Получаем историю сообщений с конкретным пользователем
            cur.execute(f"""
                SELECT m.id, m.sender_id, m.message_text, m.created_at, m.is_read,
                       u.fio, u.display_name
                FROM t_p80499285_psot_realization_pro.messages m
                JOIN t_p80499285_psot_realization_pro.chats c ON m.chat_id = c.id
                JOIN t_p80499285_psot_realization_pro.users u ON m.sender_id = u.id
                WHERE c.type = 'private'
                AND m.is_removed = false
                AND EXISTS (
                    SELECT 1 FROM t_p80499285_psot_realization_pro.chat_participants cp1
                    WHERE cp1.chat_id = c.id AND cp1.user_id = {user_id}
                )
                AND EXISTS (
                    SELECT 1 FROM t_p80499285_psot_realization_pro.chat_participants cp2
                    WHERE cp2.chat_id = c.id AND cp2.user_id = {receiver_id}
                )
                ORDER BY m.created_at DESC
                LIMIT 50
            """)
            
            messages = []
            for row in cur.fetchall():
                messages.append({
                    'id': row[0],
                    'senderId': row[1],
                    'message': row[2],
                    'createdAt': row[3].isoformat() if row[3] else None,
                    'isRead': row[4],
                    'senderName': row[5] or row[6] or f"ID№{str(row[1]).zfill(5)}"
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'messages': messages})
            }
        else:
            # Получаем список всех чатов пользователя
            cur.execute(f"""
                SELECT DISTINCT 
                    c.id,
                    CASE 
                        WHEN cp2.user_id = {user_id} THEN cp1.user_id
                        ELSE cp2.user_id
                    END as other_user_id,
                    u.fio,
                    u.display_name,
                    u.position,
                    u.subdivision,
                    (SELECT m.message_text 
                     FROM t_p80499285_psot_realization_pro.messages m 
                     WHERE m.chat_id = c.id AND m.is_removed = false
                     ORDER BY m.created_at DESC LIMIT 1) as last_message,
                    (SELECT m.created_at 
                     FROM t_p80499285_psot_realization_pro.messages m 
                     WHERE m.chat_id = c.id AND m.is_removed = false
                     ORDER BY m.created_at DESC LIMIT 1) as last_message_time,
                    (SELECT COUNT(*) 
                     FROM t_p80499285_psot_realization_pro.messages m 
                     WHERE m.chat_id = c.id AND m.is_read = false 
                     AND m.sender_id != {user_id} AND m.is_removed = false) as unread_count
                FROM t_p80499285_psot_realization_pro.chats c
                JOIN t_p80499285_psot_realization_pro.chat_participants cp1 ON c.id = cp1.chat_id
                JOIN t_p80499285_psot_realization_pro.chat_participants cp2 ON c.id = cp2.chat_id
                JOIN t_p80499285_psot_realization_pro.users u ON 
                    CASE 
                        WHEN cp2.user_id = {user_id} THEN cp1.user_id
                        ELSE cp2.user_id
                    END = u.id
                WHERE c.type = 'private'
                AND (cp1.user_id = {user_id} OR cp2.user_id = {user_id})
                AND cp1.user_id != cp2.user_id
                ORDER BY last_message_time DESC NULLS LAST
            """)
            
            chats = []
            for row in cur.fetchall():
                chats.append({
                    'chatId': row[0],
                    'userId': row[1],
                    'userName': row[2] or row[3] or f"ID№{str(row[1]).zfill(5)}",
                    'position': row[4] or '',
                    'subdivision': row[5] or '',
                    'lastMessage': row[6] or '',
                    'lastMessageTime': row[7].isoformat() if row[7] else None,
                    'unreadCount': row[8]
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'chats': chats})
            }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({'success': False, 'error': 'Method not allowed'})
    }