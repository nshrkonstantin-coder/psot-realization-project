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
    CRUD для поручений отдела ОТиПБ + настройки + ручной список специалистов.
    GET  ?action=settings              — получить настройки (источник специалистов)
    GET  ?action=manual_specialists    — ручной список специалистов
    GET  (default)                     — список поручений + специалисты по настройке
    POST action=save_settings          — сохранить настройки
    POST action=add_specialist         — добавить специалиста в ручной список
    POST (default)                     — создать поручение
    PUT                                — обновить поручение
    DELETE ?specialist_id=N            — удалить специалиста из ручного списка
    DELETE ?id=N                       — удалить поручение
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
        params = event.get('queryStringParameters') or {}
        action = params.get('action', '')
        org_id = params.get('organization_id')

        # ── GET settings ──────────────────────────────────────────────────────
        if method == 'GET' and action == 'settings':
            where = f"WHERE organization_id = {int(org_id)}" if org_id else "WHERE organization_id IS NULL"
            cur.execute(f"SELECT specialist_source FROM {SCHEMA}.otipb_settings {where} LIMIT 1")
            row = cur.fetchone()
            source = row[0] if row else 'asubt'
            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'specialist_source': source})}

        # ── GET manual specialists ─────────────────────────────────────────────
        if method == 'GET' and action == 'manual_specialists':
            where = f"WHERE organization_id = {int(org_id)}" if org_id else "WHERE organization_id IS NULL"
            cur.execute(f"""
                SELECT id, fio, position, email, phone, user_id, active
                FROM {SCHEMA}.otipb_specialists {where}
                ORDER BY fio
            """)
            specs = [{'id': r[0], 'fio': r[1], 'position': r[2], 'email': r[3],
                      'phone': r[4], 'user_id': r[5], 'active': r[6]} for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'specialists': specs})}

        # ── GET orders + specialists (main) ───────────────────────────────────
        if method == 'GET':
            order_id = params.get('id')
            user_id = params.get('user_id')

            if order_id:
                cur.execute(f"""
                    SELECT o.id, o.title, o.issued_date, o.deadline, o.responsible_person,
                           o.issued_by, o.status, o.extended_deadline, o.organization_id,
                           o.assigned_to_user_id, o.created_by_user_id, o.notes,
                           o.created_at, o.updated_at, u.fio as assigned_fio, o.last_action
                    FROM {SCHEMA}.ot_orders o
                    LEFT JOIN {SCHEMA}.users u ON o.assigned_to_user_id = u.id
                    WHERE o.id = {int(order_id)}
                """)
                row = cur.fetchone()
                if not row:
                    return {'statusCode': 404, 'headers': CORS, 'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': 'Поручение не найдено'})}
                return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': True, 'order': _row_to_dict(row)})}

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
                       o.created_at, o.updated_at, u.fio as assigned_fio, o.last_action
                FROM {SCHEMA}.ot_orders o
                LEFT JOIN {SCHEMA}.users u ON o.assigned_to_user_id = u.id
                {where}
                ORDER BY o.created_at DESC
            """)
            orders = [_row_to_dict(r) for r in cur.fetchall()]

            # Определяем источник специалистов
            settings_where = f"WHERE organization_id = {int(org_id)}" if org_id else "WHERE organization_id IS NULL"
            cur.execute(f"SELECT specialist_source FROM {SCHEMA}.otipb_settings {settings_where} LIMIT 1")
            s_row = cur.fetchone()
            source = s_row[0] if s_row else 'asubt'

            if source == 'manual':
                # Ручной список
                spec_where = f"WHERE organization_id = {int(org_id)} AND active = TRUE" if org_id else "WHERE organization_id IS NULL AND active = TRUE"
                cur.execute(f"""
                    SELECT COALESCE(u.id, ms.id + 100000), COALESCE(u.fio, ms.fio),
                           COALESCE(u.position, ms.position), ms.email, ms.phone
                    FROM {SCHEMA}.otipb_specialists ms
                    LEFT JOIN {SCHEMA}.users u ON ms.user_id = u.id
                    {spec_where}
                    ORDER BY COALESCE(u.fio, ms.fio)
                """)
                specialists = [{'id': r[0], 'fio': r[1], 'position': r[2],
                                'email': r[3], 'phone': r[4]} for r in cur.fetchall()]
            else:
                # АСУБТ — из базы users, фильтр по подразделению ОТиПБ
                spec_where_parts = ["role IN ('admin', 'miniadmin', 'user')"]
                if org_id:
                    spec_where_parts.append(f"organization_id = {int(org_id)}")
                spec_where_parts.append("(LOWER(subdivision) LIKE '%отипб%' OR LOWER(subdivision) LIKE '%охрана труда%' OR LOWER(subdivision) LIKE '%от и пб%' OR subdivision IS NULL OR subdivision = '')")
                cur.execute(f"""
                    SELECT id, fio, position, email FROM {SCHEMA}.users
                    WHERE {' AND '.join(spec_where_parts)}
                    ORDER BY fio
                """)
                specialists = [{'id': r[0], 'fio': r[1], 'position': r[2], 'email': r[3]} for r in cur.fetchall()]

            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'orders': orders, 'specialists': specialists,
                                       'specialist_source': source, 'total': len(orders)})}

        # ── POST: парсим тело один раз ────────────────────────────────────────
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            post_action_pre = body.get('action', '')

        # ── POST send_checklist_email ─────────────────────────────────────────
        if method == 'POST' and post_action_pre == 'send_checklist_email':
            to_email = (body.get('to_email') or '').strip()
            subject = (body.get('subject') or 'Чек-лист передачи вахты')
            html_content = body.get('html_content') or ''
            if not to_email or not html_content:
                return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Не указан email или содержимое'})}
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            smtp_host = os.environ.get('SMTP_HOST')
            smtp_port = int(os.environ.get('SMTP_PORT', '587'))
            smtp_user = os.environ.get('SMTP_USER')
            smtp_pass = (os.environ.get('SMTP_PASSWORD_NEW') or
                         os.environ.get('YANDEX_SMTP_PASSWORD') or
                         os.environ.get('SMTP_PASSWORD'))
            if not all([smtp_host, smtp_user, smtp_pass]):
                return {'statusCode': 500, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'SMTP не настроен'})}
            try:
                from email.header import Header
                mail_msg = MIMEMultipart('alternative')
                mail_msg['Subject'] = Header(subject, 'utf-8')
                mail_msg['From'] = smtp_user
                mail_msg['To'] = to_email
                mail_msg.attach(MIMEText(html_content, 'html', 'utf-8'))
                smtp_conn = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
                smtp_conn.ehlo()
                if smtp_port == 587:
                    smtp_conn.starttls()
                    smtp_conn.ehlo()
                smtp_conn.login(smtp_user, smtp_pass)
                smtp_conn.sendmail(smtp_user, [to_email], mail_msg.as_string())
                smtp_conn.quit()
                return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': True})}
            except Exception as e:
                return {'statusCode': 500, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': str(e)})}

        # ── POST send_checklist_internal ──────────────────────────────────────
        if method == 'POST' and post_action_pre == 'send_checklist_internal':
            sender_id = body.get('sender_id')
            receiver_id = body.get('receiver_id')
            message = (body.get('message') or '').strip()
            if not sender_id or not receiver_id or not message:
                return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Не указаны поля'})}
            # Находим или создаём приватный чат
            cur.execute(f"""
                SELECT c.id FROM {SCHEMA}.chats c
                WHERE c.type = 'private'
                AND EXISTS (SELECT 1 FROM {SCHEMA}.chat_participants p WHERE p.chat_id = c.id AND p.user_id = {int(sender_id)})
                AND EXISTS (SELECT 1 FROM {SCHEMA}.chat_participants p WHERE p.chat_id = c.id AND p.user_id = {int(receiver_id)})
                LIMIT 1
            """)
            chat_row = cur.fetchone()
            if chat_row:
                chat_id = chat_row[0]
            else:
                cur.execute(f"""
                    SELECT organization_id FROM {SCHEMA}.users WHERE id = {int(sender_id)}
                """)
                org_row = cur.fetchone()
                sender_org = org_row[0] if org_row else 'NULL'
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.chats (name, type, organization_id, created_by, created_at, is_active)
                    VALUES ('Передача вахты', 'private', {sender_org or 'NULL'}, {int(sender_id)}, NOW(), true)
                    RETURNING id
                """)
                chat_id = cur.fetchone()[0]
                for uid in [int(sender_id), int(receiver_id)]:
                    cur.execute(f"SELECT organization_id FROM {SCHEMA}.users WHERE id = {uid}")
                    r = cur.fetchone()
                    uid_org = r[0] if r else 'NULL'
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.chat_participants (chat_id, user_id, organization_id)
                        VALUES ({chat_id}, {uid}, {uid_org or 'NULL'})
                        ON CONFLICT DO NOTHING
                    """)
            msg_clean = message.replace("'", "''")
            cur.execute(f"""
                INSERT INTO {SCHEMA}.messages (chat_id, sender_id, sender_organization_id, message_text)
                SELECT {chat_id}, {int(sender_id)}, organization_id, '{msg_clean}'
                FROM {SCHEMA}.users WHERE id = {int(sender_id)}
            """)
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'chat_id': chat_id})}

        # ── POST save_settings ────────────────────────────────────────────────
        if method == 'POST':
            post_action = post_action_pre

            if post_action == 'save_settings':
                source = body.get('specialist_source', 'asubt')
                if source not in ('asubt', 'manual'):
                    return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': 'Неверный источник'})}
                org_val = str(int(org_id)) if org_id else 'NULL'
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.otipb_settings (organization_id, specialist_source, updated_at)
                    VALUES ({org_val}, '{source}', NOW())
                    ON CONFLICT (organization_id) DO UPDATE
                    SET specialist_source = EXCLUDED.specialist_source, updated_at = NOW()
                """)
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': True})}

            # ── POST add_specialist ────────────────────────────────────────────
            if post_action == 'add_specialist':
                fio = (body.get('fio') or '').strip().replace("'", "''")
                position = (body.get('position') or '').strip().replace("'", "''")
                email = (body.get('email') or '').strip().replace("'", "''")
                phone = (body.get('phone') or '').strip().replace("'", "''")
                user_id_val = body.get('user_id')
                if not fio:
                    return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                            'body': json.dumps({'success': False, 'error': 'ФИО обязательно'})}
                org_val = str(int(body.get('organization_id'))) if body.get('organization_id') else 'NULL'
                uid_val = str(int(user_id_val)) if user_id_val else 'NULL'
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.otipb_specialists (organization_id, fio, position, email, phone, user_id)
                    VALUES ({org_val}, '{fio}', '{position}', '{email}', '{phone}', {uid_val})
                    RETURNING id
                """)
                new_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': True, 'id': new_id})}

            # ── POST create order (default) ────────────────────────────────────
            title = (body.get('title') or '').strip().replace("'", "''")
            issued_date = body.get('issued_date', '')
            deadline = body.get('deadline', '')
            responsible_person = (body.get('responsible_person') or '').strip().replace("'", "''")
            issued_by = (body.get('issued_by') or '').strip().replace("'", "''")
            b_org_id = body.get('organization_id')
            assigned_to = body.get('assigned_to_user_id')
            created_by = body.get('created_by_user_id')
            notes = (body.get('notes') or '').strip().replace("'", "''")
            last_action = (body.get('last_action') or '').strip().replace("'", "''")

            if not title or not deadline or not responsible_person or not issued_by:
                return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Заполните обязательные поля'})}

            org_val = str(int(b_org_id)) if b_org_id else 'NULL'
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

        # ── PUT update order ───────────────────────────────────────────────────
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

        # ── DELETE ─────────────────────────────────────────────────────────────
        if method == 'DELETE':
            specialist_id = params.get('specialist_id')
            order_id = params.get('id')
            if specialist_id:
                cur.execute(f"DELETE FROM {SCHEMA}.otipb_specialists WHERE id = {int(specialist_id)}")
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': True})}
            if order_id:
                cur.execute(f"DELETE FROM {SCHEMA}.ot_orders WHERE id = {int(order_id)}")
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': True})}
            return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'id обязателен'})}

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