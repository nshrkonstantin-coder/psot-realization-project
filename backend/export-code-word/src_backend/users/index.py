import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: User management API for admins
    Args: event - dict with httpMethod, body, queryStringParameters
          context - object with attributes: request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'GET':
        import psycopg2
        
        params = event.get('queryStringParameters') or {}
        action = params.get('action', 'list')
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        if action == 'list':
            headers = event.get('headers', {})
            user_role = headers.get('X-User-Role', '')
            
            cur.execute("""
                SELECT u.id, u.email, u.fio, u.display_name, u.company, u.subdivision, u.position, u.role, u.created_at,
                       COALESCE(s.registered_count, 0) as registered_count,
                       COALESCE(s.online_count, 0) as online_count,
                       COALESCE(s.offline_count, 0) as offline_count
                FROM t_p80499285_psot_realization_pro.users u
                LEFT JOIN t_p80499285_psot_realization_pro.user_stats s ON u.id = s.user_id
                ORDER BY u.created_at DESC
            """)
            
            users = []
            for row in cur.fetchall():
                is_superadmin = user_role == 'superadmin'
                users.append({
                    'id': row[0],
                    'email': row[1],
                    'fio': row[2] if is_superadmin else row[3],
                    'display_name': row[3],
                    'company': row[4],
                    'subdivision': row[5],
                    'position': row[6],
                    'role': row[7],
                    'created_at': row[8].isoformat() if row[8] else None,
                    'stats': {
                        'registered_count': row[9],
                        'online_count': row[10],
                        'offline_count': row[11]
                    }
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'users': users})
            }
        
        elif action == 'stats':
            cur.execute("""
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN role = 'user' THEN 1 END) as users_count,
                    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins_count,
                    COUNT(CASE WHEN role = 'superadmin' THEN 1 END) as superadmins_count
                FROM t_p80499285_psot_realization_pro.users
            """)
            
            row = cur.fetchone()
            stats = {
                'total_users': row[0],
                'users_count': row[1],
                'admins_count': row[2],
                'superadmins_count': row[3]
            }
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'stats': stats})
            }
        
        cur.close()
        conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
