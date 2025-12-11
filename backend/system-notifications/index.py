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
            # Получение списка уведомлений
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
            
            # Получение уведомлений
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
            
            # Получение общей статистики
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
            
            if action == 'create':
                # Создание нового уведомления
                notification_type = body.get('type', 'info')
                severity = body.get('severity', 'medium')
                title = body.get('title', '')
                message = body.get('message', '')
                page_url = body.get('pageUrl')
                page_name = body.get('pageName')
                user_id = body.get('userId')
                user_fio = body.get('userFio')
                user_position = body.get('userPosition')
                organization_id = body.get('organizationId')
                organization_name = body.get('organizationName')
                action_type = body.get('actionType')
                error_details = body.get('errorDetails')
                stack_trace = body.get('stackTrace')
                metadata = json.dumps(body.get('metadata', {}))
                
                title_escaped = title.replace("'", "''")
                message_escaped = message.replace("'", "''")
                page_url_escaped = page_url.replace("'", "''") if page_url else None
                page_name_escaped = page_name.replace("'", "''") if page_name else None
                user_fio_escaped = user_fio.replace("'", "''") if user_fio else None
                user_position_escaped = user_position.replace("'", "''") if user_position else None
                organization_name_escaped = organization_name.replace("'", "''") if organization_name else None
                action_type_escaped = action_type.replace("'", "''") if action_type else None
                error_details_escaped = error_details.replace("'", "''") if error_details else None
                stack_trace_escaped = stack_trace.replace("'", "''") if stack_trace else None
                
                cur.execute(f"""
                    INSERT INTO t_p80499285_psot_realization_pro.system_notifications 
                    (notification_type, severity, title, message, page_url, page_name, 
                     user_id, user_fio, user_position, organization_id, organization_name,
                     action_type, error_details, stack_trace, metadata)
                    VALUES (
                        '{notification_type}', '{severity}', '{title_escaped}', '{message_escaped}',
                        {'NULL' if not page_url_escaped else f"'{page_url_escaped}'"},
                        {'NULL' if not page_name_escaped else f"'{page_name_escaped}'"},
                        {user_id if user_id else 'NULL'},
                        {'NULL' if not user_fio_escaped else f"'{user_fio_escaped}'"},
                        {'NULL' if not user_position_escaped else f"'{user_position_escaped}'"},
                        {organization_id if organization_id else 'NULL'},
                        {'NULL' if not organization_name_escaped else f"'{organization_name_escaped}'"},
                        {'NULL' if not action_type_escaped else f"'{action_type_escaped}'"},
                        {'NULL' if not error_details_escaped else f"'{error_details_escaped}'"},
                        {'NULL' if not stack_trace_escaped else f"'{stack_trace_escaped}'"},
                        '{metadata}'
                    )
                    RETURNING id
                """)
                
                notification_id = cur.fetchone()[0]
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
                    'body': json.dumps({
                        'success': True,
                        'notificationId': notification_id
                    })
                }
            
            elif action == 'mark_read':
                # Пометить как прочитанное
                notification_ids = body.get('ids', [])
                if not notification_ids:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'isBase64Encoded': False,
                        'body': json.dumps({'error': 'IDs required'})
                    }
                
                ids_str = ','.join(str(int(id)) for id in notification_ids)
                cur.execute(f"""
                    UPDATE t_p80499285_psot_realization_pro.system_notifications
                    SET is_read = true, read_at = CURRENT_TIMESTAMP
                    WHERE id IN ({ids_str})
                """)
                
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
        
        elif method == 'DELETE':
            # Удаление уведомлений
            body = json.loads(event.get('body', '{}'))
            notification_ids = body.get('ids', [])
            
            if not notification_ids:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'IDs required'})
                }
            
            ids_str = ','.join(str(int(id)) for id in notification_ids)
            cur.execute(f"""
                DELETE FROM t_p80499285_psot_realization_pro.system_notifications
                WHERE id IN ({ids_str})
            """)
            
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
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except Exception as e:
        if conn:
            conn.rollback()
            cur.close()
            conn.close()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': str(e)})
        }
