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


def handler(event: dict, context) -> dict:
    """
    Принимает список файлов через POST и генерирует Word-документ с исходным кодом.
    Body: { "files": [{"path": "src/App.tsx", "content": "...", "section": "frontend"}, ...] }
    Возвращает ссылку на скачивание Word-документа из S3.
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

    body = json.loads(event.get('body') or '{}')
    files = body.get('files', [])

    doc = Document()

    style = doc.styles['Normal']
    style.font.name = 'Arial'
    style.font.size = Pt(10)

    title = doc.add_heading('Исходный код программы', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph('Автоматически сгенерированный документ со всеми исходными файлами проекта.')
    doc.add_paragraph()

    frontend_files = [f for f in files if f.get('section') == 'frontend']
    backend_files = [f for f in files if f.get('section') == 'backend']

    for section_title, section_files in [
        ('Раздел 1. Фронтенд (TypeScript / TSX / CSS)', frontend_files),
        ('Раздел 2. Бэкенд (Python)', backend_files),
    ]:
        doc.add_heading(section_title, level=1)

        if not section_files:
            doc.add_paragraph('Файлы не переданы.')
            continue

        for file_item in section_files:
            path = file_item.get('path', 'unknown')
            content = file_item.get('content', '')

            doc.add_heading(path, level=2)

            if not content.strip():
                content = '// Файл пустой'

            add_code_block(doc, content)

            sep = doc.add_paragraph('─' * 100)
            if sep.runs:
                sep.runs[0].font.size = Pt(6)
                sep.runs[0].font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)

    total_files = len(files)
    doc.add_heading('Итого', level=1)
    doc.add_paragraph(f'Всего файлов в документе: {total_files}')

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
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'success': True,
            'url': cdn_url,
            'total_files': total_files,
            'message': f'Документ создан. Файлов: {total_files}'
        })
    }
