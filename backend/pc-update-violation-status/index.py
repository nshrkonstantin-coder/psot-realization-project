import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Обновляет статус нарушения ПК
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
    violation_id = body_data.get('violation_id')
    status = body_data.get('status')
    
    if not violation_id or not status:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'violation_id and status are required'})
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
        UPDATE t_p80499285_psot_realization_pro.production_control_violations 
        SET status = %s 
        WHERE id = %s
        RETURNING report_id
    ''', (status, violation_id))
    
    result = cur.fetchone()
    if not result:
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Violation not found'})
        }
    
    report_id = result[0]
    
    cur.execute('''
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM t_p80499285_psot_realization_pro.production_control_violations
        WHERE report_id = %s
    ''', (report_id,))
    
    stats = cur.fetchone()
    total = stats[0]
    completed = stats[1]
    
    new_report_status = 'new'
    if completed == total:
        new_report_status = 'completed'
    elif completed > 0:
        new_report_status = 'in_progress'
    
    cur.execute('''
        UPDATE t_p80499285_psot_realization_pro.production_control_reports 
        SET status = %s 
        WHERE id = %s
    ''', (new_report_status, report_id))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': True,
            'violation_id': violation_id,
            'new_status': status,
            'report_updated': True,
            'report_status': new_report_status
        })
    }