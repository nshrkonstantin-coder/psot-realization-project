import json
import os
import psycopg2
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для управления видеоконференциями'''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    user_id = event.get('headers', {}).get('X-User-Id')
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Требуется авторизация'}),
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        conn.autocommit = True
        cur = conn.cursor()
        
        query_params = event.get('queryStringParameters') or {}
        action = query_params.get('action', 'list')
        
        if method == 'POST' and action == 'create':
            body = json.loads(event.get('body', '{}'))
            conf_id = body['id']
            name = body['name']
            creator_name = body['creator_name']
            participants = body.get('participants', [])
            
            cur.execute('''
                INSERT INTO video_conferences (id, name, creator_id, creator_name, created_at, status)
                VALUES (%s, %s, %s, %s, NOW(), 'active')
            ''', (conf_id, name, int(user_id), creator_name))
            
            for participant_id in participants:
                cur.execute('''
                    INSERT INTO video_conference_participants (conference_id, user_id)
                    VALUES (%s, %s)
                    ON CONFLICT (conference_id, user_id) DO NOTHING
                ''', (conf_id, participant_id))
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'conference_id': conf_id}),
                'isBase64Encoded': False
            }
        
        elif method == 'GET' and action == 'list':
            cur.execute('''
                SELECT DISTINCT 
                    vc.id, vc.name, vc.creator_id, vc.creator_name,
                    vc.created_at, vc.status, vc.ended_at, vc.duration,
                    vcp.is_favorite,
                    (SELECT COUNT(*) FROM video_conference_participants WHERE conference_id = vc.id) as participants_count
                FROM video_conferences vc
                LEFT JOIN video_conference_participants vcp ON vc.id = vcp.conference_id AND vcp.user_id = %s
                WHERE vc.status = 'active' OR vcp.user_id = %s
                ORDER BY vc.created_at DESC
            ''', (int(user_id), int(user_id)))
            
            rows = cur.fetchall()
            conferences = []
            for row in rows:
                cur.execute('''
                    SELECT user_id FROM video_conference_participants WHERE conference_id = %s
                ''', (row[0],))
                participant_ids = [p[0] for p in cur.fetchall()]
                
                conferences.append({
                    'id': row[0],
                    'name': row[1],
                    'creator_id': row[2],
                    'creator_name': row[3],
                    'created_at': row[4].isoformat() if row[4] else None,
                    'status': row[5],
                    'ended_at': row[6].isoformat() if row[6] else None,
                    'duration': row[7],
                    'is_favorite': row[8] or False,
                    'participants': participant_ids,
                    'participants_count': row[9]
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'conferences': conferences}),
                'isBase64Encoded': False
            }
        
        elif method == 'GET' and action == 'get':
            conf_id = query_params.get('id')
            if not conf_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Требуется ID конференции'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                SELECT vc.id, vc.name, vc.creator_id, vc.creator_name,
                       vc.created_at, vc.status, vc.ended_at, vc.duration,
                       vcp.is_favorite
                FROM video_conferences vc
                LEFT JOIN video_conference_participants vcp ON vc.id = vcp.conference_id AND vcp.user_id = %s
                WHERE vc.id = %s
            ''', (int(user_id), conf_id))
            
            row = cur.fetchone()
            if not row:
                cur.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Конференция не найдена'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                SELECT user_id FROM video_conference_participants WHERE conference_id = %s
            ''', (conf_id,))
            participant_ids = [p[0] for p in cur.fetchall()]
            
            conference = {
                'id': row[0],
                'name': row[1],
                'creator_id': row[2],
                'creator_name': row[3],
                'created_at': row[4].isoformat() if row[4] else None,
                'status': row[5],
                'ended_at': row[6].isoformat() if row[6] else None,
                'duration': row[7],
                'is_favorite': row[8] or False,
                'participants': participant_ids
            }
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(conference),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT' and action == 'end':
            body = json.loads(event.get('body', '{}'))
            conf_id = body.get('id')
            duration = body.get('duration', 0)
            
            cur.execute('''
                UPDATE video_conferences 
                SET status = 'ended', ended_at = NOW(), duration = %s
                WHERE id = %s AND creator_id = %s
            ''', (duration, conf_id, int(user_id)))
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST' and action == 'join':
            body = json.loads(event.get('body', '{}'))
            conf_id = body.get('conference_id')
            
            cur.execute('''
                INSERT INTO video_conference_participants (conference_id, user_id)
                VALUES (%s, %s)
                ON CONFLICT (conference_id, user_id) DO UPDATE SET joined_at = NOW()
            ''', (conf_id, int(user_id)))
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT' and action == 'favorite':
            body = json.loads(event.get('body', '{}'))
            conf_id = body.get('conference_id')
            is_favorite = body.get('is_favorite', True)
            
            cur.execute('''
                INSERT INTO video_conference_participants (conference_id, user_id, is_favorite)
                VALUES (%s, %s, %s)
                ON CONFLICT (conference_id, user_id) DO UPDATE SET is_favorite = %s
            ''', (conf_id, int(user_id), is_favorite, is_favorite))
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Неизвестное действие'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
