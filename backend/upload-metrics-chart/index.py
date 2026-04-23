import json
import os
import base64
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
    Загрузка Excel-файла с графиком личных показателей ПАБ в Яндекс Object Storage
    POST: body JSON с file (base64), org_id
    GET: ?org_id=N — проверить наличие файла
    DELETE: body JSON с org_id — удалить файл
    '''
    method: str = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }

    bucket = os.environ.get('YA_S3_BUCKET_NAME', 'psot-files')

    if method == 'POST':
        try:
            body_data = json.loads(event.get('body') or '{}')
        except Exception:
            body_data = {}
        file_base64 = body_data.get('file')
        org_id = body_data.get('org_id', 'global')
        filename = 'metrics-chart.xlsx'

        if not file_base64:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Файл не предоставлен'}),
                'isBase64Encoded': False
            }

        try:
            s3 = get_s3()
            file_data = base64.b64decode(file_base64)
            key = f'metrics/charts/org_{org_id}/{filename}'
            s3.put_object(
                Bucket=bucket, Key=key, Body=file_data,
                ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            url = f'{YA_ENDPOINT}/{bucket}/{key}'
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'url': url, 'filename': filename, 'org_id': org_id}),
                'isBase64Encoded': False
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Ошибка загрузки файла: {str(e)}'}),
                'isBase64Encoded': False
            }

    if method == 'GET':
        try:
            params = event.get('queryStringParameters') or {}
            org_id = params.get('org_id', 'global')
            key = f'metrics/charts/org_{org_id}/metrics-chart.xlsx'
            s3 = get_s3()
            try:
                s3.head_object(Bucket=bucket, Key=key)
                url = f'{YA_ENDPOINT}/{bucket}/{key}'
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'exists': True, 'url': url, 'org_id': org_id}),
                    'isBase64Encoded': False
                }
            except Exception:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'exists': False, 'org_id': org_id}),
                    'isBase64Encoded': False
                }
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(e)}),
                'isBase64Encoded': False
            }

    if method == 'DELETE':
        try:
            body_data = json.loads(event.get('body', '{}'))
            org_id = body_data.get('org_id', 'global')
            key = f'metrics/charts/org_{org_id}/metrics-chart.xlsx'
            s3 = get_s3()
            s3.delete_object(Bucket=bucket, Key=key)
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'org_id': org_id}),
                'isBase64Encoded': False
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(e)}),
                'isBase64Encoded': False
            }

    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Метод не поддерживается'}),
        'isBase64Encoded': False
    }