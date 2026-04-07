import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Генерация уникального номера для предписания производственного контроля
    Проверяет все существующие номера в организации и возвращает следующий свободный
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
    
    if method == 'GET':
        params = event.get('queryStringParameters', {})
        organization_id = params.get('organization_id')
        
        if not organization_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'Missing organization_id'})
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        try:
            from datetime import datetime
            current_year = datetime.now().year
            short_year = str(current_year)[-2:]
            
            # Получаем все номера предписаний текущего года для организации
            cur.execute(f"""
                SELECT doc_number 
                FROM t_p80499285_psot_realization_pro.production_control_reports
                WHERE organization_id = {organization_id}
                AND EXTRACT(YEAR FROM created_at) = {current_year}
                ORDER BY id DESC
            """)
            
            existing_numbers = [row[0] for row in cur.fetchall()]
            
            # Извлекаем числовые части из существующих номеров (формат: ЭПК-N-YY)
            used_numbers = []
            for num in existing_numbers:
                if num and num.startswith('ЭПК-'):
                    parts = num.split('-')
                    if len(parts) >= 2:
                        try:
                            used_numbers.append(int(parts[1]))
                        except ValueError:
                            continue
            
            # Находим следующий свободный номер
            next_number = 1
            if used_numbers:
                next_number = max(used_numbers) + 1
            
            new_doc_number = f"ЭПК-{next_number}-{short_year}"
            
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
                    'doc_number': new_doc_number,
                    'year': current_year,
                    'sequence': next_number
                })
            }
        
        except Exception as e:
            cur.close()
            conn.close()
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': str(e)})
            }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
