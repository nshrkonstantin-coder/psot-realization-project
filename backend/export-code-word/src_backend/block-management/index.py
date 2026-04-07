import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API управления блокировками пользователей и предприятий
    POST - заблокировать/разблокировать
    GET - получить информацию о блокировке
    entity_type: user или organization
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
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {}) or {}
        entity_type = params.get('entity_type')
        entity_id = params.get('entity_id')
        
        if not entity_type or not entity_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'entity_type и entity_id обязательны'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        table = 't_p80499285_psot_realization_pro.users' if entity_type == 'user' else 't_p80499285_psot_realization_pro.organizations'
        
        cur.execute(f'''
            SELECT is_blocked, blocked_until, block_reason, blocked_at
            FROM {table}
            WHERE id = %s
        ''', (entity_id,))
        
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Не найдено'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        is_blocked = row[0]
        blocked_until = row[1]
        
        if is_blocked and blocked_until:
            if datetime.now() > blocked_until:
                is_blocked = False
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'is_blocked': is_blocked,
                'blocked_until': row[1].isoformat() if row[1] else None,
                'block_reason': row[2],
                'blocked_at': row[3].isoformat() if row[3] else None
            }, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        entity_type = body.get('entity_type')
        entity_id = body.get('entity_id')
        action = body.get('action')
        blocked_until = body.get('blocked_until')
        reason = body.get('reason', '')
        admin_id = body.get('admin_id')
        
        if not entity_type or not entity_id or not action:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'entity_type, entity_id и action обязательны'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        table = 't_p80499285_psot_realization_pro.users' if entity_type == 'user' else 't_p80499285_psot_realization_pro.organizations'
        
        if action == 'block':
            blocked_until_dt = datetime.fromisoformat(blocked_until) if blocked_until else None
            
            cur.execute(f'''
                UPDATE {table}
                SET is_blocked = true,
                    blocked_until = %s,
                    block_reason = %s,
                    blocked_by = %s,
                    blocked_at = CURRENT_TIMESTAMP
                WHERE id = %s
            ''', (blocked_until_dt, reason, admin_id, entity_id))
            
            cur.execute('''
                INSERT INTO t_p80499285_psot_realization_pro.block_history 
                (entity_type, entity_id, action, blocked_until, reason, performed_by)
                VALUES (%s, %s, 'block', %s, %s, %s)
            ''', (entity_type, entity_id, blocked_until_dt, reason, admin_id))
            
        elif action == 'unblock':
            cur.execute(f'''
                UPDATE {table}
                SET is_blocked = false,
                    blocked_until = NULL,
                    block_reason = NULL
                WHERE id = %s
            ''', (entity_id,))
            
            cur.execute('''
                INSERT INTO t_p80499285_psot_realization_pro.block_history 
                (entity_type, entity_id, action, reason, performed_by)
                VALUES (%s, %s, 'unblock', %s, %s)
            ''', (entity_type, entity_id, reason, admin_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'action': action}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
