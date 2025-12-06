import json
import os
from typing import Dict, Any
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
            id, doc_number, doc_date, inspector_fio, inspector_position,
            department, location, checked_object, created_at
        FROM pab_records
        ORDER BY created_at DESC
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
