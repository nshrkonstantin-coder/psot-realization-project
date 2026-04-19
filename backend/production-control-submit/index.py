import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Any

def send_notification(cur, user_id: int, title: str, message: str, notification_type: str = 'info'):
    '''Отправка уведомления пользователю и администраторам в локальный чат'''
    cur.execute(
        "SELECT fio, position, organization_id FROM t_p80499285_psot_realization_pro.users WHERE id = %s",
        (user_id,)
    )
    user_data = cur.fetchone()
    
    if not user_data:
        return
    
    user_fio, user_position, org_id = user_data
    org_name = 'АО "ГРК "Западная"'
    
    cur.execute(
        "INSERT INTO t_p80499285_psot_realization_pro.system_notifications "
        "(notification_type, severity, title, message, user_id, user_fio, user_position, "
        "organization_id, organization_name, is_read, created_at) "
        "VALUES (%s, 'info', %s, %s, %s, %s, %s, %s, %s, false, NOW())",
        (notification_type, title, message, user_id, user_fio or '', user_position or '', org_id, org_name)
    )
    
    print(f'[Notification] Sent to user {user_id} and admins')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Save production control report to database
    Args: event - dict with httpMethod, body
          context - object with attributes: request_id, function_name
    Returns: HTTP response dict with report_id
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        
        doc_number = body_data.get('doc_number')
        doc_date = body_data.get('doc_date')
        recipient_user_id = body_data.get('recipient_user_id')
        recipient_name = body_data.get('recipient_name')
        department = body_data.get('department')
        witness = body_data.get('witness', '')
        issuer_name = body_data.get('issuer_name')
        issuer_position = body_data.get('issuer_position')
        issue_date = body_data.get('issue_date')
        violations = body_data.get('violations', [])
        signatures = body_data.get('acceptor_signatures', [])
        user_id = body_data.get('user_id')
        organization_id = body_data.get('organization_id')
        word_file_url = body_data.get('word_file_url', '')
        
        if not all([doc_number, doc_date, department, issuer_name, issue_date, user_id, organization_id]):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'Missing required fields'})
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        try:
            # Insert main report
            cur.execute(
                "INSERT INTO t_p80499285_psot_realization_pro.production_control_reports "
                "(doc_number, doc_date, recipient_user_id, recipient_name, department, witness, "
                "issuer_name, issuer_position, issue_date, user_id, organization_id, word_file_url) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (doc_number, doc_date, recipient_user_id or None, recipient_name or '', department,
                 witness or '', issuer_name, issuer_position or '', issue_date,
                 int(user_id), int(organization_id), word_file_url or '')
            )
            report_id = cur.fetchone()[0]
            
            # Insert violations
            for violation in violations:
                item_number = violation.get('item_number')
                photos = violation.get('photos', [])
                deadline = violation.get('deadline', '')
                responsible_user_id = violation.get('responsible_user_id')
                
                cur.execute(
                    "INSERT INTO t_p80499285_psot_realization_pro.production_control_violations "
                    "(report_id, item_number, description, measures, deadline, responsible_user_id) "
                    "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (report_id, item_number, violation.get('description', ''),
                     violation.get('measures', ''), deadline or None,
                     int(responsible_user_id) if responsible_user_id else None)
                )
                violation_id = cur.fetchone()[0]
                
                # Insert photos
                for photo in photos:
                    photo_url = photo.get('data', '')
                    if photo_url:
                        cur.execute(
                            "INSERT INTO t_p80499285_psot_realization_pro.production_control_photos "
                            "(violation_id, photo_url) VALUES (%s, %s)",
                            (violation_id, photo_url)
                        )
            
            # Insert signatures
            for sig in signatures:
                sig_user_id = sig.get('userId')
                sig_date = sig.get('date')
                
                if sig.get('userName') and sig_date:
                    cur.execute(
                        "INSERT INTO t_p80499285_psot_realization_pro.production_control_signatures "
                        "(report_id, user_id, user_name, signature_date) VALUES (%s, %s, %s, %s)",
                        (report_id, int(sig_user_id) if sig_user_id else None, sig.get('userName', ''), sig_date)
                    )
            
            # Создаем записи в реестре предписаний для отслеживания выполнения
            if recipient_user_id:
                # Создаем главное предписание
                cur.execute(
                    "INSERT INTO t_p80499285_psot_realization_pro.production_prescriptions "
                    "(issuer_fio, issuer_position, issuer_department, issuer_organization, "
                    "assigned_user_id, assigned_user_fio) "
                    "VALUES (%s, %s, %s, 'Производственный контроль', %s, %s) RETURNING id",
                    (issuer_name, issuer_position or '', department, int(recipient_user_id), recipient_name or '')
                )
                prescription_id = cur.fetchone()[0]
                
                # Создаем записи о нарушениях в реестре
                for violation in violations:
                    viol_description = violation.get('description', '')
                    viol_measures = violation.get('measures', '')
                    deadline = violation.get('deadline', '')
                    responsible_user_id_viol = violation.get('responsible_user_id')
                    
                    if viol_description or viol_measures:
                        violation_text = viol_description
                        if viol_measures:
                            violation_text += f"\n\nМеры: {viol_measures}"
                        
                        # Используем ответственного из нарушения, если указан, иначе получателя
                        final_user_id = responsible_user_id_viol if responsible_user_id_viol else recipient_user_id
                        
                        # Получаем ФИО ответственного
                        if responsible_user_id_viol:
                            cur.execute(
                                "SELECT fio FROM t_p80499285_psot_realization_pro.users WHERE id = %s",
                                (final_user_id,)
                            )
                            result = cur.fetchone()
                            responsible_fio = result[0] if result else (recipient_name or '')
                        else:
                            responsible_fio = recipient_name or ''
                        
                        # Используем срок выполнения из формы
                        if deadline:
                            cur.execute(
                                "INSERT INTO t_p80499285_psot_realization_pro.production_prescription_violations "
                                "(prescription_id, violation_text, assigned_user_id, assigned_user_fio, "
                                "deadline, status) "
                                "VALUES (%s, %s, %s, %s, DATE(%s), 'in_work') RETURNING id",
                                (prescription_id, violation_text, int(final_user_id), responsible_fio, deadline)
                            )
                        else:
                            cur.execute(
                                "INSERT INTO t_p80499285_psot_realization_pro.production_prescription_violations "
                                "(prescription_id, violation_text, assigned_user_id, assigned_user_fio, "
                                "deadline, status) "
                                "VALUES (%s, %s, %s, %s, DATE(%s) + INTERVAL '30 days', 'in_work') RETURNING id",
                                (prescription_id, violation_text, int(final_user_id), responsible_fio, issue_date)
                            )
                        violation_id = cur.fetchone()[0]
                        
                        # Отправляем уведомление в Telegram
                        print(f'[DEBUG] Checking Telegram for user_id={final_user_id}')
                        cur.execute(
                            "SELECT u.telegram_chat_id, u.telegram_username "
                            "FROM t_p80499285_psot_realization_pro.users u "
                            "WHERE u.id = %s AND u.telegram_chat_id IS NOT NULL",
                            (final_user_id,)
                        )
                        user_tg = cur.fetchone()
                        print(f'[DEBUG] Telegram query result: {user_tg}')
                        
                        # Отправляем уведомление в локальный чат (всегда)
                        notification_title = f"📋 Новое предписание #{doc_number}"
                        notification_message = f"""Предписание производственного контроля

Номер: {doc_number}
Дата: {issue_date}

Нарушение:
{viol_description}

Меры:
{viol_measures}

Срок выполнения: {deadline if deadline else 'не указан'}
Ответственный: {responsible_fio}"""
                        
                        send_notification(cur, final_user_id, notification_title, notification_message, 'production_control')
                        
                        # Отправляем в Telegram (если привязан)
                        if user_tg and user_tg[0]:
                            import urllib.request
                            import urllib.parse
                            
                            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
                            print(f'[DEBUG] Bot token exists: {bool(bot_token)}')
                            if bot_token:
                                telegram_message = f"""🔔 <b>Новое предписание</b>

📋 Номер: {doc_number}
📅 Дата: {issue_date}

⚠️ Нарушение:
{viol_description}

💡 Меры:
{viol_measures}

⏰ Срок: {deadline if deadline else 'не указан'}
👤 Ответственный: {responsible_fio}"""
                                
                                send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                                
                                # Добавляем inline-кнопку "Принято"
                                keyboard = {
                                    'inline_keyboard': [[
                                        {'text': '✅ Принято', 'callback_data': f'accept_pc_{violation_id}'}
                                    ]]
                                }
                                
                                payload = json.dumps({
                                    'chat_id': user_tg[0],
                                    'text': telegram_message,
                                    'parse_mode': 'HTML',
                                    'reply_markup': keyboard
                                }).encode()
                                
                                try:
                                    print(f'[DEBUG] Sending to chat_id={user_tg[0]}')
                                    req = urllib.request.Request(
                                        send_url,
                                        data=payload,
                                        headers={'Content-Type': 'application/json'}
                                    )
                                    urllib.request.urlopen(req, timeout=5)
                                    print(f'[Telegram] Sent notification to user {final_user_id}')
                                except Exception as e:
                                    print(f'[Telegram] Failed to send: {e}')
                            else:
                                print('[DEBUG] Bot token is empty!')
                        else:
                            print(f'[DEBUG] No Telegram for user {final_user_id}')
            
            # Отправка email уведомлений
            admin_email_sent = False
            user_email_sent = False
            responsible_emails_sent = {}
            email_error = None
            
            smtp_host = os.environ.get('SMTP_HOST', 'smtp.yandex.ru')
            smtp_port = os.environ.get('SMTP_PORT', '587')
            smtp_user = os.environ.get('SMTP_USER', 'ACYBT@yandex.ru')
            smtp_password = os.environ.get('SMTP_PASSWORD_NEW') or os.environ.get('YANDEX_SMTP_PASSWORD')
            admin_email = os.environ.get('ADMIN_EMAIL', 'ACYBT@yandex.ru')
            
            # Получаем email пользователя
            user_email = None
            if user_id:
                cur.execute(
                    "SELECT email FROM t_p80499285_psot_realization_pro.users WHERE id = %s",
                    (int(user_id),)
                )
                user_row = cur.fetchone()
                if user_row and user_row[0]:
                    user_email = user_row[0]
            
            # URL для просмотра акта
            pc_url = f"https://otpbru.ru/pc-view/{report_id}"
            
            if smtp_host and smtp_user and smtp_password:
                # Формируем список нарушений для email
                violations_text = ""
                for idx, violation in enumerate(violations, 1):
                    violations_text += f"""\n--- Нарушение №{idx} ---
Описание: {violation.get('description', '')}
Мероприятия: {violation.get('measures', '')}
Срок выполнения: {violation.get('deadline', 'не указан')}
"""
                
                # 1. Отправка администратору
                if admin_email:
                    try:
                        msg = MIMEMultipart()
                        msg['From'] = smtp_user
                        msg['To'] = admin_email
                        msg['Subject'] = f"Новый акт ПК: {doc_number}"
                        
                        email_body = f"""Зарегистрирован новый акт производственного контроля

Номер: {doc_number}
Дата: {doc_date}
Выдающий: {issuer_name}
Подразделение: {department}
Получатель: {recipient_name if recipient_name else 'Не указан'}

Нарушения:{violations_text}

Просмотреть акт: {pc_url}
"""
                        
                        msg.attach(MIMEText(email_body, 'plain', 'utf-8'))
                        
                        server = smtplib.SMTP(smtp_host, int(smtp_port))
                        server.starttls()
                        server.login(smtp_user, smtp_password)
                        server.send_message(msg)
                        server.quit()
                        
                        admin_email_sent = True
                        print(f"Email sent to admin: {admin_email}")
                        
                    except Exception as e:
                        email_error = f"Admin email error: {str(e)}"
                        print(f"Admin email error: {e}")
                
                # 2. Отправка пользователю (создателю акта)
                if user_email:
                    try:
                        msg_user = MIMEMultipart()
                        msg_user['From'] = smtp_user
                        msg_user['To'] = user_email
                        msg_user['Subject'] = f"Ваш акт ПК зарегистрирован: {doc_number}"
                        
                        user_email_body = f"""Ваш акт производственного контроля успешно зарегистрирован

Номер: {doc_number}
Дата: {doc_date}
Подразделение: {department}
Получатель: {recipient_name if recipient_name else 'Не указан'}

Нарушения:{violations_text}

Просмотреть акт: {pc_url}
"""
                        
                        msg_user.attach(MIMEText(user_email_body, 'plain', 'utf-8'))
                        
                        server_user = smtplib.SMTP(smtp_host, int(smtp_port))
                        server_user.starttls()
                        server_user.login(smtp_user, smtp_password)
                        server_user.send_message(msg_user)
                        server_user.quit()
                        
                        user_email_sent = True
                        print(f"Email sent to user: {user_email}")
                        
                    except Exception as e:
                        if email_error:
                            email_error += f"; User email error: {str(e)}"
                        else:
                            email_error = f"User email error: {str(e)}"
                        print(f"User email error: {e}")
                
                # 3. Отправка ответственным лицам
                # Группируем нарушения по ответственным
                responsible_violations = {}
                for violation in violations:
                    responsible_id = violation.get('responsible_user_id')
                    if responsible_id:
                        if responsible_id not in responsible_violations:
                            responsible_violations[responsible_id] = []
                        responsible_violations[responsible_id].append(violation)
                
                for resp_user_id, resp_violations in responsible_violations.items():
                    cur.execute(
                        "SELECT email, fio FROM t_p80499285_psot_realization_pro.users WHERE id = %s",
                        (int(resp_user_id),)
                    )
                    resp_user_row = cur.fetchone()
                    
                    if resp_user_row and resp_user_row[0]:
                        resp_email = resp_user_row[0]
                        resp_fio = resp_user_row[1]
                        
                        # Пропускаем если это админ или создатель акта
                        if resp_email in [admin_email, user_email]:
                            continue
                        
                        try:
                            msg_resp = MIMEMultipart()
                            msg_resp['From'] = smtp_user
                            msg_resp['To'] = resp_email
                            msg_resp['Subject'] = f"Назначено устранение нарушений по акту ПК: {doc_number}"
                            
                            # Формируем список нарушений для конкретного ответственного
                            resp_violations_text = ""
                            for idx, viol in enumerate(resp_violations, 1):
                                resp_violations_text += f"""\n--- Нарушение №{idx} ---
Описание: {viol.get('description', '')}
Мероприятия: {viol.get('measures', '')}
Срок выполнения: {viol.get('deadline', 'не указан')}
"""
                            
                            resp_email_body = f"""Вам назначено устранение нарушений по акту производственного контроля

Номер акта: {doc_number}
Дата: {doc_date}
Выдающий: {issuer_name}
Подразделение: {department}

Ваши нарушения:{resp_violations_text}

Просмотреть акт: {pc_url}
"""
                            
                            msg_resp.attach(MIMEText(resp_email_body, 'plain', 'utf-8'))
                            
                            server_resp = smtplib.SMTP(smtp_host, int(smtp_port))
                            server_resp.starttls()
                            server_resp.login(smtp_user, smtp_password)
                            server_resp.send_message(msg_resp)
                            server_resp.quit()
                            
                            responsible_emails_sent[resp_email] = True
                            print(f"Email sent to responsible: {resp_email}")
                            
                        except Exception as e:
                            responsible_emails_sent[resp_email] = False
                            print(f"Error sending email to responsible {resp_email}: {e}")
            else:
                print("Email credentials not configured")
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'report_id': report_id,
                    'adminEmailSent': admin_email_sent,
                    'userEmailSent': user_email_sent,
                    'userEmail': user_email,
                    'responsibleEmailsSent': responsible_emails_sent,
                    'emailError': email_error
                })
            }
        except Exception as e:
            conn.rollback()
            print(f'Error saving report: {str(e)}')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': str(e)})
            }
        finally:
            cur.close()
            conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }