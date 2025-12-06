import json
import os
from typing import Dict, Any
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Удаление записей ПАБ (для администраторов)
    '''
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    body = json.loads(event.get('body', '{}'))
    pab_ids = body.get('pab_ids', [])
    
    if not pab_ids or not isinstance(pab_ids, list):
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing or invalid pab_ids'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    ids_str = ','.join(str(id) for id in pab_ids)
    
    cur.execute(f"""
        DELETE FROM pab_observations WHERE pab_record_id IN ({ids_str})
    """)
    
    cur.execute(f"""
        DELETE FROM pab_records WHERE id IN ({ids_str})
    """)
    
    deleted_count = cur.rowcount
    
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
            'deleted_count': deleted_count
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }
