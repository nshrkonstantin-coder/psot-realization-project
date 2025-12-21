"""
Backend функция для управления реестром пользователей ПАБ.
Обрабатывает запросы на получение, создание и обновление записей реестра.
"""

import json
import os
import psycopg2
from typing import Dict, Any, List
from datetime import datetime


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Обработчик запросов для работы с реестром пользователей ПАБ.
    
    GET /pab-registry - получить все записи реестра
    GET /pab-registry?user_id=X - получить записи конкретного пользователя
    POST /pab-registry - создать или обновить запись реестра
    
    Args:
        event: dict с httpMethod, queryStringParameters, body
        context: объект с атрибутами request_id, function_name, etc.
    
    Returns:
        HTTP response dict с данными реестра
    """
    method: str = event.get('httpMethod', 'GET')
    
    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
        'Content-Type': 'application/json'
    }
    
    # Handle OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': '',
            'isBase64Encoded': False
        }
    
    # Подключение к БД
    try:
        dsn = os.environ['DATABASE_URL']
        conn = psycopg2.connect(dsn)
        conn.autocommit = True
        cursor = conn.cursor()
        
        if method == 'GET':
            # Получение записей реестра с данными из users и pab_records
            params = event.get('queryStringParameters') or {}
            user_id = params.get('user_id')
            
            query = """
                SELECT 
                    u.id as user_id,
                    u.fio,
                    u.email,
                    COALESCE(o.name, u.company) as company,
                    u.subdivision,
                    u.position,
                    COUNT(DISTINCT pr.id) as audits_completed,
                    COUNT(po.id) as observations_made,
                    MAX(pr.doc_date) as last_audit_date
                FROM t_p80499285_psot_realization_pro.users u
                LEFT JOIN t_p80499285_psot_realization_pro.organizations o ON u.organization_id = o.id
                LEFT JOIN t_p80499285_psot_realization_pro.pab_records pr ON pr.inspector_fio = u.fio
                LEFT JOIN t_p80499285_psot_realization_pro.pab_observations po ON po.pab_record_id = pr.id
                WHERE 1=1
            """
            
            if user_id:
                query += " AND u.id = %s"
                query += """
                    GROUP BY u.id, u.fio, u.email, o.name, u.company, u.subdivision, u.position
                    ORDER BY last_audit_date DESC NULLS LAST
                """
                cursor.execute(query, (user_id,))
            else:
                query += """
                    GROUP BY u.id, u.fio, u.email, o.name, u.company, u.subdivision, u.position
                    ORDER BY last_audit_date DESC NULLS LAST
                """
                cursor.execute(query)
            
            rows = cursor.fetchall()
            records = []
            
            for row in rows:
                user_id = row[0]
                pab_number = f'ПАБ-{str(user_id).zfill(4)}'
                records.append({
                    'id': user_id,
                    'user_id': user_id,
                    'full_name': row[1],
                    'email': row[2] or '',
                    'company': row[3] or '',
                    'department': row[4] or '',
                    'position': row[5] or '',
                    'pab_number': pab_number,
                    'audit_date': row[8].isoformat() if row[8] else datetime.now().isoformat(),
                    'audits_completed': row[6] or 0,
                    'observations_made': row[7] or 0,
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'records': records, 'count': len(records)}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            # Создание или обновление записи реестра
            body_data = json.loads(event.get('body', '{}'))
            
            user_id = body_data.get('user_id')
            full_name = body_data.get('full_name')
            email = body_data.get('email', '')
            company = body_data.get('company', '')
            department = body_data.get('department', '')
            position = body_data.get('position', '')
            pab_number = body_data.get('pab_number', '')
            audits_increment = body_data.get('audits_increment', 0)
            observations_increment = body_data.get('observations_increment', 0)
            
            if not user_id or not full_name:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'user_id и full_name обязательны'}),
                    'isBase64Encoded': False
                }
            
            # Проверка существующей записи
            check_query = """
                SELECT id, audits_completed, observations_made 
                FROM t_p80499285_psot_realization_pro.user_pab_registry
                WHERE user_id = %s
            """
            cursor.execute(check_query, (user_id,))
            existing = cursor.fetchone()
            
            if existing:
                # Обновление существующей записи
                new_audits = existing[1] + audits_increment
                new_observations = existing[2] + observations_increment
                
                update_query = """
                    UPDATE t_p80499285_psot_realization_pro.user_pab_registry
                    SET full_name = %s, email = %s, company = %s, department = %s,
                        position = %s, pab_number = %s, audit_date = %s,
                        audits_completed = %s, observations_made = %s, 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                    RETURNING id, audits_completed, observations_made
                """
                cursor.execute(update_query, (
                    full_name, email, company, department, position, pab_number,
                    datetime.now(), new_audits, new_observations, user_id
                ))
                result = cursor.fetchone()
                
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'message': 'Запись обновлена',
                        'id': result[0],
                        'audits_completed': result[1],
                        'observations_made': result[2]
                    }),
                    'isBase64Encoded': False
                }
            else:
                # Создание новой записи
                insert_query = """
                    INSERT INTO t_p80499285_psot_realization_pro.user_pab_registry
                    (user_id, full_name, email, company, department, position, 
                     pab_number, audit_date, audits_completed, observations_made)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, audits_completed, observations_made
                """
                cursor.execute(insert_query, (
                    user_id, full_name, email, company, department, position,
                    pab_number, datetime.now(), audits_increment, observations_increment
                ))
                result = cursor.fetchone()
                
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 201,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'message': 'Запись создана',
                        'id': result[0],
                        'audits_completed': result[1],
                        'observations_made': result[2]
                    }),
                    'isBase64Encoded': False
                }
        
        else:
            return {
                'statusCode': 405,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Метод не поддерживается'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }