import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получение данных ПК для экспорта в PDF (используется на frontend)
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
    ids_str = params.get('ids', '')
    
    if not ids_str:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing ids parameter'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    try:
        pc_ids = [int(id_str.strip()) for id_str in ids_str.split(',')]
    except ValueError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid ids format'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    ids_placeholder = ','.join(['%s'] * len(pc_ids))
    
    query = f"""
        SELECT 
            r.id,
            r.doc_number,
            r.doc_date,
            r.issuer_name as inspector_fio,
            r.issuer_position as inspector_position,
            r.recipient_name as location,
            r.department,
            '' as checked_object,
            'new' as status
        FROM t_p80499285_psot_realization_pro.production_control_reports r
        WHERE r.id IN ({ids_placeholder})
        ORDER BY r.doc_date DESC
    """
    
    cur.execute(query, pc_ids)
    records = cur.fetchall()
    
    if not records:
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'No PC records found'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    records_with_violations = []
    
    for record in records:
        pc_id = record['id']
        
        cur.execute("""
            SELECT 
                v.id,
                v.item_number as violation_number,
                v.description,
                '' as who_violated,
                v.measures,
                COALESCE(u.fio, '') as responsible_person,
                COALESCE(v.deadline, r.doc_date) as deadline,
                'new' as status,
                NULL as photo_url
            FROM t_p80499285_psot_realization_pro.production_control_violations v
            JOIN t_p80499285_psot_realization_pro.production_control_reports r ON v.report_id = r.id
            LEFT JOIN t_p80499285_psot_realization_pro.users u ON v.responsible_user_id = u.id
            WHERE v.report_id = %s
            ORDER BY v.item_number
        """, (pc_id,))
        
        violations = cur.fetchall()
        
        record_dict = dict(record)
        if record_dict.get('doc_date'):
            record_dict['doc_date'] = record_dict['doc_date'].isoformat()
        
        violations_list = []
        for violation in violations:
            violation_dict = dict(violation)
            if violation_dict.get('deadline'):
                violation_dict['deadline'] = violation_dict['deadline'].isoformat()
            
            # Загружаем фотографии для каждого нарушения
            violation_id = violation_dict['id']
            cur.execute("""
                SELECT photo_url
                FROM t_p80499285_psot_realization_pro.production_control_photos
                WHERE violation_id = %s
                ORDER BY id
            """, (violation_id,))
            
            photos = cur.fetchall()
            violation_dict['photos'] = [{'data': photo['photo_url']} for photo in photos] if photos else []
            
            violations_list.append(violation_dict)
        
        record_dict['violations'] = violations_list
        records_with_violations.append(record_dict)
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'records': records_with_violations
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }