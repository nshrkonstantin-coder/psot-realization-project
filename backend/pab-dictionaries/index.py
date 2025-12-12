import json
import os
from typing import Dict, Any
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление справочниками ПАБ (категории, условия, опасные факторы)
    GET - получить все справочники
    POST - добавить элемент в справочник
    PUT - редактировать элемент в справочнике
    DELETE - удалить элемент из справочника
    '''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
        schema = 't_p80499285_psot_realization_pro'
        
        cur.execute(f"SELECT id, name FROM {schema}.pab_categories WHERE is_active = true ORDER BY name")
        categories = [{'id': row[0], 'name': row[1]} for row in cur.fetchall()]
        
        cur.execute(f"SELECT id, name FROM {schema}.pab_conditions WHERE is_active = true ORDER BY name")
        conditions = [{'id': row[0], 'name': row[1]} for row in cur.fetchall()]
        
        cur.execute(f"SELECT id, name FROM {schema}.pab_hazards WHERE is_active = true ORDER BY name")
        hazards = [{'id': row[0], 'name': row[1]} for row in cur.fetchall()]
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'categories': categories,
                'conditions': conditions,
                'hazards': hazards
            }, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        dict_type = body.get('type')
        name = body.get('name')
        
        if dict_type == 'category':
            cur.execute("INSERT INTO pab_categories (name) VALUES (%s) RETURNING id", (name,))
        elif dict_type == 'condition':
            cur.execute("INSERT INTO pab_conditions (name) VALUES (%s) RETURNING id", (name,))
        elif dict_type == 'hazard':
            cur.execute("INSERT INTO pab_hazards (name) VALUES (%s) RETURNING id", (name,))
        else:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid type'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'id': new_id, 'name': name}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        dict_type = body.get('type')
        item_id = body.get('id')
        name = body.get('name')
        
        if not dict_type or not item_id or not name:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing type, id or name'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        if dict_type == 'category':
            cur.execute("UPDATE pab_categories SET name = %s WHERE id = %s", (name, item_id))
        elif dict_type == 'condition':
            cur.execute("UPDATE pab_conditions SET name = %s WHERE id = %s", (name, item_id))
        elif dict_type == 'hazard':
            cur.execute("UPDATE pab_hazards SET name = %s WHERE id = %s", (name, item_id))
        else:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid type'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'id': item_id, 'name': name}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'DELETE':
        params = event.get('queryStringParameters', {})
        dict_type = params.get('type')
        item_id = params.get('id')
        
        if not dict_type or not item_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing type or id'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        if dict_type == 'category':
            cur.execute("UPDATE pab_categories SET is_active = false WHERE id = %s", (item_id,))
        elif dict_type == 'condition':
            cur.execute("UPDATE pab_conditions SET is_active = false WHERE id = %s", (item_id,))
        elif dict_type == 'hazard':
            cur.execute("UPDATE pab_hazards SET is_active = false WHERE id = %s", (item_id,))
        else:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid type'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'success': True}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}, ensure_ascii=False),
        'isBase64Encoded': False
    }