import json
import os
import uuid
import psycopg2
from typing import Dict, Any
import mimetypes
import boto3
from botocore.client import Config

def parse_multipart(body: bytes, boundary: str) -> Dict[str, Any]:
    """
    Парсинг multipart/form-data вручную
    """
    result = {}
    boundary_bytes = f'--{boundary}'.encode('latin-1')
    parts = body.split(boundary_bytes)
    
    for part in parts:
        if not part or part in (b'--\r\n', b'--', b'\r\n'):
            continue
        
        if b'\r\n\r\n' not in part:
            continue
            
        headers_raw, body_raw = part.split(b'\r\n\r\n', 1)
        
        if body_raw.endswith(b'\r\n'):
            body_raw = body_raw[:-2]
        
        headers_str = headers_raw.decode('utf-8', errors='ignore')
        
        if 'Content-Disposition' not in headers_str:
            continue
            
        name = None
        filename = None
        
        for line in headers_str.split('\r\n'):
            if 'Content-Disposition' in line:
                parts_list = line.split(';')
                for p in parts_list:
                    p = p.strip()
                    if p.startswith('name='):
                        name = p.split('=', 1)[1].strip('"')
                    elif p.startswith('filename='):
                        filename = p.split('=', 1)[1].strip('"')
        
        if name:
            if filename:
                result[name] = {
                    'filename': filename,
                    'data': body_raw
                }
            else:
                result[name] = body_raw.decode('utf-8', errors='ignore')
    
    return result

def get_ya_s3_client():
    """Создаёт клиент Яндекс Object Storage"""
    access_key = os.environ.get('YA_S3_ACCESS_KEY_ID')
    secret_key = os.environ.get('YA_S3_SECRET_ACCESS_KEY')
    if not access_key or not secret_key:
        return None, None
    client = boto3.client(
        's3',
        endpoint_url='https://storage.yandexcloud.net',
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='ru-central1'
    )
    bucket = os.environ.get('YA_S3_BUCKET_NAME', 'psot-files')
    return client, bucket

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загрузка файлов в Яндекс Object Storage
    POST: Загрузить файл в папку (multipart/form-data)
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
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Метод не поддерживается'}),
            'isBase64Encoded': False
        }
    
    try:
        s3_client, s3_bucket = get_ya_s3_client()
        use_s3 = s3_client is not None
        
        headers = event.get('headers', {})
        content_type = headers.get('content-type') or headers.get('Content-Type', '')
        
        if 'multipart/form-data' not in content_type.lower():
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Требуется multipart/form-data'}),
                'isBase64Encoded': False
            }
        
        if 'boundary=' not in content_type:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Отсутствует boundary в Content-Type'}),
                'isBase64Encoded': False
            }
        
        boundary = content_type.split('boundary=')[-1].strip()
        
        body = event.get('body', '')
        is_base64 = event.get('isBase64Encoded', False)
        
        if is_base64:
            import base64
            body_bytes = base64.b64decode(body)
        else:
            body_bytes = body.encode('latin-1') if isinstance(body, str) else body
        
        parsed = parse_multipart(body_bytes, boundary)
        
        if 'file' not in parsed:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Отсутствует поле file'}),
                'isBase64Encoded': False
            }
        
        if 'folder_id' not in parsed:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Отсутствует поле folder_id'}),
                'isBase64Encoded': False
            }
        
        file_info = parsed['file']
        if not isinstance(file_info, dict) or 'filename' not in file_info:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Некорректные данные файла'}),
                'isBase64Encoded': False
            }
        
        file_name = file_info['filename']
        file_data = file_info['data']
        folder_id = str(parsed['folder_id']).strip()
        
        if not file_data or not file_name or not folder_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Отсутствует file, folder_id или filename'}),
                'isBase64Encoded': False
            }
        
        file_size = len(file_data)
        file_type = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        try:
            S = os.environ.get('MAIN_DB_SCHEMA', 't_p80499285_psot_realization_pro')
            cur.execute(f'SELECT id FROM {S}.storage_folders WHERE id = %s', (folder_id,))
            if not cur.fetchone():
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Папка не найдена'}),
                    'isBase64Encoded': False
                }
            
            file_url = None
            
            if use_s3:
                try:
                    file_id = str(uuid.uuid4())
                    file_extension = os.path.splitext(file_name)[1]
                    object_key = f'storage/{folder_id}/{file_id}{file_extension}'
                    
                    s3_client.put_object(
                        Bucket=s3_bucket,
                        Key=object_key,
                        Body=file_data,
                        ContentType=file_type,
                        Metadata={
                            'original_filename': file_name,
                            'folder_id': folder_id
                        }
                    )
                    
                    file_url = f'https://storage.yandexcloud.net/{s3_bucket}/{object_key}'
                    print(f'File uploaded to Yandex S3: {file_url}')
                    
                except Exception as e:
                    print(f'Yandex S3 upload failed, falling back to database: {str(e)}')
                    use_s3 = False
            
            if not use_s3:
                import base64
                file_b64 = base64.b64encode(file_data).decode('utf-8')
                file_url = f'data:{file_type};base64,{file_b64}'
                print('File saved to database (fallback)')
            
            file_uuid = str(uuid.uuid4())
            cur.execute(
                f'''INSERT INTO {S}.storage_files 
                    (id, folder_id, file_name, file_url, file_size, file_type, uploaded_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id''',
                (file_uuid, folder_id, file_name, file_url, file_size, file_type)
            )
            
            result = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'file': {
                        'id': result[0],
                        'folder_id': folder_id,
                        'file_name': file_name,
                        'file_url': file_url,
                        'file_size': file_size,
                        'file_type': file_type,
                        'storage': 'yandex_s3' if (file_url and file_url.startswith('https://')) else 'database'
                    }
                }),
                'isBase64Encoded': False
            }
            
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        print(f'Upload error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Ошибка загрузки: {str(e)}'}),
            'isBase64Encoded': False
        }
