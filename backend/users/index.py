import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: User management API for admins
    Args: event - dict with httpMethod, body, queryStringParameters
          context - object with attributes: request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'GET':
        import psycopg2
        
        params = event.get('queryStringParameters') or {}
        action = params.get('action', 'list')
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        if action == 'list':
            headers = event.get('headers', {})
            user_role = headers.get('X-User-Role', '')
            
            cur.execute("""
                SELECT u.id, u.email, u.fio, u.display_name, u.company, u.subdivision, u.position, u.role, u.created_at,
                       COALESCE(s.registered_count, 0) as registered_count,
                       COALESCE(s.online_count, 0) as online_count,
                       COALESCE(s.offline_count, 0) as offline_count
                FROM t_p80499285_psot_realization_pro.users u
                LEFT JOIN t_p80499285_psot_realization_pro.user_stats s ON u.id = s.user_id
                ORDER BY u.created_at DESC
            """)
            
            users = []
            for row in cur.fetchall():
                is_superadmin = user_role == 'superadmin'
                users.append({
                    'id': row[0],
                    'email': row[1],
                    'fio': row[2] if is_superadmin else row[3],
                    'display_name': row[3],
                    'company': row[4],
                    'subdivision': row[5],
                    'position': row[6],
                    'role': row[7],
                    'created_at': row[8].isoformat() if row[8] else None,
                    'stats': {
                        'registered_count': row[9],
                        'online_count': row[10],
                        'offline_count': row[11]
                    }
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
                'body': json.dumps({'success': True, 'users': users})
            }
        
        elif action == 'stats':
            cur.execute("""
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN role = 'user' THEN 1 END) as users_count,
                    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins_count,
                    COUNT(CASE WHEN role = 'superadmin' THEN 1 END) as superadmins_count
                FROM t_p80499285_psot_realization_pro.users
            """)
            
            row = cur.fetchone()
            stats = {
                'total_users': row[0],
                'users_count': row[1],
                'admins_count': row[2],
                'superadmins_count': row[3]
            }
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'stats': stats})
            }
        
        elif action == 'list_companies':
            cur.execute("""
                SELECT id, name 
                FROM t_p80499285_psot_realization_pro.organizations 
                ORDER BY name
            """)
            
            companies = [{'id': row[0], 'name': row[1]} for row in cur.fetchall()]
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'companies': companies})
            }
        
        elif action == 'user_cabinet':
            user_id = params.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})
                }
            
            # Получаем данные пользователя и автоматически считаем зарегистрированных пользователей из организации
            cur.execute(f"""
                SELECT u.id, u.display_name, u.fio, u.email, u.company, u.subdivision, u.position,
                       u.organization_id,
                       COALESCE(s.online_count, 0) as online_count,
                       COALESCE(s.offline_count, 0) as offline_count,
                       COALESCE(s.pab_total, 0) as pab_total,
                       COALESCE(s.pab_completed, 0) as pab_completed,
                       COALESCE(s.pab_in_progress, 0) as pab_in_progress,
                       COALESCE(s.pab_overdue, 0) as pab_overdue,
                       COALESCE(s.observations_issued, 0) as observations_issued,
                       COALESCE(s.observations_completed, 0) as observations_completed,
                       COALESCE(s.observations_in_progress, 0) as observations_in_progress,
                       COALESCE(s.observations_overdue, 0) as observations_overdue,
                       COALESCE(s.prescriptions_issued, 0) as prescriptions_issued,
                       COALESCE(s.prescriptions_completed, 0) as prescriptions_completed,
                       COALESCE(s.prescriptions_in_progress, 0) as prescriptions_in_progress,
                       COALESCE(s.prescriptions_overdue, 0) as prescriptions_overdue,
                       COALESCE(s.audits_conducted, 0) as audits_conducted
                FROM t_p80499285_psot_realization_pro.users u
                LEFT JOIN t_p80499285_psot_realization_pro.user_stats s ON u.id = s.user_id
                WHERE u.id = {user_id}
            """)
            
            row = cur.fetchone()
            
            if not row:
                cur.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User not found'})
                }
            
            # Подсчитываем всех зарегистрированных пользователей из организации (кроме администраторов)
            organization_id = row[7]
            registered_count = 0
            
            if organization_id:
                cur.execute(f"""
                    SELECT COUNT(*) 
                    FROM t_p80499285_psot_realization_pro.users 
                    WHERE organization_id = {organization_id} 
                    AND role NOT IN ('admin', 'superadmin', 'miniadmin')
                """)
                count_row = cur.fetchone()
                registered_count = count_row[0] if count_row else 0
            
            stats = {
                'user_id': row[0],
                'display_name': row[1] or f"ID№{str(row[0]).zfill(5)}",
                'fio': row[2],
                'email': row[3],
                'company': row[4] or '',
                'subdivision': row[5] or '',
                'position': row[6] or '',
                'registered_count': registered_count,
                'online_count': row[8],
                'offline_count': row[9],
                'pab_total': row[10],
                'pab_completed': row[11],
                'pab_in_progress': row[12],
                'pab_overdue': row[13],
                'observations_issued': row[14],
                'observations_completed': row[15],
                'observations_in_progress': row[16],
                'observations_overdue': row[17],
                'prescriptions_issued': row[18],
                'prescriptions_completed': row[19],
                'prescriptions_in_progress': row[20],
                'prescriptions_overdue': row[21],
                'audits_conducted': row[22]
            }
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'stats': stats})
            }
        
        elif action == 'registered_users':
            user_id = params.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})
                }
            
            # Получаем organization_id текущего пользователя
            cur.execute(f"""
                SELECT organization_id 
                FROM t_p80499285_psot_realization_pro.users 
                WHERE id = {user_id}
            """)
            
            row = cur.fetchone()
            
            if not row or not row[0]:
                cur.close()
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'users': []})
                }
            
            organization_id = row[0]
            
            # Получаем всех пользователей из той же организации
            cur.execute(f"""
                SELECT id, fio, display_name, position, subdivision, company, email
                FROM t_p80499285_psot_realization_pro.users
                WHERE organization_id = {organization_id}
                AND role NOT IN ('admin', 'superadmin', 'miniadmin')
                ORDER BY fio
            """)
            
            users = []
            for user_row in cur.fetchall():
                users.append({
                    'id': user_row[0],
                    'fio': user_row[1] or user_row[2] or f"ID№{str(user_row[0]).zfill(5)}",
                    'position': user_row[3] or '',
                    'subdivision': user_row[4] or '',
                    'company': user_row[5] or '',
                    'email': user_row[6] or ''
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
                'body': json.dumps({'success': True, 'users': users})
            }
        
        elif action == 'online_users':
            user_id = params.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})
                }
            
            # Получаем organization_id текущего пользователя
            cur.execute(f"""
                SELECT organization_id 
                FROM t_p80499285_psot_realization_pro.users 
                WHERE id = {user_id}
            """)
            
            row = cur.fetchone()
            
            if not row or not row[0]:
                cur.close()
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'users': []})
                }
            
            organization_id = row[0]
            
            # Получаем онлайн пользователей из той же организации (последняя активность < 5 минут)
            cur.execute(f"""
                SELECT u.id, u.fio, u.display_name, u.position, u.subdivision, u.company, u.email, u.last_activity
                FROM t_p80499285_psot_realization_pro.users u
                WHERE u.organization_id = {organization_id}
                AND u.role NOT IN ('admin', 'superadmin', 'miniadmin')
                AND u.last_activity IS NOT NULL
                AND u.last_activity > NOW() - INTERVAL '5 minutes'
                ORDER BY u.last_activity DESC
            """)
            
            users = []
            for user_row in cur.fetchall():
                users.append({
                    'id': user_row[0],
                    'fio': user_row[1] or user_row[2] or f"ID№{str(user_row[0]).zfill(5)}",
                    'position': user_row[3] or '',
                    'subdivision': user_row[4] or '',
                    'company': user_row[5] or '',
                    'email': user_row[6] or '',
                    'last_activity': user_row[7].isoformat() if user_row[7] else None
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
                'body': json.dumps({'success': True, 'users': users})
            }
    
    if method == 'PUT':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('userId')
        action = body_data.get('action')
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        if action == 'update_role':
            new_role = body_data.get('role')
            new_role_escaped = new_role.replace("'", "''")
            cur.execute(f"UPDATE t_p80499285_psot_realization_pro.users SET role = '{new_role_escaped}' WHERE id = {user_id}")
            conn.commit()
            
        elif action == 'update_profile':
            fio = body_data.get('fio')
            company = body_data.get('company')
            subdivision = body_data.get('subdivision')
            position = body_data.get('position')
            
            fio_escaped = fio.replace("'", "''") if fio else ''
            company_escaped = company.replace("'", "''") if company else ''
            subdivision_escaped = subdivision.replace("'", "''") if subdivision else ''
            position_escaped = position.replace("'", "''") if position else ''
            
            fio_sql = f"'{fio_escaped}'" if fio else 'NULL'
            company_sql = f"'{company_escaped}'" if company else 'NULL'
            subdivision_sql = f"'{subdivision_escaped}'" if subdivision else 'NULL'
            position_sql = f"'{position_escaped}'" if position else 'NULL'
            
            cur.execute(f"""
                UPDATE t_p80499285_psot_realization_pro.users 
                SET fio = {fio_sql}, company = {company_sql}, subdivision = {subdivision_sql}, position = {position_sql} 
                WHERE id = {user_id}
            """)
            conn.commit()
            
        elif action == 'change_email':
            import hashlib
            
            new_email = body_data.get('newEmail')
            new_email_escaped = new_email.replace("'", "''")
            
            cur.execute(f"SELECT id FROM t_p80499285_psot_realization_pro.users WHERE email = '{new_email_escaped}' AND id != {user_id}")
            if cur.fetchone():
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Email already exists'})
                }
            
            cur.execute(f"UPDATE t_p80499285_psot_realization_pro.users SET email = '{new_email_escaped}' WHERE id = {user_id}")
            conn.commit()
            
        elif action == 'change_password':
            import hashlib
            
            new_password = body_data.get('newPassword')
            new_hash = hashlib.sha256(new_password.encode()).hexdigest()
            
            cur.execute(f"UPDATE t_p80499285_psot_realization_pro.users SET password_hash = '{new_hash}' WHERE id = {user_id}")
            conn.commit()
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'success': True})
        }
    
    if method == 'POST':
        import psycopg2
        import hashlib
        import secrets
        import string
        
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        if action == 'bulk_import':
            company_id = body_data.get('companyId')
            fio = body_data.get('fio')
            email = body_data.get('email', '').strip()
            subdivision = body_data.get('subdivision')
            position = body_data.get('position')
            
            if not email:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Email обязателен для заполнения'})
                }
            
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            
            email_escaped = email.replace("'", "''")
            cur.execute(f"SELECT id FROM t_p80499285_psot_realization_pro.users WHERE email = '{email_escaped}'")
            if cur.fetchone():
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Email уже существует'})
                }
            
            temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
            password_hash = hashlib.sha256(temp_password.encode()).hexdigest()
            
            fio_escaped = fio.replace("'", "''") if fio else ''
            subdivision_escaped = subdivision.replace("'", "''") if subdivision else ''
            position_escaped = position.replace("'", "''") if position else ''
            
            cur.execute(f"SELECT name FROM t_p80499285_psot_realization_pro.organizations WHERE id = {company_id}")
            company_row = cur.fetchone()
            company_name = company_row[0] if company_row else ''
            company_name_escaped = company_name.replace("'", "''")
            
            cur.execute(f"""
                INSERT INTO t_p80499285_psot_realization_pro.users 
                (email, password_hash, fio, company, subdivision, position, role, organization_id) 
                VALUES ('{email_escaped}', '{password_hash}', '{fio_escaped}', '{company_name_escaped}', '{subdivision_escaped}', '{position_escaped}', 'user', {company_id}) 
                RETURNING id
            """)
            
            user_id = cur.fetchone()[0]
            
            cur.execute(f"INSERT INTO t_p80499285_psot_realization_pro.user_stats (user_id, registered_count) VALUES ({user_id}, 1)")
            
            cur.execute(f"SELECT registration_code FROM t_p80499285_psot_realization_pro.organizations WHERE id = {company_id}")
            org_code_row = cur.fetchone()
            org_code = org_code_row[0] if org_code_row else ''
            
            base_url = event.get('headers', {}).get('Origin', 'https://your-domain.com')
            login_link = f"{base_url}/org/{org_code}?email={email}&password={temp_password}"
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'loginLink': login_link})
            }
        
        elif action == 'send_bulk_links':
            users_data = body_data.get('users', [])
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'sent': len(users_data)})
            }
        
        elif action == 'create_user':
            email = body_data.get('email')
            password = body_data.get('password')
            fio = body_data.get('fio')
            company = body_data.get('company')
            subdivision = body_data.get('subdivision')
            position = body_data.get('position')
            role = body_data.get('role', 'user')
            
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            
            email_escaped = email.replace("'", "''")
            cur.execute(f"SELECT id FROM t_p80499285_psot_realization_pro.users WHERE email = '{email_escaped}'")
            if cur.fetchone():
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Email already exists'})
                }
            
            fio_escaped = fio.replace("'", "''") if fio else ''
            company_escaped = company.replace("'", "''") if company else ''
            subdivision_escaped = subdivision.replace("'", "''") if subdivision else ''
            position_escaped = position.replace("'", "''") if position else ''
            role_escaped = role.replace("'", "''")
            
            fio_sql = f"'{fio_escaped}'" if fio else 'NULL'
            company_sql = f"'{company_escaped}'" if company else 'NULL'
            subdivision_sql = f"'{subdivision_escaped}'" if subdivision else 'NULL'
            position_sql = f"'{position_escaped}'" if position else 'NULL'
            
            cur.execute(f"""
                INSERT INTO t_p80499285_psot_realization_pro.users (email, password_hash, fio, company, subdivision, position, role) 
                VALUES ('{email_escaped}', '{password_hash}', {fio_sql}, {company_sql}, {subdivision_sql}, {position_sql}, '{role_escaped}') 
                RETURNING id
            """)
            
            user_id = cur.fetchone()[0]
            
            cur.execute(f"INSERT INTO t_p80499285_psot_realization_pro.user_stats (user_id) VALUES ({user_id})")
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'userId': user_id, 'email': email})
            }
    
    if method == 'DELETE':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('userId')
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        cur.execute(f"DELETE FROM t_p80499285_psot_realization_pro.user_stats WHERE user_id = {user_id}")
        cur.execute(f"DELETE FROM t_p80499285_psot_realization_pro.prescriptions WHERE user_id = {user_id}")
        cur.execute(f"DELETE FROM t_p80499285_psot_realization_pro.audits WHERE user_id = {user_id}")
        cur.execute(f"DELETE FROM t_p80499285_psot_realization_pro.violations WHERE user_id = {user_id}")
        cur.execute(f"DELETE FROM t_p80499285_psot_realization_pro.users WHERE id = {user_id}")
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'success': True})
        }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }