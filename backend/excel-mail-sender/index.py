"""
Обработка Excel-файла и рассылка персональных email работникам.
Поддерживает: parse (разбор xlsx), send (отправка одной строки), track (трекинг открытия), status (получение статуса).
"""
import json
import os
import smtplib
import base64
import io
import re
import uuid
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List, Optional


def get_db():
    import psycopg2
    return psycopg2.connect(os.environ['DATABASE_URL'])


def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


def parse_excel(file_bytes: bytes) -> Dict[str, Any]:
    try:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return {'error': 'Файл пустой'}
        headers = [str(h).strip() if h is not None else '' for h in rows[0]]
        data_rows = []
        for row in rows[1:]:
            row_data = {}
            for i, cell in enumerate(row):
                key = headers[i] if i < len(headers) else f'col_{i}'
                row_data[key] = str(cell).strip() if cell is not None else ''
            data_rows.append(row_data)
        return {'headers': headers, 'rows': data_rows}
    except Exception as e:
        return {'error': f'Ошибка чтения файла: {str(e)}'}


def build_email_html(row: Dict[str, str], include_columns: List[str], sender_display: str, track_id: str) -> str:
    rows_html = ''
    for col in include_columns:
        value = row.get(col, '')
        # Ссылки делаем кликабельными
        if value.startswith('http://') or value.startswith('https://'):
            cell_val = f'<a href="{value}" style="color:#2563eb;word-break:break-all">{value}</a>'
        else:
            cell_val = f'<span style="white-space:pre-wrap;word-break:break-word">{value}</span>'
        rows_html += (
            f'<tr>'
            f'<td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc;width:40%;vertical-align:top;color:#374151">{col}</td>'
            f'<td style="padding:10px 14px;border:1px solid #e2e8f0;vertical-align:top;color:#111827">{cell_val}</td>'
            f'</tr>'
        )

    track_url = f"https://functions.poehali.dev/2dab48c9-57c0-4f55-90e7-d93b326a6891?action=track&id={track_id}"
    pixel = f'<img src="{track_url}" width="1" height="1" style="display:none" alt="" />'

    return (
        f'<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
        f'<body style="margin:0;padding:16px;background:#f1f5f9;font-family:Arial,sans-serif">'
        f'<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">'
        f'<div style="background:#2563eb;padding:24px 28px">'
        f'<div style="font-size:20px;font-weight:700;color:#fff;margin:0">{sender_display}</div>'
        f'<div style="font-size:13px;color:#bfdbfe;margin-top:4px">Информационное сообщение</div>'
        f'</div>'
        f'<div style="padding:24px 28px">'
        f'<p style="margin:0 0 16px;font-size:15px;color:#374151">Уважаемый сотрудник,<br>направляем вам следующую информацию:</p>'
        f'<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">{rows_html}</table>'
        f'<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">'
        f'<div style="font-size:12px;color:#6b7280">{sender_display}</div>'
        f'</div>'
        f'</div>'
        f'{pixel}'
        f'</body></html>'
    )


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Excel-рассылка: parse (разбор файла), send (одна строка), track (пиксель открытия), status (статусы)
    """
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
    }

    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    # ── GET: трекинг-пиксель ──
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        track_id = params.get('id', '')
        if params.get('action') == 'track' and track_id:
            try:
                db = get_db()
                cur = db.cursor()
                cur.execute(
                    "UPDATE excel_mail_log SET status='opened', opened_at=NOW() WHERE track_id=%s AND status!='opened'",
                    (track_id,)
                )
                db.commit()
                cur.close()
                db.close()
            except Exception:
                pass
            gif_b64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
            return {
                'statusCode': 200,
                'headers': {**cors, 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache'},
                'body': gif_b64,
                'isBase64Encoded': True
            }
        return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Неизвестный запрос'})}

    if method != 'POST':
        return {'statusCode': 405, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Только POST/GET'})}

    try:
        body = json.loads(event.get('body', '{}'))
    except Exception:
        return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Неверный JSON'})}

    action = body.get('action', 'parse')

    # ── parse ──
    if action == 'parse':
        file_b64 = body.get('file_base64', '')
        if not file_b64:
            return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Файл не передан'})}
        try:
            file_bytes = base64.b64decode(file_b64)
        except Exception:
            return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Ошибка декодирования файла'})}
        result = parse_excel(file_bytes)
        if 'error' in result:
            return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': result['error']})}
        return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'success': True, 'headers': result['headers'], 'rows': result['rows']})}

    # ── send (одна строка) ──
    elif action == 'send':
        headers_list: List[str] = body.get('headers', [])
        row: Dict[str, str] = body.get('row', {})
        sender_display: str = body.get('sender_name', 'АСУБТ').strip() or 'АСУБТ'
        subject: str = body.get('subject', 'Информационное сообщение').strip() or 'Информационное сообщение'
        sender_user_id: Optional[int] = body.get('user_id')

        email_col: Optional[str] = None
        include_col: Optional[str] = None
        for h in headers_list:
            hl = h.lower().strip()
            # Точное совпадение — только служебные колонки исключаем
            if hl in ('электронная почта', 'email', 'e-mail', 'почта'):
                email_col = h
            if hl in ('включить в рассылку', 'рассылка'):
                include_col = h

        if not email_col:
            return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Не найдена колонка «Электронная почта»'})}

        to_email = row.get(email_col, '').strip()
        if not to_email or not validate_email(to_email):
            return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': f'Неверный email: {to_email}'})}

        exclude = {include_col, email_col} if include_col else {email_col}
        include_columns = [h for h in headers_list if h not in exclude]

        track_id = uuid.uuid4().hex

        # Приоритет: SMTP из запроса (личный ящик) → системный SMTP
        smtp_email_req: Optional[str] = body.get('smtp_email', '').strip() or None
        smtp_pass_req: Optional[str] = body.get('smtp_password', '').strip() or None
        smtp_host_req: Optional[str] = body.get('smtp_host', '').strip() or None
        smtp_port_req: Optional[int] = body.get('smtp_port')

        if smtp_email_req and smtp_pass_req:
            smtp_host = smtp_host_req or 'smtp.yandex.ru'
            smtp_port = int(smtp_port_req) if smtp_port_req else 587
            smtp_user = smtp_email_req
            smtp_password = smtp_pass_req
        else:
            smtp_host = os.environ.get('SMTP_HOST')
            smtp_port = int(os.environ.get('SMTP_PORT', '587'))
            smtp_user = os.environ.get('SMTP_USER')
            smtp_password = (os.environ.get('SMTP_PASSWORD_NEW') or
                             os.environ.get('YANDEX_SMTP_PASSWORD') or
                             os.environ.get('SMTP_PASSWORD'))

        if not all([smtp_host, smtp_user, smtp_password]):
            return {'statusCode': 500, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'SMTP не настроен. Укажите Email и пароль отправителя.'})}

        html = build_email_html(row, include_columns, sender_display, track_id)
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg.attach(MIMEText(html, 'html', 'utf-8'))

        try:
            smtp_conn = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            smtp_conn.ehlo()
            if smtp_port == 587:
                smtp_conn.starttls()
                smtp_conn.ehlo()
            smtp_conn.login(smtp_user, smtp_password)
            smtp_conn.send_message(msg)
            smtp_conn.quit()
        except smtplib.SMTPAuthenticationError:
            return {'statusCode': 500, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Ошибка аутентификации. Проверьте email и пароль приложения.'})}
        except Exception as e:
            return {'statusCode': 500, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': str(e)})}

        try:
            db = get_db()
            cur = db.cursor()
            cur.execute(
                "INSERT INTO excel_mail_log (track_id, sender_user_id, recipient_email, subject, sender_display, status, row_data) VALUES (%s, %s, %s, %s, %s, 'sent', %s)",
                (track_id, sender_user_id, to_email, subject, sender_display, json.dumps(row))
            )
            db.commit()
            cur.close()
            db.close()
        except Exception:
            pass

        return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'success': True, 'track_id': track_id, 'email': to_email})}

    # ── status ──
    elif action == 'status':
        track_ids: List[str] = body.get('track_ids', [])
        if not track_ids:
            return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'success': True, 'statuses': {}})}
        try:
            db = get_db()
            cur = db.cursor()
            placeholders = ','.join(['%s'] * len(track_ids))
            cur.execute(
                f"SELECT track_id, status, sent_at, opened_at FROM excel_mail_log WHERE track_id IN ({placeholders})",
                track_ids
            )
            rows_db = cur.fetchall()
            cur.close()
            db.close()
            statuses = {}
            for r in rows_db:
                statuses[r[0]] = {
                    'status': r[1],
                    'sent_at': r[2].isoformat() if r[2] else None,
                    'opened_at': r[3].isoformat() if r[3] else None,
                }
            return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'success': True, 'statuses': statuses})}
        except Exception as e:
            return {'statusCode': 500, 'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': str(e)})}

    return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Неизвестный action'})}