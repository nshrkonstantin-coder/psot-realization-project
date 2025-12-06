import json
import os
from typing import Dict, Any
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Обновление статуса наблюдения ПАБ (для администраторов)
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
    observation_id = body.get('observation_id')
    status = body.get('status')
    
    if not observation_id or not status:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing observation_id or status'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    allowed_statuses = ['new', 'in_progress', 'completed', 'overdue']
    if status not in allowed_statuses:
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
        SELECT pab_record_id FROM pab_observations WHERE id = %s
    """, (observation_id,))
    result = cur.fetchone()
    
    if not result:
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Observation not found'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    pab_record_id = result[0]
    
    cur.execute("""
        UPDATE pab_observations
        SET status = %s
        WHERE id = %s
    """, (status, observation_id))
    
    cur.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM pab_observations
        WHERE pab_record_id = %s
    """, (pab_record_id,))
    
    counts = cur.fetchone()
    total_obs = counts[0]
    completed_obs = counts[1]
    
    if total_obs > 0 and completed_obs == total_obs:
        cur.execute("""
            UPDATE pab_records
            SET status = 'completed'
            WHERE id = %s
        """, (pab_record_id,))
    elif completed_obs > 0 and completed_obs < total_obs:
        cur.execute("""
            UPDATE pab_records
            SET status = 'in_progress'
            WHERE id = %s
        """, (pab_record_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True}, ensure_ascii=False),
        'isBase64Encoded': False
    }