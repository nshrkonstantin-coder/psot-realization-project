import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List
from pydantic import BaseModel, Field, EmailStr


class UserCredentials(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class SendCredentialsRequest(BaseModel):
    users: List[UserCredentials]
    loginUrl: str = Field(default='')


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Отправляет учётные данные (email и пароль) выбранным пользователям на их почту
    Использует SMTP Яндекс.Почты для отправки писем
    '''
    method: str = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }

    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }

    try:
        body_data = json.loads(event.get('body', '{}'))
        request_data = SendCredentialsRequest(**body_data)
        login_url = request_data.loginUrl or ''

        smtp_host = os.environ.get('SMTP_HOST_NEW', 'smtp.yandex.ru')
        smtp_port = int(os.environ.get('SMTP_PORT_NEW', 587))
        smtp_user = os.environ.get('SMTP_USER_NEW', 'ACYBT@yandex.ru')
        smtp_password = os.environ.get('SMTP_PASSWORD_NEW')

        if not smtp_user or not smtp_password:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'SMTP credentials not configured'}),
                'isBase64Encoded': False
            }

        sent_count = 0
        failed_emails = []
        
        print(f'[INFO] Starting to send credentials to {len(request_data.users)} users')
        print(f'[INFO] SMTP config: host={smtp_host}, port={smtp_port}, user={smtp_user}')

        for user_cred in request_data.users:
            try:
                print(f'[INFO] Preparing email for {user_cred.email}')
                msg = MIMEMultipart('alternative')
                msg['Subject'] = 'Ваши учётные данные для доступа к системе'
                msg['From'] = smtp_user
                msg['To'] = user_cred.email

                login_link_html = f'<p style="margin: 5px 0;"><strong>Ссылка для входа/регистрации:</strong> <a href="{login_url}" style="color: #2563eb;">{login_url}</a></p>' if login_url else ''
                
                html_body = f'''
                <html>
                  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                      <h2 style="color: #2563eb;">Доступ к системе</h2>
                      <p>Здравствуйте!</p>
                      <p>Вам предоставлен доступ к системе. Ваши учётные данные:</p>
                      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Email:</strong> {user_cred.email}</p>
                        <p style="margin: 5px 0;"><strong>Пароль:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 3px;">{user_cred.password}</code></p>
                        {login_link_html}
                      </div>
                      <p>Для входа необходимо ввести эти данные, после входа сможете при необходимости поменять пароль.</p>
                      <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">Если вы не регистрировались в системе, проигнорируйте это письмо.</p>
                    </div>
                  </body>
                </html>
                '''

                login_link_text = f'\nСсылка для входа/регистрации: {login_url}\n' if login_url else ''
                
                text_body = f'''
Доступ к системе

Здравствуйте!

Вам предоставлен доступ к системе. Ваши учётные данные:

Email: {user_cred.email}
Пароль: {user_cred.password}{login_link_text}
Для входа необходимо ввести эти данные, после входа сможете при необходимости поменять пароль.

Если вы не регистрировались в системе, проигнорируйте это письмо.
                '''

                part_text = MIMEText(text_body, 'plain', 'utf-8')
                part_html = MIMEText(html_body, 'html', 'utf-8')
                msg.attach(part_text)
                msg.attach(part_html)

                print(f'[INFO] Connecting to SMTP server for {user_cred.email}')
                with smtplib.SMTP(smtp_host, smtp_port) as server:
                    server.starttls()
                    print(f'[INFO] Logging in to SMTP...')
                    server.login(smtp_user, smtp_password)
                    print(f'[INFO] Sending message to {user_cred.email}')
                    server.send_message(msg)
                    print(f'[SUCCESS] Email sent to {user_cred.email}')

                sent_count += 1

            except Exception as email_error:
                print(f'[ERROR] Failed to send email to {user_cred.email}: {str(email_error)}')
                failed_emails.append({'email': user_cred.email, 'error': str(email_error)})

        response_data = {
            'success': True,
            'sent_count': sent_count,
            'total_count': len(request_data.users),
            'failed_emails': failed_emails
        }
        
        print(f'[INFO] Finished: sent={sent_count}, failed={len(failed_emails)}')

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response_data),
            'isBase64Encoded': False
        }

    except Exception as error:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(error)}),
            'isBase64Encoded': False
        }