"""
Обработка Excel-файла и рассылка персональных email работникам.
Парсит загруженный .xlsx, строит таблицу рассылки, отправляет каждому работнику
письмо с данными из строк, где отмечена колонка 'Включить в рассылку'.
"""
import json
import os
import smtplib
import base64
import io
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List


def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


def parse_excel(file_bytes: bytes) -> Dict[str, Any]:
    """Парсинг Excel-файла, возврат заголовков и строк"""
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


def build_email_html(row: Dict[str, str], include_columns: List[str], sender_display: str) -> str:
    """Формирование HTML-письма с данными строки"""
    rows_html = ''
    for col in include_columns:
        value = row.get(col, '')
        rows_html += f'''
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;background:#f5f5f5;width:40%">{col}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">{value}</td>
        </tr>'''

    return f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">{sender_display}</h2>
        <p style="color:#94a3b8;margin:4px 0 0">Информационное сообщение</p>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <p style="margin-top:0">Уважаемый сотрудник,<br>направляем вам следующую информацию:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          {rows_html}
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
        <p style="color:#64748b;font-size:13px;margin:0">{sender_display}</p>
      </div>
    </body></html>
    """


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Загрузка Excel и рассылка персональных email работникам.
    POST: файл base64, sender_name, subject, action (parse|send)
    """
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Только POST'})}

    try:
        body = json.loads(event.get('body', '{}'))
    except Exception:
        return {'statusCode': 400, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Неверный JSON'})}

    action = body.get('action', 'parse')

    # ── ДЕЙСТВИЕ: parse ── разбираем Excel и возвращаем таблицу
    if action == 'parse':
        file_b64 = body.get('file_base64', '')
        if not file_b64:
            return {'statusCode': 400, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Файл не передан'})}
        try:
            file_bytes = base64.b64decode(file_b64)
        except Exception:
            return {'statusCode': 400, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Ошибка декодирования файла'})}

        result = parse_excel(file_bytes)
        if 'error' in result:
            return {'statusCode': 400, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': result['error']})}

        return {'statusCode': 200, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'success': True, 'headers': result['headers'], 'rows': result['rows']})}

    # ── ДЕЙСТВИЕ: send ── отправляем письма
    elif action == 'send':
        headers_list = body.get('headers', [])
        rows = body.get('rows', [])
        sender_display = body.get('sender_name', 'АСУБТ').strip() or 'АСУБТ'
        subject = body.get('subject', 'Информационное сообщение').strip() or 'Информационное сообщение'

        # Ищем колонки email и "включить в рассылку" (нечувствительно к регистру)
        email_col = None
        include_col = None
        for h in headers_list:
            h_lower = h.lower().strip()
            if 'электронная почта' in h_lower or h_lower in ('email', 'e-mail', 'почта'):
                email_col = h
            if 'включить в рассылку' in h_lower or 'рассылка' in h_lower:
                include_col = h

        if not email_col:
            return {'statusCode': 400, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Не найдена колонка с email. Ожидается "Электронная почта" или "Email"'})}

        # Колонки, включаемые в тело письма (все кроме служебных)
        exclude_from_body = {include_col, email_col} if include_col else {email_col}
        include_columns = [h for h in headers_list if h not in exclude_from_body]

        # SMTP
        smtp_host = os.environ.get('SMTP_HOST')
        smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = (os.environ.get('SMTP_PASSWORD_NEW') or
                         os.environ.get('YANDEX_SMTP_PASSWORD') or
                         os.environ.get('SMTP_PASSWORD'))

        if not all([smtp_host, smtp_user, smtp_password]):
            return {'statusCode': 500, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'SMTP не настроен'})}

        results = []
        try:
            smtp = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            smtp.ehlo()
            if smtp_port == 587:
                smtp.starttls()
                smtp.ehlo()
            smtp.login(smtp_user, smtp_password)

            for row in rows:
                # Проверяем флаг включения в рассылку
                if include_col:
                    flag = row.get(include_col, '').lower().strip()
                    if flag not in ('да', 'yes', '1', 'true', '+', 'х', 'x'):
                        results.append({'email': row.get(email_col, ''), 'success': False,
                                        'message': 'Пропущено (не включён в рассылку)'})
                        continue

                to_email = row.get(email_col, '').strip()
                if not to_email or not validate_email(to_email):
                    results.append({'email': to_email, 'success': False,
                                    'message': 'Неверный email адрес'})
                    continue

                html = build_email_html(row, include_columns, sender_display)
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = f'{sender_display} <{smtp_user}>'
                msg['To'] = to_email
                msg.attach(MIMEText(html, 'html', 'utf-8'))

                try:
                    smtp.send_message(msg)
                    results.append({'email': to_email, 'success': True, 'message': 'Отправлено'})
                except Exception as e:
                    results.append({'email': to_email, 'success': False, 'message': str(e)})

            smtp.quit()
        except smtplib.SMTPAuthenticationError:
            return {'statusCode': 500, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Ошибка аутентификации SMTP'})}
        except Exception as e:
            return {'statusCode': 500, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': str(e), 'results': results})}

        sent = [r for r in results if r['success']]
        failed = [r for r in results if not r['success']]
        return {'statusCode': 200, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'success': True, 'total': len(results),
                                    'sent': len(sent), 'failed': len(failed), 'results': results})}

    return {'statusCode': 400, 'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Неизвестный action'})}
