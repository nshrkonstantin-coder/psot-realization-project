import json
import os
import psycopg2

SCHEMA = 't_p80499285_psot_realization_pro'

def handler(event: dict, context) -> dict:
    """Управление тарифными планами: GET список/детали, POST создание, PUT обновление, DELETE удаление"""
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    method = event.get('httpMethod', 'GET')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    try:
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            tariff_id = params.get('id')

            if tariff_id:
                cur.execute(f"""
                    SELECT t.id, t.name, t.description, t.price, t.is_active, t.is_default,
                           m.id as module_id, m.name, m.display_name, m.description, m.route_path, m.icon, m.category
                    FROM {SCHEMA}.tariff_plans t
                    LEFT JOIN {SCHEMA}.tariff_modules tm ON tm.tariff_id = t.id
                    LEFT JOIN {SCHEMA}.modules m ON m.id = tm.module_id
                    WHERE t.id = {int(tariff_id)}
                """)
                rows = cur.fetchall()
                if not rows:
                    return _resp(404, {'error': 'Тариф не найден'})

                r = rows[0]
                tariff = {
                    'id': r[0], 'name': r[1], 'description': r[2],
                    'price': float(r[3]) if r[3] else 0,
                    'is_active': r[4], 'is_default': r[5],
                    'modules': []
                }
                for row in rows:
                    if row[6]:
                        tariff['modules'].append({
                            'id': row[6], 'name': row[7], 'display_name': row[8],
                            'description': row[9], 'route_path': row[10],
                            'icon': row[11], 'category': row[12]
                        })
                return _resp(200, tariff)

            else:
                cur.execute(f"""
                    SELECT t.id, t.name, t.description, t.price, t.is_active, t.is_default,
                           COUNT(tm.module_id) as module_count
                    FROM {SCHEMA}.tariff_plans t
                    LEFT JOIN {SCHEMA}.tariff_modules tm ON tm.tariff_id = t.id
                    GROUP BY t.id
                    ORDER BY t.id
                """)
                rows = cur.fetchall()
                tariffs = [{
                    'id': r[0], 'name': r[1], 'description': r[2],
                    'price': float(r[3]) if r[3] else 0,
                    'is_active': r[4], 'is_default': r[5],
                    'module_count': r[6]
                } for r in rows]
                return _resp(200, tariffs)

        elif method == 'POST':
            body = json.loads(event.get('body') or '{}')
            name = body.get('name', '').strip()
            if not name:
                return _resp(400, {'error': 'Название обязательно'})

            cur.execute(f"""
                INSERT INTO {SCHEMA}.tariff_plans (name, description, price)
                VALUES (%s, %s, %s) RETURNING id
            """, (name, body.get('description', ''), body.get('price', 0)))
            tariff_id = cur.fetchone()[0]

            module_ids = body.get('module_ids', [])
            for mid in module_ids:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.tariff_modules (tariff_id, module_id) VALUES (%s, %s)
                """, (tariff_id, mid))

            conn.commit()
            return _resp(201, {'success': True, 'id': tariff_id})

        elif method == 'PUT':
            body = json.loads(event.get('body') or '{}')
            tariff_id = body.get('id')
            if not tariff_id:
                return _resp(400, {'error': 'ID тарифа обязателен'})

            cur.execute(f"""
                UPDATE {SCHEMA}.tariff_plans
                SET name = %s, description = %s, price = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (body.get('name'), body.get('description', ''), body.get('price', 0), tariff_id))

            cur.execute(f"DELETE FROM {SCHEMA}.tariff_modules WHERE tariff_id = %s", (tariff_id,))
            for mid in body.get('module_ids', []):
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.tariff_modules (tariff_id, module_id) VALUES (%s, %s)
                """, (tariff_id, mid))

            conn.commit()
            return _resp(200, {'success': True})

        elif method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            tariff_id = params.get('id')
            if not tariff_id:
                return _resp(400, {'error': 'ID тарифа обязателен'})

            cur.execute(f"DELETE FROM {SCHEMA}.tariff_modules WHERE tariff_id = %s", (int(tariff_id),))
            cur.execute(f"DELETE FROM {SCHEMA}.tariff_plans WHERE id = %s", (int(tariff_id),))
            conn.commit()
            return _resp(200, {'success': True})

    finally:
        cur.close()
        conn.close()

    return _resp(405, {'error': 'Method not allowed'})


def _resp(status: int, data) -> dict:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(data, ensure_ascii=False)
    }
