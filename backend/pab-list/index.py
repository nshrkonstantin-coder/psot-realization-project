import json
import os
from typing import Dict, Any
from datetime import datetime, date
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получение списка всех записей ПАБ
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
            pr.id, pr.doc_number, pr.doc_date, pr.inspector_fio, pr.inspector_position,
            pr.department, pr.location, pr.checked_object, pr.created_at, pr.status,
            pr.photo_url,
            MAX(po.deadline) as max_deadline,
            COUNT(po.id) as total_observations,
            COUNT(CASE WHEN po.status = 'completed' THEN 1 END) as completed_observations,
            COUNT(CASE WHEN po.deadline < CURRENT_DATE AND po.status != 'completed' THEN 1 END) as overdue_observations,
            (SELECT DISTINCT po2.responsible_person 
             FROM pab_observations po2 
             WHERE po2.pab_record_id = pr.id 
             LIMIT 1) as responsible_fio,
            (SELECT u.position 
             FROM users u 
             WHERE LOWER(u.fio) = LOWER(
                 (SELECT DISTINCT po3.responsible_person 
                  FROM pab_observations po3 
                  WHERE po3.pab_record_id = pr.id 
                  LIMIT 1)
             ) LIMIT 1) as responsible_position
        FROM pab_records pr
        LEFT JOIN pab_observations po ON pr.id = po.pab_record_id
        GROUP BY pr.id, pr.doc_number, pr.doc_date, pr.inspector_fio, pr.inspector_position,
                 pr.department, pr.location, pr.checked_object, pr.created_at, pr.status, pr.photo_url
        ORDER BY pr.created_at DESC
    """)
    
    records = cur.fetchall()
    
    cur.close()
    conn.close()
    
    today = date.today()
    
    records_list = []
    for record in records:
        record_dict = dict(record)
        
        max_deadline = record_dict.get('max_deadline')
        current_status = record_dict.get('status', 'new')
        
        if current_status != 'completed':
            if max_deadline and max_deadline < today:
                record_dict['status'] = 'overdue'
            else:
                record_dict['status'] = 'new'
        
        if record_dict.get('doc_date'):
            record_dict['doc_date'] = record_dict['doc_date'].isoformat()
        if record_dict.get('created_at'):
            record_dict['created_at'] = record_dict['created_at'].isoformat()
        if record_dict.get('max_deadline'):
            record_dict['max_deadline'] = record_dict['max_deadline'].isoformat()
        
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