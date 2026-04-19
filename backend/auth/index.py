import json
import os
import bcrypt  # security: bcrypt for password hashing
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
            
            cur.execute("SELECT id, name FROM t_p80499285_psot_realization_pro.organizations WHERE registration_code = %s", (code,))
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
                
                password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
                
                conn = psycopg2.connect(os.environ['DATABASE_URL'])
                cur = conn.cursor()
                
                organization_id = None
                if code:
                    print(f"[REGISTER DEBUG] Checking registration code: {code}")
                    cur.execute("SELECT id, name FROM t_p80499285_psot_realization_pro.organizations WHERE registration_code = %s", (code,))
                    org_result = cur.fetchone()
                    print(f"[REGISTER DEBUG] Organization query result: {org_result}")
                    if org_result:
                        organization_id = org_result[0]
                        company = org_result[1]
                        print(f"[REGISTER DEBUG] Found organization: ID={organization_id}, Name={company}")
                    else:
                        print(f"[REGISTER DEBUG] No organization found for code: {code}")
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
                
                cur.execute("SELECT id FROM t_p80499285_psot_realization_pro.users WHERE email = %s", (email,))
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
                
                cur.execute(
                    "INSERT INTO t_p80499285_psot_realization_pro.users (email, password_hash, fio, company, subdivision, position, organization_id, role) VALUES (%s, %s, %s, %s, %s, %s, %s, 'user') RETURNING id",
                    (email, password_hash, fio, company or '', subdivision or '', position or '', organization_id)
                )
                user_id = cur.fetchone()[0]
                
                surname_initial = fio_parts[0][0].upper()
                name_initial = fio_parts[1][0].upper()
                patronymic_initial = fio_parts[2][0].upper()
                display_name = f"ID№{str(user_id).zfill(5)}-{surname_initial}.{name_initial}.{patronymic_initial}."
                
                cur.execute(
                    "UPDATE t_p80499285_psot_realization_pro.users SET display_name = %s WHERE id = %s",
                    (display_name, user_id)
                )
                
                cur.execute(
                    "INSERT INTO t_p80499285_psot_realization_pro.user_stats (user_id) VALUES (%s)",
                    (user_id,)
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

            email = body_data.get('email', '').strip()
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
                cur.execute("SELECT blocked_until FROM " + SCHEMA + ".ip_blocks WHERE ip_address = %s AND blocked_until > NOW()", (ip,))
                ip_block = cur.fetchone()
                if ip_block:
                    cur.close(); conn.close()
                    return {'statusCode': 429, 'headers': CORS, 'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': 'ip_blocked',
                                'message': f'Слишком много попыток входа. Ваш IP заблокирован до {ip_block[0].strftime("%H:%M")}'})}

            # 2. Проверка попыток входа по email (последние 15 минут)
            cur.execute(
                "SELECT COUNT(*) FROM " + SCHEMA + ".login_attempts WHERE email = %s AND success = false AND created_at > NOW() - INTERVAL '" + str(BLOCK_MINUTES) + " minutes'",
                (email,)
            )
            fail_count = cur.fetchone()[0]

            if fail_count >= MAX_ATTEMPTS:
                cur.close(); conn.close()
                return {'statusCode': 429, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'too_many_attempts',
                            'message': f'Слишком много неверных попыток. Попробуйте через {BLOCK_MINUTES} минут.'})}

            # 3. Проверка блокировки IP по количеству попыток с разных аккаунтов
            if ip:
                cur.execute(
                    "SELECT COUNT(*) FROM " + SCHEMA + ".login_attempts WHERE ip_address = %s AND success = false AND created_at > NOW() - INTERVAL '10 minutes'",
                    (ip,)
                )
                ip_fail_count = cur.fetchone()[0]
                if ip_fail_count >= IP_BLOCK_THRESHOLD:
                    block_until = now + timedelta(hours=1)
                    cur.execute(
                        "INSERT INTO " + SCHEMA + ".ip_blocks (ip_address, blocked_until, reason) VALUES (%s, %s, %s) ON CONFLICT (ip_address) DO UPDATE SET blocked_until = %s",
                        (ip, block_until, f'Автоблокировка: {ip_fail_count} неверных попыток', block_until)
                    )
                    conn.commit()
                    cur.close(); conn.close()
                    return {'statusCode': 429, 'headers': CORS, 'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': 'ip_blocked',
                                'message': 'Подозрительная активность. IP заблокирован на 1 час.'})}

            # 4. Основная аутентификация
            cur.execute(
                "SELECT u.id, u.fio, u.subdivision, u.position, u.role, u.organization_id, u.is_blocked, u.blocked_until, o.is_blocked, o.blocked_until, o.registration_code, COALESCE(u.company, o.name, '') as company, u.email, u.password_hash FROM " + SCHEMA + ".users u LEFT JOIN " + SCHEMA + ".organizations o ON u.organization_id = o.id WHERE LOWER(u.email) = LOWER(%s)",
                (email,)
            )
            auth_row = cur.fetchone()
            # Verify password with bcrypt in Python
            if auth_row and bcrypt.checkpw(password.encode(), auth_row[13].encode()):
                result = auth_row
            else:
                result = None

            ip_or_none = ip if ip else None

            if not result:
                # Фиксируем неудачную попытку
                cur.execute(
                    "INSERT INTO " + SCHEMA + ".login_attempts (email, ip_address, success) VALUES (%s, %s, false)",
                    (email, ip_or_none)
                )
                cur.execute(
                    "INSERT INTO " + SCHEMA + ".login_log (email, ip_address, user_agent, success, fail_reason) VALUES (%s, %s, %s, false, 'invalid_credentials')",
                    (email, ip_or_none, user_agent)
                )
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
                cur.execute(
                    "INSERT INTO " + SCHEMA + ".login_log (user_id, email, ip_address, user_agent, success, fail_reason) VALUES (%s, %s, %s, %s, false, 'user_blocked')",
                    (user_id, email, ip_or_none, user_agent)
                )
                conn.commit()
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'blocked',
                            'message': f'Ваш аккаунт заблокирован. Обратитесь к администратору (ID №{user_id})'})}

            # 6. Проверка блокировки организации
            if org_blocked and result[5] and (not org_blocked_until or now < org_blocked_until):
                cur.execute(
                    "INSERT INTO " + SCHEMA + ".login_log (user_id, email, ip_address, user_agent, success, fail_reason) VALUES (%s, %s, %s, %s, false, 'org_blocked')",
                    (user_id, email, ip_or_none, user_agent)
                )
                conn.commit()
                cur.close(); conn.close()
                return {'statusCode': 403, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'blocked',
                            'message': 'Ваше предприятие заблокировано. Обратитесь к главному администратору.'})}

            # 7. Фиксируем успешный вход
            cur.execute(
                "INSERT INTO " + SCHEMA + ".login_attempts (email, ip_address, success) VALUES (%s, %s, true)",
                (email, ip_or_none)
            )
            cur.execute(
                "INSERT INTO " + SCHEMA + ".login_log (user_id, email, ip_address, user_agent, success) VALUES (%s, %s, %s, %s, true)",
                (user_id, email, ip_or_none, user_agent)
            )

            # 8. Проверка нового устройства и отправка уведомления
            is_new_device = False
            if device_fp:
                cur.execute(
                    "SELECT id FROM " + SCHEMA + ".known_devices WHERE user_id = %s AND device_fingerprint = %s",
                    (user_id, device_fp)
                )
                known = cur.fetchone()
                if not known:
                    is_new_device = True
                    cur.execute(
                        "INSERT INTO " + SCHEMA + ".known_devices (user_id, device_fingerprint, user_agent) VALUES (%s, %s, %s)",
                        (user_id, device_fp, user_agent)
                    )
                else:
                    cur.execute(
                        "UPDATE " + SCHEMA + ".known_devices SET last_seen = NOW() WHERE user_id = %s AND device_fingerprint = %s",
                        (user_id, device_fp)
                    )

            # 8б. Создаём сессионный токен (8 часов)
            import secrets as _secrets
            session_token = _secrets.token_hex(48)
            session_expires = now + timedelta(hours=SESSION_HOURS)
            cur.execute(
                "INSERT INTO " + SCHEMA + ".sessions (token, user_id, expires_at, ip_address, user_agent) VALUES (%s, %s, %s, %s, %s)",
                (session_token, user_id, session_expires, ip or None, user_agent[:500] if user_agent else None)
            )

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
                    'isNewDevice': is_new_device,
                    'sessionToken': session_token
                })
            }
    
        elif action == 'logout':
            import psycopg2
            SCHEMA = 't_p80499285_psot_realization_pro'
            CORS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            token = body_data.get('sessionToken', '')
            if token:
                conn = psycopg2.connect(os.environ['DATABASE_URL'])
                cur = conn.cursor()
                cur.execute("UPDATE " + SCHEMA + ".sessions SET expires_at = NOW() WHERE token = %s", (token,))
                conn.commit()
                cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True})}

        elif action == 'verify_session':
            import psycopg2
            SCHEMA = 't_p80499285_psot_realization_pro'
            CORS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            token = body_data.get('sessionToken', '') or \
                    (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '')
            if not token:
                return {'statusCode': 401, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'No token'})}
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            cur.execute(
                "SELECT s.user_id, u.role, u.organization_id, u.fio FROM " + SCHEMA + ".sessions s "
                "JOIN " + SCHEMA + ".users u ON s.user_id = u.id "
                "WHERE s.token = %s AND s.expires_at > NOW()",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {'statusCode': 401, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Invalid or expired session'})}
            cur.execute("UPDATE " + SCHEMA + ".sessions SET last_seen = NOW() WHERE token = %s", (token,))
            conn.commit()
            cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'userId': row[0], 'role': row[1],
                                        'organizationId': row[2], 'fio': row[3]})}

    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }