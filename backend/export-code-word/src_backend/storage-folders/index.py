import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление папками в хранилище пользователей
    GET: Получить список папок пользователя
    POST: Создать или удалить папку
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
            user_id = params.get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id обязателен'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                SELECT id, folder_name, parent_id, created_at 
                FROM storage_folders 
                WHERE user_id = %s 
                ORDER BY created_at DESC
            ''', (user_id,))
            
            folders = []
            for row in cur.fetchall():
                folders.append({
                    'id': row[0],
                    'folder_name': row[1],
                    'parent_id': row[2],
                    'created_at': row[3].isoformat() if row[3] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'folders': folders}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'create':
                user_id = body.get('user_id')
                folder_name = body.get('folder_name', '').strip()
                parent_id = body.get('parent_id')
                
                if not user_id or not folder_name:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'user_id и folder_name обязательны'}),
                        'isBase64Encoded': False
                    }
                
                if parent_id:
                    cur.execute('''
                        SELECT id FROM storage_folders 
                        WHERE user_id = %s AND folder_name = %s AND parent_id = %s
                    ''', (user_id, folder_name, parent_id))
                else:
                    cur.execute('''
                        SELECT id FROM storage_folders 
                        WHERE user_id = %s AND folder_name = %s AND parent_id IS NULL
                    ''', (user_id, folder_name))
                
                existing = cur.fetchone()
                if existing:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'folder_id': existing[0], 'message': 'Папка уже существует'}),
                        'isBase64Encoded': False
                    }
                
                try:
                    cur.execute('''
                        INSERT INTO storage_folders (user_id, folder_name, parent_id) 
                        VALUES (%s, %s, %s) 
                        RETURNING id
                    ''', (user_id, folder_name, parent_id))
                    
                    folder_id = cur.fetchone()[0]
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'folder_id': folder_id, 'message': 'Папка создана'}),
                        'isBase64Encoded': False
                    }
                except psycopg2.IntegrityError as e:
                    conn.rollback()
                    print(f"[DEBUG] IntegrityError caught: {str(e)}")
                    
                    if parent_id:
                        cur.execute('''
                            SELECT id FROM storage_folders 
                            WHERE user_id = %s AND folder_name = %s AND parent_id = %s
                        ''', (user_id, folder_name, parent_id))
                    else:
                        cur.execute('''
                            SELECT id FROM storage_folders 
                            WHERE user_id = %s AND folder_name = %s AND parent_id IS NULL
                        ''', (user_id, folder_name))
                    
                    existing_after_error = cur.fetchone()
                    
                    if existing_after_error:
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'folder_id': existing_after_error[0], 'message': 'Папка уже существует'}),
                            'isBase64Encoded': False
                        }
                    
                    return {
                        'statusCode': 409,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': f'Ошибка создания папки: {str(e)}'}),
                        'isBase64Encoded': False
                    }
            
            elif action == 'delete':
                folder_id = body.get('folder_id')
                
                if not folder_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'folder_id обязателен'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('SELECT id FROM storage_folders WHERE id = %s', (folder_id,))
                if not cur.fetchone():
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Папка не найдена'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('DELETE FROM storage_files WHERE folder_id = %s', (folder_id,))
                cur.execute('DELETE FROM storage_folders WHERE id = %s', (folder_id,))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Папка удалена'}),
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
