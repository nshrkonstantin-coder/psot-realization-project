import os
import io
import json
import boto3
import psycopg2
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p80499285_psot_realization_pro')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def add_code_block(doc, code_text):
    para = doc.add_paragraph()
    run = para.add_run(code_text)
    run.font.name = 'Courier New'
    run.font.size = Pt(7)
    run.font.color.rgb = RGBColor(0x1F, 0x1F, 0x1F)
    pPr = para._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), 'F5F5F5')
    pPr.append(shd)


def handler(event: dict, context) -> dict:
    """
    GET  — возвращает статистику файлов из БД.
    POST action=save_files — сохраняет файлы в БД (принимает список файлов).
    POST action=generate   — генерирует Word из файлов в БД.
    """

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    # GET — статистика
    if event.get('httpMethod') == 'GET':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT section, COUNT(*) FROM {SCHEMA}.source_files GROUP BY section")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        stats = {row[0]: row[1] for row in rows}
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'frontend_count': stats.get('frontend', 0),
                'backend_count': stats.get('backend', 0),
                'total': sum(stats.values())
            })
        }

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'generate')

    # POST action=save_files — сохранить файлы в БД
    if action == 'save_files':
        files = body.get('files', [])
        if not files:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нет файлов'})}

        conn = get_conn()
        cur = conn.cursor()
        saved = 0
        for f in files:
            path = f.get('path', '').replace("'", "''")
            content = f.get('content', '').replace("'", "''")
            section = f.get('section', 'backend').replace("'", "''")
            cur.execute(f"""
                INSERT INTO {SCHEMA}.source_files (file_path, file_content, section)
                VALUES ('{path}', '{content}', '{section}')
                ON CONFLICT (file_path) DO UPDATE SET file_content = EXCLUDED.file_content, updated_at = NOW()
            """)
            saved += 1
        conn.commit()
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'saved': saved})
        }

    # POST action=generate — генерация Word из БД
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT file_path, file_content, section FROM {SCHEMA}.source_files ORDER BY section, file_path")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    frontend_files = [{'path': r[0], 'content': r[1]} for r in rows if r[2] == 'frontend']
    backend_files  = [{'path': r[0], 'content': r[1]} for r in rows if r[2] == 'backend']

    doc = Document()
    style = doc.styles['Normal']
    style.font.name = 'Arial'
    style.font.size = Pt(10)

    title = doc.add_heading('Исходный код программы', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph('Автоматически сгенерированный документ со всеми исходными файлами проекта.')
    doc.add_paragraph()

    for section_title, section_files in [
        ('Раздел 1. Фронтенд (TypeScript / TSX / CSS)', frontend_files),
        ('Раздел 2. Бэкенд (Python)', backend_files),
    ]:
        doc.add_heading(section_title, level=1)
        if not section_files:
            doc.add_paragraph('Файлы не загружены.')
            continue
        for f in section_files:
            doc.add_heading(f['path'], level=2)
            add_code_block(doc, f['content'] or '// Файл пустой')
            sep = doc.add_paragraph('─' * 100)
            if sep.runs:
                sep.runs[0].font.size = Pt(6)
                sep.runs[0].font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)

    total = len(frontend_files) + len(backend_files)
    doc.add_heading('Итого', level=1)
    doc.add_paragraph(f'Фронтенд: {len(frontend_files)} файлов')
    doc.add_paragraph(f'Бэкенд: {len(backend_files)} файлов')
    doc.add_paragraph(f'Всего: {total}')

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    key = 'exports/source_code.docx'
    s3.put_object(Bucket='files', Key=key, Body=buffer.read(),
                  ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'success': True,
            'url': cdn_url,
            'total_files': total,
            'frontend_count': len(frontend_files),
            'backend_count': len(backend_files),
        })
    }
