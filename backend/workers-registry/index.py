import json
import os
import uuid
import base64
import psycopg2
from typing import Dict, Any

SCHEMA = 't_p80499285_psot_realization_pro'
CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
}

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Реестр работников отдела ОТиПБ.
    GET  ?action=list               — список работников (краткая info)
    GET  ?action=worker&id=N        — полная карточка работника
    GET  ?action=columns            — конфигурация колонок
    GET  ?action=files              — список загруженных файлов
    GET  ?action=qr&token=XXX       — найти работника по QR-токену (внутри системы)
    POST action=analyze_excel       — анализ Excel: вернуть заголовки колонок (этап 1)
    POST action=import_excel        — импорт данных из Excel (этап 2)
    POST action=add_worker          — добавить работника вручную
    POST action=update_worker       — обновить данные работника
    POST action=upload_file_only    — сохранить файл реестра в S3 (для главного администратора)
    """
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        params = event.get('queryStringParameters') or {}
        action = params.get('action', '')
        org_id = params.get('organization_id', '')

        # ── GET list ──────────────────────────────────────────────────────────
        if method == 'GET' and action == 'list':
            cur.execute(
                f"""SELECT id, worker_number, qr_token, fio, subdivision, position_name
                    FROM {SCHEMA}.wr_employees
                    WHERE organization_id = %s AND archived = FALSE
                    ORDER BY fio""",
                (org_id,)
            )
            rows = cur.fetchall()
            workers = []
            for r in rows:
                workers.append({
                    'id': r[0],
                    'worker_number': r[1],
                    'qr_token': r[2],
                    'fio': r[3],
                    'subdivision': r[4],
                    'position': r[5]
                })
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True, 'workers': workers}, ensure_ascii=False)}

        # ── GET worker by id ──────────────────────────────────────────────────
        if method == 'GET' and action == 'worker':
            wid = params.get('id')
            cur.execute(
                f"SELECT id, worker_number, qr_token, fio, subdivision, position_name, extra_data, created_at FROM {SCHEMA}.wr_employees WHERE id = %s AND archived = FALSE",
                (wid,)
            )
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'Работник не найден'})}
            extra = r[6] if r[6] else {}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True,
                'worker': {
                    'id': r[0], 'worker_number': r[1], 'qr_token': r[2],
                    'fio': r[3], 'subdivision': r[4], 'position': r[5],
                    'extra_data': extra, 'created_at': str(r[7])
                }
            }, ensure_ascii=False)}

        # ── GET columns ───────────────────────────────────────────────────────
        if method == 'GET' and action == 'columns':
            cur.execute(
                f"SELECT column_key, column_label, column_order, column_type, is_core FROM {SCHEMA}.workers_registry_columns WHERE organization_id = %s ORDER BY column_order",
                (org_id,)
            )
            cols = [{'key': r[0], 'label': r[1], 'order': r[2], 'type': r[3], 'is_core': r[4]} for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True, 'columns': cols}, ensure_ascii=False)}

        # ── GET files ─────────────────────────────────────────────────────────
        if method == 'GET' and action == 'files':
            cur.execute(
                f"SELECT id, file_name, file_url, file_size, uploaded_at, is_active FROM {SCHEMA}.workers_registry_files WHERE organization_id = %s ORDER BY uploaded_at DESC",
                (org_id,)
            )
            files = [{'id': r[0], 'file_name': r[1], 'file_url': r[2], 'file_size': r[3], 'uploaded_at': str(r[4]), 'is_active': r[5]} for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True, 'files': files}, ensure_ascii=False)}

        # ── GET by QR token ───────────────────────────────────────────────────
        if method == 'GET' and action == 'qr':
            token = params.get('token', '')
            cur.execute(
                f"SELECT id, worker_number, fio, subdivision, position_name, extra_data FROM {SCHEMA}.wr_employees WHERE qr_token = %s AND archived = FALSE",
                (token,)
            )
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'Работник не найден'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True,
                'worker': {'id': r[0], 'worker_number': r[1], 'fio': r[2], 'subdivision': r[3], 'position': r[4], 'extra_data': r[5] or {}}
            }, ensure_ascii=False)}

        # ── POST: разбираем тело ──────────────────────────────────────────────
        if method == 'POST':
            body_raw = event.get('body', '{}') or '{}'
            if event.get('isBase64Encoded'):
                body_raw = base64.b64decode(body_raw).decode('utf-8')
            body = json.loads(body_raw)
            action_post = body.get('action', action)

            # ── analyze_excel: анализ заголовков Excel (этап 1) ───────────────
            if action_post == 'analyze_excel':
                headers_list = body.get('headers', [])
                o_id = body.get('organization_id', org_id)

                # Очищаем старые колонки организации
                cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.wr_employees WHERE organization_id = %s AND archived = FALSE", (o_id,))
                worker_count = cur.fetchone()[0]

                if worker_count == 0:
                    cur.execute(f"UPDATE {SCHEMA}.workers_registry_columns SET column_order = -1 WHERE organization_id = %s", (o_id,))

                # Сохраняем новые колонки
                core_fields = {'фио': ('fio', True), 'ф.и.о': ('fio', True), 'ф.и.о.': ('fio', True),
                               'подразделение': ('subdivision', True), 'отдел': ('subdivision', True),
                               'должность': ('position_name', True)}

                for i, h in enumerate(headers_list):
                    h_lower = h.lower().strip()
                    is_core = h_lower in core_fields
                    col_key = core_fields.get(h_lower, (h, False))[0] if is_core else h
                    cur.execute(
                        f"""INSERT INTO {SCHEMA}.workers_registry_columns (organization_id, column_key, column_label, column_order, column_type, is_core)
                            VALUES (%s, %s, %s, %s, 'text', %s)
                            ON CONFLICT DO NOTHING""",
                        (o_id, col_key, h, i, is_core)
                    )

                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                    'success': True,
                    'message': f'Структура сформирована: {len(headers_list)} колонок',
                    'headers': headers_list,
                    'worker_count': worker_count
                }, ensure_ascii=False)}

            # ── import_excel: импорт строк данных (этап 2) ───────────────────
            if action_post == 'import_excel':
                rows_data = body.get('rows', [])
                headers_list = body.get('headers', [])
                o_id = body.get('organization_id', org_id)
                user_id = body.get('user_id', '')
                file_name = body.get('file_name', 'registry.xlsx')
                file_url = body.get('file_url', '')
                file_size = body.get('file_size', 0)

                core_map = {}
                for h in headers_list:
                    h_lower = h.lower().strip()
                    if h_lower in ('фио', 'ф.и.о', 'ф.и.о.', 'фамилия имя отчество'):
                        core_map['fio'] = h
                    elif h_lower in ('подразделение', 'отдел', 'цех', 'участок'):
                        core_map['subdivision'] = h
                    elif h_lower in ('должность', 'профессия'):
                        core_map['position_name'] = h

                imported = 0
                for row in rows_data:
                    fio = row.get(core_map.get('fio', ''), '')
                    if not fio or not str(fio).strip():
                        continue

                    subdivision = row.get(core_map.get('subdivision', ''), '')
                    position_name = row.get(core_map.get('position_name', ''), '')

                    extra = {k: str(v) if v is not None else '' for k, v in row.items()}

                    qr_token = str(uuid.uuid4()).replace('-', '')[:32]

                    cur.execute(
                        f"""SELECT id FROM {SCHEMA}.wr_employees
                            WHERE organization_id = %s AND fio = %s AND archived = FALSE""",
                        (o_id, str(fio).strip())
                    )
                    existing = cur.fetchone()

                    if existing:
                        cur.execute(
                            f"""UPDATE {SCHEMA}.wr_employees
                                SET subdivision = %s, position_name = %s, extra_data = %s, updated_at = NOW()
                                WHERE id = %s""",
                            (str(subdivision), str(position_name), json.dumps(extra, ensure_ascii=False), existing[0])
                        )
                    else:
                        cur.execute(
                            f"SELECT COUNT(*) FROM {SCHEMA}.wr_employees WHERE organization_id = %s",
                            (o_id,)
                        )
                        count = cur.fetchone()[0] + 1
                        worker_number = f"WR-{o_id}-{count:04d}"

                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.wr_employees
                                (organization_id, worker_number, qr_token, fio, subdivision, position_name, extra_data, source_file_id, created_by_user_id)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, NULL, %s)""",
                            (o_id, worker_number, qr_token, str(fio).strip(), str(subdivision), str(position_name),
                             json.dumps(extra, ensure_ascii=False), user_id if user_id else None)
                        )
                        imported += 1

                # Сохраняем запись о файле
                if file_url:
                    cur.execute(
                        f"""INSERT INTO {SCHEMA}.workers_registry_files (organization_id, file_name, file_url, file_size, uploaded_by_user_id, is_active)
                            VALUES (%s, %s, %s, %s, %s, TRUE)""",
                        (o_id, file_name, file_url, file_size, user_id if user_id else None)
                    )

                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                    'success': True,
                    'imported': imported,
                    'total': len(rows_data),
                    'message': f'Импортировано {imported} новых работников'
                }, ensure_ascii=False)}

            # ── add_worker: ручное добавление ─────────────────────────────────
            if action_post == 'add_worker':
                o_id = body.get('organization_id', org_id)
                fio = body.get('fio', '').strip()
                subdivision = body.get('subdivision', '')
                position_name = body.get('position_name', '')
                extra = body.get('extra_data', {})
                user_id = body.get('user_id', '')

                if not fio:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'ФИО обязательно'})}

                cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.wr_employees WHERE organization_id = %s", (o_id,))
                count = cur.fetchone()[0] + 1
                worker_number = f"WR-{o_id}-{count:04d}"
                qr_token = str(uuid.uuid4()).replace('-', '')[:32]

                cur.execute(
                    f"""INSERT INTO {SCHEMA}.wr_employees
                        (organization_id, worker_number, qr_token, fio, subdivision, position_name, extra_data, created_by_user_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (o_id, worker_number, qr_token, fio, subdivision, position_name,
                     json.dumps(extra, ensure_ascii=False), user_id if user_id else None)
                )
                new_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                    'success': True, 'id': new_id, 'worker_number': worker_number
                }, ensure_ascii=False)}

            # ── update_worker: обновление данных ─────────────────────────────
            if action_post == 'update_worker':
                wid = body.get('id')
                fio = body.get('fio', '').strip()
                subdivision = body.get('subdivision', '')
                position_name = body.get('position_name', '')
                extra = body.get('extra_data', {})

                cur.execute(
                    f"""UPDATE {SCHEMA}.wr_employees
                        SET fio = %s, subdivision = %s, position_name = %s, extra_data = %s, updated_at = NOW()
                        WHERE id = %s""",
                    (fio, subdivision, position_name, json.dumps(extra, ensure_ascii=False), wid)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True}, ensure_ascii=False)}

        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'Неизвестный action'})}

    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': CORS, 'body': json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False)}
    finally:
        cur.close()
        conn.close()