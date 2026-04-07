import json
import os
import imaplib
import email
from email.header import decode_header
from typing import Dict, Any, List, Optional
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Автоматическая настройка почты и получение входящих писем
    Args: event - HTTP запрос с методом и параметрами
          context - контекст выполнения функции
    Returns: Конфигурация почты или список входящих писем
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # CORS для всех запросов
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
        'Access-Control-Max-Age': '86400'
    }
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': '',
            'isBase64Encoded': False
        }
    
    # Проверяем наличие SMTP настроек
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = os.environ.get('SMTP_PORT')
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    admin_email = os.environ.get('ADMIN_EMAIL')
    
    if not all([smtp_host, smtp_port, smtp_user, smtp_password]):
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': False,
                'error': 'SMTP настройки не сконфигурированы',
                'missing': [
                    k for k, v in {
                        'SMTP_HOST': smtp_host,
                        'SMTP_PORT': smtp_port,
                        'SMTP_USER': smtp_user,
                        'SMTP_PASSWORD': smtp_password
                    }.items() if not v
                ]
            }, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    # GET - получить конфигурацию и входящие письма
    if method == 'GET':
        query_params = event.get('queryStringParameters') or {}
        fetch_emails = query_params.get('fetch_emails') == 'true'
        limit = int(query_params.get('limit', '10'))
        
        # Определяем IMAP настройки на основе SMTP
        imap_config = get_imap_config(smtp_host, smtp_user)
        
        result = {
            'success': True,
            'smtp_configured': True,
            'smtp': {
                'host': smtp_host,
                'port': int(smtp_port),
                'user': smtp_user,
                'secure': int(smtp_port) in [465, 587]
            },
            'imap': imap_config,
            'admin_email': admin_email,
            'inbox': []
        }
        
        # Если запрошено - получаем входящие письма
        if fetch_emails and imap_config['host']:
            try:
                emails = fetch_inbox_emails(
                    imap_config['host'],
                    imap_config['port'],
                    smtp_user,
                    smtp_password,
                    limit
                )
                result['inbox'] = emails
                result['inbox_count'] = len(emails)
            except Exception as e:
                result['inbox_error'] = str(e)
        
        return {
            'statusCode': 200,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps(result, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    # POST - тест подключения к IMAP
    if method == 'POST':
        try:
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action', 'test')
            
            if action == 'test_imap':
                imap_config = get_imap_config(smtp_host, smtp_user)
                
                if not imap_config['host']:
                    return {
                        'statusCode': 200,
                        'headers': {**cors_headers, 'Content-Type': 'application/json'},
                        'body': json.dumps({
                            'success': False,
                            'error': 'Не удалось определить IMAP сервер для вашего провайдера'
                        }, ensure_ascii=False),
                        'isBase64Encoded': False
                    }
                
                # Тестируем подключение
                mail = imaplib.IMAP4_SSL(imap_config['host'], imap_config['port'])
                mail.login(smtp_user, smtp_password)
                mail.select('inbox')
                
                # Получаем количество писем
                status, messages = mail.search(None, 'ALL')
                email_ids = messages[0].split()
                total_emails = len(email_ids)
                
                # Получаем непрочитанные
                status, unread = mail.search(None, 'UNSEEN')
                unread_count = len(unread[0].split())
                
                mail.logout()
                
                return {
                    'statusCode': 200,
                    'headers': {**cors_headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'success': True,
                        'connected': True,
                        'imap': imap_config,
                        'stats': {
                            'total': total_emails,
                            'unread': unread_count
                        }
                    }, ensure_ascii=False),
                    'isBase64Encoded': False
                }
                
        except Exception as e:
            return {
                'statusCode': 200,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': False,
                    'error': f'Ошибка подключения к IMAP: {str(e)}'
                }, ensure_ascii=False),
                'isBase64Encoded': False
            }
    
    return {
        'statusCode': 405,
        'headers': {**cors_headers, 'Content-Type': 'application/json'},
        'body': json.dumps({'error': 'Метод не поддерживается'}, ensure_ascii=False),
        'isBase64Encoded': False
    }


def get_imap_config(smtp_host: str, email: str) -> Dict[str, Any]:
    '''Определяет IMAP настройки на основе SMTP сервера'''
    
    # Популярные провайдеры
    providers = {
        'smtp.yandex.ru': {'host': 'imap.yandex.ru', 'port': 993},
        'smtp.gmail.com': {'host': 'imap.gmail.com', 'port': 993},
        'smtp.mail.ru': {'host': 'imap.mail.ru', 'port': 993},
        'smtp-mail.outlook.com': {'host': 'outlook.office365.com', 'port': 993},
        'smtp.office365.com': {'host': 'outlook.office365.com', 'port': 993},
    }
    
    if smtp_host in providers:
        return providers[smtp_host]
    
    # Пытаемся угадать по домену email
    domain = email.split('@')[-1] if '@' in email else ''
    
    common_patterns = [
        f'imap.{domain}',
        f'mail.{domain}',
    ]
    
    # Возвращаем первый паттерн как предположение
    return {
        'host': common_patterns[0] if domain else '',
        'port': 993
    }


def fetch_inbox_emails(imap_host: str, imap_port: int, username: str, 
                       password: str, limit: int = 10) -> List[Dict[str, Any]]:
    '''Получает последние письма из почтового ящика'''
    
    emails = []
    
    try:
        # Подключаемся к IMAP
        mail = imaplib.IMAP4_SSL(imap_host, imap_port)
        mail.login(username, password)
        mail.select('inbox')
        
        # Ищем все письма
        status, messages = mail.search(None, 'ALL')
        email_ids = messages[0].split()
        
        # Берем последние N писем
        recent_ids = email_ids[-limit:] if len(email_ids) > limit else email_ids
        recent_ids.reverse()  # От новых к старым
        
        for email_id in recent_ids:
            try:
                # Получаем письмо
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                
                if status != 'OK':
                    continue
                
                # Парсим письмо
                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)
                
                # Декодируем тему
                subject = decode_mime_words(msg.get('Subject', ''))
                
                # Получаем отправителя
                from_header = msg.get('From', '')
                sender = parse_email_address(from_header)
                
                # Дата
                date_str = msg.get('Date', '')
                
                # Получаем текст письма
                body = get_email_body(msg)
                
                # Флаги (прочитано/непрочитано)
                status, flag_data = mail.fetch(email_id, '(FLAGS)')
                flags = flag_data[0].decode() if flag_data else ''
                is_read = '\\Seen' in flags
                
                emails.append({
                    'id': email_id.decode(),
                    'subject': subject,
                    'from': sender,
                    'date': date_str,
                    'preview': body[:200] if body else '',
                    'is_read': is_read,
                    'has_attachments': msg.get_content_type() == 'multipart/mixed'
                })
                
            except Exception as e:
                # Пропускаем проблемные письма
                continue
        
        mail.logout()
        
    except Exception as e:
        raise Exception(f'Не удалось получить письма: {str(e)}')
    
    return emails


def decode_mime_words(s: str) -> str:
    '''Декодирует MIME-encoded слова'''
    if not s:
        return ''
    
    decoded_parts = []
    for word, encoding in decode_header(s):
        if isinstance(word, bytes):
            try:
                decoded_parts.append(word.decode(encoding or 'utf-8'))
            except:
                decoded_parts.append(word.decode('utf-8', errors='ignore'))
        else:
            decoded_parts.append(word)
    
    return ''.join(decoded_parts)


def parse_email_address(from_header: str) -> str:
    '''Извлекает email адрес из заголовка From'''
    if '<' in from_header and '>' in from_header:
        start = from_header.index('<') + 1
        end = from_header.index('>')
        return from_header[start:end]
    return from_header


def get_email_body(msg) -> str:
    '''Извлекает текст письма'''
    body = ''
    
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            
            if content_type == 'text/plain':
                try:
                    payload = part.get_payload(decode=True)
                    charset = part.get_content_charset() or 'utf-8'
                    body = payload.decode(charset, errors='ignore')
                    break
                except:
                    continue
    else:
        try:
            payload = msg.get_payload(decode=True)
            charset = msg.get_content_charset() or 'utf-8'
            body = payload.decode(charset, errors='ignore')
        except:
            body = ''
    
    return body.strip()
