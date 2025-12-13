import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для работы с реестром предписаний производственного контроля
    - Получение списка предписаний и нарушений с фильтрацией по пользователю
    - Создание предписаний и нарушений
    - Обновление статуса нарушений
    - Перенаправление нарушений другому пользователю
    - Подтверждение выполнения нарушений инициатором
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role, X-User-Fio',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    user_role = headers.get('X-User-Role') or headers.get('x-user-role')
    user_fio = headers.get('X-User-Fio') or headers.get('x-user-fio')
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    
    try:
        if method == 'GET':
            return get_prescriptions(conn, user_id, user_role, event)
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action', 'create')
            
            if action == 'create_prescription':
                return create_prescription(conn, body)
            elif action == 'create_violation':
                return create_violation(conn, body)
            elif action == 'redirect_violation':
                return redirect_violation(conn, body, user_fio)
            elif action == 'confirm_completion':
                return confirm_completion(conn, body, user_id)
            
            return {'statusCode': 400, 'body': json.dumps({'error': 'Unknown action'}), 'isBase64Encoded': False}
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return update_violation_status(conn, body)
        
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        conn.close()


def get_prescriptions(conn, user_id: str, user_role: str, event: Dict) -> Dict:
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    params = event.get('queryStringParameters') or {}
    schema = 't_p80499285_psot_realization_pro'
    
    is_admin = user_role in ['admin', 'superadmin', 'miniadmin']
    
    # Статистика
    stats_query = f'''
        SELECT 
            COUNT(DISTINCT pv.prescription_id) as total_prescriptions,
            COUNT(pv.id) as total_violations,
            SUM(CASE WHEN pv.status = 'completed' AND pv.confirmed_by_issuer = TRUE THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN pv.status = 'in_work' THEN 1 ELSE 0 END) as in_work,
            SUM(CASE WHEN pv.status = 'overdue' OR (pv.deadline < CURRENT_DATE AND pv.status != 'completed') THEN 1 ELSE 0 END) as overdue
        FROM {schema}.production_prescription_violations pv
    '''
    
    if not is_admin:
        stats_query += f" WHERE pv.assigned_user_id = {user_id}"
    
    cursor.execute(stats_query)
    stats = dict(cursor.fetchone())
    
    # Список нарушений
    violations_query = f'''
        SELECT 
            pv.*,
            p.issuer_fio,
            p.issuer_position,
            p.issuer_department,
            p.issuer_organization,
            CASE 
                WHEN pv.deadline < CURRENT_DATE AND pv.status != 'completed' THEN 'overdue'
                ELSE pv.status
            END as actual_status
        FROM {schema}.production_prescription_violations pv
        JOIN {schema}.production_prescriptions p ON pv.prescription_id = p.id
    '''
    
    where_clauses = []
    if not is_admin:
        where_clauses.append(f"pv.assigned_user_id = {user_id}")
    
    if params.get('status'):
        status = params['status']
        if status == 'overdue':
            where_clauses.append("(pv.deadline < CURRENT_DATE AND pv.status != 'completed')")
        else:
            where_clauses.append(f"pv.status = '{status}'")
    
    if params.get('prescription_id'):
        where_clauses.append(f"pv.prescription_id = {params['prescription_id']}")
    
    if where_clauses:
        violations_query += ' WHERE ' + ' AND '.join(where_clauses)
    
    violations_query += ' ORDER BY pv.deadline ASC, pv.id DESC'
    
    cursor.execute(violations_query)
    violations = [dict(row) for row in cursor.fetchall()]
    
    # Преобразуем даты в строки
    for v in violations:
        if isinstance(v.get('deadline'), date):
            v['deadline'] = v['deadline'].isoformat()
        if isinstance(v.get('completed_at'), datetime):
            v['completed_at'] = v['completed_at'].isoformat()
        if isinstance(v.get('created_at'), datetime):
            v['created_at'] = v['created_at'].isoformat()
        if isinstance(v.get('updated_at'), datetime):
            v['updated_at'] = v['updated_at'].isoformat()
    
    cursor.close()
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({
            'stats': stats,
            'violations': violations
        }),
        'isBase64Encoded': False
    }


def create_prescription(conn, body: Dict) -> Dict:
    cursor = conn.cursor()
    
    query = """
        INSERT INTO t_p80499285_psot_realization_pro.production_prescriptions 
        (issuer_fio, issuer_position, issuer_department, issuer_organization, assigned_user_id, assigned_user_fio)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    
    cursor.execute(query, (
        body['issuer_fio'],
        body['issuer_position'],
        body.get('issuer_department', ''),
        body['issuer_organization'],
        body['assigned_user_id'],
        body['assigned_user_fio']
    ))
    
    prescription_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 201,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'id': prescription_id}),
        'isBase64Encoded': False
    }


def create_violation(conn, body: Dict) -> Dict:
    cursor = conn.cursor()
    schema = 't_p80499285_psot_realization_pro'
    
    cursor.execute(f'''
        INSERT INTO {schema}.production_prescription_violations 
        (prescription_id, violation_text, assigned_user_id, assigned_user_fio, deadline)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    ''', (
        body['prescription_id'],
        body['violation_text'],
        body['assigned_user_id'],
        body['assigned_user_fio'],
        body['deadline']
    ))
    
    violation_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 201,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'id': violation_id}),
        'isBase64Encoded': False
    }


def update_violation_status(conn, body: Dict) -> Dict:
    cursor = conn.cursor()
    schema = 't_p80499285_psot_realization_pro'
    
    if body.get('status') == 'completed':
        cursor.execute(f'''
            UPDATE {schema}.production_prescription_violations 
            SET status = %s, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        ''', (body['status'], body['id']))
    else:
        cursor.execute(f'''
            UPDATE {schema}.production_prescription_violations 
            SET status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        ''', (body['status'], body['id']))
    
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }


def redirect_violation(conn, body: Dict, redirected_by: str) -> Dict:
    cursor = conn.cursor()
    schema = 't_p80499285_psot_realization_pro'
    
    cursor.execute(f'''
        UPDATE {schema}.production_prescription_violations 
        SET assigned_user_id = %s, assigned_user_fio = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
    ''', (body['new_user_id'], body['new_user_fio'], body['violation_id']))
    
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'success': True, 'message': f'Нарушение перенаправлено на {body["new_user_fio"]}'}),
        'isBase64Encoded': False
    }


def confirm_completion(conn, body: Dict, confirmer_id: str) -> Dict:
    cursor = conn.cursor()
    schema = 't_p80499285_psot_realization_pro'
    
    cursor.execute(f'''
        UPDATE {schema}.production_prescription_violations 
        SET confirmed_by_issuer = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
    ''', (body['violation_id'],))
    
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'success': True, 'message': 'Выполнение нарушения подтверждено'}),
        'isBase64Encoded': False
    }