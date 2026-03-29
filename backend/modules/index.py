import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API управления модулями приложения
    GET - получить все активные модули (сгруппированные по категориям)
    POST - создать новый модуль
    PUT - обновить модуль
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {}) or {}
        organization_id = params.get('organization_id')
        
        if organization_id:
            cur.execute('''
                SELECT m.id, m.name, m.display_name, m.description, m.route_path, m.icon, m.category,
                       om.is_enabled
                FROM t_p80499285_psot_realization_pro.modules m
                LEFT JOIN t_p80499285_psot_realization_pro.organization_modules om ON m.id = om.module_id AND om.organization_id = %s
                WHERE m.is_active = true
                ORDER BY m.category, m.display_name
            ''', (organization_id,))
            
            modules = []
            for row in cur.fetchall():
                modules.append({
                    'id': row[0],
                    'name': row[1],
                    'display_name': row[2],
                    'description': row[3],
                    'route_path': row[4],
                    'icon': row[5],
                    'category': row[6],
                    'is_enabled': row[7] if row[7] is not None else False
                })
        else:
            cur.execute('''
                SELECT id, name, display_name, description, route_path, icon, category
                FROM t_p80499285_psot_realization_pro.modules
                WHERE is_active = true
                ORDER BY category, display_name
            ''')
            
            modules = []
            for row in cur.fetchall():
                modules.append({
                    'id': row[0],
                    'name': row[1],
                    'display_name': row[2],
                    'description': row[3],
                    'route_path': row[4],
                    'icon': row[5],
                    'category': row[6]
                })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(modules, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        name = body.get('name')
        display_name = body.get('display_name')
        
        if not name or not display_name:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Название модуля обязательно'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        cur.execute('''
            INSERT INTO t_p80499285_psot_realization_pro.modules (name, display_name, description, route_path, icon, category, module_type, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, true)
            RETURNING id
        ''', (
            name,
            display_name,
            body.get('description', ''),
            body.get('route_path', ''),
            body.get('icon', 'Package'),
            body.get('category', 'custom'),
            body.get('module_type', 'custom')
        ))
        
        module_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'id': module_id, 'name': name}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        module_id = body.get('id')
        
        if not module_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'ID модуля обязателен'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        updates = []
        params = []
        
        if 'display_name' in body:
            updates.append('display_name = %s')
            params.append(body['display_name'])
        
        if 'description' in body:
            updates.append('description = %s')
            params.append(body['description'])
        
        if 'is_active' in body:
            updates.append('is_active = %s')
            params.append(body['is_active'])
        
        if 'icon' in body:
            updates.append('icon = %s')
            params.append(body['icon'])
        
        if updates:
            params.append(module_id)
            query = f"UPDATE t_p80499285_psot_realization_pro.modules SET {', '.join(updates)} WHERE id = %s"
            cur.execute(query, params)
            conn.commit()
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'DELETE':
        params = event.get('queryStringParameters', {}) or {}
        module_id = params.get('id')
        
        if not module_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'ID модуля обязателен'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        cur.execute('DELETE FROM t_p80499285_psot_realization_pro.tariff_modules WHERE module_id = %s', (module_id,))
        cur.execute('DELETE FROM t_p80499285_psot_realization_pro.modules WHERE id = %s', (module_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }