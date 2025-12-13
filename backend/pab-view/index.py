import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получение детальной информации о ПАБ по ID
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
    pab_id = params.get('id')
    
    if not pab_id:
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
            id, doc_number, doc_date, inspector_fio, inspector_position,
            department, location, checked_object, status, photo_url
        FROM t_p80499285_psot_realization_pro.pab_records
        WHERE id = %s
    """, (pab_id,))
    
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
            'body': json.dumps({'error': 'PAB not found'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    cur.execute("""
        SELECT 
            id, observation_number, description, category, conditions_actions,
            hazard_factors, measures, responsible_person, deadline, status, photo_url
        FROM t_p80499285_psot_realization_pro.pab_observations
        WHERE pab_record_id = %s
        ORDER BY observation_number
    """, (pab_id,))
    
    observations = cur.fetchall()
    
    cur.close()
    conn.close()
    
    pab_dict = dict(record)
    if pab_dict.get('doc_date'):
        pab_dict['doc_date'] = pab_dict['doc_date'].isoformat()
    
    obs_list = []
    for obs in observations:
        obs_dict = dict(obs)
        if obs_dict.get('deadline'):
            obs_dict['deadline'] = obs_dict['deadline'].isoformat()
        obs_list.append(obs_dict)
    
    pab_dict['observations'] = obs_list
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'pab': pab_dict
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }