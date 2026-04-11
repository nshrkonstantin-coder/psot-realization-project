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
    GET  ?action=sheets             — список листов (вкладок) Excel
    GET  ?action=files              — список загруженных файлов
    GET  ?action=qr&token=XXX       — найти работника по QR-токену
    POST action=analyze_excel       — сохранить структуру листов (этап 1)
    POST action=import_sheet        — импорт данных одного листа (этап 2)
    POST action=add_worker          — добавить работника вручную
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

            # Если org_id не передан — пробуем через user_id
            if not org_id and uid_p:
                cur.execute(f"SELECT organization_id FROM {SCHEMA}.users WHERE id = %s", (uid_p,))
                r0 = cur.fetchone()
                if r0 and r0[0]: org_id = r0[0]

            # Строим условие по org_id (NULL = показать всё)
            if org_id:
                org_cond = "organization_id = %s"
                org_args = [org_id]
            else:
                org_cond = "1=1"
                org_args = []

            if sheet_name:
                cur.execute(
                    f"""SELECT id, worker_number, qr_token, fio, subdivision, position_name, sheet_name
                        FROM {SCHEMA}.wr_employees
                        WHERE {org_cond} AND archived = FALSE AND sheet_name = %s
                        ORDER BY fio""",
                    org_args + [sheet_name]
                )
            else:
                cur.execute(
                    f"""SELECT id, worker_number, qr_token, fio, subdivision, position_name, sheet_name
                        FROM {SCHEMA}.wr_employees
                        WHERE {org_cond} AND archived = FALSE
                        ORDER BY sheet_name, fio""",
                    org_args
                )
            rows = cur.fetchall()
            workers = [{'id': r[0], 'worker_number': r[1], 'qr_token': r[2],
                        'fio': r[3], 'subdivision': r[4], 'position': r[5], 'sheet_name': r[6]} for r in rows]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'workers': workers}, ensure_ascii=False)}

        # ── GET worker by id ──────────────────────────────────────────────────
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
            if sheet_name:
                cur.execute(
                    f"""SELECT column_key, column_label, column_order, column_type, is_core, sheet_name
                        FROM {SCHEMA}.workers_registry_columns
                        WHERE organization_id = %s AND sheet_name = %s
                        ORDER BY column_order""",
                    (org_id, sheet_name)
                )
            else:
                cur.execute(
                    f"""SELECT column_key, column_label, column_order, column_type, is_core, sheet_name
                        FROM {SCHEMA}.workers_registry_columns
                        WHERE organization_id = %s
                        ORDER BY sheet_name, column_order""",
                    (org_id,)
                )
            cols = [{'key': r[0], 'label': r[1], 'order': r[2], 'type': r[3],
                     'is_core': r[4], 'sheet_name': r[5]} for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'columns': cols}, ensure_ascii=False)}

        # ── GET sheets (листы) ────────────────────────────────────────────────
        if method == 'GET' and action == 'sheets':
            # Берём листы из wr_employees (там точно есть данные)
            if org_id:
                cur.execute(
                    f"""SELECT DISTINCT sheet_name FROM {SCHEMA}.wr_employees
                        WHERE organization_id = %s AND sheet_name IS NOT NULL AND sheet_name != ''
                        AND archived = FALSE ORDER BY sheet_name""",
                    (org_id,)
                )
            else:
                cur.execute(
                    f"""SELECT DISTINCT sheet_name FROM {SCHEMA}.wr_employees
                        WHERE sheet_name IS NOT NULL AND sheet_name != ''
                        AND archived = FALSE ORDER BY sheet_name"""
                )
            sheets = [r[0] for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'sheets': sheets}, ensure_ascii=False)}

        # ── GET files ─────────────────────────────────────────────────────────
        if method == 'GET' and action == 'files':
            cur.execute(
                f"""SELECT id, file_name, file_url, file_size, uploaded_at, is_active
                    FROM {SCHEMA}.workers_registry_files
                    WHERE organization_id = %s ORDER BY uploaded_at DESC""",
                (org_id,)
            )
            files = [{'id': r[0], 'file_name': r[1], 'file_url': r[2],
                      'file_size': r[3], 'uploaded_at': str(r[4]), 'is_active': r[5]}
                     for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'files': files}, ensure_ascii=False)}

        # ── GET by QR token ───────────────────────────────────────────────────
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
            print(f"[POST] action={action_post} org={body.get('organization_id')}")

            # ── analyze_excel: сохранить структуру всех листов (этап 1) ──────
            if action_post == 'analyze_excel':
                sheets_data = body.get('sheets', [])  # [{name, headers: []}]
                _o_raw = body.get('organization_id', '') or str(org_id or '')
                _u_raw0 = body.get('user_id', '')
                o_id = int(_o_raw) if _o_raw and str(_o_raw).strip().isdigit() else None
                # Если org_id не передан — берём из профиля пользователя
                if not o_id and _u_raw0:
                    cur.execute(f"SELECT organization_id FROM {SCHEMA}.users WHERE id = %s", (int(_u_raw0),))
                    row0 = cur.fetchone()
                    if row0: o_id = row0[0]
                print(f"[analyze_excel] org={o_id} sheets_count={len(sheets_data)}")

                # Удаляем старую структуру если работников нет
                cur.execute(
                    f"SELECT COUNT(*) FROM {SCHEMA}.wr_employees WHERE organization_id = %s AND archived = FALSE",
                    (o_id,)
                )
                worker_count = cur.fetchone()[0]
                print(f"[analyze_excel] existing workers={worker_count}")

                if worker_count == 0:
                    cur.execute(
                        f"UPDATE {SCHEMA}.workers_registry_columns SET column_order = -1 WHERE organization_id = %s",
                        (o_id,)
                    )

                core_fields = {
                    'фио': True, 'ф.и.о': True, 'ф.и.о.': True,
                    'фамилия имя отчество': True, 'фамилия': True,
                    'подразделение': True, 'отдел': True, 'цех': True,
                    'должность': True, 'профессия': True
                }

                total_cols = 0
                for sheet in sheets_data:
                    sheet_name = sheet.get('name', '')
                    headers_list = sheet.get('headers', [])
                    print(f"[analyze_excel] sheet={sheet_name} headers={headers_list[:5]}")

                    for i, h in enumerate(headers_list):
                        if not h or not str(h).strip():
                            continue
                        h_str = str(h).strip()
                        h_lower = h_str.lower()
                        is_core = h_lower in core_fields
                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.workers_registry_columns
                                (organization_id, column_key, column_label, column_order, column_type, is_core, sheet_name)
                                VALUES (%s, %s, %s, %s, 'text', %s, %s)""",
                            (o_id, h_str, h_str, i, is_core, sheet_name)
                        )
                        total_cols += 1

                conn.commit()
                print(f"[analyze_excel] saved total_cols={total_cols}")
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                    'success': True,
                    'message': f'Структура сформирована: {len(sheets_data)} листов, {total_cols} колонок',
                    'sheets': [s.get('name') for s in sheets_data],
                    'worker_count': worker_count
                }, ensure_ascii=False)}

            # ── import_sheet: импорт строк одного листа (этап 2) ────────────
            if action_post == 'import_sheet':
                rows_data = body.get('rows', [])
                sheet_name = body.get('sheet_name', '')
                headers_list = body.get('headers', [])
                _o_id_raw = body.get('organization_id', '') or str(org_id or '')
                _u_id_raw = body.get('user_id', '')
                o_id = int(_o_id_raw) if _o_id_raw and str(_o_id_raw).strip().isdigit() else None
                uid = int(_u_id_raw) if _u_id_raw and str(_u_id_raw).strip().isdigit() else None
                # Если org_id не передан — берём из профиля пользователя
                if not o_id and uid:
                    cur.execute(f"SELECT organization_id FROM {SCHEMA}.users WHERE id = %s", (uid,))
                    row0 = cur.fetchone()
                    if row0: o_id = row0[0]
                file_name = body.get('file_name', 'registry.xlsx')
                file_size = int(body.get('file_size', 0) or 0)
                print(f"[import_sheet] sheet={sheet_name} rows={len(rows_data)} org={o_id} uid={uid}")

                # Определяем ключевые поля (расширенный список синонимов)
                fio_key = ''
                sub_key = ''
                pos_key = ''
                fio_keys = {'фио', 'ф.и.о', 'ф.и.о.', 'фамилия имя отчество', 'фамилия',
                            'имя', 'работник', 'сотрудник', 'фамилия имя', 'полное имя'}
                sub_keys = {'подразделение', 'отдел', 'цех', 'участок', 'структурное подразделение',
                            'место работы', 'подразделение (цех, отдел)'}
                pos_keys = {'должность', 'профессия', 'специальность', 'должность (профессия)'}

                for h in headers_list:
                    hl = str(h).lower().strip()
                    if not fio_key and hl in fio_keys:
                        fio_key = h
                    if not sub_key and hl in sub_keys:
                        sub_key = h
                    if not pos_key and hl in pos_keys:
                        pos_key = h

                # Если fio_key не нашли — берём первую непустую колонку как ФИО
                if not fio_key and headers_list:
                    fio_key = headers_list[0]
                    print(f"[import_sheet] fio_key not found, using first column: {fio_key}")

                print(f"[import_sheet] fio_key={fio_key} sub_key={sub_key} pos_key={pos_key} headers={headers_list[:5]}")

                imported = 0
                updated = 0
                for row in rows_data:
                    fio_val = str(row.get(fio_key, '')).strip() if fio_key else ''
                    if not fio_val:
                        continue

                    sub_val = str(row.get(sub_key, '')) if sub_key else ''
                    pos_val = str(row.get(pos_key, '')) if pos_key else ''
                    extra = {str(k): str(v) if v is not None else '' for k, v in row.items()}

                    # Проверяем существующего
                    cur.execute(
                        f"""SELECT id FROM {SCHEMA}.wr_employees
                            WHERE organization_id = %s AND fio = %s
                            AND (sheet_name = %s OR sheet_name IS NULL) AND archived = FALSE""",
                        (o_id, fio_val, sheet_name)
                    )
                    existing = cur.fetchone()

                    if existing:
                        cur.execute(
                            f"""UPDATE {SCHEMA}.wr_employees
                                SET subdivision = %s, position_name = %s, extra_data = %s,
                                    sheet_name = %s, updated_at = NOW()
                                WHERE id = %s""",
                            (sub_val, pos_val, json.dumps(extra, ensure_ascii=False), sheet_name, existing[0])
                        )
                        updated += 1
                    else:
                        cur.execute(
                            f"SELECT COUNT(*) FROM {SCHEMA}.wr_employees WHERE organization_id = %s",
                            (o_id,)
                        )
                        count = cur.fetchone()[0] + 1
                        worker_number = f"WR-{o_id}-{count:04d}"
                        qr_token = str(uuid.uuid4()).replace('-', '')[:32]
                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.wr_employees
                                (organization_id, worker_number, qr_token, fio, subdivision,
                                 position_name, extra_data, sheet_name, created_by_user_id)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                            (o_id, worker_number, qr_token, fio_val, sub_val, pos_val,
                             json.dumps(extra, ensure_ascii=False), sheet_name, uid)
                        )
                        imported += 1

                # Сохраняем запись о файле (только для первого листа)
                if file_name and file_size:
                    cur.execute(
                        f"""SELECT COUNT(*) FROM {SCHEMA}.workers_registry_files
                            WHERE organization_id = %s AND file_name = %s""",
                        (o_id, file_name)
                    )
                    if cur.fetchone()[0] == 0:
                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.workers_registry_files
                                (organization_id, file_name, file_url, file_size, uploaded_by_user_id, is_active)
                                VALUES (%s, %s, %s, %s, %s, TRUE)""",
                            (o_id, file_name, '', file_size, uid)
                        )

                conn.commit()
                print(f"[import_sheet] done imported={imported} updated={updated}")
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                    'success': True, 'imported': imported, 'updated': updated,
                    'sheet_name': sheet_name,
                    'message': f'Лист «{sheet_name}»: {imported} добавлено, {updated} обновлено'
                }, ensure_ascii=False)}

            # ── add_worker ────────────────────────────────────────────────────
            if action_post == 'add_worker':
                _o_raw2 = body.get('organization_id', org_id)
                _u_raw2 = body.get('user_id', '')
                o_id = int(_o_raw2) if _o_raw2 and str(_o_raw2).strip() else None
                uid2 = int(_u_raw2) if _u_raw2 and str(_u_raw2).strip() else None
                fio = str(body.get('fio', '')).strip()
                subdivision = body.get('subdivision', '')
                position_name = body.get('position_name', '')
                extra = body.get('extra_data', {})
                sheet_name = body.get('sheet_name', '')

                if not fio:
                    return {'statusCode': 400, 'headers': CORS,
                            'body': json.dumps({'success': False, 'error': 'ФИО обязательно'})}

                cur.execute(
                    f"SELECT COUNT(*) FROM {SCHEMA}.wr_employees WHERE organization_id = %s",
                    (o_id,)
                )
                count = cur.fetchone()[0] + 1
                worker_number = f"WR-{o_id}-{count:04d}"
                qr_token = str(uuid.uuid4()).replace('-', '')[:32]

                cur.execute(
                    f"""INSERT INTO {SCHEMA}.wr_employees
                        (organization_id, worker_number, qr_token, fio, subdivision,
                         position_name, extra_data, sheet_name, created_by_user_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (o_id, worker_number, qr_token, fio, subdivision, position_name,
                     json.dumps(extra, ensure_ascii=False), sheet_name, uid2)
                )
                new_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'id': new_id,
                                            'worker_number': worker_number}, ensure_ascii=False)}

            # ── update_worker ─────────────────────────────────────────────────
            if action_post == 'update_worker':
                wid = body.get('id')
                fio = str(body.get('fio', '')).strip()
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

        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'success': False, 'error': 'Неизвестный action'})}

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return {'statusCode': 500, 'headers': CORS,
                'body': json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False)}
    finally:
        cur.close()
        conn.close()