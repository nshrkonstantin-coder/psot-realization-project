import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any
from datetime import date, datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получает список архивированных записей производственного контроля
    Args: event - dict с httpMethod
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict со списком архивированных записей
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
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
            r.archived_at,
            COUNT(v.id) as total_violations
        FROM t_p80499285_psot_realization_pro.production_control_reports r
        LEFT JOIN t_p80499285_psot_realization_pro.production_control_violations v ON r.id = v.report_id
        WHERE r.archived = TRUE
        GROUP BY r.id, r.doc_number, r.doc_date, r.issuer_name, r.issuer_position, r.department, r.recipient_name, r.created_at, r.archived_at
        ORDER BY r.archived_at DESC
    """)
    
    rows = cur.fetchall()
    
    def json_serializer(obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")
    
    records = []
    for row in rows:
        record = dict(row)
        records.append(record)
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'records': records}, default=json_serializer),
        'isBase64Encoded': False
    }
