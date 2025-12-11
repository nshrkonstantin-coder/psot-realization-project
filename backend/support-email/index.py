import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Отправка запросов техподдержки на email администратора
    Args: event - dict с httpMethod, body (requestType, description, userFio, userCompany, userEmail, userId)
          context - object с атрибутами: request_id, function_name
    Returns: HTTP response dict
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
            'body': '',
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        
        request_type = body_data.get('requestType', 'problem')
        description = body_data.get('description', '')
        user_fio = body_data.get('userFio', 'Неизвестный пользователь')
        user_company = body_data.get('userCompany', 'Не указана')
        user_email = body_data.get('userEmail', 'Не указан')
        user_id = body_data.get('userId', 'Не указан')
        
        if not description.strip():
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'Описание запроса обязательно'})
            }
        
        request_types = {
            'problem': 'Проблема в работе',
            'recommendation': 'Рекомендация',
            'new_feature': 'Заказать новый блок'
        }
        
        request_type_label = request_types.get(request_type, 'Неизвестный тип')
        
        email_body = f"""
Новый запрос в техническую поддержку АСУБТ

Пользователь: {user_fio}
Предприятие: {user_company}
Email: {user_email}
ID пользователя: {user_id}

Тип запроса: {request_type_label}

Описание:
{description}

Дата: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}
"""
        
        try:
            smtp_host = os.environ.get('SMTP_HOST')
            smtp_port = int(os.environ.get('SMTP_PORT', 465))
            smtp_user = os.environ.get('SMTP_USER')
            smtp_password = os.environ.get('SMTP_PASSWORD')
            admin_email = 'ACYBT@yandex.ru'
            
            if not all([smtp_host, smtp_user, smtp_password]):
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'SMTP не настроен'})
                }
            
            msg = MIMEMultipart()
            msg['From'] = smtp_user
            msg['To'] = admin_email
            msg['Subject'] = f'АСУБТ - {request_type_label} от {user_fio}'
            
            msg.attach(MIMEText(email_body, 'plain', 'utf-8'))
            
            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(smtp_host, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'message': 'Запрос отправлен'})
            }
            
        except Exception as e:
            print(f'Email sending error: {str(e)}')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': f'Ошибка отправки: {str(e)}'})
            }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }