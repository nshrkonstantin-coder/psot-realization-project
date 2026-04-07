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

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загрузка файлов в Cloudflare R2
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
        r2_access_key = os.environ.get('R2_ACCESS_KEY_ID')
        r2_secret_key = os.environ.get('R2_SECRET_ACCESS_KEY')
        r2_bucket = os.environ.get('R2_BUCKET_NAME')
        r2_account_id = os.environ.get('R2_ACCOUNT_ID')
        
        use_r2 = all([r2_access_key, r2_secret_key, r2_bucket, r2_account_id])
        
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
            cur.execute('SELECT id FROM storage_folders WHERE id = %s', (folder_id,))
            if not cur.fetchone():
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Папка не найдена'}),
                    'isBase64Encoded': False
                }
            
            file_url = None
            
            if use_r2:
                try:
                    s3_client = boto3.client(
                        's3',
                        endpoint_url=f'https://{r2_account_id}.r2.cloudflarestorage.com',
                        aws_access_key_id=r2_access_key,
                        aws_secret_access_key=r2_secret_key,
                        config=Config(signature_version='s3v4'),
                        region_name='auto'
                    )
                    
                    file_id = str(uuid.uuid4())
                    file_extension = os.path.splitext(file_name)[1]
                    object_key = f'{folder_id}/{file_id}{file_extension}'
                    
                    s3_client.put_object(
                        Bucket=r2_bucket,
                        Key=object_key,
                        Body=file_data,
                        ContentType=file_type,
                        Metadata={
                            'original_filename': file_name,
                            'folder_id': folder_id
                        }
                    )
                    
                    file_url = f'https://{r2_bucket}.{r2_account_id}.r2.cloudflarestorage.com/{object_key}'
                    
                except Exception as e:
                    print(f'R2 upload failed, falling back to database: {str(e)}')
                    use_r2 = False
            
            cur.execute(
                'INSERT INTO storage_files (folder_id, file_name, file_url, file_size, file_type) VALUES (%s, %s, %s, %s, %s) RETURNING id',
                (folder_id, file_name, file_url or '', file_size, file_type)
            )
            file_db_id = cur.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'file_id': file_db_id,
                    'file_name': file_name,
                    'file_url': file_url,
                    'file_size': file_size,
                    'file_type': file_type
                }),
                'isBase64Encoded': False
            }
        finally:
            cur.close()
            conn.close()
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
