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
            import random
            import string
            from datetime import datetime, timedelta

            SCHEMA = 't_p80499285_psot_realization_pro'
            CORS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            MAX_ATTEMPTS = 5
            BLOCK_MINUTES = 15
            IP_BLOCK_THRESHOLD = 20
            SESSION_HOURS = 8

            email = body_data.get('email', '').strip().lower()
            password = body_data.get('password', '').strip()
            device_fp = body_data.get('deviceFingerprint', '')
            user_agent = (event.get('headers') or {}).get('User-Agent', '')
            ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp', '') or \
                 (event.get('headers') or {}).get('X-Forwarded-For', '').split(',')[0].strip()

            print(f"[AUTH] Login: {email}, IP: {ip}")

            if not email or not password:
                return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Email и пароль обязательны'})}

            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            now = datetime.now()

            # 1. Проверка блокировки IP
            if ip:
                ip_esc = ip.replace("'", "''")
                cur.execute(f"SELECT blocked_until FROM {SCHEMA}.ip_blocks WHERE ip_address = '{ip_esc}' AND blocked_until > NOW()")
                ip_block = cur.fetchone()
                if ip_block:
                    cur.close(); conn.close()
                    return {'statusCode': 429, 'headers': CORS, 'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': 'ip_blocked',
                                'message': f'Слишком много попыток входа. Ваш IP заблокирован до {ip_block[0].strftime("%H:%M")}'})}

            # 2. Проверка попыток входа по email (последние 15 минут)
            email_esc = email.replace("'", "''")
            cur.execute(f"""
                SELECT COUNT(*) FROM {SCHEMA}.login_attempts
                WHERE email = '{email_esc}' AND success = false
                AND created_at > NOW() - INTERVAL '{BLOCK_MINUTES} minutes'
            """)
            fail_count = cur.fetchone()[0]

            if fail_count >= MAX_ATTEMPTS:
                cur.close(); conn.close()
                return {'statusCode': 429, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'too_many_attempts',
                            'message': f'Слишком много неверных попыток. Попробуйте через {BLOCK_MINUTES} минут.'})}

            # 3. Проверка блокировки IP по количеству попыток с разных аккаунтов
            if ip:
                cur.execute(f"""
                    SELECT COUNT(*) FROM {SCHEMA}.login_attempts
                    WHERE ip_address = '{ip_esc}' AND success = false
                    AND created_at > NOW() - INTERVAL '10 minutes'
                """)
                ip_fail_count = cur.fetchone()[0]
                if ip_fail_count >= IP_BLOCK_THRESHOLD:
                    block_until = now + timedelta(hours=1)
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.ip_blocks (ip_address, blocked_until, reason)
                        VALUES ('{ip_esc}', '{block_until}', 'Автоблокировка: {ip_fail_count} неверных попыток')
                        ON CONFLICT (ip_address) DO UPDATE SET blocked_until = '{block_until}'
                    """)
                    conn.commit()
                    cur.close(); conn.close()
                    return {'statusCode': 429, 'headers': CORS, 'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': 'ip_blocked',
                                'message': 'Подозрительная активность. IP заблокирован на 1 час.'})}

            # 4. Основная аутентификация
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            ph_esc = password_hash.replace("'", "''")
            cur.execute(f"""
                SELECT u.id, u.fio, u.subdivision, u.position, u.role, u.organization_id,
                       u.is_blocked, u.blocked_until, o.is_blocked, o.blocked_until, o.registration_code,
                       COALESCE(u.company, o.name, '') as company, u.email
                FROM {SCHEMA}.users u
                LEFT JOIN {SCHEMA}.organizations o ON u.organization_id = o.id
                WHERE u.email = '{email_esc}' AND u.password_hash = '{ph_esc}'
            """)
            result = cur.fetchone()

            ip_val = f"'{ip_esc}'" if ip else 'NULL'
            ua_esc = user_agent.replace("'", "''")

            if not result:
                # Фиксируем неудачную попытку
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.login_attempts (email, ip_address, success)
                    VALUES ('{email_esc}', {ip_val}, false)
                """)
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.login_log (email, ip_address, user_agent, success, fail_reason)
                    VALUES ('{email_esc}', {ip_val}, '{ua_esc}', false, 'invalid_credentials')
                """)
                conn.commit()
                remaining = MAX_ATTEMPTS - fail_count - 1
                cur.close(); conn.close()
                msg = f'Неверный логин или пароль. Осталось попыток: {remaining}' if remaining > 0 else \
                      f'Неверный логин или пароль. Следующая попытка через {BLOCK_MINUTES} мин.'
                return {'statusCode': 401, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'invalid_credentials', 'message': msg})}

            user_id = result[0]
            user_blocked = result[6]
            user_blocked_until = result[7]
            org_blocked = result[8]
            org_blocked_until = result[9]

            # 5. Проверка блокировки пользователя
            if user_blocked and (not user_blocked_until or now < user_blocked_until):
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.login_log (user_id, email, ip_address, user_agent, success, fail_reason)
                    VALUES ({user_id}, '{email_esc}', {ip_val}, '{ua_esc}', false, 'user_blocked')
                """)
                conn.commit()
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'blocked',
                            'message': f'Ваш аккаунт заблокирован. Обратитесь к администратору (ID №{user_id})'})}

            # 6. Проверка блокировки организации
            if org_blocked and result[5] and (not org_blocked_until or now < org_blocked_until):
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.login_log (user_id, email, ip_address, user_agent, success, fail_reason)
                    VALUES ({user_id}, '{email_esc}', {ip_val}, '{ua_esc}', false, 'org_blocked')
                """)
                conn.commit()
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'blocked',
                            'message': 'Ваше предприятие заблокировано. Обратитесь к главному администратору.'})}

            # 7. Фиксируем успешный вход
            cur.execute(f"""
                INSERT INTO {SCHEMA}.login_attempts (email, ip_address, success)
                VALUES ('{email_esc}', {ip_val}, true)
            """)
            cur.execute(f"""
                INSERT INTO {SCHEMA}.login_log (user_id, email, ip_address, user_agent, success)
                VALUES ({user_id}, '{email_esc}', {ip_val}, '{ua_esc}', true)
            """)

            # 8. Проверка нового устройства и отправка уведомления
            is_new_device = False
            if device_fp:
                fp_esc = device_fp.replace("'", "''")
                cur.execute(f"""
                    SELECT id FROM {SCHEMA}.known_devices
                    WHERE user_id = {user_id} AND device_fingerprint = '{fp_esc}'
                """)
                known = cur.fetchone()
                if not known:
                    is_new_device = True
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.known_devices (user_id, device_fingerprint, user_agent)
                        VALUES ({user_id}, '{fp_esc}', '{ua_esc}')
                    """)
                else:
                    cur.execute(f"""
                        UPDATE {SCHEMA}.known_devices SET last_seen = NOW()
                        WHERE user_id = {user_id} AND device_fingerprint = '{fp_esc}'
                    """)

            conn.commit()
            cur.close(); conn.close()

            # 9. Если новое устройство — отправить email уведомление (асинхронно, не блокируем вход)
            if is_new_device and email:
                try:
                    import urllib.request
                    send_email_url = 'https://functions.poehali.dev/3a8b2c1d-send-email-placeholder'
                    notify_body = json.dumps({
                        'email': email,
                        'subject': 'Вход с нового устройства — АСУБТ',
                        'html_content': f'''
                            <div style="font-family:Arial,sans-serif;max-width:500px">
                                <h2 style="color:#dc2626">⚠️ Новый вход в аккаунт</h2>
                                <p>Зафиксирован вход в систему АСУБТ с нового устройства.</p>
                                <table style="width:100%;border-collapse:collapse">
                                    <tr><td style="padding:8px;color:#666">Время:</td><td style="padding:8px"><b>{now.strftime("%d.%m.%Y %H:%M")}</b></td></tr>
                                    <tr><td style="padding:8px;color:#666">IP-адрес:</td><td style="padding:8px"><b>{ip or "неизвестен"}</b></td></tr>
                                    <tr><td style="padding:8px;color:#666">Устройство:</td><td style="padding:8px"><b>{user_agent[:80] if user_agent else "неизвестно"}</b></td></tr>
                                </table>
                                <p style="color:#dc2626">Если это были не вы — немедленно смените пароль.</p>
                            </div>
                        ''',
                        'sender_name': 'АСУБТ Безопасность'
                    })
                    req = urllib.request.Request(
                        'https://functions.poehali.dev/4c959f6c-567d-4173-8a4b-d5a78340d3eb',
                        data=notify_body.encode(),
                        headers={'Content-Type': 'application/json'},
                        method='POST'
                    )
                    urllib.request.urlopen(req, timeout=5)
                except Exception as e:
                    print(f"[AUTH] New device email error: {e}")

            return {
                'statusCode': 200,
                'headers': CORS,
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'userId': result[0],
                    'fio': result[1],
                    'subdivision': result[2],
                    'position': result[3],
                    'role': result[4],
                    'organizationId': result[5],
                    'registrationCode': result[10] if result[10] else None,
                    'company': result[11] if result[11] else None,
                    'isNewDevice': is_new_device
                })
            }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }