import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """API управления модулями организации."""
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
        
        if not organization_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'organization_id обязателен'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        cur.execute('''
            SELECT m.id, m.name, m.display_name, m.description, m.route_path, m.icon, m.category,
                   COALESCE(om.is_enabled, false) as is_enabled
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
                'is_enabled': row[7]
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
        organization_id = body.get('organization_id')
        module_id = body.get('module_id')
        is_enabled = body.get('is_enabled', True)
        
        if not organization_id or not module_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'organization_id и module_id обязательны'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        cur.execute('''
            INSERT INTO t_p80499285_psot_realization_pro.organization_modules (organization_id, module_id, is_enabled)
            VALUES (%s, %s, %s)
            ON CONFLICT (organization_id, module_id) 
            DO UPDATE SET is_enabled = EXCLUDED.is_enabled
        ''', (organization_id, module_id, is_enabled))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        organization_id = body.get('organization_id')
        module_ids = body.get('module_ids', [])
        
        if not organization_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'organization_id обязателен'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        cur.execute('UPDATE t_p80499285_psot_realization_pro.organization_modules SET is_enabled = false WHERE organization_id = %s', (organization_id,))
        
        for module_id in module_ids:
            cur.execute('''
                INSERT INTO t_p80499285_psot_realization_pro.organization_modules (organization_id, module_id, is_enabled)
                VALUES (%s, %s, true)
                ON CONFLICT (organization_id, module_id) 
                DO UPDATE SET is_enabled = true
            ''', (organization_id, module_id))
        
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