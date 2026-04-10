import json
import os
from typing import Dict, Any

SCHEMA = 't_p80499285_psot_realization_pro'
CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
}

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    CRUD для поручений отдела ОТиПБ.
    GET  — список поручений (фильтр по organization_id и/или user_id)
    POST — создать поручение
    PUT  — обновить статус / данные / last_action поручения
    DELETE — удалить поручение
    """
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    import psycopg2
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            org_id = params.get('organization_id')
            order_id = params.get('id')
            user_id = params.get('user_id')

            if order_id:
                cur.execute(f"""
                    SELECT o.id, o.title, o.issued_date, o.deadline, o.responsible_person,
                           o.issued_by, o.status, o.extended_deadline, o.organization_id,
                           o.assigned_to_user_id, o.created_by_user_id, o.notes,
                           o.created_at, o.updated_at,
                           u.fio as assigned_fio, o.last_action
                    FROM {SCHEMA}.ot_orders o
                    LEFT JOIN {SCHEMA}.users u ON o.assigned_to_user_id = u.id
                    WHERE o.id = {int(order_id)}
                """)
                row = cur.fetchone()
                if not row:
                    return {'statusCode': 404, 'headers': CORS, 'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': 'Поручение не найдено'})}
                order = _row_to_dict(row)
                return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': True, 'order': order})}

            conditions = []
            if org_id:
                conditions.append(f"o.organization_id = {int(org_id)}")
            if user_id:
                conditions.append(f"(o.assigned_to_user_id = {int(user_id)} OR o.created_by_user_id = {int(user_id)})")

            where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

            cur.execute(f"""
                SELECT o.id, o.title, o.issued_date, o.deadline, o.responsible_person,
                       o.issued_by, o.status, o.extended_deadline, o.organization_id,
                       o.assigned_to_user_id, o.created_by_user_id, o.notes,
                       o.created_at, o.updated_at,
                       u.fio as assigned_fio, o.last_action
                FROM {SCHEMA}.ot_orders o
                LEFT JOIN {SCHEMA}.users u ON o.assigned_to_user_id = u.id
                {where}
                ORDER BY o.created_at DESC
            """)
            orders = [_row_to_dict(r) for r in cur.fetchall()]

            # Список специалистов отдела для выбора ответственного
            spec_where = ''
            if org_id:
                spec_where = f"AND organization_id = {int(org_id)}"
            cur.execute(f"""
                SELECT id, fio, position FROM {SCHEMA}.users
                WHERE role IN ('admin', 'miniadmin', 'user') {spec_where}
                ORDER BY fio
            """)
            specialists = [{'id': r[0], 'fio': r[1], 'position': r[2]} for r in cur.fetchall()]

            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'orders': orders, 'specialists': specialists,
                                       'total': len(orders)})}

        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            title = (body.get('title') or '').strip().replace("'", "''")
            issued_date = body.get('issued_date', '')
            deadline = body.get('deadline', '')
            responsible_person = (body.get('responsible_person') or '').strip().replace("'", "''")
            issued_by = (body.get('issued_by') or '').strip().replace("'", "''")
            org_id = body.get('organization_id')
            assigned_to = body.get('assigned_to_user_id')
            created_by = body.get('created_by_user_id')
            notes = (body.get('notes') or '').strip().replace("'", "''")
            last_action = (body.get('last_action') or '').strip().replace("'", "''")

            if not title or not deadline or not responsible_person or not issued_by:
                return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Заполните обязательные поля'})}

            org_val = str(int(org_id)) if org_id else 'NULL'
            assigned_val = str(int(assigned_to)) if assigned_to else 'NULL'
            created_val = str(int(created_by)) if created_by else 'NULL'
            issued_date_val = f"'{issued_date}'" if issued_date else 'CURRENT_DATE'
            last_action_val = f"'{last_action}'" if last_action else 'NULL'

            cur.execute(f"""
                INSERT INTO {SCHEMA}.ot_orders
                    (title, issued_date, deadline, responsible_person, issued_by,
                     status, organization_id, assigned_to_user_id, created_by_user_id, notes, last_action)
                VALUES
                    ('{title}', {issued_date_val}, '{deadline}', '{responsible_person}', '{issued_by}',
                     'new', {org_val}, {assigned_val}, {created_val}, '{notes}', {last_action_val})
                RETURNING id
            """)
            new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'id': new_id})}

        if method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            order_id = body.get('id')
            if not order_id:
                return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'id обязателен'})}

            sets = []
            if 'status' in body:
                st = body['status'].replace("'", "''")
                if st in ('new', 'completed', 'extended'):
                    sets.append(f"status = '{st}'")
            if 'extended_deadline' in body:
                val = body['extended_deadline']
                sets.append(f"extended_deadline = '{val}'" if val else "extended_deadline = NULL")
            if 'title' in body:
                sets.append(f"title = '{body['title'].replace(chr(39), chr(39)+chr(39))}'")
            if 'deadline' in body:
                sets.append(f"deadline = '{body['deadline']}'")
            if 'responsible_person' in body:
                sets.append(f"responsible_person = '{body['responsible_person'].replace(chr(39), chr(39)+chr(39))}'")
            if 'assigned_to_user_id' in body:
                val = body['assigned_to_user_id']
                sets.append(f"assigned_to_user_id = {int(val)}" if val else "assigned_to_user_id = NULL")
            if 'notes' in body:
                sets.append(f"notes = '{body['notes'].replace(chr(39), chr(39)+chr(39))}'")
            if 'last_action' in body:
                val = (body['last_action'] or '').replace("'", "''")
                sets.append(f"last_action = '{val}'" if val else "last_action = NULL")

            if not sets:
                return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Нет данных для обновления'})}

            sets.append("updated_at = NOW()")
            cur.execute(f"UPDATE {SCHEMA}.ot_orders SET {', '.join(sets)} WHERE id = {int(order_id)}")
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True})}

        if method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            order_id = params.get('id')
            if not order_id:
                return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'id обязателен'})}
            cur.execute(f"DELETE FROM {SCHEMA}.ot_orders WHERE id = {int(order_id)}")
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True})}

        return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}

    finally:
        cur.close()
        conn.close()


def _row_to_dict(row):
    return {
        'id': row[0],
        'title': row[1],
        'issued_date': row[2].isoformat() if row[2] else None,
        'deadline': row[3].isoformat() if row[3] else None,
        'responsible_person': row[4],
        'issued_by': row[5],
        'status': row[6],
        'extended_deadline': row[7].isoformat() if row[7] else None,
        'organization_id': row[8],
        'assigned_to_user_id': row[9],
        'created_by_user_id': row[10],
        'notes': row[11],
        'created_at': row[12].isoformat() if row[12] else None,
        'updated_at': row[13].isoformat() if row[13] else None,
        'assigned_fio': row[14],
        'last_action': row[15],
    }
