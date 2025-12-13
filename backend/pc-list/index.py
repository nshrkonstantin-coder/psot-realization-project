import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получение списка записей производственного контроля (ЭПК)
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
            r.department as checked_object,
            r.recipient_name as responsible_person,
            r.created_at,
            'new' as status,
            COUNT(v.id) as total_violations,
            0 as completed_violations
        FROM t_p80499285_psot_realization_pro.production_control_reports r
        LEFT JOIN t_p80499285_psot_realization_pro.production_control_violations v ON r.id = v.report_id
        GROUP BY r.id, r.doc_number, r.doc_date, r.issuer_name, r.issuer_position, r.department, r.recipient_name, r.created_at
        ORDER BY r.created_at DESC
    """)
    
    records = cur.fetchall()
    
    cur.close()
    conn.close()
    
    records_list = []
    for record in records:
        record_dict = dict(record)
        if record_dict.get('doc_date'):
            record_dict['doc_date'] = record_dict['doc_date'].isoformat()
        if record_dict.get('created_at'):
            record_dict['created_at'] = record_dict['created_at'].isoformat()
        records_list.append(record_dict)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'records': records_list
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }