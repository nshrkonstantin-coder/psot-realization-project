import json
import os
from typing import Dict, Any
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Удаление записей производственного контроля
    Удаляет записи ПК и все связанные данные
    '''
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        body_str = event.get('body', '{}')
        if not body_str or body_str.strip() == '':
            body_str = '{}'
        body = json.loads(body_str)
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid JSON in request body'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    pc_ids = body.get('pc_ids', [])
    organization_id = body.get('organization_id')
    
    if not pc_ids or not isinstance(pc_ids, list):
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing or invalid pc_ids'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        
        ids_str = ','.join(str(id) for id in pc_ids)
        
        if organization_id:
            cur.execute(f"""
                SELECT id FROM production_control_reports 
                WHERE id IN ({ids_str}) AND organization_id = {organization_id}
            """)
            valid_ids = [row[0] for row in cur.fetchall()]
            if not valid_ids:
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'success': True,
                        'deleted_count': 0
                    }, ensure_ascii=False),
                    'isBase64Encoded': False
                }
            ids_str = ','.join(str(id) for id in valid_ids)
        
        cur.execute(f"""
            DELETE FROM production_control_photos WHERE report_id IN ({ids_str})
        """)
        
        cur.execute(f"""
            DELETE FROM production_control_signatures WHERE report_id IN ({ids_str})
        """)
        
        cur.execute(f"""
            DELETE FROM production_control_violations WHERE report_id IN ({ids_str})
        """)
        
        cur.execute(f"""
            DELETE FROM production_control_reports WHERE id IN ({ids_str})
        """)
        
        deleted_count = cur.rowcount
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'deleted_count': deleted_count
            }, ensure_ascii=False),
            'isBase64Encoded': False
        }
    except psycopg2.Error as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'Database error: {str(e)}. ВНИМАНИЕ: Возможно у пользователя БД нет прав на удаление этих таблиц. Обратитесь к администратору системы.'
            }, ensure_ascii=False),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'Unexpected error: {str(e)}'
            }, ensure_ascii=False),
            'isBase64Encoded': False
        }