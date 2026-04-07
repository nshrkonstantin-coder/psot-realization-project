import json
import os
from typing import Dict, Any
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Обновление статуса ПАБ (только для администраторов)
    '''
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    body = json.loads(event.get('body', '{}'))
    pab_id = body.get('id')
    new_status = body.get('status')
    
    if not pab_id or not new_status:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing id or status'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    allowed_statuses = ['new', 'in_progress', 'completed', 'overdue']
    if new_status not in allowed_statuses:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid status'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute("""
        UPDATE pab_records 
        SET status = %s 
        WHERE id = %s
    """, (new_status, pab_id))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'success': True,
            'message': 'Status updated'
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }
