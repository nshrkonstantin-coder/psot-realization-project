import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Генерирует номер ПАБ в формате ПАБ-{counter}-{year}
    Args: event - dict с httpMethod
          context - объект с атрибутами request_id, function_name
    Returns: JSON с номером ПАБ
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        dsn = os.environ.get('DATABASE_URL')
        if not dsn:
            raise ValueError('DATABASE_URL not set')
        
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        
        schema = 't_p80499285_psot_realization_pro'
        
        cur.execute(f"SELECT year, counter FROM {schema}.pab_counter WHERE id = 1")
        result = cur.fetchone()
        
        if not result:
            cur.execute(f"INSERT INTO {schema}.pab_counter (id, year, counter) VALUES (1, 2025, 1)")
            conn.commit()
            year = 2025
            counter = 1
        else:
            year, counter = result
            current_year = 2025
            
            if year != current_year:
                counter = 1
                year = current_year
                cur.execute(f"UPDATE {schema}.pab_counter SET year = {year}, counter = {counter} WHERE id = 1")
            else:
                counter += 1
                cur.execute(f"UPDATE {schema}.pab_counter SET counter = {counter} WHERE id = 1")
            
            conn.commit()
        
        pab_number = f"ПАБ-{counter}-{str(year)[2:]}"
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'pabNumber': pab_number, 'counter': counter, 'year': year}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
