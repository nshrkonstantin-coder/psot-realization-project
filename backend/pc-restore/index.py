import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Восстанавливает архивированные записи производственного контроля
    Args: event - dict с httpMethod, body (pc_ids: список ID для восстановления)
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body = event.get('body', '{}')
    if not body or body == '':
        body = '{}'
    body_data = json.loads(body)
    pc_ids: List[int] = body_data.get('pc_ids', [])
    
    if not pc_ids or not isinstance(pc_ids, list):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'pc_ids (список ID) обязателен'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    valid_ids = [id for id in pc_ids if isinstance(id, int)]
    
    if not valid_ids:
        cur.close()
        conn.close()
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Некорректные ID записей'}),
            'isBase64Encoded': False
        }
    
    ids_str = ','.join(str(id) for id in valid_ids)
    
    cur.execute(f"""
        UPDATE production_control_reports 
        SET archived = FALSE, archived_at = NULL
        WHERE id IN ({ids_str}) AND archived = TRUE
    """)
    
    restored_count = cur.rowcount
    conn.commit()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': True,
            'restored_count': restored_count,
            'message': f'Восстановлено записей: {restored_count}'
        }),
        'isBase64Encoded': False
    }