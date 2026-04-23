import json
import os
import boto3
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
    Удаляет документ ПАБ из Яндекс Object Storage
    POST: body JSON с полем doc_number
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
        body = json.loads(event.get('body', '{}'))
        doc_number = body.get('doc_number', '').strip()

        if not doc_number:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Не указан номер документа'}),
                'isBase64Encoded': False
            }

        bucket = os.environ.get('YA_S3_BUCKET_NAME', 'psot-files')
        s3 = get_s3()
        extensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls']
        found_key = None

        for ext in extensions:
            key = f'pab-documents/{doc_number}{ext}'
            try:
                s3.head_object(Bucket=bucket, Key=key)
                found_key = key
                break
            except Exception:
                continue

        if not found_key:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Документ не найден', 'doc_number': doc_number}),
                'isBase64Encoded': False
            }

        s3.delete_object(Bucket=bucket, Key=found_key)

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'message': 'Документ успешно удален', 'doc_number': doc_number}),
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
            'body': json.dumps({'error': f'Ошибка удаления файла: {str(e)}'}),
            'isBase64Encoded': False
        }
