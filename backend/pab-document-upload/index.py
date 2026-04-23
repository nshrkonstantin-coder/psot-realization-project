import json
import os
import boto3
import base64
from botocore.client import Config
from typing import Dict, Any

YA_ENDPOINT = 'https://storage.yandexcloud.net'

def get_s3():
    return boto3.client('s3',
        endpoint_url=YA_ENDPOINT,
        aws_access_key_id=os.environ['YA_S3_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['YA_S3_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
        region_name='ru-central1'
    )

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загружает документ ПАБ в Яндекс Object Storage
    POST: body JSON с полями doc_number, file (base64), file_name
    '''
    method: str = event.get('httpMethod', 'POST')

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
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }

    try:
        body = event.get('body', '')
        if event.get('isBase64Encoded', False):
            body = base64.b64decode(body).decode('utf-8')

        data = json.loads(body)
        doc_number = data.get('doc_number', '').strip()
        file_base64 = data.get('file')
        file_name = data.get('file_name', '')

        if not doc_number or not file_base64:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Не указан номер документа или файл'}),
                'isBase64Encoded': False
            }

        file_ext = '.pdf'
        if file_name and '.' in file_name:
            file_ext = '.' + file_name.split('.')[-1].lower()

        file_data = base64.b64decode(file_base64)

        content_type = 'application/pdf'
        if file_ext in ['.doc', '.docx']:
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif file_ext in ['.xls', '.xlsx']:
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

        bucket = os.environ.get('YA_S3_BUCKET_NAME', 'psot-files')
        key = f'pab-documents/{doc_number}{file_ext}'

        s3 = get_s3()
        s3.put_object(Bucket=bucket, Key=key, Body=file_data, ContentType=content_type)

        file_url = f'{YA_ENDPOINT}/{bucket}/{key}'

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'file_url': file_url,
                'doc_number': doc_number,
                'message': 'Документ успешно загружен'
            }),
            'isBase64Encoded': False
        }

    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Неверный формат данных'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Ошибка загрузки файла: {str(e)}'}),
            'isBase64Encoded': False
        }
