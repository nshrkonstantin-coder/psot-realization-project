import json
import os
import psycopg2
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Удаление записей производственного контроля
    Удаляет записи ПК и все связанные нарушения каскадно
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
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
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
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
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'pc_ids array is required'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    deleted_count = 0
    
    for pc_id in pc_ids:
        cur.execute(
            'DELETE FROM t_p80499285_psot_realization_pro.production_control_violations WHERE report_id = %s',
            (pc_id,)
        )
        
        cur.execute(
            'DELETE FROM t_p80499285_psot_realization_pro.production_control_reports WHERE id = %s',
            (pc_id,)
        )
        
        deleted_count += cur.rowcount
    
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
            'deleted_count': deleted_count,
            'deleted_ids': pc_ids
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }