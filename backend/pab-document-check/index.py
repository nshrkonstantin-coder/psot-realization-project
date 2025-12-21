import json
import os
import boto3
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Проверяет наличие документа ПАБ в хранилище
    Args: event - dict с queryStringParameters (doc_number)
    Returns: HTTP response с информацией о наличии документа
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS
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
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters') or {}
    doc_number = params.get('doc_number', '').strip()
    
    if not doc_number:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Не указан номер документа'}),
            'isBase64Encoded': False
        }
    
    # Инициализация S3
    s3 = boto3.client('s3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    
    # Проверяем наличие файла с разными расширениями
    extensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls']
    found_file = None
    
    for ext in extensions:
        key = f'pab-documents/{doc_number}{ext}'
        try:
            s3.head_object(Bucket='files', Key=key)
            found_file = key
            break
        except:
            continue
    
    if found_file:
        # Документ найден
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{found_file}"
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'exists': True,
                'file_url': cdn_url,
                'doc_number': doc_number
            }),
            'isBase64Encoded': False
        }
    else:
        # Документ не найден
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'exists': False,
                'doc_number': doc_number
            }),
            'isBase64Encoded': False
        }
