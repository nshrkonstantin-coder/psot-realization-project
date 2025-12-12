"""
Backend функция для экспорта ПАБ в формат Word (DOCX)
Возвращает файл .docx для скачивания
"""
import json
import os
from typing import Dict, Any
import psycopg2
from io import BytesIO
import base64

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Экспорт ПАБ в Word документ
    
    Query параметры:
    - ids: строка с ID через запятую (например: "1,2,3")
    """
    
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
        pab_ids = [int(id_str.strip()) for id_str in ids_str.split(',')]
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
        
        ids_placeholder = ','.join(['%s'] * len(pab_ids))
        
        query = f"""
            SELECT 
                p.id,
                p.doc_number,
                p.doc_date,
                p.inspector_fio,
                p.inspector_position,
                p.location,
                p.checked_object,
                p.department,
                p.header_photo_url,
                p.status
            FROM pab_records p
            WHERE p.id IN ({ids_placeholder})
            ORDER BY p.doc_date DESC
        """
        
        cursor.execute(query, pab_ids)
        pab_records = cursor.fetchall()
        
        if not pab_records:
            cursor.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No PAB records found'}),
                'isBase64Encoded': False
            }
        
        pabs_with_obs = []
        
        for pab_row in pab_records:
            pab_id = pab_row[0]
            
            obs_query = """
                SELECT 
                    observation_number,
                    description,
                    category,
                    conditions_actions,
                    hazard_factors,
                    measures,
                    responsible_person,
                    deadline,
                    photo_url,
                    status
                FROM pab_observations
                WHERE pab_id = %s
                ORDER BY observation_number
            """
            
            cursor.execute(obs_query, (pab_id,))
            observations = cursor.fetchall()
            
            pabs_with_obs.append({
                'id': pab_row[0],
                'doc_number': pab_row[1],
                'doc_date': str(pab_row[2]) if pab_row[2] else '',
                'inspector_fio': pab_row[3],
                'inspector_position': pab_row[4],
                'location': pab_row[5],
                'checked_object': pab_row[6],
                'department': pab_row[7],
                'header_photo_url': pab_row[8] or '',
                'status': pab_row[9],
                'observations': [{
                    'observation_number': obs[0],
                    'description': obs[1],
                    'category': obs[2],
                    'conditions_actions': obs[3],
                    'hazard_factors': obs[4],
                    'measures': obs[5],
                    'responsible_person': obs[6],
                    'deadline': str(obs[7]) if obs[7] else '',
                    'photo_url': obs[8] or '',
                    'status': obs[9]
                } for obs in observations]
            })
        
        cursor.close()
        conn.close()
        
        try:
            from docx import Document
            from docx.shared import Pt, Inches, RGBColor
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            
            doc = Document()
            
            for pab in pabs_with_obs:
                heading = doc.add_heading(f"Карта регистрации ПАБ №{pab['doc_number']}", level=1)
                heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
                
                doc.add_paragraph(f"Дата составления: {pab['doc_date']}")
                doc.add_paragraph(f"Проверяющий: {pab['inspector_fio']}")
                doc.add_paragraph(f"Должность: {pab['inspector_position']}")
                doc.add_paragraph(f"Подразделение: {pab['department']}")
                doc.add_paragraph(f"Участок: {pab['location']}")
                doc.add_paragraph(f"Объект проверки: {pab['checked_object']}")
                doc.add_paragraph(f"Статус: {pab['status']}")
                
                doc.add_paragraph()
                doc.add_heading('Наблюдения:', level=2)
                
                for obs in pab['observations']:
                    doc.add_heading(f"Наблюдение №{obs['observation_number']}", level=3)
                    doc.add_paragraph(f"Описание: {obs['description']}")
                    doc.add_paragraph(f"Категория: {obs['category']}")
                    doc.add_paragraph(f"Условия/Действия: {obs['conditions_actions']}")
                    doc.add_paragraph(f"Опасные факторы: {obs['hazard_factors']}")
                    doc.add_paragraph(f"Меры устранения: {obs['measures']}")
                    doc.add_paragraph(f"Ответственный: {obs['responsible_person']}")
                    doc.add_paragraph(f"Срок: {obs['deadline']}")
                    doc.add_paragraph(f"Статус: {obs['status']}")
                    
                    if obs['photo_url']:
                        doc.add_paragraph(f"Фото: {obs['photo_url']}")
                    
                    doc.add_paragraph()
                
                doc.add_page_break()
            
            buffer = BytesIO()
            doc.save(buffer)
            buffer.seek(0)
            
            docx_base64 = base64.b64encode(buffer.read()).decode('utf-8')
            
            filename = f"PAB_{pabs_with_obs[0]['doc_number']}" if len(pabs_with_obs) == 1 else "PAB_Multiple"
            
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
            
        except ImportError:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'python-docx library not installed'}),
                'isBase64Encoded': False
            }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
