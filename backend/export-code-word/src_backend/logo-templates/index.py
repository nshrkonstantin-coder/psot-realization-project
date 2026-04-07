import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление библиотекой шаблонов логотипов для предприятий
    GET - получить все шаблоны логотипов (с фильтрацией по категории)
    POST - добавить новый шаблон логотипа
    PUT - обновить существующий шаблон
    DELETE - удалить шаблон
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            category = params.get('category')
            
            if category:
                cur.execute('''
                    SELECT id, name, category, logo_url, preview_url, is_active, created_at
                    FROM organization_logo_templates
                    WHERE category = %s AND is_active = true
                    ORDER BY name
                ''', (category,))
            else:
                cur.execute('''
                    SELECT id, name, category, logo_url, preview_url, is_active, created_at
                    FROM organization_logo_templates
                    WHERE is_active = true
                    ORDER BY category, name
                ''')
            
            rows = cur.fetchall()
            templates = []
            
            for row in rows:
                templates.append({
                    'id': row[0],
                    'name': row[1],
                    'category': row[2],
                    'logo_url': row[3],
                    'preview_url': row[4],
                    'is_active': row[5],
                    'created_at': row[6].isoformat() if row[6] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(templates, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            name = body.get('name')
            category = body.get('category')
            logo_url = body.get('logo_url')
            preview_url = body.get('preview_url', logo_url)
            
            if not all([name, category, logo_url]):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Отсутствуют обязательные поля'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                INSERT INTO organization_logo_templates (name, category, logo_url, preview_url)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            ''', (name, category, logo_url, preview_url))
            
            template_id = cur.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'id': template_id,
                    'name': name,
                    'category': category,
                    'logo_url': logo_url
                }, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            template_id = body.get('id')
            
            if not template_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Отсутствует ID шаблона'}),
                    'isBase64Encoded': False
                }
            
            updates = []
            params = []
            
            if 'name' in body:
                updates.append('name = %s')
                params.append(body['name'])
            
            if 'category' in body:
                updates.append('category = %s')
                params.append(body['category'])
            
            if 'logo_url' in body:
                updates.append('logo_url = %s')
                params.append(body['logo_url'])
            
            if 'preview_url' in body:
                updates.append('preview_url = %s')
                params.append(body['preview_url'])
            
            if 'is_active' in body:
                updates.append('is_active = %s')
                params.append(body['is_active'])
            
            if updates:
                params.append(template_id)
                query = f"UPDATE organization_logo_templates SET {', '.join(updates)} WHERE id = %s"
                cur.execute(query, params)
                conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            body = json.loads(event.get('body', '{}'))
            template_id = body.get('id')
            
            if not template_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Отсутствует ID шаблона'}),
                    'isBase64Encoded': False
                }
            
            # Мягкое удаление - просто делаем неактивным
            cur.execute('UPDATE organization_logo_templates SET is_active = false WHERE id = %s', (template_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Метод не поддерживается'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        import traceback
        print(f"Error: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Ошибка сервера: {str(e)}'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
