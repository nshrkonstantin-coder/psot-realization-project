import json
import os
from typing import Dict, Any
import psycopg2
import base64
from io import BytesIO
import openpyxl
import csv
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Импорт сотрудников из Excel/CSV файла
    Обрабатывает загруженный файл и добавляет сотрудников в базу
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
    file_content = body_data.get('fileContent', '')
    file_name = body_data.get('fileName', '')
    org_id = body_data.get('organizationId', 1)
    
    if not file_content:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'File content is required'}),
            'isBase64Encoded': False
        }
    
    try:
        if file_content.startswith('data:'):
            file_content = file_content.split(',')[1]
        
        file_bytes = base64.b64decode(file_content)
        file_buffer = BytesIO(file_bytes)
        
        employees = []
        
        if file_name.endswith('.csv'):
            file_buffer.seek(0)
            text_content = file_buffer.read().decode('utf-8-sig')
            csv_reader = csv.DictReader(text_content.splitlines())
            
            for row in csv_reader:
                employees.append({
                    'code': row.get('Код', row.get('code', '')),
                    'fio': row.get('ФИО', row.get('fio', '')),
                    'position': row.get('Должность', row.get('position', '')),
                    'department': row.get('Подразделение', row.get('department', '')),
                    'phone': row.get('Телефон', row.get('phone', '')),
                    'email': row.get('Email', row.get('email', ''))
                })
        
        elif file_name.endswith(('.xlsx', '.xls')):
            workbook = openpyxl.load_workbook(file_buffer)
            sheet = workbook.active
            
            headers = []
            for cell in sheet[1]:
                headers.append(cell.value)
            
            header_map = {}
            for idx, header in enumerate(headers):
                if header in ['Код', 'code']:
                    header_map['code'] = idx
                elif header in ['ФИО', 'fio']:
                    header_map['fio'] = idx
                elif header in ['Должность', 'position']:
                    header_map['position'] = idx
                elif header in ['Подразделение', 'department']:
                    header_map['department'] = idx
                elif header in ['Телефон', 'phone']:
                    header_map['phone'] = idx
                elif header in ['Email', 'email']:
                    header_map['email'] = idx
            
            for row in sheet.iter_rows(min_row=2, values_only=True):
                if not any(row):
                    continue
                    
                emp = {
                    'code': str(row[header_map.get('code', 0)] or ''),
                    'fio': str(row[header_map.get('fio', 1)] or ''),
                    'position': str(row[header_map.get('position', 2)] or ''),
                    'department': str(row[header_map.get('department', 3)] or ''),
                    'phone': str(row[header_map.get('phone', 4)] or ''),
                    'email': str(row[header_map.get('email', 5)] or '')
                }
                employees.append(emp)
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Unsupported file format. Use .xlsx, .xls, or .csv'}),
                'isBase64Encoded': False
            }
        
        if not employees:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No employees found in file'}),
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
            
            if not emp_fio or emp_fio == 'None':
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
                    login = emp_email if emp_email and emp_email != 'None' else f"user_{emp_code}"
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
            VALUES ('file', NOW(), 'success', %s, %s)
        """
        log_details = json.dumps({
            'fileName': file_name,
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
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
