import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Database information and data viewer for superadmin
    Args: event - dict with httpMethod, body
          context - object with attributes: request_id, function_name
    Returns: HTTP response dict with database info or table data
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        # Получаем текущую схему из search_path
        cur.execute("SELECT current_schema()")
        current_schema = cur.fetchone()[0]
        
        try:
            if action == 'list_tables':
                # Получаем список всех таблиц
                cur.execute(f"""
                    SELECT table_name, table_schema
                    FROM information_schema.tables 
                    WHERE table_schema = '{current_schema}' 
                    AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                """)
                
                tables = []
                for row in cur.fetchall():
                    table_name = row[0]
                    table_schema = row[1]
                    # Получаем количество строк отдельным запросом
                    try:
                        cur.execute(f'SELECT COUNT(*) FROM "{table_schema}"."{table_name}"')
                        row_count = cur.fetchone()[0]
                    except:
                        row_count = 0
                    
                    tables.append({
                        'table_name': table_name,
                        'schema_name': table_schema,
                        'row_count': row_count
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'tables': tables, 'schema': current_schema})
                }
            
            elif action == 'table_structure':
                table_name = body_data.get('table_name', '').replace("'", "''")
                
                cur.execute(f"""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_schema = '{current_schema}'
                    AND table_name = '{table_name}'
                    ORDER BY ordinal_position
                """)
                
                columns = []
                for row in cur.fetchall():
                    columns.append({
                        'column_name': row[0],
                        'data_type': row[1]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'columns': columns})
                }
            
            elif action == 'table_data':
                table_name = body_data.get('table_name', '').replace("'", "''")
                limit = body_data.get('limit', 50)
                search = body_data.get('search', '')
                
                # Базовый запрос
                query = f'SELECT * FROM "{current_schema}"."{table_name}"'
                
                # Добавляем поиск если есть
                if search:
                    search_esc = search.replace("'", "''")
                    # Получаем список столбцов для поиска
                    cur.execute(f"""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = '{current_schema}'
                        AND table_name = '{table_name}'
                        AND data_type IN ('character varying', 'text')
                    """)
                    text_columns = [row[0] for row in cur.fetchall()]
                    
                    if text_columns:
                        where_clauses = [f"{col}::text ILIKE '%{search_esc}%'" for col in text_columns]
                        query += f" WHERE {' OR '.join(where_clauses)}"
                
                query += f" LIMIT {limit}"
                
                cur.execute(query)
                
                # Получаем названия столбцов
                column_names = [desc[0] for desc in cur.description]
                
                # Формируем результат
                rows = []
                for row in cur.fetchall():
                    row_dict = {}
                    for i, value in enumerate(row):
                        # Преобразуем datetime в строку
                        if hasattr(value, 'isoformat'):
                            row_dict[column_names[i]] = value.isoformat()
                        else:
                            row_dict[column_names[i]] = value
                    rows.append(row_dict)
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'rows': rows})
                }
            
            else:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'Unknown action'})
                }
                
        except Exception as e:
            print(f'Error in database-info: {str(e)}')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': str(e)})
            }
        finally:
            cur.close()
            conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }