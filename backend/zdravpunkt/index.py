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
                    (SELECT COUNT(*) FROM {SCHEMA}.zdravpunkt_files WHERE is_archived = FALSE),
                    (SELECT COALESCE(SUM(workers_count), 0) FROM {SCHEMA}.zdravpunkt_contractor_records
                     WHERE organization_id = %s),
                    (SELECT COUNT(*) FROM {SCHEMA}.zdravpunkt_contractor_records
                     WHERE organization_id = %s)
                FROM {SCHEMA}.zdravpunkt_esmo WHERE {ACTIVE}
            """, (org_id or 0, org_id or 0))
            s = cur.fetchone()
            contractor_workers = int(s[6] or 0)
            contractor_records_count = int(s[7] or 0)
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True,
                'total_workers': int(s[0] or 0) + contractor_workers,
                'total_esmo': int(s[1] or 0) + contractor_records_count,
                'admitted': s[2],
                'not_admitted': s[3],
                'evaded': s[4],
                'total_files': s[5],
                'contractor_workers': contractor_workers,
                'contractor_records': contractor_records_count,
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

            # Подрядчики — ручной ввод (за тот же период + все те же фильтры)
            contr_where = ['organization_id = %s']
            contr_args = [org_id or 0]
            if date_from:
                contr_where.append('record_date >= %s::date')
                contr_args.append(date_from)
            if date_to:
                contr_where.append('record_date <= %s::date')
                contr_args.append(date_to)
            # Фильтр по компании — применяем к contractor_records.company_name
            if companies_list:
                placeholders_co = ','.join(['%s'] * len(companies_list))
                contr_where.append(f'company_name IN ({placeholders_co})')
                contr_args.extend(companies_list)
            if exam_types_list:
                placeholders_ct = ','.join(['%s'] * len(exam_types_list))
                contr_where.append(f'exam_type IN ({placeholders_ct})')
                contr_args.extend(exam_types_list)
            # Фильтр по результату допуска
            if results_list:
                placeholders_res = ','.join(['%s'] * len(results_list))
                contr_where.append(f'admission IN ({placeholders_res})')
                contr_args.extend(results_list)
            contr_sql = ' AND '.join(contr_where)
            cur.execute(
                f"""SELECT id, record_date, company_name, workers_count, admission, exam_type, shift
                    FROM {SCHEMA}.zdravpunkt_contractor_records
                    WHERE {contr_sql}
                    ORDER BY record_date ASC, id ASC""",
                contr_args
            )
            contr_rows = cur.fetchall()
            contractor_list = []
            for cr in contr_rows:
                contractor_list.append({
                    'id': cr[0],
                    'record_date': cr[1].isoformat() if cr[1] else None,
                    'company_name': cr[2],
                    'workers_count': cr[3],
                    'admission': cr[4],
                    'exam_type': cr[5] or 'pre_shift',
                    'shift': cr[6] or 'day',
                })
            contr_workers_sum = sum(r['workers_count'] for r in contractor_list)
            contr_records_count = len(contractor_list)
            # Считаем допуски из contractor_records по workers_count
            contr_admitted = sum(r['workers_count'] for r in contractor_list if r['admission'] == 'admitted')
            contr_not_admitted = sum(r['workers_count'] for r in contractor_list if r['admission'] == 'not_admitted')
            contr_evaded = sum(r['workers_count'] for r in contractor_list if r['admission'] == 'evaded')

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True,
                'records': records,
                'contractor_records_list': contractor_list,
                'total': total_count + contr_records_count,
                'admitted': int(stat[1] or 0) + contr_admitted,
                'not_admitted': int(stat[2] or 0) + contr_not_admitted,
                'evaded': int(stat[3] or 0) + contr_evaded,
                'unique_workers': int(stat[4] or 0) + contr_workers_sum,
                'unique_workers_esmo': int(stat[4] or 0),
                'total_esmo': total_count,
                'contractor_workers': contr_workers_sum,
                'unique_not_admitted': unique_not_admitted,
                'unique_evaded': unique_evaded,
                'limit': limit,
                'offset': offset_val,
                'contractor_records': contr_records_count,
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
            esmo_companies = [r[0] for r in cur.fetchall()]
            # Добавляем компании из ручного ввода подрядчиков
            if org_id:
                cur.execute(
                    f"SELECT DISTINCT company_name FROM {SCHEMA}.zdravpunkt_contractor_records WHERE organization_id = %s AND company_name IS NOT NULL AND company_name != '' ORDER BY company_name",
                    (org_id,)
                )
                contractor_companies = [r[0] for r in cur.fetchall()]
            else:
                contractor_companies = []
            # Объединяем уникально, сохраняя порядок
            all_companies = esmo_companies + [c for c in contractor_companies if c not in esmo_companies]
            all_companies.sort()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'success': True, 'subdivisions': subdivisions, 'companies': all_companies
            }, ensure_ascii=False)}

        if method == 'GET' and action == 'workers_list':
            q_org = f"AND organization_id = {int(org_id)}" if org_id else ""
            subdivision = params.get('subdivision', '')
            if subdivision:
                cur.execute(f"""
                    SELECT id, fio, worker_number, subdivision, position, company, shift_type, created_at
                    FROM {SCHEMA}.zdravpunkt_workers
                    WHERE 1=1 {q_org} AND subdivision = %s
                    ORDER BY fio
                """, (subdivision,))
            else:
                cur.execute(f"""
                    SELECT id, fio, worker_number, subdivision, position, company, shift_type, created_at
                    FROM {SCHEMA}.zdravpunkt_workers
                    WHERE 1=1 {q_org}
                    ORDER BY subdivision, fio
                """)
            rows = cur.fetchall()
            workers = [{'id': r[0], 'fio': r[1], 'worker_number': r[2] or '', 'subdivision': r[3] or '',
                        'position': r[4] or '', 'company': r[5] or '', 'shift_type': r[6], 'created_at': str(r[7])} for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True, 'workers': workers}, ensure_ascii=False)}

        if method == 'GET' and action == 'workers_sub_stats':
            q_org = f"AND organization_id = {int(org_id)}" if org_id else ""
            cur.execute(f"""
                SELECT subdivision, shift_type, COUNT(*) as cnt
                FROM {SCHEMA}.zdravpunkt_workers
                WHERE 1=1 {q_org}
                  AND subdivision IS NOT NULL AND subdivision != ''
                GROUP BY subdivision, shift_type
                ORDER BY subdivision, shift_type
            """)
            rows = cur.fetchall()
            subs: dict = {}
            for sub, shift, cnt in rows:
                if sub not in subs:
                    subs[sub] = {'subdivision': sub, 'vakhta': 0, 'mezhvakhta': 0, 'other': 0, 'total': 0}
                if shift == 'Вахта':
                    subs[sub]['vakhta'] += cnt
                elif shift == 'Межвахта':
                    subs[sub]['mezhvakhta'] += cnt
                else:
                    subs[sub]['other'] += cnt
                subs[sub]['total'] += cnt
            result = sorted(subs.values(), key=lambda x: x['subdivision'])
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'success': True, 'stats': result}, ensure_ascii=False)}

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
                         w.get('company', ''), '{}',
                         w.get('shift_type') if w.get('shift_type') not in (None, '-', '') else None)
                        for w in workers
                    ]
                    psycopg2.extras.execute_values(
                        cur,
                        f"""INSERT INTO {SCHEMA}.zdravpunkt_workers
                            (file_id, organization_id, worker_number, fio, subdivision, position, company, extra_data, shift_type)
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

            # ── Сохранить / обновить записи подрядчиков ──────────────────────
            if action_post == 'save_contractor_records':
                records_in = body.get('records', [])
                try:
                    org_id_b = int(body.get('organization_id') or 0) or None
                except (TypeError, ValueError):
                    org_id_b = None
                if not org_id_b:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'organization_id required'})}
                saved = []
                for rec in records_in:
                    rid = rec.get('id') or None
                    rec_date = rec.get('record_date') or None
                    company = str(rec.get('company_name', '')).strip()
                    try:
                        count = int(rec.get('workers_count', 0) or 0)
                    except (TypeError, ValueError):
                        count = 0
                    admission = rec.get('admission', 'admitted')
                    exam_type = rec.get('exam_type', 'pre_shift') or 'pre_shift'
                    shift = rec.get('shift', 'day') or 'day'
                    if not company or not rec_date:
                        continue
                    if rid:
                        cur.execute(
                            f"""UPDATE {SCHEMA}.zdravpunkt_contractor_records
                                SET record_date=%s, company_name=%s, workers_count=%s, admission=%s, exam_type=%s, shift=%s, updated_at=now()
                                WHERE id=%s AND organization_id=%s RETURNING id""",
                            (rec_date, company, count, admission, exam_type, shift, rid, org_id_b)
                        )
                        row = cur.fetchone()
                        if row:
                            saved.append(row[0])
                    else:
                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.zdravpunkt_contractor_records
                                (organization_id, record_date, company_name, workers_count, admission, exam_type, shift)
                                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                            (org_id_b, rec_date, company, count, admission, exam_type, shift)
                        )
                        row = cur.fetchone()
                        if row:
                            saved.append(row[0])
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'saved': len(saved)}, ensure_ascii=False)}

            # ── Сохранить / обновить настройку пролонгации ───────────────────
            if action_post == 'save_prolongation':
                try:
                    org_id_b = int(body.get('organization_id') or 0) or None
                except (TypeError, ValueError):
                    org_id_b = None
                if not org_id_b:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'organization_id required'})}
                pid = body.get('id') or None
                company = str(body.get('company_name', '')).strip()
                try:
                    wday = int(body.get('workers_count_day', 0) or 0)
                    wnight = int(body.get('workers_count_night', 0) or 0)
                except (TypeError, ValueError):
                    wday, wnight = 0, 0
                admission = body.get('admission', 'admitted')
                exam_type = body.get('exam_type', 'pre_shift') or 'pre_shift'
                is_active = bool(body.get('is_active', True))
                if not company:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'company_name required'})}
                if pid:
                    cur.execute(
                        f"""UPDATE {SCHEMA}.zdravpunkt_contractor_prolongation
                            SET company_name=%s, workers_count_day=%s, workers_count_night=%s,
                                admission=%s, exam_type=%s, is_active=%s, updated_at=now()
                            WHERE id=%s AND organization_id=%s RETURNING id""",
                        (company, wday, wnight, admission, exam_type, is_active, pid, org_id_b)
                    )
                else:
                    cur.execute(
                        f"""INSERT INTO {SCHEMA}.zdravpunkt_contractor_prolongation
                            (organization_id, company_name, workers_count_day, workers_count_night, admission, exam_type, is_active)
                            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                        (org_id_b, company, wday, wnight, admission, exam_type, is_active)
                    )
                row = cur.fetchone()
                conn.commit()
                new_id = row[0] if row else pid
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'id': new_id}, ensure_ascii=False)}

            # ── Удалить настройку пролонгации ─────────────────────────────────
            if action_post == 'delete_prolongation':
                pid = body.get('id') or None
                try:
                    org_id_b = int(body.get('organization_id') or 0) or None
                except (TypeError, ValueError):
                    org_id_b = None
                if not pid or not org_id_b:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'id and organization_id required'})}
                cur.execute(
                    f"DELETE FROM {SCHEMA}.zdravpunkt_contractor_prolongation WHERE id=%s AND organization_id=%s",
                    (pid, org_id_b)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True}, ensure_ascii=False)}

            # ── Заполнить сегодняшние записи по активным пролонгациям ─────────
            if action_post == 'fill_prolongation_today':
                try:
                    org_id_b = int(body.get('organization_id') or 0) or None
                except (TypeError, ValueError):
                    org_id_b = None
                if not org_id_b:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'organization_id required'})}
                today = date.today()
                cur.execute(
                    f"""SELECT id, company_name, workers_count_day, workers_count_night, admission, exam_type
                        FROM {SCHEMA}.zdravpunkt_contractor_prolongation
                        WHERE organization_id=%s AND is_active=TRUE AND (last_filled_date IS NULL OR last_filled_date < %s)""",
                    (org_id_b, today)
                )
                prolongations = cur.fetchall()
                inserted = 0
                for p in prolongations:
                    pid_p, company, wday, wnight, admission, exam_type = p
                    # Дневная смена
                    if wday > 0:
                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.zdravpunkt_contractor_records
                                (organization_id, record_date, company_name, workers_count, admission, exam_type, shift)
                                VALUES (%s, %s, %s, %s, %s, %s, 'day')""",
                            (org_id_b, today, company, wday, admission, exam_type)
                        )
                        inserted += 1
                    # Ночная смена
                    if wnight > 0:
                        cur.execute(
                            f"""INSERT INTO {SCHEMA}.zdravpunkt_contractor_records
                                (organization_id, record_date, company_name, workers_count, admission, exam_type, shift)
                                VALUES (%s, %s, %s, %s, %s, %s, 'night')""",
                            (org_id_b, today, company, wnight, admission, exam_type)
                        )
                        inserted += 1
                    cur.execute(
                        f"UPDATE {SCHEMA}.zdravpunkt_contractor_prolongation SET last_filled_date=%s WHERE id=%s",
                        (today, pid_p)
                    )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True, 'inserted': inserted}, ensure_ascii=False)}

            # ── Удалить запись подрядчика ─────────────────────────────────────
            if action_post == 'delete_contractor_record':
                rid = body.get('id') or None
                try:
                    org_id_b = int(body.get('organization_id') or 0) or None
                except (TypeError, ValueError):
                    org_id_b = None
                if not rid or not org_id_b:
                    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'id and organization_id required'})}
                cur.execute(
                    f"DELETE FROM {SCHEMA}.zdravpunkt_contractor_records WHERE id=%s AND organization_id=%s",
                    (rid, org_id_b)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'success': True}, ensure_ascii=False)}

        # ── GET: список записей подрядчиков (ручной ввод) ────────────────────
        if method == 'GET' and action == 'contractor_records':
            if not org_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'organization_id required'})}
            cur.execute(
                f"""SELECT id, record_date, company_name, workers_count, admission, created_at, exam_type, shift
                    FROM {SCHEMA}.zdravpunkt_contractor_records
                    WHERE organization_id = %s
                    ORDER BY record_date DESC, id DESC""",
                (org_id,)
            )
            rows = cur.fetchall()
            records = [{'id': r[0], 'record_date': r[1].isoformat() if r[1] else None,
                        'company_name': r[2], 'workers_count': r[3], 'admission': r[4],
                        'created_at': r[5].isoformat() if r[5] else None,
                        'exam_type': r[6] or 'pre_shift',
                        'shift': r[7] or 'day'} for r in rows]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'records': records}, ensure_ascii=False)}

        # ── GET: список настроек пролонгации ─────────────────────────────────
        if method == 'GET' and action == 'prolongation_list':
            if not org_id:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'success': False, 'error': 'organization_id required'})}
            cur.execute(
                f"""SELECT id, company_name, workers_count_day, workers_count_night,
                           admission, exam_type, is_active, last_filled_date
                    FROM {SCHEMA}.zdravpunkt_contractor_prolongation
                    WHERE organization_id = %s
                    ORDER BY id ASC""",
                (org_id,)
            )
            rows = cur.fetchall()
            items = [{'id': r[0], 'company_name': r[1], 'workers_count_day': r[2],
                      'workers_count_night': r[3], 'admission': r[4], 'exam_type': r[5],
                      'is_active': r[6],
                      'last_filled_date': r[7].isoformat() if r[7] else None} for r in rows]
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'success': True, 'prolongations': items}, ensure_ascii=False)}

        return {'statusCode': 400, 'headers': CORS,
                'body': json.dumps({'success': False, 'error': 'Неизвестный запрос'}, ensure_ascii=False)}

    except Exception as e:
        conn.rollback()
        return {'statusCode': 500, 'headers': CORS,
                'body': json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False)}
    finally:
        cur.close()
        conn.close()