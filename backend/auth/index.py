import json
import os
import hashlib
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Authentication and user registration for ASUBT system
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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'GET':
        query_params = event.get('queryStringParameters', {})
        action = query_params.get('action')
        
        if action == 'verify_code':
            import psycopg2
            
            code = query_params.get('code')
            if not code:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Code required'})
                }
            
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            
            code_escaped = code.replace("'", "''")
            cur.execute(f"SELECT id, name FROM t_p80499285_psot_realization_pro.organizations WHERE registration_code = '{code_escaped}'")
            org_result = cur.fetchone()
            
            cur.close()
            conn.close()
            
            if org_result:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'success': True,
                        'organizationId': org_result[0],
                        'organizationName': org_result[1]
                    })
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Invalid code'})
                }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        if action == 'register':
            try:
                import psycopg2
                
                email = body_data.get('email', '').strip()
                password = body_data.get('password', '').strip()
                code = body_data.get('code', '').strip() if body_data.get('code') else None
                full_name = body_data.get('full_name', '').strip() if body_data.get('full_name') else None
                fio = (body_data.get('fio', '').strip() if body_data.get('fio') else None) or full_name
                company = body_data.get('company', '').strip() if body_data.get('company') else None
                subdivision = body_data.get('subdivision', '').strip() if body_data.get('subdivision') else None
                position = body_data.get('position', '').strip() if body_data.get('position') else None
                
                print(f"[REGISTER DEBUG] Registration request: email={email}, code={code}, fio={fio}")
                
                if not email or not password or not fio:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Email, password and full name are required'})
                    }
                
                fio_parts = fio.strip().split()
                if len(fio_parts) < 3:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'ФИО должно содержать Фамилию, Имя и Отчество (три слова)'})
                    }
                
                for part in fio_parts[:3]:
                    if not part[0].isupper():
                        return {
                            'statusCode': 400,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': 'Каждое слово в ФИО должно начинаться с заглавной буквы'})
                        }
                
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                
                conn = psycopg2.connect(os.environ['DATABASE_URL'])
                cur = conn.cursor()
                
                email_escaped = email.replace("'", "''")
                code_escaped = code.replace("'", "''") if code else ''
                fio_escaped = fio.replace("'", "''")
                password_hash_escaped = password_hash.replace("'", "''")
                
                organization_id = None
                if code:
                    print(f"[REGISTER DEBUG] Checking registration code: {code_escaped}")
                    cur.execute(f"SELECT id, name FROM t_p80499285_psot_realization_pro.organizations WHERE registration_code = '{code_escaped}'")
                    org_result = cur.fetchone()
                    print(f"[REGISTER DEBUG] Organization query result: {org_result}")
                    if org_result:
                        organization_id = org_result[0]
                        company = org_result[1]
                        print(f"[REGISTER DEBUG] Found organization: ID={organization_id}, Name={company}")
                    else:
                        print(f"[REGISTER DEBUG] No organization found for code: {code_escaped}")
                        cur.close()
                        conn.close()
                        return {
                            'statusCode': 400,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': f'Неверный код приглашения: {code}'})
                        }
                
                cur.execute(f"SELECT id FROM t_p80499285_psot_realization_pro.users WHERE email = '{email_escaped}'")
                existing = cur.fetchone()
                
                if existing:
                    print(f"[REGISTER DEBUG] Email already exists: {email}")
                    cur.close()
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Этот email уже зарегистрирован'})
                    }
                
                company_escaped = company.replace("'", "''") if company else ''
                subdivision_escaped = subdivision.replace("'", "''") if subdivision else ''
                position_escaped = position.replace("'", "''") if position else ''
                
                org_id_sql = str(organization_id) if organization_id else 'NULL'
                company_sql = f"'{company_escaped}'" if company_escaped else "''"
                subdivision_sql = f"'{subdivision_escaped}'" if subdivision_escaped else "''"
                position_sql = f"'{position_escaped}'" if position_escaped else "''"
                
                cur.execute(
                    f"INSERT INTO t_p80499285_psot_realization_pro.users (email, password_hash, fio, company, subdivision, position, organization_id, role) VALUES ('{email_escaped}', '{password_hash_escaped}', '{fio_escaped}', {company_sql}, {subdivision_sql}, {position_sql}, {org_id_sql}, 'user') RETURNING id"
                )
                user_id = cur.fetchone()[0]
                
                surname_initial = fio_parts[0][0].upper()
                name_initial = fio_parts[1][0].upper()
                patronymic_initial = fio_parts[2][0].upper()
                display_name = f"ID№{str(user_id).zfill(5)}-{surname_initial}.{name_initial}.{patronymic_initial}."
                display_name_escaped = display_name.replace("'", "''")
                
                cur.execute(
                    f"UPDATE t_p80499285_psot_realization_pro.users SET display_name = '{display_name_escaped}' WHERE id = {user_id}"
                )
                
                cur.execute(
                    f"INSERT INTO t_p80499285_psot_realization_pro.user_stats (user_id) VALUES ({user_id})"
                )
                
                conn.commit()
                cur.close()
                conn.close()
                
                print(f"[REGISTER DEBUG] Registration successful: user_id={user_id}, display_name={display_name}")
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'userId': user_id, 'displayName': display_name})
                }
            except Exception as e:
                print(f"[REGISTER ERROR] Exception during registration: {str(e)}")
                import traceback
                traceback.print_exc()
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': f'Ошибка сервера: {str(e)}'})
                }
        
        elif action == 'login':
            import psycopg2
            
            email = body_data.get('email', '').strip()
            password = body_data.get('password', '').strip()
            
            print(f"[AUTH DEBUG] Login attempt for email: {email}, password length: {len(password) if password else 0}")
            
            if not email or not password:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Email and password required'})
                }
            
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            print(f"[AUTH DEBUG] Computed hash: {password_hash}")
            
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            
            email_escaped = email.replace("'", "''")
            password_hash_escaped = password_hash.replace("'", "''")
            cur.execute(f"""
                SELECT u.id, u.fio, u.subdivision, u.position, u.role, u.organization_id, 
                       u.is_blocked, u.blocked_until, o.is_blocked, o.blocked_until, o.registration_code
                FROM t_p80499285_psot_realization_pro.users u 
                LEFT JOIN t_p80499285_psot_realization_pro.organizations o ON u.organization_id = o.id 
                WHERE u.email = '{email_escaped}' AND u.password_hash = '{password_hash_escaped}'
            """)
            result = cur.fetchone()
            print(f"[AUTH DEBUG] Final query result: {result is not None}")
            
            cur.close()
            conn.close()
            
            if result:
                from datetime import datetime
                user_blocked = result[6]
                user_blocked_until = result[7]
                org_blocked = result[8]
                org_blocked_until = result[9]
                
                if user_blocked:
                    if user_blocked_until and datetime.now() < user_blocked_until:
                        return {
                            'statusCode': 403,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'isBase64Encoded': False,
                            'body': json.dumps({
                                'success': False, 
                                'error': 'blocked',
                                'message': f'Ваш аккаунт был заблокирован по неизвестной причине, просьба обратиться к администратору вашего предприятия, не забудьте назвать свой id №{result[0]}'
                            })
                        }
                    elif not user_blocked_until:
                        return {
                            'statusCode': 403,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'isBase64Encoded': False,
                            'body': json.dumps({
                                'success': False, 
                                'error': 'blocked',
                                'message': f'Ваш аккаунт был заблокирован по неизвестной причине, просьба обратиться к администратору вашего предприятия, не забудьте назвать свой id №{result[0]}'
                            })
                        }
                
                if org_blocked and result[5]:
                    if org_blocked_until and datetime.now() < org_blocked_until:
                        return {
                            'statusCode': 403,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'isBase64Encoded': False,
                            'body': json.dumps({
                                'success': False, 
                                'error': 'blocked',
                                'message': 'Ваше предприятие временно заблокировано. Обратитесь к главному администратору системы.'
                            })
                        }
                    elif not org_blocked_until:
                        return {
                            'statusCode': 403,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'isBase64Encoded': False,
                            'body': json.dumps({
                                'success': False, 
                                'error': 'blocked',
                                'message': 'Ваше предприятие заблокировано. Обратитесь к главному администратору системы.'
                            })
                        }
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'success': True,
                        'userId': result[0],
                        'fio': result[1],
                        'subdivision': result[2],
                        'position': result[3],
                        'role': result[4],
                        'organizationId': result[5],
                        'registrationCode': result[10] if result[10] else None
                    })
                }
            else:
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Invalid credentials'})
                }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }