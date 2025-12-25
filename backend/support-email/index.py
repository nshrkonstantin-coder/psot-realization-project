import json
import os
import smtplib
import base64
import boto3
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from datetime import datetime
import uuid

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Отправка запросов техподдержки на email администратора с поддержкой загрузки файлов
    Args: event - dict с httpMethod, body (action, requestType, description, userFio, userCompany, userEmail, userId, attachments OR fileName, fileData, fileType)
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
        action = body_data.get('action', 'send_request')
        
        # Загрузка файла в S3
        if action == 'upload_file':
            try:
                file_name = body_data.get('fileName', '')
                file_data = body_data.get('fileData', '')
                file_type = body_data.get('fileType', 'application/octet-stream')
                
                if not file_name or not file_data:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Отсутствуют данные файла'})
                    }
                
                # Декодируем base64
                file_bytes = base64.b64decode(file_data)
                
                # Генерируем уникальное имя файла
                file_ext = os.path.splitext(file_name)[1]
                unique_name = f"support/{uuid.uuid4()}{file_ext}"
                
                # Загружаем в S3
                s3 = boto3.client('s3',
                    endpoint_url='https://bucket.poehali.dev',
                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                )
                
                s3.put_object(
                    Bucket='files',
                    Key=unique_name,
                    Body=file_bytes,
                    ContentType=file_type
                )
                
                # Генерируем CDN URL
                cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{unique_name}"
                
                print(f'File uploaded: {file_name} -> {cdn_url}')
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'success': True,
                        'fileUrl': cdn_url,
                        'fileName': file_name
                    })
                }
                
            except Exception as e:
                print(f'File upload error: {str(e)}')
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': f'Ошибка загрузки файла: {str(e)}'})
                }
        
        # Отправка запроса техподдержки
        request_type = body_data.get('requestType', 'problem')
        description = body_data.get('description', '')
        user_fio = body_data.get('userFio', 'Неизвестный пользователь')
        user_company = body_data.get('userCompany', 'Не указана')
        user_email = body_data.get('userEmail', 'Не указан')
        user_id = body_data.get('userId', 'Не указан')
        attachments = body_data.get('attachments', [])
        
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
        
        attachments_text = ''
        if attachments:
            attachments_text = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nПРИКРЕПЛЕННЫЕ ФАЙЛЫ:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
            for idx, att in enumerate(attachments, 1):
                file_size_kb = att.get('size', 0) / 1024
                attachments_text += f"📎 Файл {idx}: {att.get('name', 'Файл')}\n   Размер: {file_size_kb:.1f} КБ\n   Ссылка: {att.get('url', '')}\n\n"
        
        email_body = f"""
╔═══════════════════════════════════════════════════════╗
║     НОВЫЙ ЗАПРОС В ТЕХНИЧЕСКУЮ ПОДДЕРЖКУ АСУБТ        ║
╚═══════════════════════════════════════════════════════╝

👤 ИНФОРМАЦИЯ ОБ ОТПРАВИТЕЛЕ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ФИО: {user_fio}
Предприятие: {user_company}
Email отправителя: {user_email}
ID пользователя: {user_id}

📋 ТИП ЗАПРОСА: {request_type_label}

📝 ОПИСАНИЕ ЗАПРОСА:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{description}
{attachments_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Дата отправки: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}

💡 Для ответа отправителю просто нажмите "Ответить" в вашем почтовом клиенте.
"""
        
        try:
            smtp_host = os.environ.get('SMTP_HOST_NEW', 'smtp.yandex.ru')
            smtp_port = int(os.environ.get('SMTP_PORT_NEW', 587))
            smtp_user = os.environ.get('SMTP_USER_NEW', 'ACYBT@yandex.ru')
            smtp_password = os.environ.get('SMTP_PASSWORD_NEW')
            admin_email = 'bezop.truda@yandex.ru'
            
            print(f'SMTP config: host={smtp_host}, port={smtp_port}, user={smtp_user}, pass_len={len(smtp_password) if smtp_password else 0}')
            
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
            
            # Добавляем Reply-To для возможности ответа отправителю
            if user_email and user_email != 'Не указан' and '@' in user_email:
                msg['Reply-To'] = user_email
                print(f'Reply-To set to: {user_email}')
            else:
                print(f'Warning: Invalid user_email: {user_email}')
            
            msg.attach(MIMEText(email_body, 'plain', 'utf-8'))
            
            print(f'Connecting to SMTP...')
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                print(f'Starting TLS...')
                server.starttls()
                print(f'Logging in...')
                server.login(smtp_user, smtp_password)
                print(f'Sending message to {admin_email}...')
                server.send_message(msg)
                print(f'Email sent successfully!')
            
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