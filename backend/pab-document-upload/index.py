import json
import os
import boto3
import base64
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загружает документ ПАБ в облачное хранилище
    Args: event - dict с body (base64 encoded multipart/form-data)
    Returns: HTTP response с URL загруженного файла
    '''
    method: str = event.get('httpMethod', 'POST')
    
    # Handle CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
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
    
    # Парсим body (ожидаем JSON с base64 файлом)
    try:
        body = event.get('body', '')
        is_base64 = event.get('isBase64Encoded', False)
        
        if is_base64:
            body = base64.b64decode(body).decode('utf-8')
        
        data = json.loads(body)
        
        doc_number = data.get('doc_number', '').strip()
        file_base64 = data.get('file')
        file_name = data.get('file_name', '')
        
        if not doc_number or not file_base64:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Не указан номер документа или файл'}),
                'isBase64Encoded': False
            }
        
        # Определяем расширение файла
        file_ext = '.pdf'
        if file_name:
            if '.' in file_name:
                file_ext = '.' + file_name.split('.')[-1].lower()
        
        # Декодируем base64 файл
        file_data = base64.b64decode(file_base64)
        
        # Инициализация S3
        s3 = boto3.client('s3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        
        # Определяем Content-Type
        content_type = 'application/pdf'
        if file_ext in ['.doc', '.docx']:
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif file_ext in ['.xls', '.xlsx']:
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        # Загружаем файл
        key = f'pab-documents/{doc_number}{file_ext}'
        s3.put_object(
            Bucket='files',
            Key=key,
            Body=file_data,
            ContentType=content_type
        )
        
        # Формируем CDN URL
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'file_url': cdn_url,
                'doc_number': doc_number,
                'message': 'Документ успешно загружен'
            }),
            'isBase64Encoded': False
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Неверный формат данных'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Ошибка загрузки файла: {str(e)}'}),
            'isBase64Encoded': False
        }
