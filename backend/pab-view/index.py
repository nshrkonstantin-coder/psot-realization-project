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
            pr.id, pr.doc_number, pr.doc_date, pr.inspector_fio, pr.inspector_position,
            pr.department, pr.location, pr.checked_object, pr.status, pr.photo_url,
            COALESCE(pr.organization_id, 1) as organization_id
        FROM t_p80499285_psot_realization_pro.pab_records pr
        WHERE pr.id = %s
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
            po.id, po.observation_number, po.description, po.category, po.conditions_actions,
            po.hazard_factors, po.measures, po.responsible_person, po.deadline, po.status, po.photo_url,
            u.position as responsible_position
        FROM t_p80499285_psot_realization_pro.pab_observations po
        LEFT JOIN t_p80499285_psot_realization_pro.users u ON LOWER(po.responsible_person) = LOWER(u.fio)
        WHERE po.pab_record_id = %s
        ORDER BY po.observation_number
    """, (pab_id,))
    
    observations = cur.fetchall()
    
    pab_dict = dict(record)
    
    org_id = pab_dict.get('organization_id')
    if org_id:
        cur.execute("""
            SELECT logo_url FROM t_p80499285_psot_realization_pro.organizations WHERE id = %s
        """, (org_id,))
        logo_result = cur.fetchone()
        if logo_result and logo_result['logo_url']:
            pab_dict['logo_url'] = logo_result['logo_url']
    
    cur.close()
    conn.close()
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