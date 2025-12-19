"""
Управление Excel-файлами графиков ПАБ
Позволяет главному администратору загружать графики, сохранять их в БД,
а всем пользователям - просматривать актуальные графики
"""

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """Получить подключение к БД"""
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Обработчик запросов для управления графиками ПАБ
    GET - получить активный файл для пользователя
    POST - загрузить новый файл (только для главного админа)
    DELETE - удалить файл (только для главного админа)
    """
    method: str = event.get('httpMethod', 'GET')
    
    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json'
    }
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        # Получение user_id из заголовков
        headers = event.get('headers', {})
        user_id = headers.get('x-user-id') or headers.get('X-User-Id')
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Unauthorized'}),
                'isBase64Encoded': False
            }
        
        conn = get_db_connection()
        
        if method == 'GET':
            # Получить активный файл
            return get_active_file(conn, user_id, cors_headers)
        
        elif method == 'POST':
            # Загрузить новый файл (только главный админ)
            body_data = json.loads(event.get('body', '{}'))
            return upload_file(conn, user_id, body_data, cors_headers)
        
        elif method == 'DELETE':
            # Удалить файл (только главный админ)
            query_params = event.get('queryStringParameters', {}) or {}
            file_id = query_params.get('file_id')
            return delete_file(conn, user_id, file_id, cors_headers)
        
        else:
            return {
                'statusCode': 405,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        if 'conn' in locals():
            conn.close()


def get_active_file(conn, user_id: str, headers: Dict[str, str]) -> Dict[str, Any]:
    """Получить активный файл графика для пользователя"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Получить организацию пользователя
        cur.execute("""
            SELECT organization_id 
            FROM users 
            WHERE id = %s
        """, (int(user_id),))
        
        user_row = cur.fetchone()
        if not user_row:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'User not found'}),
                'isBase64Encoded': False
            }
        
        org_id = user_row['organization_id']
        
        # Получить активный файл для организации
        cur.execute("""
            SELECT id, file_name, file_data, uploaded_at
            FROM pab_schedule_files
            WHERE organization_id = %s AND is_active = true
            ORDER BY uploaded_at DESC
            LIMIT 1
        """, (org_id,))
        
        file_row = cur.fetchone()
        
        if not file_row:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'file': None}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'file': {
                    'id': file_row['id'],
                    'name': file_row['file_name'],
                    'data': file_row['file_data'],
                    'uploadedAt': file_row['uploaded_at'].isoformat()
                }
            }),
            'isBase64Encoded': False
        }


def upload_file(conn, user_id: str, body_data: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
    """Загрузить новый файл графика (только главный админ)"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Проверить права пользователя
        cur.execute("""
            SELECT role, organization_id 
            FROM users 
            WHERE id = %s
        """, (int(user_id),))
        
        user_row = cur.fetchone()
        if not user_row:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'User not found'}),
                'isBase64Encoded': False
            }
        
        if user_row['role'] not in ['main_admin', 'super_admin']:
            return {
                'statusCode': 403,
                'headers': headers,
                'body': json.dumps({'error': 'Only main admin can upload files'}),
                'isBase64Encoded': False
            }
        
        org_id = user_row['organization_id']
        file_name = body_data.get('fileName')
        file_data = body_data.get('fileData')
        
        if not file_name or not file_data:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'fileName and fileData are required'}),
                'isBase64Encoded': False
            }
        
        # Деактивировать старые файлы
        cur.execute("""
            UPDATE pab_schedule_files
            SET is_active = false
            WHERE organization_id = %s
        """, (org_id,))
        
        # Вставить новый файл
        cur.execute("""
            INSERT INTO pab_schedule_files 
            (file_name, file_data, uploaded_by, organization_id, is_active)
            VALUES (%s, %s, %s, %s, true)
            RETURNING id, uploaded_at
        """, (file_name, json.dumps(file_data), int(user_id), org_id))
        
        new_file = cur.fetchone()
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'fileId': new_file['id'],
                'uploadedAt': new_file['uploaded_at'].isoformat()
            }),
            'isBase64Encoded': False
        }


def delete_file(conn, user_id: str, file_id: str, headers: Dict[str, str]) -> Dict[str, Any]:
    """Удалить файл графика (только главный админ)"""
    if not file_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'file_id is required'}),
            'isBase64Encoded': False
        }
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Проверить права пользователя
        cur.execute("""
            SELECT role
            FROM users 
            WHERE id = %s
        """, (int(user_id),))
        
        user_row = cur.fetchone()
        if not user_row:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'User not found'}),
                'isBase64Encoded': False
            }
        
        if user_row['role'] not in ['main_admin', 'super_admin']:
            return {
                'statusCode': 403,
                'headers': headers,
                'body': json.dumps({'error': 'Only main admin can delete files'}),
                'isBase64Encoded': False
            }
        
        # Деактивировать файл
        cur.execute("""
            UPDATE pab_schedule_files
            SET is_active = false
            WHERE id = %s
        """, (int(file_id),))
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True}),
            'isBase64Encoded': False
        }
