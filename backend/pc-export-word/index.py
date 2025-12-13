import json
import os
from typing import Dict, Any
import psycopg2
from io import BytesIO
import base64

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Экспорт записей ПК (производственного контроля) в формат Word (DOCX)
    Возвращает файл .docx для скачивания
    '''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Only GET allowed'}),
            'isBase64Encoded': False
        }
    
    query_params = event.get('queryStringParameters', {})
    ids_str = query_params.get('ids', '')
    
    if not ids_str:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Parameter ids is required'}),
            'isBase64Encoded': False
        }
    
    try:
        pc_ids = [int(id_str.strip()) for id_str in ids_str.split(',')]
    except ValueError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid ids format'}),
            'isBase64Encoded': False
        }
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'}),
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        ids_placeholder = ','.join(['%s'] * len(pc_ids))
        
        query = f"""
            SELECT 
                r.id,
                r.doc_number,
                r.doc_date,
                r.issuer_name,
                r.issuer_position,
                r.recipient_name,
                r.department,
                '' as checked_object
            FROM t_p80499285_psot_realization_pro.production_control_reports r
            WHERE r.id IN ({ids_placeholder})
            ORDER BY r.doc_date DESC
        """
        
        cursor.execute(query, pc_ids)
        pc_records = cursor.fetchall()
        
        if not pc_records:
            cursor.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No PC records found'}),
                'isBase64Encoded': False
            }
        
        pcs_with_violations = []
        
        for pc_row in pc_records:
            pc_id = pc_row[0]
            
            viol_query = """
                SELECT 
                    item_number,
                    description,
                    measures
                FROM t_p80499285_psot_realization_pro.production_control_violations
                WHERE report_id = %s
                ORDER BY item_number
            """
            
            cursor.execute(viol_query, (pc_id,))
            violations = cursor.fetchall()
            
            pcs_with_violations.append({
                'id': pc_row[0],
                'doc_number': pc_row[1],
                'doc_date': str(pc_row[2]) if pc_row[2] else '',
                'inspector_fio': pc_row[3],
                'inspector_position': pc_row[4],
                'location': pc_row[5],
                'department': pc_row[6],
                'checked_object': pc_row[7],
                'violations': [{
                    'violation_number': viol[0],
                    'description': viol[1],
                    'measures': viol[2],
                } for viol in violations]
            })
        
        cursor.close()
        conn.close()
        
        from docx import Document
        from docx.shared import Pt, Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        
        doc = Document()
        
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(0.6)
            section.bottom_margin = Inches(0.6)
            section.left_margin = Inches(0.6)
            section.right_margin = Inches(0.6)
        
        for pc in pcs_with_violations:
            heading1 = doc.add_heading('ПРОТОКОЛ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ', level=1)
            heading1.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in heading1.runs:
                run.font.size = Pt(16)
                run.font.bold = True
            
            heading2 = doc.add_heading(pc['doc_number'], level=2)
            heading2.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in heading2.runs:
                run.font.size = Pt(14)
                run.font.bold = True
            
            doc.add_paragraph()
            
            info_table = doc.add_table(rows=6, cols=2)
            info_table.style = 'Table Grid'
            
            info_data = [
                ('Дата:', pc['doc_date']),
                ('Проверяющий:', pc['inspector_fio']),
                ('Должность:', pc['inspector_position']),
                ('Подразделение:', pc['department']),
                ('Кому:', pc['location']),
                ('Объект проверки:', pc['checked_object'] or '—')
            ]
            
            for idx, (label, value) in enumerate(info_data):
                row = info_table.rows[idx]
                label_cell = row.cells[0]
                value_cell = row.cells[1]
                
                label_para = label_cell.paragraphs[0]
                label_para.text = label
                label_para.runs[0].font.bold = True
                label_para.runs[0].font.size = Pt(10)
                
                value_para = value_cell.paragraphs[0]
                value_para.text = str(value) if value else '—'
                value_para.runs[0].font.size = Pt(10)
            
            doc.add_paragraph()
            
            obs_heading = doc.add_heading('НАРУШЕНИЯ', level=2)
            obs_heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in obs_heading.runs:
                run.font.size = Pt(13)
                run.font.bold = True
            
            for viol in pc['violations']:
                viol_table = doc.add_table(rows=1, cols=1)
                viol_table.style = 'Table Grid'
                viol_cell = viol_table.rows[0].cells[0]
                
                viol_title = viol_cell.add_paragraph()
                viol_title.add_run(f"Нарушение №{viol['violation_number']}").bold = True
                viol_title.runs[0].font.size = Pt(11)
                
                fields = [
                    ('Описание нарушения:', viol['description']),
                    ('Мероприятия по устранению:', viol['measures']),
                ]
                
                for field_label, field_value in fields:
                    field_para = viol_cell.add_paragraph()
                    field_para.add_run(f"{field_label} ").bold = True
                    field_para.runs[0].font.size = Pt(10)
                    
                    value_run = field_para.add_run(str(field_value))
                    value_run.font.size = Pt(10)
                
                doc.add_paragraph()
            
            doc.add_paragraph()
            
            signatures_heading = doc.add_heading('ПОДПИСИ', level=2)
            signatures_heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in signatures_heading.runs:
                run.font.size = Pt(12)
                run.font.bold = True
            
            sig_table = doc.add_table(rows=1, cols=2)
            sig_table.style = 'Table Grid'
            
            left_cell = sig_table.rows[0].cells[0]
            
            left_label = left_cell.paragraphs[0]
            left_label.add_run('Проверяющий:').bold = True
            left_label.runs[0].font.size = Pt(10)
            
            left_name = left_cell.add_paragraph(pc['inspector_fio'])
            left_name.runs[0].font.size = Pt(10)
            
            left_cell.add_paragraph()
            left_cell.add_paragraph()
            
            left_sign = left_cell.add_paragraph('Подпись ______________')
            left_sign.runs[0].font.size = Pt(10)
            
            left_date = left_cell.add_paragraph(f'Дата: {pc["doc_date"]}')
            left_date.runs[0].font.size = Pt(9)
            
            right_cell = sig_table.rows[0].cells[1]
            
            right_label = right_cell.paragraphs[0]
            right_label.add_run('Кому:').bold = True
            right_label.runs[0].font.size = Pt(10)
            
            right_name = right_cell.add_paragraph(pc['location'])
            right_name.runs[0].font.size = Pt(10)
            
            right_cell.add_paragraph()
            right_cell.add_paragraph()
            
            right_sign = right_cell.add_paragraph('Подпись ______________')
            right_sign.runs[0].font.size = Pt(10)
            
            right_date = right_cell.add_paragraph('Дата: __________')
            right_date.runs[0].font.size = Pt(9)
            
            doc.add_page_break()
        
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        docx_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        
        filename = f"PC_{pcs_with_violations[0]['doc_number']}" if len(pcs_with_violations) == 1 else "PC_Multiple"
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Access-Control-Allow-Origin': '*',
                'Content-Disposition': f'attachment; filename="{filename}.docx"'
            },
            'body': docx_base64,
            'isBase64Encoded': True
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
