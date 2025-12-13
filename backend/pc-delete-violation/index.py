import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Удаляет нарушение ПК и пересчитывает статус записи ПК
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
    
    if not violation_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'violation_id is required'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute('SELECT report_id FROM t_p80499285_psot_realization_pro.production_control_violations WHERE id = %s', (violation_id,))
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
    
    cur.execute('DELETE FROM t_p80499285_psot_realization_pro.production_control_violations WHERE id = %s', (violation_id,))
    
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
    
    if total == 0:
        new_report_status = 'new'
    elif completed == total:
        new_report_status = 'completed'
    elif completed > 0:
        new_report_status = 'in_progress'
    else:
        new_report_status = 'new'
    
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
            'deleted_violation_id': violation_id
        })
    }