import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Отправка email с формой ПАБ ответственному и администратору
    Args: event - dict с httpMethod, body
          context - object с request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    
    doc_number = body_data.get('doc_number', '')
    responsible_email = body_data.get('responsible_email', '')
    admin_email = body_data.get('admin_email', '')
    html_url = body_data.get('html_url', '')
    
    smtp_server = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_password = os.environ.get('SMTP_PASSWORD', '')
    
    if not all([smtp_user, smtp_password, doc_number, html_url]):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing required parameters: smtp or doc_number or html_url'}),
            'isBase64Encoded': False
        }
    
    recipients = [email for email in [responsible_email, admin_email] if email]
    
    if not recipients:
        admin_email_fallback = os.environ.get('ADMIN_EMAIL', '')
        if admin_email_fallback:
            recipients = [admin_email_fallback]
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No recipients provided and no ADMIN_EMAIL configured'}),
                'isBase64Encoded': False
            }
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'Регистрация ПАБ №{doc_number}'
    msg['From'] = smtp_user
    msg['To'] = ', '.join(recipients)
    
    html_body = f'''
    <html>
      <head></head>
      <body>
        <h2>Новая регистрация ПАБ №{doc_number}</h2>
        <p>Была создана новая форма регистрации ПАБ.</p>
        <p><a href="{html_url}">Открыть форму ПАБ №{doc_number}</a></p>
        <p>Вы можете открыть, распечатать или сохранить форму в PDF.</p>
      </body>
    </html>
    '''
    
    part = MIMEText(html_body, 'html')
    msg.attach(part)
    
    try:
        print(f'[PAB EMAIL] Connecting to {smtp_server}:{smtp_port}')
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.starttls()
        print(f'[PAB EMAIL] Logging in as {smtp_user}')
        server.login(smtp_user, smtp_password)
        print(f'[PAB EMAIL] Sending email to {recipients}')
        server.send_message(msg)
        server.quit()
        print(f'[PAB EMAIL] Email sent successfully to {recipients}')
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True, 
                'message': 'Email sent successfully',
                'recipients': recipients,
                'doc_number': doc_number
            }),
            'isBase64Encoded': False
        }
    except smtplib.SMTPAuthenticationError as e:
        print(f'[PAB EMAIL] Authentication error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'error': 'SMTP authentication failed',
                'details': 'Check SMTP_USER and SMTP_PASSWORD configuration'
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f'[PAB EMAIL] Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }