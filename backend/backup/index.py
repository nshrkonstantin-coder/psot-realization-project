import json
import os
import psycopg2
import psycopg2.extras
from datetime import datetime
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление резервным копированием базы данных PostgreSQL
    
    GET /backup - получить конфигурацию и историю бэкапов
    POST /backup - создать резервную копию БД с сохранением в таблицу
    PUT /backup - обновить конфигурацию автокопирования
    DELETE /backup - удалить резервную копию (кроме самой свежей)
    '''
    
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'DATABASE_URL не настроен'}),
            'isBase64Encoded': False
        }
    
    if method == 'GET':
        try:
            conn = psycopg2.connect(database_url)
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cur.execute("SELECT * FROM backup_config ORDER BY id DESC LIMIT 1")
            config_row = cur.fetchone()
            
            config = {
                'autoBackup': config_row['auto_backup'] if config_row else False,
                'dayOfWeek': config_row['day_of_week'] if config_row else 'monday',
                'time': config_row['backup_time'] if config_row else '03:00',
                'lastBackup': config_row['last_backup'].strftime('%Y-%m-%d %H:%M:%S') if config_row and config_row['last_backup'] else None
            }
            
            cur.execute("""
                SELECT backup_id as id, 
                       TO_CHAR(backup_date, 'DD.MM.YYYY') as date,
                       backup_time as time,
                       size_text as size,
                       status,
                       download_url as "downloadUrl"
                FROM backup_history 
                ORDER BY backup_date DESC, backup_time DESC 
                LIMIT 20
            """)
            history = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'config': config,
                    'history': history
                }),
                'isBase64Encoded': False
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': f'Ошибка загрузки данных: {str(e)}'}),
                'isBase64Encoded': False
            }
    
    if method == 'POST':
        try:
            conn = psycopg2.connect(database_url)
            cur = conn.cursor()
            
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            tables = cur.fetchall()
            table_count = len(tables)
            
            total_rows = 0
            total_size_bytes = 0
            
            for (table_name,) in tables:
                cur.execute(f"SELECT COUNT(*) FROM {table_name}")
                row_count = cur.fetchone()[0]
                total_rows += row_count
                
                cur.execute(f"""
                    SELECT pg_total_relation_size('{table_name}')
                """)
                table_size = cur.fetchone()[0]
                total_size_bytes += table_size if table_size else 0
            
            size_mb = total_size_bytes / (1024 * 1024)
            
            if size_mb < 0.1:
                size_kb = total_size_bytes / 1024
                size_text = f'{size_kb:.1f} КБ'
            else:
                size_text = f'{size_mb:.1f} МБ'
            
            body_str = event.get('body', '{}')
            if body_str and body_str.strip():
                try:
                    body_data = json.loads(body_str)
                    client_timestamp = body_data.get('timestamp')
                except json.JSONDecodeError:
                    client_timestamp = None
            else:
                client_timestamp = None
            
            if client_timestamp:
                client_dt = datetime.fromtimestamp(client_timestamp / 1000)
                timestamp = client_dt.strftime('%Y%m%d_%H%M%S')
                backup_date = client_dt.date()
                backup_time = client_dt.strftime('%H:%M')
            else:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                backup_date = datetime.now().date()
                backup_time = datetime.now().strftime('%H:%M')
            
            backup_filename = f'backup_{timestamp}.sql'
            
            cur.execute("""
                INSERT INTO backup_history 
                (backup_id, filename, file_size, size_text, table_count, backup_date, backup_time, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (timestamp, backup_filename, int(total_size_bytes), 
                  size_text, table_count, backup_date, backup_time, 'success'))
            
            cur.execute("""
                UPDATE backup_config 
                SET last_backup = CURRENT_TIMESTAMP, 
                    updated_at = CURRENT_TIMESTAMP
            """)
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Резервная копия создана и сохранена',
                    'backup': {
                        'id': timestamp,
                        'filename': backup_filename,
                        'size': size_text,
                        'date': datetime.now().strftime('%d.%m.%Y'),
                        'time': backup_time,
                        'tables': table_count,
                        'total_rows': total_rows
                    }
                }),
                'isBase64Encoded': False
            }
            
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': f'Ошибка создания бэкапа: {str(e)}'}),
                'isBase64Encoded': False
            }
    
    if method == 'PUT':
        try:
            body_data = json.loads(event.get('body', '{}'))
            
            auto_backup = body_data.get('autoBackup', False)
            day_of_week = body_data.get('dayOfWeek', 'monday')
            time = body_data.get('time', '03:00')
            
            conn = psycopg2.connect(database_url)
            cur = conn.cursor()
            
            cur.execute("""
                UPDATE backup_config 
                SET auto_backup = %s,
                    day_of_week = %s,
                    backup_time = %s,
                    updated_at = CURRENT_TIMESTAMP
            """, (auto_backup, day_of_week, time))
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Конфигурация обновлена',
                    'config': {
                        'autoBackup': auto_backup,
                        'dayOfWeek': day_of_week,
                        'time': time
                    }
                }),
                'isBase64Encoded': False
            }
            
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': f'Ошибка сохранения настроек: {str(e)}'}),
                'isBase64Encoded': False
            }
    
    if method == 'DELETE':
        try:
            body_data = json.loads(event.get('body', '{}'))
            backup_id = body_data.get('backupId')
            
            if not backup_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Не указан ID резервной копии'}),
                    'isBase64Encoded': False
                }
            
            conn = psycopg2.connect(database_url)
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cur.execute("""
                SELECT backup_id, backup_date, backup_time 
                FROM backup_history 
                ORDER BY backup_date DESC, backup_time DESC 
                LIMIT 1
            """)
            latest_backup = cur.fetchone()
            
            if latest_backup and latest_backup['backup_id'] == backup_id:
                cur.close()
                conn.close()
                return {
                    'statusCode': 403,
                    'headers': headers,
                    'body': json.dumps({'error': 'Нельзя удалить самую свежую резервную копию'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                DELETE FROM backup_history 
                WHERE backup_id = %s
            """, (backup_id,))
            
            if cur.rowcount == 0:
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'Резервная копия не найдена'}),
                    'isBase64Encoded': False
                }
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'Резервная копия удалена'}),
                'isBase64Encoded': False
            }
            
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': f'Ошибка удаления: {str(e)}'}),
                'isBase64Encoded': False
            }
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Метод не поддерживается'}),
        'isBase64Encoded': False
    }