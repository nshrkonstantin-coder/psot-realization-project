import json
import os
import hashlib
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: User profile management
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
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'GET':
        import psycopg2
        
        params = event.get('queryStringParameters') or {}
        user_id = params.get('userId')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'User ID required'})
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        cur.execute("""
            SELECT u.id, u.email, u.fio, u.company, u.subdivision, u.position, u.role, u.created_at,
                   COALESCE(s.registered_count, 0) as registered_count,
                   COALESCE(s.online_count, 0) as online_count,
                   COALESCE(s.offline_count, 0) as offline_count
            FROM t_p80499285_psot_realization_pro.users u
            LEFT JOIN t_p80499285_psot_realization_pro.user_stats s ON u.id = s.user_id
            WHERE u.id = %s
        """, (user_id,))
        
        result = cur.fetchone()
        
        if not result:
            cur.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'User not found'})
            }
        
        user_data = {
            'id': result[0],
            'email': result[1],
            'fio': result[2],
            'company': result[3],
            'subdivision': result[4],
            'position': result[5],
            'role': result[6],
            'created_at': result[7].isoformat() if result[7] else None,
            'stats': {
                'registered_count': result[8],
                'online_count': result[9],
                'offline_count': result[10]
            }
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
            'body': json.dumps({'success': True, 'user': user_data})
        }
    
    if method == 'PUT':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('userId')
        action = body_data.get('action')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'User ID required'})
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        if action == 'update_profile':
            fio = body_data.get('fio')
            company = body_data.get('company')
            subdivision = body_data.get('subdivision')
            position = body_data.get('position')
            
            cur.execute("""
                UPDATE users 
                SET fio = %s, company = %s, subdivision = %s, position = %s 
                WHERE id = %s
            """, (fio, company, subdivision, position, user_id))
            conn.commit()
            
        elif action == 'change_password':
            current_password = body_data.get('currentPassword')
            new_password = body_data.get('newPassword')
            
            current_hash = hashlib.sha256(current_password.encode()).hexdigest()
            
            cur.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
            result = cur.fetchone()
            
            if not result or result[0] != current_hash:
                cur.close()
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Incorrect current password'})
                }
            
            new_hash = hashlib.sha256(new_password.encode()).hexdigest()
            cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
            conn.commit()
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'success': True})
        }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }