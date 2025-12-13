import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получение детальной информации о записи производственного контроля (ЭПК) по ID
    '''
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters', {})
    pc_id = params.get('id')
    
    if not pc_id:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing id parameter'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT 
            r.id,
            r.doc_number,
            r.doc_date,
            r.issuer_name as inspector_fio,
            r.issuer_position as inspector_position,
            r.department,
            r.recipient_name as location,
            '' as checked_object,
            'new' as status
        FROM t_p80499285_psot_realization_pro.production_control_reports r
        WHERE r.id = %s
    """, (pc_id,))
    
    record = cur.fetchone()
    
    if not record:
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'PC record not found'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    cur.execute("""
        SELECT 
            v.id,
            v.item_number as violation_number,
            v.description,
            '' as who_violated,
            v.measures,
            '' as responsible_person,
            r.doc_date as deadline,
            'new' as status,
            NULL as photo_url
        FROM t_p80499285_psot_realization_pro.production_control_violations v
        JOIN t_p80499285_psot_realization_pro.production_control_reports r ON v.report_id = r.id
        WHERE v.report_id = %s
        ORDER BY v.item_number
    """, (pc_id,))
    
    violations = cur.fetchall()
    
    cur.close()
    conn.close()
    
    pc_dict = dict(record)
    if pc_dict.get('doc_date'):
        pc_dict['doc_date'] = pc_dict['doc_date'].isoformat()
    
    violations_list = []
    for violation in violations:
        violation_dict = dict(violation)
        if violation_dict.get('deadline'):
            violation_dict['deadline'] = violation_dict['deadline'].isoformat()
        violations_list.append(violation_dict)
    
    pc_dict['violations'] = violations_list
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'pc': pc_dict
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }
