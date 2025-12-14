import json
import os
import psycopg2
import secrets
import string
from typing import Dict, Any
from datetime import datetime, timedelta

def generate_registration_code() -> str:
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(10))

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление организациями (предприятиями)
    GET - получить все организации
    POST - создать новую организацию
    PUT - обновить данные организации
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {}) or {}
        action = params.get('action')
        org_id = params.get('id')
        org_code = params.get('code')
        
        # Если запрашивается список (action=list), игнорируем id и code
        if action == 'list':
            org_id = None
            org_code = None
        
        if org_code:
            safe_code = org_code.replace("'", "''")
            cur.execute(f'''
                SELECT o.id, o.name, o.registration_code, o.logo_url
                FROM t_p80499285_psot_realization_pro.organizations o
                WHERE o.registration_code = '{safe_code}' AND o.is_active = true
            ''')
            row = cur.fetchone()
            
            if row:
                result = {
                    'id': row[0],
                    'name': row[1],
                    'registration_code': row[2],
                    'logo_url': row[3]
                }
                cur.close()
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(result),
                    'isBase64Encoded': False
                }
            else:
                cur.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Организация не найдена'}),
                    'isBase64Encoded': False
                }
        
        if org_id:
            safe_org_id = int(org_id)
            cur.execute(f'''
                SELECT o.id, o.name, o.registration_code, o.created_at, o.trial_end_date, 
                       o.subscription_type, o.is_active, o.logo_url,
                       COUNT(DISTINCT u.id) as user_count,
                       COUNT(DISTINCT om.module_id) as module_count,
                       COUNT(DISTINCT op.page_id) as page_count
                FROM t_p80499285_psot_realization_pro.organizations o
                LEFT JOIN t_p80499285_psot_realization_pro.users u ON o.id = u.organization_id
                LEFT JOIN t_p80499285_psot_realization_pro.organization_modules om ON o.id = om.organization_id
                LEFT JOIN t_p80499285_psot_realization_pro.organization_pages op ON o.id = op.organization_id
                WHERE o.id = {safe_org_id}
                GROUP BY o.id
            ''')
        else:
            cur.execute('''
                SELECT o.id, o.name, o.registration_code, o.created_at, o.trial_end_date, 
                       o.subscription_type, o.is_active, o.logo_url,
                       COUNT(DISTINCT u.id) as user_count,
                       COUNT(DISTINCT om.module_id) as module_count,
                       COUNT(DISTINCT op.page_id) as page_count
                FROM t_p80499285_psot_realization_pro.organizations o
                LEFT JOIN t_p80499285_psot_realization_pro.users u ON o.id = u.organization_id
                LEFT JOIN t_p80499285_psot_realization_pro.organization_modules om ON o.id = om.organization_id
                LEFT JOIN t_p80499285_psot_realization_pro.organization_pages op ON o.id = op.organization_id
                GROUP BY o.id
                ORDER BY o.created_at DESC
            ''')
        
        rows = cur.fetchall()
        organizations = []
        
        for row in rows:
            organizations.append({
                'id': row[0],
                'name': row[1],
                'registration_code': row[2],
                'created_at': row[3].isoformat() if row[3] else None,
                'trial_end_date': row[4].isoformat() if row[4] else None,
                'subscription_type': row[5],
                'is_active': row[6],
                'logo_url': row[7],
                'user_count': row[8],
                'module_count': row[9],
                'page_count': row[10]
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(organizations[0] if org_id and organizations else organizations, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        name = body.get('name')
        tariff_plan_id = body.get('tariff_plan_id')
        subscription_plan_id = body.get('subscription_plan_id')
        logo_url = body.get('logo_url')
        
        if not name:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing name'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        registration_code = generate_registration_code()
        
        trial_end_date = None
        subscription_type = 'free'
        
        if subscription_plan_id:
            safe_subscription_plan_id = int(subscription_plan_id)
            cur.execute(f'SELECT trial_days, name FROM t_p80499285_psot_realization_pro.subscription_plans WHERE id = {safe_subscription_plan_id}')
            plan = cur.fetchone()
            if plan:
                trial_days, plan_name = plan
                trial_end_date = datetime.now() + timedelta(days=trial_days)
                subscription_type = plan_name
        
        safe_name = name.replace("'", "''")
        safe_registration_code = registration_code.replace("'", "''")
        safe_trial_end_date = f"'{trial_end_date.isoformat()}'" if trial_end_date else 'NULL'
        safe_subscription_type = subscription_type.replace("'", "''")
        if logo_url:
            escaped_logo = logo_url.replace("'", "''")
            safe_logo_url = f"'{escaped_logo}'"
        else:
            safe_logo_url = 'NULL'
        safe_tariff_plan_id = str(int(tariff_plan_id)) if tariff_plan_id else 'NULL'
        cur.execute(f'''
            INSERT INTO t_p80499285_psot_realization_pro.organizations (name, registration_code, trial_end_date, subscription_type, logo_url, tariff_plan_id)
            VALUES ('{safe_name}', '{safe_registration_code}', {safe_trial_end_date}, '{safe_subscription_type}', {safe_logo_url}, {safe_tariff_plan_id})
            RETURNING id
        ''')
        
        org_id = cur.fetchone()[0]
        
        if tariff_plan_id:
            safe_org_id = int(org_id)
            safe_tariff_plan_id = int(tariff_plan_id)
            cur.execute(f'''
                INSERT INTO t_p80499285_psot_realization_pro.organization_modules (organization_id, module_id, is_enabled)
                SELECT {safe_org_id}, tm.module_id, true
                FROM t_p80499285_psot_realization_pro.tariff_modules tm
                WHERE tm.tariff_id = {safe_tariff_plan_id}
            ''')
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'id': org_id,
                'name': name,
                'registration_code': registration_code,
                'subscription_type': subscription_type
            }, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        org_id = body.get('id')
        
        if not org_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing id'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        updates = []
        params = []
        
        if 'name' in body:
            updates.append('name = %s')
            params.append(body['name'])
        
        if 'subscription_type' in body:
            updates.append('subscription_type = %s')
            params.append(body['subscription_type'])
        
        if 'is_active' in body:
            updates.append('is_active = %s')
            params.append(body['is_active'])
        
        if 'trial_end_date' in body:
            updates.append('trial_end_date = %s')
            params.append(body['trial_end_date'])
        
        if 'logo_url' in body:
            updates.append('logo_url = %s')
            params.append(body['logo_url'])
        
        if updates:
            params.append(org_id)
            query = f"UPDATE organizations SET {', '.join(updates)} WHERE id = %s"
            cur.execute(query, params)
            conn.commit()
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}, ensure_ascii=False),
        'isBase64Encoded': False
    }