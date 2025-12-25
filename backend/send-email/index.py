"""
Backend функция для отправки email-уведомлений с детальной отчетностью
Возвращает статус каждой отправки: успех/ошибка с причиной
"""
import json
import os
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class EmailResult:
    """Результат отправки email"""
    email: str
    success: bool
    message: str
    is_valid_format: bool


def validate_email(email: str) -> bool:
    """Проверка валидности формата email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


def send_single_email(
    smtp_connection,
    from_email: str,
    to_email: str,
    subject: str,
    html_content: str
) -> EmailResult:
    """Отправка одного email с детальной обработкой ошибок"""
    
    # Проверка формата email
    if not validate_email(to_email):
        return EmailResult(
            email=to_email,
            success=False,
            message="Неверный формат email адреса",
            is_valid_format=False
        )
    
    try:
        # Создание письма
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = to_email
        
        # Добавление HTML контента
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)
        
        # Отправка
        smtp_connection.send_message(msg)
        
        return EmailResult(
            email=to_email,
            success=True,
            message="Письмо успешно отправлено",
            is_valid_format=True
        )
        
    except smtplib.SMTPRecipientsRefused as e:
        return EmailResult(
            email=to_email,
            success=False,
            message=f"Email отклонен сервером: возможно адрес не существует",
            is_valid_format=True
        )
    except smtplib.SMTPDataError as e:
        return EmailResult(
            email=to_email,
            success=False,
            message=f"Ошибка передачи данных: {str(e)}",
            is_valid_format=True
        )
    except Exception as e:
        return EmailResult(
            email=to_email,
            success=False,
            message=f"Ошибка отправки: {str(e)}",
            is_valid_format=True
        )


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Отправка email-уведомлений с детальной отчетностью
    
    Body параметры:
    - recipients: List[str] - список email адресов получателей
    - subject: str - тема письма
    - html_content: str - HTML содержимое письма
    - sender_name: str (optional) - имя отправителя
    """
    
    method = event.get('httpMethod', 'POST')
    
    # CORS
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
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Только POST запросы'}),
            'isBase64Encoded': False
        }
    
    # Получение конфигурации SMTP
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER')
    # Используем новый пароль приложения Яндекс.Почты
    smtp_password = os.environ.get('SMTP_PASSWORD_NEW') or os.environ.get('YANDEX_SMTP_PASSWORD') or os.environ.get('SMTP_PASSWORD')
    
    if not all([smtp_host, smtp_user, smtp_password]):
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'SMTP не настроен',
                'details': 'Отсутствуют необходимые переменные окружения'
            }),
            'isBase64Encoded': False
        }
    
    # Парсинг запроса
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Неверный формат JSON'}),
            'isBase64Encoded': False
        }
    
    recipients = body.get('recipients', [])
    subject = body.get('subject', 'Уведомление АСУБТ')
    html_content = body.get('html_content', '')
    sender_name = body.get('sender_name', 'АСУБТ')
    
    if not recipients:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Не указаны получатели'}),
            'isBase64Encoded': False
        }
    
    if not html_content:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Не указано содержимое письма'}),
            'isBase64Encoded': False
        }
    
    # Формирование email отправителя
    from_email = f"{sender_name} <{smtp_user}>"
    
    # Отправка писем
    results: List[Dict[str, Any]] = []
    smtp_connection = None
    
    try:
        # Подключение к SMTP серверу
        smtp_connection = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
        smtp_connection.ehlo()
        
        # Используем STARTTLS для порта 587
        if smtp_port == 587:
            smtp_connection.starttls()
            smtp_connection.ehlo()
        
        smtp_connection.login(smtp_user, smtp_password)
        
        # Отправка каждому получателю
        for recipient in recipients:
            result = send_single_email(
                smtp_connection,
                smtp_user,
                recipient.strip(),
                subject,
                html_content
            )
            
            results.append({
                'email': result.email,
                'success': result.success,
                'message': result.message,
                'valid_format': result.is_valid_format
            })
        
    except smtplib.SMTPAuthenticationError:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Ошибка аутентификации SMTP',
                'details': 'Проверьте SMTP_USER и SMTP_PASSWORD',
                'results': []
            }),
            'isBase64Encoded': False
        }
    except smtplib.SMTPConnectError:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Не удалось подключиться к SMTP серверу',
                'details': f'Проверьте SMTP_HOST ({smtp_host}) и SMTP_PORT ({smtp_port})',
                'results': []
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Ошибка отправки',
                'details': str(e),
                'results': results
            }),
            'isBase64Encoded': False
        }
    finally:
        if smtp_connection:
            try:
                smtp_connection.quit()
            except:
                pass
    
    # Подсчет статистики
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'success': True,
            'total': len(results),
            'sent': len(successful),
            'failed': len(failed),
            'results': results,
            'summary': {
                'sent_to': [r['email'] for r in successful],
                'failed_to': [{'email': r['email'], 'reason': r['message']} for r in failed]
            }
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }