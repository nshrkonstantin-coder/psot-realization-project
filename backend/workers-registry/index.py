import json
import os
import uuid
import base64
import psycopg2
from typing import Dict, Any


def next_worker_number(cur, schema: str) -> str:
    """
    Возвращает следующий уникальный №ID формата WR-XXXXX.
    Берёт MAX существующего числового суффикса (включая archived)
    и прибавляет 1 — номер никогда не переиспользуется.
    """
    cur.execute(
        f"""SELECT MAX(CAST(SUBSTRING(worker_number FROM 4) AS INTEGER))
            FROM {schema}.wr_employees
            WHERE worker_number ~ '^WR-[0-9]+$'"""
    )
    row = cur.fetchone()
    current_max = row[0] if row and row[0] else 0
    return f"WR-{current_max + 1:05d}"

SCHEMA = 't_p80499285_psot_realization_pro'
CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
}

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Реестр работников отдела ОТиПБ.
    GET  ?action=list&sheet=ИТР-1   — список работников (по листу или всех)
    GET  ?action=worker&id=N        — полная карточка работника
    GET  ?action=columns&sheet=X    — конфигурация колонок листа
    GET  ?action=sheets             — список листов
    GET  ?action=files              — загруженные файлы
    GET  ?action=qr&token=XXX       — найти по QR-токену
    POST action=analyze_excel       — сохранить структуру всех листов (этап 1)
    POST action=import_sheet        — импорт данных одного листа (этап 2)
    POST action=add_worker          — добавить вручную
    POST action=update_worker       — обновить данные работника
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
        _org_raw = params.get('organization_id', '')
        org_id = int(_org_raw) if _org_raw and str(_org_raw).strip().isdigit() else None

        # ── GET list ──────────────────────────────────────────────────────────
        if method == 'GET' and action == 'list':
            sheet_name = params.get('sheet', '')
            user_id_param = params.get('user_id', '')
            uid_p = int(user_id_param) if user_id_param and user_id_param.isdigit() else None

            if not org_id and uid_p:
                cur.execute(f"SELECT organization_id FROM {SCHEMA}.users WHERE id = %s", (uid_p,))
                r0 = cur.fetchone()
                if r0 and r0[0]: org_id = r0[0]

            if org_id:
                org_cond = "organization_id = %s"
                org_args = [org_id]
            else:
                org_cond = "1=1"
                org_args = []

            if sheet_name:
                cur.execute(
                    f"""SELECT id, worker_number, qr_token, fio, subdivision, position_name, sheet_name, extra_data
                        FROM {SCHEMA}.wr_employees
                        WHERE {org_cond} AND archived = FALSE AND sheet_name = %s
                        ORDER BY sort_order, id""",
                    org_args + [sheet_name]
                )
            else:
                cur.execute(
                    f"""SELECT id, worker_number, qr_token, fio, subdivision, position_name, sheet_name, extra_data
                        FROM {SCHEMA}.wr_employees
                        WHERE {org_cond} AND archived = FALSE
                        ORDER BY sheet_name, sort_order, id""",
                    org_args
                )
            rows = cur.fetchall()
            workers = [{'id': r[0], 'worker_number': r[1], 'qr_token': r[2],
                        'fio': r[3], 'subdivision': r[4], 'position': r[5], 'sheet_name': r[6],
                        'extra_data': r[7] or {}}
                       for r in rows]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'workers': workers}, ensure_ascii=False)}

        # ── GET worker ────────────────────────────────────────────────────────
        if method == 'GET' and action == 'worker':
            wid = params.get('id')
            cur.execute(
                f"""SELECT id, worker_number, qr_token, fio, subdivision, position_name,
                           extra_data, created_at, sheet_name
                    FROM {SCHEMA}.wr_employees WHERE id = %s AND archived = FALSE""",
                (wid,)
            )
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS,
                        'body': json.dumps({'success': False, 'error': 'Работник не найден'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True,
                'worker': {'id': r[0], 'worker_number': r[1], 'qr_token': r[2],
                           'fio': r[3], 'subdivision': r[4], 'position': r[5],
                           'extra_data': r[6] or {}, 'created_at': str(r[7]), 'sheet_name': r[8]}
            }, ensure_ascii=False)}

        # ── GET columns ───────────────────────────────────────────────────────
        if method == 'GET' and action == 'columns':
            sheet_name = params.get('sheet', '')
            if sheet_name and org_id:
                cur.execute(
                    f"""SELECT DISTINCT ON (column_key, column_order)
                               column_key, column_label, column_order, column_type, is_core, sheet_name
                        FROM {SCHEMA}.workers_registry_columns
                        WHERE sheet_name = %s
                        ORDER BY column_key, column_order, id DESC""",
                    (sheet_name,)
                )
            else:
                cur.execute(
                    f"""SELECT DISTINCT ON (sheet_name, column_order, column_key)
                               column_key, column_label, column_order, column_type, is_core, sheet_name
                        FROM {SCHEMA}.workers_registry_columns
                        ORDER BY sheet_name, column_order, column_key, id DESC"""
                )
            cols = [{'key': r[0], 'label': r[1], 'order': r[2], 'type': r[3],
                     'is_core': r[4], 'sheet_name': r[5]} for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'columns': cols}, ensure_ascii=False)}

        # ── GET page_locks ────────────────────────────────────────────────────
        if method == 'GET' and action == 'page_locks':
            cur.execute(f"SELECT page_key, is_locked FROM {SCHEMA}.page_locks")
            locks = {r[0]: r[1] for r in cur.fetchall()}
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'locks': locks}, ensure_ascii=False)}

        # ── GET sheets ────────────────────────────────────────────────────────
        if method == 'GET' and action == 'sheets':
            cur.execute(
                f"""SELECT DISTINCT sheet_name FROM {SCHEMA}.workers_registry_columns
                    WHERE sheet_name IS NOT NULL AND sheet_name != ''
                    ORDER BY sheet_name"""
            )
            sheets = [r[0] for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'sheets': sheets}, ensure_ascii=False)}

        # ── GET files ─────────────────────────────────────────────────────────
        if method == 'GET' and action == 'files':
            cur.execute(
                f"""SELECT id, file_name, file_url, file_size, uploaded_at, is_active
                    FROM {SCHEMA}.workers_registry_files
                    ORDER BY uploaded_at DESC LIMIT 20"""
            )
            files = [{'id': r[0], 'file_name': r[1], 'file_url': r[2],
                      'file_size': r[3], 'uploaded_at': str(r[4]), 'is_active': r[5]}
                     for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'files': files}, ensure_ascii=False)}

        # ── GET qr ────────────────────────────────────────────────────────────
        if method == 'GET' and action == 'qr':
            token = params.get('token', '')
            cur.execute(
                f"""SELECT id, worker_number, fio, subdivision, position_name, extra_data, sheet_name
                    FROM {SCHEMA}.wr_employees WHERE qr_token = %s AND archived = FALSE""",
                (token,)
            )
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS,
                        'body': json.dumps({'success': False, 'error': 'Работник не найден'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True,
                'worker': {'id': r[0], 'worker_number': r[1], 'fio': r[2],
                           'subdivision': r[3], 'position': r[4],
                           'extra_data': r[5] or {}, 'sheet_name': r[6]}
            }, ensure_ascii=False)}

        # ── POST ──────────────────────────────────────────────────────────────
        if method == 'POST':
            body_raw = event.get('body', '{}') or '{}'
            if event.get('isBase64Encoded'):
                body_raw = base64.b64decode(body_raw).decode('utf-8')
            body = json.loads(body_raw)
            action_post = body.get('action', action)
            o_id = body.get('organization_id', org_id)

            # ── analyze_excel: сохранить структуру всех листов (этап 1) ──────
            if action_post == 'analyze_excel':
                sheets_list = body.get('sheets', [])  # [{sheet_name, headers:[]}]

                for sheet_info in sheets_list:
                    sname = sheet_info.get('sheet_name', '')
                    headers = sheet_info.get('headers', [])
                    if not sname or not headers:
                        continue

                    core_map = {
                        'фио': True, 'ф.и.о': True, 'ф.и.о.': True,
                        'фамилия имя отчество': True,
                        'подразделение': True, 'отдел': True,
                        'должность': True, 'профессия': True,
                    }

                    for i, h in enumerate(headers):
                        if not h or not str(h).strip():
                            continue
                        h_lower = h.lower().strip()
                        is_core = h_lower in core_map
                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.workers_registry_columns
                                (organization_id, column_key, column_label, column_order, column_type, is_core, sheet_name)
                                VALUES (%s, %s, %s, %s, 'text', %s, %s)""",
                            (o_id, h, h, i, is_core, sname)
                        )

                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                    'success': True,
                    'message': f'Структура сохранена: {len(sheets_list)} листов',
                    'sheets_count': len(sheets_list)
                }, ensure_ascii=False)}

            # ── import_sheet: импорт данных одного листа (этап 2) ────────────
            if action_post == 'import_sheet':
                sheet_name = body.get('sheet_name', '')
                headers_list = body.get('headers', [])
                rows_data = body.get('rows', [])
                user_id = body.get('user_id', '')
                file_name = body.get('file_name', 'registry.xlsx')
                file_size = body.get('file_size', 0)

                # Определяем ключевые поля
                fio_key = None
                subdiv_key = None
                pos_key = None
                for h in headers_list:
                    hl = h.lower().strip()
                    if hl in ('фио', 'ф.и.о', 'ф.и.о.', 'фамилия имя отчество', 'реестр сотрудников'):
                        fio_key = h
                    elif hl in ('подразделение', 'отдел', 'цех', 'участок') and not subdiv_key:
                        subdiv_key = h
                    elif hl in ('должность', 'профессия') and not pos_key:
                        pos_key = h

                imported = 0
                for row in rows_data:
                    # Берём ФИО — если нет явного поля, берём первое непустое
                    if fio_key:
                        fio_val = str(row.get(fio_key, '')).strip()
                    else:
                        fio_val = ''
                        for h in headers_list:
                            v = str(row.get(h, '')).strip()
                            if v and len(v) > 3:
                                fio_val = v
                                break

                    if not fio_val:
                        continue

                    subdiv_val = str(row.get(subdiv_key or '', '')).strip() if subdiv_key else ''
                    pos_val = str(row.get(pos_key or '', '')).strip() if pos_key else ''
                    extra = {k: str(v) if v is not None else '' for k, v in row.items()}

                    # Ищем существующую запись по ФИО + лист
                    cur.execute(
                        f"""SELECT id FROM {SCHEMA}.wr_employees
                            WHERE fio = %s AND sheet_name = %s AND archived = FALSE""",
                        (fio_val, sheet_name)
                    )
                    existing = cur.fetchone()

                    if existing:
                        cur.execute(
                            f"""UPDATE {SCHEMA}.wr_employees
                                SET subdivision = %s, position_name = %s, extra_data = %s,
                                    updated_at = NOW()
                                WHERE id = %s""",
                            (subdiv_val, pos_val, json.dumps(extra, ensure_ascii=False), existing[0])
                        )
                    else:
                        worker_number = next_worker_number(cur, SCHEMA)
                        qr_token = str(uuid.uuid4()).replace('-', '')[:32]

                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.wr_employees
                                (organization_id, worker_number, qr_token, fio, subdivision,
                                 position_name, extra_data, sheet_name, created_by_user_id)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                            (o_id, worker_number, qr_token, fio_val, subdiv_val, pos_val,
                             json.dumps(extra, ensure_ascii=False), sheet_name,
                             int(user_id) if user_id and str(user_id).isdigit() else None)
                        )
                        imported += 1

                # Сохраняем файл (только один раз — при первом листе)
                if file_name and imported > 0:
                    cur.execute(
                        f"""SELECT COUNT(*) FROM {SCHEMA}.workers_registry_files
                            WHERE file_name = %s""",
                        (file_name,)
                    )
                    if cur.fetchone()[0] == 0:
                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.workers_registry_files
                                (organization_id, file_name, file_url, file_size, uploaded_by_user_id, is_active)
                                VALUES (%s, %s, %s, %s, %s, TRUE)""",
                            (o_id, file_name, '', file_size,
                             int(user_id) if user_id and str(user_id).isdigit() else None)
                        )

                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                    'success': True,
                    'imported': imported,
                    'total': len(rows_data),
                    'sheet_name': sheet_name
                }, ensure_ascii=False)}

            # ── add_worker ────────────────────────────────────────────────────
            if action_post == 'add_worker':
                fio = body.get('fio', '').strip()
                subdivision = body.get('subdivision', '')
                position_name = body.get('position_name', '')
                sheet_name = body.get('sheet_name', 'Работники')
                user_id = body.get('user_id', '')
                extra = body.get('extra_data', {})

                if not fio:
                    return {'statusCode': 400, 'headers': CORS,
                            'body': json.dumps({'success': False, 'error': 'ФИО обязательно'})}

                worker_number = next_worker_number(cur, SCHEMA)
                qr_token = str(uuid.uuid4()).replace('-', '')[:32]

                # Автоматически назначаем № п/п как max+1 для этого листа
                cur.execute(
                    f"""SELECT COALESCE(MAX(CAST(extra_data->>'№ п/п' AS INTEGER)), 0) + 1
                        FROM {SCHEMA}.wr_employees
                        WHERE sheet_name = %s AND (archived = false OR archived IS NULL)""",
                    (sheet_name,)
                )
                next_num = cur.fetchone()[0]
                extra['№ п/п'] = str(next_num)

                cur.execute(
                    f"""INSERT INTO {SCHEMA}.wr_employees
                        (organization_id, worker_number, qr_token, fio, subdivision, position_name,
                         extra_data, sheet_name, created_by_user_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (o_id, worker_number, qr_token, fio, subdivision, position_name,
                     json.dumps(extra, ensure_ascii=False), sheet_name,
                     int(user_id) if user_id and str(user_id).isdigit() else None)
                )
                new_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                    'success': True, 'id': new_id, 'worker_number': worker_number
                }, ensure_ascii=False)}

            # ── update_worker ─────────────────────────────────────────────────
            if action_post == 'update_worker':
                wid = body.get('id')
                fio = body.get('fio', '').strip()
                subdivision = body.get('subdivision', '')
                position_name = body.get('position_name', '')
                extra = body.get('extra_data', {})

                cur.execute(
                    f"""UPDATE {SCHEMA}.wr_employees
                        SET fio = %s, subdivision = %s, position_name = %s,
                            extra_data = %s, updated_at = NOW()
                        WHERE id = %s""",
                    (fio, subdivision, position_name,
                     json.dumps(extra, ensure_ascii=False), wid)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True}, ensure_ascii=False)}

            # ── delete_row: пометить строку как archived ──────────────────────
            if action_post == 'delete_row':
                wid = body.get('id')
                cur.execute(
                    f"UPDATE {SCHEMA}.wr_employees SET archived = TRUE WHERE id = %s",
                    (wid,)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True}, ensure_ascii=False)}

            # ── update_row: обновить fio + extra_data ────────────────────────
            if action_post == 'update_row':
                wid = body.get('id')
                fio = body.get('fio', '').strip()
                extra = body.get('extra_data', {})
                cur.execute(
                    f"""UPDATE {SCHEMA}.wr_employees
                        SET fio = %s, extra_data = %s, updated_at = NOW()
                        WHERE id = %s""",
                    (fio, json.dumps(extra, ensure_ascii=False), wid)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True}, ensure_ascii=False)}

            # ── add_row: добавить строку в конец списка ──────────────────────
            if action_post == 'add_row':
                sheet_name = body.get('sheet_name', '')
                fio = body.get('fio', '').strip()
                extra = body.get('extra_data', {})
                if not fio:
                    return {'statusCode': 400, 'headers': CORS,
                            'body': json.dumps({'success': False, 'error': 'Значение обязательно'})}
                cur.execute(
                    f"""SELECT COALESCE(MAX(sort_order), 0) + 1
                        FROM {SCHEMA}.wr_employees
                        WHERE sheet_name = %s AND archived = FALSE""",
                    (sheet_name,)
                )
                next_order = cur.fetchone()[0]
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.wr_employees
                        (organization_id, worker_number, qr_token, fio, extra_data, sheet_name, sort_order)
                        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (o_id, '', '', fio, json.dumps(extra, ensure_ascii=False), sheet_name, next_order)
                )
                new_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'id': new_id}, ensure_ascii=False)}

            # ── reorder: сохранить новый порядок строк ───────────────────────
            if action_post == 'reorder':
                orders = body.get('orders', [])  # [{id: N, sort_order: M}, ...]
                for item in orders:
                    cur.execute(
                        f"UPDATE {SCHEMA}.wr_employees SET sort_order = %s WHERE id = %s",
                        (item['sort_order'], item['id'])
                    )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True}, ensure_ascii=False)}

            # ── set_page_lock: установить/снять блокировку страницы ──────────
            if action_post == 'set_page_lock':
                page_key = body.get('page_key', '')
                is_locked = bool(body.get('is_locked', True))
                user_id = body.get('user_id')
                if not page_key:
                    return {'statusCode': 400, 'headers': CORS,
                            'body': json.dumps({'success': False, 'error': 'page_key обязателен'})}
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.page_locks (page_key, is_locked, updated_at, updated_by_user_id)
                        VALUES (%s, %s, NOW(), %s)
                        ON CONFLICT (page_key) DO UPDATE
                        SET is_locked = EXCLUDED.is_locked,
                            updated_at = NOW(),
                            updated_by_user_id = EXCLUDED.updated_by_user_id""",
                    (page_key, is_locked, user_id)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'page_key': page_key, 'is_locked': is_locked}, ensure_ascii=False)}

        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'success': False, 'error': 'Неизвестный запрос'})}

    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': CORS,
                'body': json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False)}
    finally:
        cur.close()
        conn.close()