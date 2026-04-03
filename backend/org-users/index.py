import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get organization users with activity statistics
    Args: event - dict with httpMethod, queryStringParameters
          context - object with attributes: request_id, function_name
    Returns: HTTP response dict with users list and activity stats
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'GET':
        import psycopg2
        
        params = event.get('queryStringParameters') or {}
        organization_id = params.get('organization_id')
        
        if not organization_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'organization_id required'})
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                u.id, 
                u.email, 
                u.fio, 
                u.subdivision, 
                u.position, 
                u.role, 
                u.created_at,
                COALESCE(
                    (SELECT COUNT(*) FROM t_p80499285_psot_realization_pro.pab_records WHERE user_id = u.id), 
                    0
                ) as records_count,
                COALESCE(
                    (SELECT COUNT(*) FROM t_p80499285_psot_realization_pro.user_activity WHERE user_id = u.id AND activity_date >= CURRENT_DATE - INTERVAL '30 days'), 
                    0
                ) as activities_last_month,
                COALESCE(
                    (SELECT MAX(activity_date) FROM t_p80499285_psot_realization_pro.user_activity WHERE user_id = u.id), 
                    NULL
                ) as last_activity
            FROM t_p80499285_psot_realization_pro.users u
            WHERE u.organization_id = %s
            ORDER BY u.created_at DESC
        """, (organization_id,))
        
        users = []
        for row in cur.fetchall():
            users.append({
                'id': row[0],
                'email': row[1],
                'fio': row[2],
                'subdivision': row[3],
                'position': row[4],
                'role': row[5],
                'created_at': row[6].isoformat() if row[6] else None,
                'records_count': row[7],
                'activities_last_month': row[8],
                'last_activity': row[9].isoformat() if row[9] else None
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps(users)
        }
    
    if method == 'PUT':
        import psycopg2
        import hashlib

        SCHEMA = 't_p80499285_psot_realization_pro'
        CORS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}

        body = json.loads(event.get('body', '{}'))
        user_id = body.get('id')

        if not user_id:
            return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'id пользователя обязателен'})}

        fio = (body.get('fio') or '').strip()
        email = (body.get('email') or '').strip()
        subdivision = (body.get('subdivision') or '').strip()
        position = (body.get('position') or '').strip()
        role = (body.get('role') or '').strip()
        new_password = (body.get('password') or '').strip()

        if not fio or not email:
            return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'ФИО и email обязательны'})}

        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()

        fio_e = fio.replace("'", "''")
        email_e = email.replace("'", "''")
        sub_e = subdivision.replace("'", "''")
        pos_e = position.replace("'", "''")
        role_e = role.replace("'", "''") if role in ('user', 'admin', 'miniadmin') else 'user'

        # Проверяем уникальность email (не занят другим пользователем)
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE LOWER(email) = LOWER('{email_e}') AND id != {user_id}")
        if cur.fetchone():
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Этот email уже занят другим пользователем'})}

        # Обновляем данные пользователя
        cur.execute(f"""
            UPDATE {SCHEMA}.users
            SET fio = '{fio_e}', email = '{email_e}',
                subdivision = '{sub_e}', position = '{pos_e}', role = '{role_e}'
            WHERE id = {user_id}
        """)

        # Если указан новый пароль — меняем хеш
        if new_password and len(new_password) >= 6:
            ph = hashlib.sha256(new_password.encode()).hexdigest()
            cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = '{ph}' WHERE id = {user_id}")

        conn.commit()
        cur.close()
        conn.close()

        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                'body': json.dumps({'success': True})}

    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }