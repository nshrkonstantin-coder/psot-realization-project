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
    Проверяет наличие документа ПАБ в Яндекс Object Storage
    GET: ?doc_number=XXX
    '''
    method: str = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }

    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }

    params = event.get('queryStringParameters') or {}
    doc_number = params.get('doc_number', '').strip()

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
    found_file = None

    for ext in extensions:
        key = f'pab-documents/{doc_number}{ext}'
        try:
            s3.head_object(Bucket=bucket, Key=key)
            found_file = key
            break
        except Exception:
            continue

    if found_file:
        file_url = f'{YA_ENDPOINT}/{bucket}/{found_file}'
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'exists': True, 'file_url': file_url, 'doc_number': doc_number}),
            'isBase64Encoded': False
        }

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'exists': False, 'doc_number': doc_number}),
        'isBase64Encoded': False
    }
