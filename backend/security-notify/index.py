import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any

CORS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Отправка email-уведомлений безопасности: новое устройство, подозрительный вход
    '''
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }, 'body': ''}

    body = json.loads(event.get('body', '{}'))
    recipient = body.get('email', '')
    subject = body.get('subject', 'Уведомление безопасности — АСУБТ')
    html_content = body.get('html_content', '')

    if not recipient or not html_content:
        return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'email и html_content обязательны'})}

    smtp_host = os.environ.get('SMTP_HOST', 'smtp.yandex.ru')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASSWORD_NEW') or os.environ.get('YANDEX_SMTP_PASSWORD') or os.environ.get('SMTP_PASSWORD', '')

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'АСУБТ Безопасность <{smtp_user}>'
    msg['To'] = recipient
    msg.attach(MIMEText(html_content, 'html', 'utf-8'))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [recipient], msg.as_string())
        print(f'[SECURITY-NOTIFY] Sent to {recipient}: {subject}')
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                'body': json.dumps({'success': True})}
    except Exception as e:
        print(f'[SECURITY-NOTIFY] SMTP error: {e}')
        return {'statusCode': 500, 'headers': CORS, 'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': str(e)})}
