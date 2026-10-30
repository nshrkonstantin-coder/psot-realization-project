import json
import os
from typing import Dict, Any

import psycopg2

SCHEMA = 't_p80499285_psot_realization_pro'
CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
}

PERIODS = {'30': 30, '90': 90, '180': 180, '365': 365}


def resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {'statusCode': status, 'headers': CORS, 'isBase64Encoded': False,
            'body': json.dumps(body, ensure_ascii=False)}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Статистика нарушений по подразделениям и месяцам: ПАБ и производственный контроль.
    GET ?token=...&period=30|90|180|365|all&source=all|pab|pc
    """
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'isBase64Encoded': False, 'body': '',
                'headers': {'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
                            'Access-Control-Max-Age': '86400'}}

    params = event.get('queryStringParameters') or {}
    token = (params.get('token') or '').strip()
    if not token:
        return resp(401, {'success': False, 'error': 'Unauthorized'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    try:
        cur.execute(
            f"SELECT u.id, u.role, u.organization_id FROM {SCHEMA}.sessions s "
            f"JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()",
            (token,)
        )
        session = cur.fetchone()
        if not session:
            return resp(401, {'success': False, 'error': 'Unauthorized'})
        org_id = session[2]

        period = params.get('period', '180')
        source = params.get('source', 'all')
        days = PERIODS.get(period)
        date_cond_pab = f"AND pr.doc_date >= CURRENT_DATE - {days}" if days else ''
        date_cond_pc = f"AND r.doc_date >= CURRENT_DATE - {days}" if days else ''
        org_cond_pab = f"AND pr.organization_id = {int(org_id)}" if org_id else ''
        org_cond_pc = f"AND r.organization_id = {int(org_id)}" if org_id else ''

        queries = []
        if source in ('all', 'pab'):
            queries.append(f"""
                SELECT COALESCE(NULLIF(pr.department, ''), 'Без подразделения') AS dept,
                       date_trunc('month', pr.doc_date)::date AS month,
                       po.status, po.deadline, 'pab' AS src
                FROM {SCHEMA}.pab_observations po
                JOIN {SCHEMA}.pab_records pr ON pr.id = po.pab_record_id
                WHERE po.category <> 'ППП' {org_cond_pab} {date_cond_pab}
            """)
        if source in ('all', 'pc'):
            queries.append(f"""
                SELECT COALESCE(NULLIF(r.department, ''), 'Без подразделения') AS dept,
                       date_trunc('month', r.doc_date)::date AS month,
                       v.status, v.deadline, 'pc' AS src
                FROM {SCHEMA}.production_control_violations v
                JOIN {SCHEMA}.production_control_reports r ON r.id = v.report_id
                WHERE (r.archived = FALSE OR r.archived IS NULL) {org_cond_pc} {date_cond_pc}
            """)
        if not queries:
            return resp(400, {'success': False, 'error': 'Неверный источник'})

        cur.execute(' UNION ALL '.join(queries))
        rows = cur.fetchall()

        cur.execute("SELECT CURRENT_DATE")
        today = cur.fetchone()[0]

        totals = {'total': 0, 'completed': 0, 'overdue': 0, 'in_progress': 0, 'new': 0}
        by_source = {'pab': 0, 'pc': 0}
        depts: Dict[str, Dict[str, int]] = {}
        months: Dict[str, Dict[str, int]] = {}

        for dept, month, status, deadline, src in rows:
            is_done = status in ('completed', 'closed')
            is_overdue = (not is_done) and deadline is not None and deadline < today
            if is_done:
                bucket = 'completed'
            elif is_overdue:
                bucket = 'overdue'
            elif status == 'in_progress':
                bucket = 'in_progress'
            else:
                bucket = 'new'

            totals['total'] += 1
            totals[bucket] += 1
            by_source[src] += 1

            d = depts.setdefault(dept, {'total': 0, 'completed': 0, 'overdue': 0, 'in_progress': 0, 'new': 0})
            d['total'] += 1
            d[bucket] += 1

            mkey = month.strftime('%Y-%m')
            m = months.setdefault(mkey, {'total': 0, 'completed': 0, 'overdue': 0, 'open': 0})
            m['total'] += 1
            if bucket == 'completed':
                m['completed'] += 1
            elif bucket == 'overdue':
                m['overdue'] += 1
                m['open'] += 1
            else:
                m['open'] += 1

        departments = sorted(
            [{'name': k, **v} for k, v in depts.items()],
            key=lambda x: (-x['total'], x['name'])
        )
        by_month = [{'month': k, **months[k]} for k in sorted(months.keys())]
        done_percent = round(totals['completed'] * 100 / totals['total']) if totals['total'] else 0

        return resp(200, {
            'success': True,
            'period': period,
            'source': source,
            'totals': {**totals, 'done_percent': done_percent},
            'by_source': by_source,
            'departments': departments,
            'months': by_month,
        })
    finally:
        cur.close()
        conn.close()
