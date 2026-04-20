import json
import os
import bcrypt
import psycopg2
from typing import Dict, Any

SCHEMA = 't_p80499285_psot_realization_pro'
CORS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}


def _verify_session(event: dict) -> dict | None:
    """Проверяет сессионный токен. Возвращает {'user_id', 'role'} или None."""
    headers = event.get('headers') or {}
    auth = (headers.get('X-Auth-Token') or headers.get('x-auth-token') or
            headers.get('X-Authorization') or headers.get('x-authorization') or
            headers.get('Authorization') or headers.get('authorization') or '')
    token = auth.replace('Bearer ', '').strip()
    if not token:
        return None
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(
        f"SELECT s.user_id, u.role FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    if row:
        cur.execute(f"UPDATE {SCHEMA}.sessions SET last_seen = NOW() WHERE token = %s", (token,))
        conn.commit()
    cur.close()
    conn.close()
    return {'user_id': row[0], 'role': row[1]} if row else None


def _unauth():
    return {'statusCode': 401, 'headers': CORS, 'isBase64Encoded': False,
            'body': json.dumps({'success': False, 'error': 'Unauthorized'})}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Управление профилем пользователя — чтение и редактирование."""
    method: str = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization, X-Auth-Token, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    if method == 'GET':
        session = _verify_session(event)
        if not session:
            return _unauth()

        params = event.get('queryStringParameters') or {}
        user_id = params.get('userId')

        if not user_id:
            return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})}

        # Пользователь может смотреть только свой профиль (если не superadmin/admin)
        if session['role'] not in ('superadmin', 'admin') and str(session['user_id']) != str(user_id):
            return {'statusCode': 403, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Access denied'})}

        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()

        cur.execute("""
            SELECT u.id, u.email, u.fio, u.company, u.subdivision, u.position, u.role, u.created_at,
                   COALESCE(s.registered_count, 0), COALESCE(s.online_count, 0), COALESCE(s.offline_count, 0),
                   u.telegram_chat_id, u.telegram_username, u.telegram_linked_at
            FROM t_p80499285_psot_realization_pro.users u
            LEFT JOIN t_p80499285_psot_realization_pro.user_stats s ON u.id = s.user_id
            WHERE u.id = %s
        """, (user_id,))

        result = cur.fetchone()
        cur.close()
        conn.close()

        if not result:
            return {'statusCode': 404, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User not found'})}

        user_data = {
            'id': result[0],
            'email': result[1],
            'fio': result[2],
            'company': result[3],
            'subdivision': result[4],
            'position': result[5],
            'role': result[6],
            'created_at': result[7].isoformat() if result[7] else None,
            'stats': {
                'registered_count': result[8],
                'online_count': result[9],
                'offline_count': result[10]
            },
            'telegram_chat_id': result[11],
            'telegram_username': result[12],
            'telegram_linked_at': result[13].isoformat() if result[13] else None
        }

        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'user': user_data})}

    if method == 'PUT':
        session = _verify_session(event)
        if not session:
            return _unauth()

        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('userId')
        action = body_data.get('action')

        if not user_id:
            return {'statusCode': 400, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})}

        # Только свой профиль (если не admin)
        if session['role'] not in ('superadmin', 'admin') and str(session['user_id']) != str(user_id):
            return {'statusCode': 403, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Access denied'})}

        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()

        if action == 'update_profile':
            fio = body_data.get('fio')
            company = body_data.get('company')
            subdivision = body_data.get('subdivision')
            position = body_data.get('position')
            cur.execute(
                f"UPDATE {SCHEMA}.users SET fio = %s, company = %s, subdivision = %s, position = %s WHERE id = %s",
                (fio, company, subdivision, position, user_id)
            )
            conn.commit()

        elif action == 'change_password':
            current_password = body_data.get('currentPassword', '')
            new_password = body_data.get('newPassword', '')

            cur.execute(f"SELECT password_hash FROM {SCHEMA}.users WHERE id = %s", (user_id,))
            result = cur.fetchone()

            if not result:
                cur.close(); conn.close()
                return {'statusCode': 404, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'User not found'})}

            stored_hash = result[0]
            # Поддержка bcrypt и старого SHA-256
            import hashlib
            valid = False
            if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
                valid = bcrypt.checkpw(current_password.encode(), stored_hash.encode())
            else:
                valid = (hashlib.sha256(current_password.encode()).hexdigest() == stored_hash)

            if not valid:
                cur.close(); conn.close()
                return {'statusCode': 401, 'headers': CORS, 'isBase64Encoded': False,
                        'body': json.dumps({'success': False, 'error': 'Incorrect current password'})}

            new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
            cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
            conn.commit()

        elif action == 'generate_telegram_code':
            import random
            import string
            link_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            cur.execute(f"UPDATE {SCHEMA}.users SET telegram_link_code = %s WHERE id = %s", (link_code, user_id))
            conn.commit()
            cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'linkCode': link_code})}

        elif action == 'unlink_telegram':
            cur.execute(
                f"UPDATE {SCHEMA}.users SET telegram_chat_id = NULL, telegram_username = NULL, telegram_linked_at = NULL WHERE id = %s",
                (user_id,)
            )
            conn.commit()

        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False,
                'body': json.dumps({'success': True})}

    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}