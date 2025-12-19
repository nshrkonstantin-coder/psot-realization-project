import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Save production control report to database
    Args: event - dict with httpMethod, body
          context - object with attributes: request_id, function_name
    Returns: HTTP response dict with report_id
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        
        doc_number = body_data.get('doc_number')
        doc_date = body_data.get('doc_date')
        recipient_user_id = body_data.get('recipient_user_id')
        recipient_name = body_data.get('recipient_name')
        department = body_data.get('department')
        witness = body_data.get('witness', '')
        issuer_name = body_data.get('issuer_name')
        issuer_position = body_data.get('issuer_position')
        issue_date = body_data.get('issue_date')
        violations = body_data.get('violations', [])
        signatures = body_data.get('acceptor_signatures', [])
        user_id = body_data.get('user_id')
        organization_id = body_data.get('organization_id')
        word_file_url = body_data.get('word_file_url', '')
        
        if not all([doc_number, doc_date, department, issuer_name, issue_date, user_id, organization_id]):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'Missing required fields'})
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        try:
            # Escape strings
            doc_number_esc = str(doc_number).replace("'", "''")
            recipient_name_esc = str(recipient_name).replace("'", "''") if recipient_name else ''
            department_esc = str(department).replace("'", "''")
            witness_esc = str(witness).replace("'", "''")
            issuer_name_esc = str(issuer_name).replace("'", "''")
            issuer_position_esc = str(issuer_position).replace("'", "''") if issuer_position else ''
            word_file_url_esc = str(word_file_url).replace("'", "''")
            
            recipient_user_id_sql = str(recipient_user_id) if recipient_user_id else 'NULL'
            
            # Insert main report
            cur.execute(f"""
                INSERT INTO t_p80499285_psot_realization_pro.production_control_reports 
                (doc_number, doc_date, recipient_user_id, recipient_name, department, witness, 
                 issuer_name, issuer_position, issue_date, user_id, organization_id, word_file_url)
                VALUES ('{doc_number_esc}', '{doc_date}', {recipient_user_id_sql}, '{recipient_name_esc}', 
                        '{department_esc}', '{witness_esc}', '{issuer_name_esc}', '{issuer_position_esc}', 
                        '{issue_date}', {user_id}, {organization_id}, '{word_file_url_esc}')
                RETURNING id
            """)
            report_id = cur.fetchone()[0]
            
            # Insert violations
            for violation in violations:
                item_number = violation.get('item_number')
                description = str(violation.get('description', '')).replace("'", "''")
                measures = str(violation.get('measures', '')).replace("'", "''")
                photos = violation.get('photos', [])
                deadline = violation.get('deadline', '')
                responsible_user_id = violation.get('responsible_user_id')
                
                responsible_sql = str(responsible_user_id) if responsible_user_id else 'NULL'
                deadline_sql = f"'{deadline}'" if deadline else 'NULL'
                
                cur.execute(f"""
                    INSERT INTO t_p80499285_psot_realization_pro.production_control_violations
                    (report_id, item_number, description, measures, deadline, responsible_user_id)
                    VALUES ({report_id}, {item_number}, '{description}', '{measures}', {deadline_sql}, {responsible_sql})
                    RETURNING id
                """)
                violation_id = cur.fetchone()[0]
                
                # Insert photos
                for photo in photos:
                    photo_url = str(photo.get('data', '')).replace("'", "''")
                    if photo_url:
                        cur.execute(f"""
                            INSERT INTO t_p80499285_psot_realization_pro.production_control_photos
                            (violation_id, photo_url)
                            VALUES ({violation_id}, '{photo_url}')
                        """)
            
            # Insert signatures
            for sig in signatures:
                sig_user_id = sig.get('userId')
                user_name = str(sig.get('userName', '')).replace("'", "''")
                sig_date = sig.get('date')
                sig_user_id_sql = str(sig_user_id) if sig_user_id else 'NULL'
                
                if user_name and sig_date:
                    cur.execute(f"""
                        INSERT INTO t_p80499285_psot_realization_pro.production_control_signatures
                        (report_id, user_id, user_name, signature_date)
                        VALUES ({report_id}, {sig_user_id_sql}, '{user_name}', '{sig_date}')
                    """)
            
            # Создаем записи в реестре предписаний для отслеживания выполнения
            if recipient_user_id:
                # Создаем главное предписание
                cur.execute(f"""
                    INSERT INTO t_p80499285_psot_realization_pro.production_prescriptions
                    (issuer_fio, issuer_position, issuer_department, issuer_organization, 
                     assigned_user_id, assigned_user_fio)
                    VALUES ('{issuer_name_esc}', '{issuer_position_esc}', '{department_esc}', 
                            'Производственный контроль', {recipient_user_id}, '{recipient_name_esc}')
                    RETURNING id
                """)
                prescription_id = cur.fetchone()[0]
                
                # Создаем записи о нарушениях в реестре
                for violation in violations:
                    description = str(violation.get('description', '')).replace("'", "''")
                    measures = str(violation.get('measures', '')).replace("'", "''")
                    deadline = violation.get('deadline', '')
                    responsible_user_id_viol = violation.get('responsible_user_id')
                    
                    if description or measures:
                        violation_text = description
                        if measures:
                            violation_text += f"\n\nМеры: {measures}"
                        
                        # Используем срок выполнения из формы
                        deadline_sql = f"DATE('{deadline}')" if deadline else f"DATE('{issue_date}') + INTERVAL '30 days'"
                        
                        # Используем ответственного из нарушения, если указан, иначе получателя
                        final_user_id = responsible_user_id_viol if responsible_user_id_viol else recipient_user_id
                        
                        # Получаем ФИО ответственного
                        if responsible_user_id_viol:
                            cur.execute(f"SELECT fio FROM t_p80499285_psot_realization_pro.users WHERE id = {final_user_id}")
                            result = cur.fetchone()
                            responsible_fio = result[0].replace("'", "''") if result else recipient_name_esc
                        else:
                            responsible_fio = recipient_name_esc
                        
                        cur.execute(f"""
                            INSERT INTO t_p80499285_psot_realization_pro.production_prescription_violations
                            (prescription_id, violation_text, assigned_user_id, assigned_user_fio, 
                             deadline, status)
                            VALUES ({prescription_id}, '{violation_text}', {final_user_id}, 
                                    '{responsible_fio}', {deadline_sql}, 'in_work')
                            RETURNING id
                        """)
                        violation_id = cur.fetchone()[0]
                        
                        # Отправляем уведомление в Telegram
                        print(f'[DEBUG] Checking Telegram for user_id={final_user_id}')
                        cur.execute(f"""
                            SELECT u.telegram_chat_id, u.telegram_username
                            FROM t_p80499285_psot_realization_pro.users u
                            WHERE u.id = {final_user_id} AND u.telegram_chat_id IS NOT NULL
                        """)
                        user_tg = cur.fetchone()
                        print(f'[DEBUG] Telegram query result: {user_tg}')
                        
                        if user_tg and user_tg[0]:
                            import urllib.request
                            import urllib.parse
                            
                            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
                            print(f'[DEBUG] Bot token exists: {bool(bot_token)}')
                            if bot_token:
                                message = f"""🔔 <b>Новое предписание</b>

📋 Номер: {doc_number}
📅 Дата: {issue_date}

⚠️ Нарушение:
{description}

💡 Меры:
{measures}

⏰ Срок: {deadline if deadline else 'не указан'}
👤 Ответственный: {responsible_fio}"""
                                
                                send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                                data = urllib.parse.urlencode({
                                    'chat_id': user_tg[0],
                                    'text': message,
                                    'parse_mode': 'HTML'
                                }).encode()
                                
                                try:
                                    print(f'[DEBUG] Sending to chat_id={user_tg[0]}')
                                    urllib.request.urlopen(send_url, data=data, timeout=5)
                                    print(f'[Telegram] Sent notification to user {final_user_id}')
                                except Exception as e:
                                    print(f'[Telegram] Failed to send: {e}')
                            else:
                                print('[DEBUG] Bot token is empty!')
                        else:
                            print(f'[DEBUG] No Telegram for user {final_user_id}')
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'report_id': report_id
                })
            }
        except Exception as e:
            conn.rollback()
            print(f'Error saving report: {str(e)}')
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': str(e)})
            }
        finally:
            cur.close()
            conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }