import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получение данных ПАБ для экспорта в PDF
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
    pab_ids_str = params.get('ids', '')
    
    if not pab_ids_str:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing ids parameter'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    pab_ids = [int(id.strip()) for id in pab_ids_str.split(',') if id.strip()]
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    ids_str = ','.join(str(id) for id in pab_ids)
    
    cur.execute(f"""
        SELECT 
            id, doc_number, doc_date, inspector_fio, inspector_position,
            department, location, checked_object, status
        FROM pab_records
        WHERE id IN ({ids_str})
        ORDER BY doc_date DESC
    """)
    
    records = cur.fetchall()
    
    result = []
    for record in records:
        cur.execute("""
            SELECT 
                observation_number, description, category, conditions_actions,
                hazard_factors, measures, responsible_person, deadline, status
            FROM pab_observations
            WHERE pab_record_id = %s
            ORDER BY observation_number
        """, (record['id'],))
        
        observations = cur.fetchall()
        
        record_dict = dict(record)
        if record_dict.get('doc_date'):
            record_dict['doc_date'] = record_dict['doc_date'].isoformat()
        
        obs_list = []
        for obs in observations:
            obs_dict = dict(obs)
            if obs_dict.get('deadline'):
                obs_dict['deadline'] = obs_dict['deadline'].isoformat()
            obs_list.append(obs_dict)
        
        record_dict['observations'] = obs_list
        result.append(record_dict)
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'pabs': result
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }
