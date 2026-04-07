import os
import io
import json
import boto3
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


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


def collect_backend_files():
    """Читает все .py файлы из папки функций на сервере"""
    result = []
    base = '/var/task'
    if not os.path.exists(base):
        return result
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames.sort()
        for filename in sorted(filenames):
            if not filename.endswith('.py'):
                continue
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, base)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
            except Exception as e:
                content = f'# Ошибка чтения: {e}'
            result.append({'path': 'backend/' + rel_path, 'content': content, 'section': 'backend'})
    return result


def handler(event: dict, context) -> dict:
    """
    POST: принимает фронтенд-файлы, сам читает Python-файлы с сервера, генерирует Word-документ.
    Body: { "files": [{"path": "src/App.tsx", "content": "...", "section": "frontend"}, ...] }
    GET: возвращает список и количество Python-файлов доступных на сервере.
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

    # GET — вернуть количество Python-файлов
    if event.get('httpMethod') == 'GET':
        backend_files = collect_backend_files()
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'backend_count': len(backend_files)})
        }

    # POST — генерация документа
    body = json.loads(event.get('body') or '{}')
    frontend_files = [f for f in body.get('files', []) if f.get('section') == 'frontend']
    backend_files = collect_backend_files()

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
            doc.add_paragraph('Файлы не найдены.')
            continue

        for file_item in section_files:
            path = file_item.get('path', 'unknown')
            content = file_item.get('content', '') or '// Файл пустой'

            doc.add_heading(path, level=2)
            add_code_block(doc, content)

            sep = doc.add_paragraph('─' * 100)
            if sep.runs:
                sep.runs[0].font.size = Pt(6)
                sep.runs[0].font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)

    total_files = len(frontend_files) + len(backend_files)
    doc.add_heading('Итого', level=1)
    doc.add_paragraph(f'Фронтенд файлов: {len(frontend_files)}')
    doc.add_paragraph(f'Бэкенд файлов: {len(backend_files)}')
    doc.add_paragraph(f'Всего: {total_files}')

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    docx_bytes = buffer.read()

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )

    key = 'exports/source_code.docx'
    s3.put_object(
        Bucket='files',
        Key=key,
        Body=docx_bytes,
        ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({
            'success': True,
            'url': cdn_url,
            'total_files': total_files,
            'frontend_count': len(frontend_files),
            'backend_count': len(backend_files),
            'message': f'Документ создан. Файлов: {total_files}'
        })
    }
