import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление системными уведомлениями для администраторов
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            limit = int(params.get('limit', 100))
            offset = int(params.get('offset', 0))
            notification_type = params.get('type')
            is_read = params.get('is_read')
            
            where_clauses = []
            if notification_type:
                where_clauses.append(f"notification_type = '{notification_type.replace(chr(39), chr(39)+chr(39))}'")
            if is_read is not None:
                where_clauses.append(f"is_read = {is_read.lower() == 'true'}")
            
            where_sql = ' AND '.join(where_clauses) if where_clauses else '1=1'
            
            cur.execute(f"""
                SELECT 
                    id, notification_type, severity, title, message, 
                    page_url, page_name, user_id, user_fio, user_position,
                    organization_id, organization_name, action_type, 
                    error_details, metadata, is_read, created_at, read_at
                FROM t_p80499285_psot_realization_pro.system_notifications
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT {limit} OFFSET {offset}
            """)
            
            notifications = []
            for row in cur.fetchall():
                notifications.append({
                    'id': row[0],
                    'type': row[1],
                    'severity': row[2],
                    'title': row[3],
                    'message': row[4],
                    'pageUrl': row[5],
                    'pageName': row[6],
                    'userId': row[7],
                    'userFio': row[8],
                    'userPosition': row[9],
                    'organizationId': row[10],
                    'organizationName': row[11],
                    'actionType': row[12],
                    'errorDetails': row[13],
                    'metadata': row[14],
                    'isRead': row[15],
                    'createdAt': row[16].isoformat() if row[16] else None,
                    'readAt': row[17].isoformat() if row[17] else None
                })
            
            cur.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE is_read = false) as unread,
                    COUNT(*) FILTER (WHERE notification_type = 'error') as errors,
                    COUNT(*) FILTER (WHERE notification_type = 'warning') as warnings
                FROM t_p80499285_psot_realization_pro.system_notifications
            """)
            stats = cur.fetchone()
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'notifications': notifications,
                    'stats': {
                        'total': stats[0],
                        'unread': stats[1],
                        'errors': stats[2],
                        'warnings': stats[3]
                    }
                })
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'mark_read':
                notification_ids = body.get('ids', [])
                
                if notification_ids:
                    ids_str = ','.join(str(nid) for nid in notification_ids)
                    cur.execute(f"""
                        UPDATE t_p80499285_psot_realization_pro.system_notifications
                        SET is_read = true, read_at = NOW()
                        WHERE id IN ({ids_str})
                    """)
                    conn.commit()
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True})
                }
            
            elif action == 'mark_all_read':
                cur.execute("""
                    UPDATE t_p80499285_psot_realization_pro.system_notifications
                    SET is_read = true, read_at = NOW()
                    WHERE is_read = false
                """)
                conn.commit()
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True})
                }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {}) or {}
            notification_id = params.get('id')
            
            if notification_id:
                cur.execute(f"""
                    DELETE FROM t_p80499285_psot_realization_pro.system_notifications
                    WHERE id = {int(notification_id)}
                """)
                conn.commit()
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'success': True})
            }
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except Exception as e:
        if not cur.closed:
            cur.close()
        if not conn.closed:
            conn.close()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'error': str(e)})
        }
