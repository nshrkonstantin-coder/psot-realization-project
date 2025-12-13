import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Обновляет статус наблюдения ПАБ
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    observation_id = body_data.get('observation_id')
    status = body_data.get('status')
    
    if not observation_id or not status:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'observation_id and status are required'})
        }
    
    if status not in ['completed', 'in_progress', 'new']:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid status. Must be: completed, in_progress, or new'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute('''
        UPDATE t_p80499285_psot_realization_pro.pab_observations 
        SET status = %s 
        WHERE id = %s
        RETURNING pab_record_id
    ''', (status, observation_id))
    
    result = cur.fetchone()
    if not result:
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Observation not found'})
        }
    
    pab_id = result[0]
    
    cur.execute('''
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM t_p80499285_psot_realization_pro.pab_observations
        WHERE pab_record_id = %s
    ''', (pab_id,))
    
    stats = cur.fetchone()
    total = stats[0]
    completed = stats[1]
    
    new_pab_status = 'new'
    if completed == total:
        new_pab_status = 'completed'
    elif completed > 0:
        new_pab_status = 'in_progress'
    
    cur.execute('''
        UPDATE t_p80499285_psot_realization_pro.pab_records 
        SET status = %s 
        WHERE id = %s
    ''', (new_pab_status, pab_id))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': True,
            'observation_id': observation_id,
            'new_status': status,
            'pab_updated': True,
            'pab_status': new_pab_status
        })
    }