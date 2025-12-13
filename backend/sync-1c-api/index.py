import json
import os
from typing import Dict, Any
import psycopg2
import requests
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Синхронизация сотрудников из 1С через HTTP API
    Загружает данные сотрудников из REST API 1С в базу данных
    '''
    
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Only POST allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    api_url = body_data.get('apiUrl', '')
    api_login = body_data.get('apiLogin', '')
    api_password = body_data.get('apiPassword', '')
    test_only = body_data.get('testOnly', False)
    
    if not api_url:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'API URL is required'}),
            'isBase64Encoded': False
        }
    
    try:
        auth = None
        if api_login and api_password:
            auth = (api_login, api_password)
        
        response = requests.get(api_url, auth=auth, timeout=30)
        
        if response.status_code != 200:
            return {
                'statusCode': 502,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'error': f'1C API returned status {response.status_code}',
                    'details': response.text[:500]
                }),
                'isBase64Encoded': False
            }
        
        data = response.json()
        
        if test_only:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'message': 'Connection successful',
                    'sample': data
                }),
                'isBase64Encoded': False
            }
        
        employees = data.get('employees', [])
        
        if not employees:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No employees found in API response'}),
                'isBase64Encoded': False
            }
        
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Database not configured'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        org_id = body_data.get('organizationId', 1)
        
        inserted_count = 0
        updated_count = 0
        errors = []
        
        for emp in employees:
            emp_code = emp.get('code', '')
            emp_fio = emp.get('fio', '')
            emp_position = emp.get('position', '')
            emp_department = emp.get('department', '')
            emp_phone = emp.get('phone', '')
            emp_email = emp.get('email', '')
            
            if not emp_fio:
                errors.append(f"Skipped employee with empty FIO: {emp_code}")
                continue
            
            try:
                check_query = """
                    SELECT id FROM t_p80499285_psot_realization_pro.users
                    WHERE fio = %s AND organization_id = %s
                """
                cursor.execute(check_query, (emp_fio, org_id))
                existing_user = cursor.fetchone()
                
                if existing_user:
                    update_query = """
                        UPDATE t_p80499285_psot_realization_pro.users
                        SET position = %s, department = %s, phone = %s, email = %s, employee_code = %s
                        WHERE id = %s
                    """
                    cursor.execute(update_query, (
                        emp_position, emp_department, emp_phone, emp_email, emp_code, existing_user[0]
                    ))
                    updated_count += 1
                else:
                    insert_query = """
                        INSERT INTO t_p80499285_psot_realization_pro.users
                        (fio, position, department, phone, email, employee_code, organization_id, role, login, password_hash, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 'user', %s, '', NOW())
                    """
                    login = emp_email if emp_email else f"user_{emp_code}"
                    cursor.execute(insert_query, (
                        emp_fio, emp_position, emp_department, emp_phone, emp_email, emp_code, org_id, login
                    ))
                    inserted_count += 1
                    
            except Exception as e:
                errors.append(f"Error processing {emp_fio}: {str(e)}")
                continue
        
        insert_log_query = """
            INSERT INTO t_p80499285_psot_realization_pro.integration_1c_logs
            (sync_type, sync_date, status, employees_count, details)
            VALUES ('api', NOW(), 'success', %s, %s)
        """
        log_details = json.dumps({
            'inserted': inserted_count,
            'updated': updated_count,
            'errors': errors[:10]
        })
        cursor.execute(insert_log_query, (inserted_count + updated_count, log_details))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'inserted': inserted_count,
                'updated': updated_count,
                'total': inserted_count + updated_count,
                'errors': errors
            }),
            'isBase64Encoded': False
        }
        
    except requests.exceptions.Timeout:
        return {
            'statusCode': 504,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Request to 1C API timed out'}),
            'isBase64Encoded': False
        }
    except requests.exceptions.RequestException as e:
        return {
            'statusCode': 502,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Failed to connect to 1C API: {str(e)}'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
