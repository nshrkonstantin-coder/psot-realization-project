import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление файлами в папках хранилища
    GET: Получить список файлов в папке
    POST: Удалить файл
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            folder_id = params.get('folder_id')
            
            if not folder_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'folder_id обязателен'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('SELECT folder_name FROM storage_folders WHERE id = %s', (folder_id,))
            folder_row = cur.fetchone()
            
            if not folder_row:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Папка не найдена'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                SELECT id, file_name, file_url, file_size, file_type, uploaded_at 
                FROM storage_files 
                WHERE folder_id = %s 
                ORDER BY uploaded_at DESC
            ''', (folder_id,))
            
            files = []
            for row in cur.fetchall():
                files.append({
                    'id': row[0],
                    'file_name': row[1],
                    'file_url': row[2],
                    'file_size': row[3],
                    'file_type': row[4],
                    'uploaded_at': row[5].isoformat() if row[5] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'files': files, 'folder_name': folder_row[0]}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'delete':
                file_id = body.get('file_id')
                
                if not file_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'file_id обязателен'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('SELECT id FROM storage_files WHERE id = %s', (file_id,))
                if not cur.fetchone():
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Файл не найден'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('DELETE FROM storage_files WHERE id = %s', (file_id,))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Файл удален'}),
                    'isBase64Encoded': False
                }
            
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неизвестное действие'}),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Метод не поддерживается'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
