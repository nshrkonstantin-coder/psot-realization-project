import json
import os
from datetime import datetime
from typing import Dict, Any
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Генерация следующего номера ПАБ в формате ПАБ-XXX-YY
    XXX - порядковый номер, YY - последние две цифры года
    '''
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    current_year = datetime.now().year
    year_short = str(current_year)[2:]
    
    # Получаем или создаём счётчик для текущего года
    cur.execute(
        "SELECT counter FROM pab_counter WHERE year = %s",
        (current_year,)
    )
    result = cur.fetchone()
    
    if result:
        counter = result[0] + 1
        cur.execute(
            "UPDATE pab_counter SET counter = %s WHERE year = %s",
            (counter, current_year)
        )
    else:
        counter = 1
        cur.execute(
            "INSERT INTO pab_counter (year, counter) VALUES (%s, %s)",
            (current_year, counter)
        )
    
    conn.commit()
    
    doc_number = f"ПАБ-{counter}-{year_short}"
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'doc_number': doc_number,
            'counter': counter,
            'year': current_year
        }, ensure_ascii=False),
        'isBase64Encoded': False
    }
