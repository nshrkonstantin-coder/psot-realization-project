import json
import os
import base64
import psycopg2
import psycopg2.extras
from datetime import datetime, date

SCHEMA = 't_p80499285_psot_realization_pro'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role, X-Auth-Token',
}


def handler(event: dict, context) -> dict:
    """Здравпункт: загрузка файлов, хранение данных, формирование отчётов"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        method = event.get('httpMethod', 'GET')
        params = event.get('queryStringParameters') or {}
        action = params.get('action', '')
        org_id_raw = params.get('organization_id', '')
        org_id = int(org_id_raw) if org_id_raw and org_id_raw.isdigit() else None

        # ── GET: список загруженных файлов ────────────────────────────────────
        if method == 'GET' and action == 'files':
            cur.execute(
                f"""SELECT id, file_type, file_name, file_url, file_size, rows_count,
                           uploaded_by, uploaded_at, is_archived,
                           period_from, period_to, new_rows, skipped_rows
                    FROM {SCHEMA}.zdravpunkt_files
                    WHERE is_archived = FALSE
                    ORDER BY uploaded_at DESC"""
            )
            rows = cur.fetchall()
            files = []
            for r in rows:
                files.append({
                    'id': r[0], 'file_type': r[1], 'file_name': r[2],
                    'file_url': r[3], 'file_size': r[4], 'rows_count': r[5],
                    'uploaded_by': r[6],
                    'uploaded_at': r[7].isoformat() if r[7] else None,
                    'is_archived': r[8],
                    'period_from': r[9].isoformat() if r[9] else None,
                    'period_to': r[10].isoformat() if r[10] else None,
                    'new_rows': r[11],
                    'skipped_rows': r[12],
                })
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'files': files}, ensure_ascii=False)}

        ACTIVE = "exam_result NOT IN ('cleared', 'archived_test')"

        # ── GET: статистика для дашборда ──────────────────────────────────────
        if method == 'GET' and action == 'stats':
            cur.execute(f"""
                SELECT
                    (SELECT COUNT(*) FROM {SCHEMA}.zdravpunkt_workers WHERE file_id IS NOT NULL),
                    COUNT(*),
                    COUNT(*) FILTER (WHERE exam_result = 'admitted'),
                    COUNT(*) FILTER (WHERE exam_result = 'not_admitted'),
                    COUNT(*) FILTER (WHERE exam_result = 'evaded'),
                    (SELECT COUNT(*) FROM {SCHEMA}.zdravpunkt_files WHERE is_archived = FALSE)
                FROM {SCHEMA}.zdravpunkt_esmo WHERE {ACTIVE}
            """)
            s = cur.fetchone()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True,
                'total_workers': s[0],
                'total_esmo': s[1],
                'admitted': s[2],
                'not_admitted': s[3],
                'evaded': s[4],
                'total_files': s[5]
            }, ensure_ascii=False)}

        # ── GET: отчёт ────────────────────────────────────────────────────────
        if method == 'GET' and action == 'report':
            date_from = params.get('date_from', '')
            date_to = params.get('date_to', '')
            subdivision_raw = params.get('subdivision', '')
            company_raw = params.get('company', '')
            fio = params.get('fio', '')
            exam_result_raw = params.get('exam_result', '')
            exam_type_raw = params.get('exam_type', '')
            limit = int(params.get('limit', '500'))
            offset_val = int(params.get('offset', '0'))

            # Мультизначения: subdivision и company разделены '||', exam_result и exam_type — ','
            subdivisions_list = [s.strip() for s in subdivision_raw.split('||') if s.strip()] if subdivision_raw else []
            companies_list = [s.strip() for s in company_raw.split('||') if s.strip()] if company_raw else []
            results_list = [s.strip() for s in exam_result_raw.split(',') if s.strip()] if exam_result_raw else []
            exam_types_list = [s.strip() for s in exam_type_raw.split(',') if s.strip()] if exam_type_raw else []

            # Исключаем служебные статусы (очищенные и тестовые)
            where = ["e.exam_result NOT IN ('archived_test', 'cleared', '')"]
            args = []
            if date_from:
                where.append('e.exam_date >= %s::date')
                args.append(date_from)
            if date_to:
                where.append('e.exam_date <= %s::date')
                args.append(date_to)
            if subdivisions_list:
                placeholders = ','.join(['%s'] * len(subdivisions_list))
                where.append(f'e.subdivision IN ({placeholders})')
                args.extend(subdivisions_list)
            if companies_list:
                placeholders = ','.join(['%s'] * len(companies_list))
                where.append(f'e.company IN ({placeholders})')
                args.extend(companies_list)
            if fio:
                where.append('e.fio ILIKE %s')
                args.append(f'%{fio}%')
            if results_list:
                placeholders = ','.join(['%s'] * len(results_list))
                where.append(f'e.exam_result IN ({placeholders})')
                args.extend(results_list)
            if exam_types_list:
                placeholders = ','.join(['%s'] * len(exam_types_list))
                where.append(f'e.exam_type IN ({placeholders})')
                args.extend(exam_types_list)

            where_sql = ' AND '.join(where)

            # Все агрегаты в одном запросе — один проход по таблице
            cur.execute(
                f"""SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE e.exam_result = 'admitted') AS admitted,
                    COUNT(*) FILTER (WHERE e.exam_result = 'not_admitted') AS not_admitted,
                    COUNT(*) FILTER (WHERE e.exam_result = 'evaded') AS evaded,
                    COUNT(DISTINCT TRIM(LOWER(e.fio))) AS unique_workers,
                    COUNT(DISTINCT CASE WHEN e.exam_result = 'not_admitted' THEN TRIM(LOWER(e.fio)) END) AS unique_not_admitted,
                    COUNT(DISTINCT CASE WHEN e.exam_result = 'evaded'       THEN TRIM(LOWER(e.fio)) END) AS unique_evaded
                FROM {SCHEMA}.zdravpunkt_esmo e WHERE {where_sql}""",
                args
            )
            stat = cur.fetchone()
            total_count = stat[0]
            unique_not_admitted = stat[5]
            unique_evaded = stat[6]

            # Затем страницу данных
            cur.execute(
                f"""SELECT e.fio, e.worker_number, e.subdivision, e.position, e.company,
                           e.exam_date, e.exam_result, e.reject_reason, e.created_at,
                           e.extra_data->>'Дата/время' AS exam_datetime,
                           e.extra_data->>'Группа МО' AS group_mo,
                           e.extra_data->>'Результат осмотра' AS exam_detail
                    FROM {SCHEMA}.zdravpunkt_esmo e
                    WHERE {where_sql}
                    ORDER BY e.exam_date ASC NULLS LAST, e.id ASC
                    LIMIT %s OFFSET %s""",
                args + [limit, offset_val]
            )
            rows = cur.fetchall()
            records = []
            for r in rows:
                records.append({
                    'fio': r[0], 'worker_number': r[1], 'subdivision': r[2],
                    'position': r[3], 'company': r[4],
                    'exam_date': r[5].isoformat() if r[5] else None,
                    'exam_result': r[6], 'reject_reason': r[7],
                    'exam_datetime': r[9],
                    'group_mo': r[10],
                    'exam_detail': r[11],
                    'created_at': r[8].isoformat() if r[8] else None
                })

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True,
                'records': records,
                'total': total_count,
                'admitted': stat[1],
                'not_admitted': stat[2],
                'evaded': stat[3],
                'unique_workers': stat[4],
                'unique_not_admitted': unique_not_admitted,
                'unique_evaded': unique_evaded,
                'limit': limit,
                'offset': offset_val,
            }, ensure_ascii=False)}

        # ── GET: история осмотров конкретного работника ───────────────────────
        if method == 'GET' and action == 'worker_history':
            fio = params.get('fio', '')
            date_from = params.get('date_from', '')
            date_to = params.get('date_to', '')
            if not fio:
                return {'statusCode': 400, 'headers': CORS,
                        'body': json.dumps({'success': False, 'error': 'fio обязателен'}, ensure_ascii=False)}
            where_w = [f"{ACTIVE}", "e.fio = %s"]
            args_w = [fio]
            if date_from:
                where_w.append('e.exam_date >= %s::date')
                args_w.append(date_from)
            if date_to:
                where_w.append('e.exam_date <= %s::date')
                args_w.append(date_to)
            cur.execute(
                f"""SELECT e.fio, e.subdivision, e.company, e.position,
                           e.exam_date, e.exam_result, e.reject_reason,
                           e.extra_data->>'Дата/время' AS exam_datetime,
                           e.extra_data->>'Группа МО' AS group_mo,
                           e.extra_data->>'Результат осмотра' AS exam_detail
                    FROM {SCHEMA}.zdravpunkt_esmo e
                    WHERE {' AND '.join(where_w)}
                    ORDER BY (e.extra_data->>'Дата/время') ASC NULLS LAST""",
                args_w
            )
            rows = cur.fetchall()
            # Считаем сводку
            admitted = sum(1 for r in rows if r[5] == 'admitted')
            not_admitted = sum(1 for r in rows if r[5] == 'not_admitted')
            evaded = sum(1 for r in rows if r[5] == 'evaded')
            records = [{
                'fio': r[0], 'subdivision': r[1], 'company': r[2], 'position': r[3],
                'exam_date': r[4].isoformat() if r[4] else None,
                'exam_result': r[5], 'reject_reason': r[6],
                'exam_datetime': r[7], 'group_mo': r[8], 'exam_detail': r[9]
            } for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True, 'records': records,
                'total': len(records), 'admitted': admitted,
                'not_admitted': not_admitted, 'evaded': evaded
            }, ensure_ascii=False)}

        # ── GET: список уникальных работников (по одной записи на человека) ────
        if method == 'GET' and action == 'unique_workers':
            date_from = params.get('date_from', '')
            date_to   = params.get('date_to', '')
            subdivision = params.get('subdivision', '')
            company     = params.get('company', '')
            fio_filter  = params.get('fio', '')

            where_u = [f"{ACTIVE}"]
            args_u  = []
            if date_from:
                where_u.append('e.exam_date >= %s::date')
                args_u.append(date_from)
            if date_to:
                where_u.append('e.exam_date <= %s::date')
                args_u.append(date_to)
            if subdivision:
                where_u.append('e.subdivision ILIKE %s')
                args_u.append(f'%{subdivision}%')
            if company:
                where_u.append('e.company ILIKE %s')
                args_u.append(f'%{company}%')
            if fio_filter:
                where_u.append('e.fio ILIKE %s')
                args_u.append(f'%{fio_filter}%')

            where_sql_u = ' AND '.join(where_u)

            # Одна строка на человека: последнее подразделение, кол-во осмотров,
            # есть ли хоть один не допуск / уклон
            cur.execute(
                f"""SELECT
                    TRIM(e.fio) AS fio,
                    MAX(e.company) AS company,
                    MAX(e.subdivision) AS subdivision,
                    COUNT(*) AS total_exams,
                    MAX(CASE WHEN e.exam_result = 'admitted'     THEN 1 ELSE 0 END) AS has_admitted,
                    MAX(CASE WHEN e.exam_result = 'not_admitted' THEN 1 ELSE 0 END) AS has_not_admitted,
                    MAX(CASE WHEN e.exam_result = 'evaded'       THEN 1 ELSE 0 END) AS has_evaded,
                    MIN(e.exam_date) AS first_date,
                    MAX(e.exam_date) AS last_date
                FROM {SCHEMA}.zdravpunkt_esmo e
                WHERE {where_sql_u}
                GROUP BY TRIM(LOWER(e.fio)), TRIM(e.fio)
                ORDER BY TRIM(e.fio)""",
                args_u
            )
            rows = cur.fetchall()
            workers = [{
                'fio':              r[0],
                'company':          r[1] or '',
                'subdivision':      r[2] or '',
                'total_exams':      r[3],
                'has_admitted':     bool(r[4]),
                'has_not_admitted': bool(r[5]),
                'has_evaded':       bool(r[6]),
                'first_date':       r[7].isoformat() if r[7] else None,
                'last_date':        r[8].isoformat() if r[8] else None,
            } for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True, 'workers': workers, 'total': len(workers)
            }, ensure_ascii=False)}

        # ── GET: статистика по типам осмотров для карточек дашборда ─────────
        if method == 'GET' and action == 'exam_type_stats':
            date_from = params.get('date_from', '')
            date_to = params.get('date_to', '')
            where = [f"{ACTIVE}", "exam_type IS NOT NULL"]
            args = []
            if date_from:
                where.append('exam_date >= %s::date')
                args.append(date_from)
            if date_to:
                where.append('exam_date <= %s::date')
                args.append(date_to)
            where_sql = ' AND '.join(where)
            cur.execute(
                f"""SELECT exam_type,
                           COUNT(*) AS total,
                           COUNT(*) FILTER (WHERE exam_result = 'admitted') AS admitted,
                           COUNT(*) FILTER (WHERE exam_result = 'not_admitted') AS not_admitted,
                           COUNT(*) FILTER (WHERE exam_result = 'evaded') AS evaded
                    FROM {SCHEMA}.zdravpunkt_esmo
                    WHERE {where_sql}
                    GROUP BY exam_type""",
                args
            )
            rows = cur.fetchall()
            result = {}
            for r in rows:
                result[r[0]] = {'total': r[1], 'admitted': r[2], 'not_admitted': r[3], 'evaded': r[4]}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True, 'stats': result
            }, ensure_ascii=False)}

        # ── GET: список записей по типу осмотра (для модального окна) ────────
        if method == 'GET' and action == 'exam_type_list':
            exam_type = params.get('exam_type', '')
            date_from = params.get('date_from', '')
            date_to = params.get('date_to', '')
            limit = int(params.get('limit', '2000'))
            offset_val = int(params.get('offset', '0'))
            where = [f"{ACTIVE}"]
            args = []
            if exam_type:
                where.append('exam_type = %s')
                args.append(exam_type)
            if date_from:
                where.append('exam_date >= %s::date')
                args.append(date_from)
            if date_to:
                where.append('exam_date <= %s::date')
                args.append(date_to)
            where_sql = ' AND '.join(where)
            cur.execute(
                f"""SELECT fio, subdivision, company, exam_date,
                           extra_data->>'Дата/время' AS exam_datetime,
                           extra_data->>'Группа МО' AS group_mo,
                           exam_result, reject_reason,
                           extra_data->>'Результат осмотра' AS exam_detail
                    FROM {SCHEMA}.zdravpunkt_esmo
                    WHERE {where_sql}
                    ORDER BY exam_date ASC NULLS LAST, id ASC
                    LIMIT %s OFFSET %s""",
                args + [limit, offset_val]
            )
            rows = cur.fetchall()
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.zdravpunkt_esmo WHERE {where_sql}", args)
            total = cur.fetchone()[0]
            records = [{
                'fio': r[0], 'subdivision': r[1], 'company': r[2],
                'exam_date': r[3].isoformat() if r[3] else None,
                'exam_datetime': r[4], 'group_mo': r[5],
                'exam_result': r[6], 'reject_reason': r[7], 'exam_detail': r[8]
            } for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True, 'records': records, 'total': total
            }, ensure_ascii=False)}

        # ── GET: список подразделений и компаний для фильтров ─────────────────
        if method == 'GET' and action == 'filters':
            cur.execute(f"SELECT DISTINCT subdivision FROM {SCHEMA}.zdravpunkt_esmo WHERE {ACTIVE} AND subdivision IS NOT NULL AND subdivision != '' ORDER BY subdivision")
            subdivisions = [r[0] for r in cur.fetchall()]
            cur.execute(f"SELECT DISTINCT company FROM {SCHEMA}.zdravpunkt_esmo WHERE {ACTIVE} AND company IS NOT NULL AND company != '' ORDER BY company")
            companies = [r[0] for r in cur.fetchall()]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True, 'subdivisions': subdivisions, 'companies': companies
            }, ensure_ascii=False)}

        # ── POST: сохранить строки из Excel ──────────────────────────────────
        if method == 'POST':
            body_raw = event.get('body', '{}') or '{}'
            if event.get('isBase64Encoded'):
                body_raw = base64.b64decode(body_raw).decode('utf-8')
            body = json.loads(body_raw)
            action_post = body.get('action', action)

            # Сохранить запись о файле
            if action_post == 'save_file':
                file_type = body.get('file_type', '')
                file_name = body.get('file_name', '')
                file_url = body.get('file_url', '')
                file_size = body.get('file_size', 0)
                rows_count = body.get('rows_count', 0)
                uploaded_by = body.get('uploaded_by')

                cur.execute(
                    f"""INSERT INTO {SCHEMA}.zdravpunkt_files
                        (file_type, file_name, file_url, file_size, rows_count, organization_id, uploaded_by)
                        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (file_type, file_name, file_url, file_size, rows_count, org_id, uploaded_by)
                )
                file_id = cur.fetchone()[0]
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'file_id': file_id}, ensure_ascii=False)}

            # Сохранить список работников — execute_values (быстрый bulk insert)
            if action_post == 'import_workers':
                file_id = body.get('file_id')
                workers = body.get('workers', [])
                if workers:
                    data = [
                        (file_id, org_id,
                         w.get('worker_number', ''), w.get('fio', ''),
                         w.get('subdivision', ''), w.get('position', ''),
                         w.get('company', ''), '{}')
                        for w in workers
                    ]
                    psycopg2.extras.execute_values(
                        cur,
                        f"""INSERT INTO {SCHEMA}.zdravpunkt_workers
                            (file_id, organization_id, worker_number, fio, subdivision, position, company, extra_data)
                            VALUES %s""",
                        data, page_size=500
                    )
                    conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'imported': len(workers)}, ensure_ascii=False)}

            # Сохранить результаты ЭСМО — с дедупликацией по ФИО + дата/время
            if action_post == 'import_esmo':
                file_id = body.get('file_id')
                records = body.get('records', [])
                is_last_batch = body.get('is_last_batch', False)
                period_from = body.get('period_from')
                period_to = body.get('period_to')
                total_rows = body.get('total_rows')

                new_count = 0
                skipped_count = 0

                if records:
                    # Ключ дедупликации: fio_lower + exam_date + точное Дата/время + exam_type
                    def make_key(r):
                        fio = r.get('fio', '').strip().lower()
                        exam_date = str(r.get('exam_date') or '')
                        dt = str((r.get('extra') or {}).get('Дата/время', '') or '')
                        etype = str(r.get('exam_type') or '')
                        return (fio, exam_date, dt, etype)

                    # Проверяем какие уже есть в БД среди активных записей
                    fios = list({r.get('fio', '').strip().lower() for r in records})
                    cur.execute(
                        f"""SELECT TRIM(LOWER(fio)),
                                   COALESCE(exam_date::text, ''),
                                   COALESCE(extra_data->>'Дата/время', ''),
                                   COALESCE(exam_type, '')
                            FROM {SCHEMA}.zdravpunkt_esmo
                            WHERE TRIM(LOWER(fio)) = ANY(%s)
                            AND exam_result NOT IN ('cleared', 'archived_test')""",
                        (fios,)
                    )
                    existing_keys = set((row[0], row[1], row[2], row[3]) for row in cur.fetchall())

                    # Фильтруем — только новые
                    new_records = []
                    for r in records:
                        if make_key(r) not in existing_keys:
                            new_records.append(r)
                        else:
                            skipped_count += 1

                    if new_records:
                        data = [
                            (file_id, org_id,
                             r.get('fio', ''), r.get('worker_number', ''),
                             r.get('subdivision', ''), r.get('position', ''),
                             r.get('company', ''), r.get('exam_date') or None,
                             r.get('exam_result', ''), r.get('reject_reason', ''),
                             json.dumps(r.get('extra', {}), ensure_ascii=False),
                             r.get('exam_type') or None)
                            for r in new_records
                        ]
                        psycopg2.extras.execute_values(
                            cur,
                            f"""INSERT INTO {SCHEMA}.zdravpunkt_esmo
                                (file_id, organization_id, fio, worker_number, subdivision, position,
                                 company, exam_date, exam_result, reject_reason, extra_data, exam_type)
                                VALUES %s""",
                            data, page_size=len(data)
                        )
                        new_count = len(new_records)

                    # Обновляем статистику файла после последнего батча
                    if is_last_batch:
                        cur.execute(
                            f"""UPDATE {SCHEMA}.zdravpunkt_files
                                SET period_from = %s, period_to = %s,
                                    new_rows = COALESCE(new_rows,0) + %s,
                                    skipped_rows = COALESCE(skipped_rows,0) + %s
                                    {', rows_count = %s' if total_rows is not None else ''}
                                WHERE id = %s""",
                            (period_from, period_to, new_count, skipped_count)
                            + ((total_rows,) if total_rows is not None else ())
                            + (file_id,)
                        )
                    else:
                        cur.execute(
                            f"""UPDATE {SCHEMA}.zdravpunkt_files
                                SET new_rows = COALESCE(new_rows,0) + %s,
                                    skipped_rows = COALESCE(skipped_rows,0) + %s
                                WHERE id = %s""",
                            (new_count, skipped_count, file_id)
                        )
                    conn.commit()

                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({
                            'success': True,
                            'imported': new_count,
                            'skipped': skipped_count
                        }, ensure_ascii=False)}

            # Удалить данные конкретного файла (только главный администратор)
            if action_post == 'delete_file':
                file_id = body.get('file_id')
                user_id = body.get('user_id')

                # Считаем сколько записей удалим
                cur.execute(
                    f"SELECT COUNT(*) FROM {SCHEMA}.zdravpunkt_esmo WHERE file_id = %s AND exam_result NOT IN ('cleared','archived_test')",
                    (file_id,)
                )
                rows_count = cur.fetchone()[0]

                # Помечаем данные этого файла как очищенные
                cur.execute(
                    f"UPDATE {SCHEMA}.zdravpunkt_esmo SET exam_result = 'cleared' WHERE file_id = %s AND exam_result NOT IN ('cleared','archived_test')",
                    (file_id,)
                )
                # Архивируем запись файла
                cur.execute(
                    f"UPDATE {SCHEMA}.zdravpunkt_files SET is_archived = TRUE, archived_by = %s, archived_at = NOW() WHERE id = %s",
                    (user_id, file_id)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'deleted_rows': rows_count}, ensure_ascii=False)}

            # Архивировать файл без удаления данных (устаревший, оставляем для совместимости)
            if action_post == 'archive_file':
                file_id = body.get('file_id')
                user_id = body.get('user_id')
                cur.execute(
                    f"UPDATE {SCHEMA}.zdravpunkt_files SET is_archived = TRUE, archived_by = %s, archived_at = NOW() WHERE id = %s",
                    (user_id, file_id)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True}, ensure_ascii=False)}

            # Полная очистка БД Здравпункта (только superadmin)
            if action_post == 'clear_all':
                user_role = body.get('user_role', '')
                if user_role not in ('superadmin', 'admin'):
                    return {'statusCode': 403, 'headers': CORS,
                            'body': json.dumps({'success': False, 'error': 'Нет прав'}, ensure_ascii=False)}
                # Помечаем все ЭСМО как очищенные
                cur.execute(f"UPDATE {SCHEMA}.zdravpunkt_esmo SET exam_result = 'cleared' WHERE 1=1")
                esmo_count = cur.rowcount
                # Помечаем все записи работников как очищенные (через file_id = -1)
                cur.execute(f"UPDATE {SCHEMA}.zdravpunkt_workers SET file_id = NULL WHERE 1=1")
                workers_count = cur.rowcount
                # Архивируем все файлы
                cur.execute(
                    f"UPDATE {SCHEMA}.zdravpunkt_files SET is_archived = TRUE, archived_by = %s, archived_at = NOW() WHERE is_archived = FALSE",
                    (body.get('user_id'),)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'esmo_cleared': esmo_count, 'workers_cleared': workers_count}, ensure_ascii=False)}

        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'success': False, 'error': 'Неизвестный запрос'}, ensure_ascii=False)}

    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': CORS,
                'body': json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False)}
    finally:
        cur.close()
        conn.close()