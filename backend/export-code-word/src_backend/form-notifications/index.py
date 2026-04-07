import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Отправка уведомлений при сохранении форм: в чат ответственным + на email администратору
    Обновлено: 12.12.2024 - новый пароль SMTP
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
        try:
            import psycopg2
            
            body_data = json.loads(event.get('body', '{}'))
            
            form_type = body_data.get('form_type')  # 'production_control', 'kbt', 'pab'
            form_data = body_data.get('form_data', {})
            responsible_user_ids = body_data.get('responsible_user_ids', [])
            report_id = body_data.get('report_id')
            doc_number = body_data.get('doc_number', '')
            organization_id = body_data.get('organization_id')
            word_file_url = body_data.get('word_file_url', '')
            
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            
            # Получаем информацию об организации
            org_name = ''
            if organization_id:
                cur.execute(f"SELECT name FROM t_p80499285_psot_realization_pro.organizations WHERE id = {organization_id}")
                org_result = cur.fetchone()
                if org_result:
                    org_name = org_result[0]
            
            # Формируем текст уведомления в зависимости от типа формы
            notification_text = ''
            email_subject = ''
            email_body = ''
            
            if form_type == 'production_control':
                notification_text = f"📋 Новое Предписание ЭПК №{doc_number}\n\n"
                notification_text += f"Подразделение: {form_data.get('department', 'Не указано')}\n"
                notification_text += f"Кому: {form_data.get('recipient_name', 'Не указано')}\n"
                notification_text += f"Выдал: {form_data.get('issuer_name', 'Не указано')}\n"
                notification_text += f"\n✅ Сохранено в базе данных (ID: {report_id})\n"
                notification_text += f"📁 Документ в папке ЭПК\n"
                
                email_subject = f"Новое Предписание ЭПК №{doc_number} - {org_name}"
                word_file_link = f'<p><a href="{word_file_url}" target="_blank" style="display: inline-block; background-color: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">📄 Открыть Word документ</a></p>' if word_file_url else ''
                email_body = f"""
<html>
<body style="font-family: Arial, sans-serif;">
    <h2 style="color: #d97706;">📋 Новое Предписание производственного контроля</h2>
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Номер документа:</strong> {doc_number}</p>
        <p><strong>Организация:</strong> {org_name}</p>
        <p><strong>Подразделение:</strong> {form_data.get('department', 'Не указано')}</p>
        <p><strong>Получатель:</strong> {form_data.get('recipient_name', 'Не указано')}</p>
        <p><strong>Выдал:</strong> {form_data.get('issuer_name', 'Не указано')}, {form_data.get('issuer_position', '')}</p>
        <p><strong>Дата выдачи:</strong> {form_data.get('issue_date', '')}</p>
    </div>
    <p><strong>ID записи в базе данных:</strong> {report_id}</p>
    <p><strong>Место хранения:</strong> База данных + папка "ЭПК" в Хранилище</p>
    {word_file_link}
    <hr style="margin: 20px 0;">
    <p style="color: #6b7280; font-size: 12px;">Автоматическое уведомление из системы АСУБТ</p>
</body>
</html>
"""
            
            elif form_type == 'kbt':
                notification_text = f"📊 Новый отчёт КБТ\n\n"
                notification_text += f"Подразделение: {form_data.get('department', 'Не указано')}\n"
                notification_text += f"Руководитель: {form_data.get('head_name', 'Не указано')}\n"
                notification_text += f"Период: {form_data.get('period_from', '')} - {form_data.get('period_to', '')}\n"
                notification_text += f"\n✅ Сохранено в базе данных (ID: {report_id})\n"
                notification_text += f"📁 Документ в папке КБТ\n"
                
                email_subject = f"Новый отчёт КБТ - {form_data.get('department', 'Не указано')} - {org_name}"
                email_body = f"""
<html>
<body style="font-family: Arial, sans-serif;">
    <h2 style="color: #059669;">📊 Новый отчёт КБТ</h2>
    <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Организация:</strong> {org_name}</p>
        <p><strong>Подразделение:</strong> {form_data.get('department', 'Не указано')}</p>
        <p><strong>Руководитель:</strong> {form_data.get('head_name', 'Не указано')}</p>
        <p><strong>Отчётный период:</strong> {form_data.get('period_from', '')} - {form_data.get('period_to', '')}</p>
    </div>
    <div style="margin: 20px 0;">
        <h3>Краткая статистика:</h3>
        <ul>
            <li>Заболевших: {form_data.get('sick_count', '0')} чел.</li>
            <li>Травм: {form_data.get('injuries', 'Не указано')}</li>
            <li>Выдано АКТов: {form_data.get('acts_count', '0')}</li>
            <li>Выдано нарушений: {form_data.get('violations_count', '0')}</li>
        </ul>
    </div>
    <p><strong>ID записи в базе данных:</strong> {report_id}</p>
    <p><strong>Место хранения:</strong> База данных + папка "КБТ" в Хранилище</p>
    <hr style="margin: 20px 0;">
    <p style="color: #6b7280; font-size: 12px;">Автоматическое уведомление из системы АСУБТ</p>
</body>
</html>
"""
            
            elif form_type == 'pab':
                notification_text = f"🔍 Новая карта ПАБ №{doc_number}\n\n"
                notification_text += f"Наблюдатель: {form_data.get('observer_name', 'Не указано')}\n"
                notification_text += f"Подразделение: {form_data.get('department', 'Не указано')}\n"
                notification_text += f"Наблюдаемый: {form_data.get('observed_name', 'Не указано')}\n"
                notification_text += f"\n✅ Сохранено в базе данных (ID: {report_id})\n"
                
                email_subject = f"Новая карта ПАБ №{doc_number} - {org_name}"
                email_body = f"""
<html>
<body style="font-family: Arial, sans-serif;">
    <h2 style="color: #2563eb;">🔍 Новая карта Поведенческого Аудита Безопасности</h2>
    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Номер карты:</strong> {doc_number}</p>
        <p><strong>Организация:</strong> {org_name}</p>
        <p><strong>Наблюдатель:</strong> {form_data.get('observer_name', 'Не указано')}</p>
        <p><strong>Подразделение:</strong> {form_data.get('department', 'Не указано')}</p>
        <p><strong>Наблюдаемый работник:</strong> {form_data.get('observed_name', 'Не указано')}</p>
        <p><strong>Дата наблюдения:</strong> {form_data.get('observation_date', '')}</p>
    </div>
    <p><strong>ID записи в базе данных:</strong> {report_id}</p>
    <hr style="margin: 20px 0;">
    <p style="color: #6b7280; font-size: 12px;">Автоматическое уведомление из системы АСУБТ</p>
</body>
</html>
"""
            
            # 1. Получаем ID администратора (ID=1)
            admin_id = 1
            
            # 2. Отправляем уведомления в чат ответственным + администратору
            chat_notifications_sent = 0
            notification_escaped = notification_text.replace("'", "''")
            
            # Отправляем администратору (ID=1)
            try:
                cur.execute(f"""
                    INSERT INTO t_p80499285_psot_realization_pro.system_notifications 
                    (user_id, notification_type, severity, title, message, created_at, is_read)
                    VALUES ({admin_id}, 'form_saved', 'info', 'Новое уведомление', '{notification_escaped}', NOW(), false)
                """)
                chat_notifications_sent += 1
                print(f"Notification sent to admin (ID: {admin_id})")
            except Exception as e:
                print(f"Error sending notification to admin: {str(e)}")
            
            # Отправляем ответственным (проверяем, что user_id существует)
            for user_id in responsible_user_ids:
                try:
                    # Проверяем существование пользователя
                    cur.execute(f"SELECT id FROM t_p80499285_psot_realization_pro.users WHERE id = {user_id}")
                    user_exists = cur.fetchone()
                    
                    if user_exists:
                        cur.execute(f"""
                            INSERT INTO t_p80499285_psot_realization_pro.system_notifications 
                            (user_id, notification_type, severity, title, message, created_at, is_read)
                            VALUES ({user_id}, 'form_saved', 'info', 'Новое уведомление', '{notification_escaped}', NOW(), false)
                        """)
                        chat_notifications_sent += 1
                        print(f"Notification sent to user {user_id}")
                    else:
                        print(f"User {user_id} does not exist, skipping notification")
                except Exception as e:
                    print(f"Error sending chat notification to user {user_id}: {str(e)}")
            
            conn.commit()
            
            # 2. Получаем email-адреса ответственных и администратора
            email_recipients = []
            admin_email = 'ACYBT@yandex.ru'
            email_recipients.append(admin_email)
            
            # Получаем email ответственных лиц
            for user_id in responsible_user_ids:
                try:
                    cur.execute(f"SELECT email FROM t_p80499285_psot_realization_pro.users WHERE id = {user_id}")
                    user_email = cur.fetchone()
                    if user_email and user_email[0]:
                        email_recipients.append(user_email[0])
                        print(f"Added responsible user email: {user_email[0]}")
                except Exception as e:
                    print(f"Error fetching email for user {user_id}: {str(e)}")
            
            # 3. Отправляем email всем получателям
            email_sent = False
            emails_sent_to = []
            
            try:
                smtp_host = 'smtp.yandex.ru'
                smtp_port = 587
                smtp_user = 'bezop.truda@yandex.ru'
                smtp_password = 'yposmisntfvbuemf'
                
                print(f"SMTP Config: host={smtp_host}, port={smtp_port}, user={smtp_user}, has_password={bool(smtp_password)}")
                print(f"Email recipients: {email_recipients}")
                
                if all([smtp_host, smtp_user, smtp_password]):
                    for recipient_email in email_recipients:
                        try:
                            msg = MIMEMultipart('alternative')
                            msg['From'] = smtp_user
                            msg['To'] = recipient_email
                            msg['Subject'] = email_subject
                            
                            html_part = MIMEText(email_body, 'html')
                            msg.attach(html_part)
                            
                            with smtplib.SMTP(smtp_host, smtp_port) as server:
                                server.starttls()
                                server.login(smtp_user, smtp_password)
                                server.send_message(msg)
                            
                            emails_sent_to.append(recipient_email)
                            print(f"Email sent to: {recipient_email}")
                        except Exception as e:
                            print(f"Error sending email to {recipient_email}: {str(e)}")
                    
                    email_sent = len(emails_sent_to) > 0
                else:
                    print("SMTP credentials not configured (one or more missing)")
            except smtplib.SMTPAuthenticationError as e:
                print(f"SMTP Authentication Error: {str(e)}")
                print(f"Please check SMTP_USER and SMTP_PASSWORD in project secrets")
            except Exception as e:
                print(f"Error sending email: {str(e)}")
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'chat_notifications_sent': chat_notifications_sent,
                    'email_sent': email_sent,
                    'emails_sent_to': emails_sent_to
                })
            }
            
        except Exception as e:
            print(f"Error in form-notifications: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': str(e)})
            }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
