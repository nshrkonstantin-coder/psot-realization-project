import json
import os
import re
import bcrypt
import psycopg2
from typing import Dict, Any

SCHEMA = 't_p80499285_psot_realization_pro'
CORS = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}


def _verify_session(event: dict) -> dict | None:
    """Проверяет сессионный токен. Возвращает {'user_id', 'role'} или None если невалиден."""
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization', '') or headers.get('Authorization', '')
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
    '''
    Business: User management API for admins
    Args: event - dict with httpMethod, body, queryStringParameters
          context - object with attributes: request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'GET':
        session = _verify_session(event)
        if not session:
            return _unauth()

        params = event.get('queryStringParameters') or {}
        action = params.get('action', 'list')
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        if action == 'list':
            user_role = session['role']
            
            cur.execute("""
                SELECT u.id, u.email, u.fio, u.display_name, u.company, u.subdivision, u.position, u.role, u.created_at,
                       COALESCE(s.registered_count, 0) as registered_count,
                       COALESCE(s.online_count, 0) as online_count,
                       COALESCE(s.offline_count, 0) as offline_count
                FROM t_p80499285_psot_realization_pro.users u
                LEFT JOIN t_p80499285_psot_realization_pro.user_stats s ON u.id = s.user_id
                ORDER BY u.created_at DESC
            """)
            
            users = []
            for row in cur.fetchall():
                is_superadmin = user_role == 'superadmin'
                users.append({
                    'id': row[0],
                    'email': row[1],
                    'fio': row[2] if is_superadmin else row[3],
                    'display_name': row[3],
                    'company': row[4],
                    'subdivision': row[5],
                    'position': row[6],
                    'role': row[7],
                    'created_at': row[8].isoformat() if row[8] else None,
                    'stats': {
                        'registered_count': row[9],
                        'online_count': row[10],
                        'offline_count': row[11]
                    }
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'users': users})
            }
        
        elif action == 'stats':
            cur.execute("""
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN role = 'user' THEN 1 END) as users_count,
                    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins_count,
                    COUNT(CASE WHEN role = 'superadmin' THEN 1 END) as superadmins_count
                FROM t_p80499285_psot_realization_pro.users
            """)
            
            row = cur.fetchone()
            stats = {
                'total_users': row[0],
                'users_count': row[1],
                'admins_count': row[2],
                'superadmins_count': row[3]
            }
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'stats': stats})
            }
        
        elif action == 'list_companies':
            cur.execute("""
                SELECT id, name 
                FROM t_p80499285_psot_realization_pro.organizations 
                ORDER BY name
            """)
            
            companies = [{'id': row[0], 'name': row[1]} for row in cur.fetchall()]
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'companies': companies})
            }
        
        elif action == 'user_cabinet':
            user_id = params.get('userId')
            start_date = params.get('startDate')  # формат YYYY-MM-DD
            end_date = params.get('endDate')      # формат YYYY-MM-DD
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})
                }
            
            # Валидация формата дат (YYYY-MM-DD)
            DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
            if start_date and not DATE_RE.match(start_date):
                cur.close(); conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Invalid startDate format, expected YYYY-MM-DD'})
                }
            if end_date and not DATE_RE.match(end_date):
                cur.close(); conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Invalid endDate format, expected YYYY-MM-DD'})
                }

            # Формируем условия для фильтрации по периоду
            use_date_filter = bool(start_date and end_date)

            # Получаем базовые данные пользователя
            cur.execute(
                "SELECT id, display_name, fio, email, company, subdivision, position, organization_id FROM t_p80499285_psot_realization_pro.users WHERE id = %s",
                (user_id,)
            )
            
            row = cur.fetchone()
            
            if not row:
                cur.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User not found'})
                }
            
            organization_id = row[7]
            
            # Подсчитываем всех зарегистрированных пользователей из организации
            registered_count = 0
            if organization_id:
                cur.execute(
                    "SELECT COUNT(*) FROM t_p80499285_psot_realization_pro.users WHERE organization_id = %s AND role NOT IN ('admin', 'superadmin', 'miniadmin')",
                    (organization_id,)
                )
                count_row = cur.fetchone()
                registered_count = count_row[0] if count_row else 0
            
            # Пока просто показываем 0 для онлайн/оффлайн (функциональность будет добавлена позже)
            online_count = 0
            offline_count = registered_count
            
            # Статистика ПАБ аудитов (проведенные пользователем через inspector_fio)
            if use_date_filter:
                cur.execute(
                    "SELECT COUNT(DISTINCT pr.id) as total, COUNT(DISTINCT CASE WHEN pr.status = 'completed' THEN pr.id END) as completed, COUNT(DISTINCT CASE WHEN pr.status IN ('in_work', 'new') THEN pr.id END) as in_progress, COUNT(DISTINCT CASE WHEN pr.status = 'overdue' THEN pr.id END) as overdue FROM t_p80499285_psot_realization_pro.pab_records pr JOIN t_p80499285_psot_realization_pro.users u ON LOWER(pr.inspector_fio) = LOWER(u.fio) WHERE u.id = %s AND pr.doc_date BETWEEN %s AND %s",
                    (user_id, start_date, end_date)
                )
            else:
                cur.execute(
                    "SELECT COUNT(DISTINCT pr.id) as total, COUNT(DISTINCT CASE WHEN pr.status = 'completed' THEN pr.id END) as completed, COUNT(DISTINCT CASE WHEN pr.status IN ('in_work', 'new') THEN pr.id END) as in_progress, COUNT(DISTINCT CASE WHEN pr.status = 'overdue' THEN pr.id END) as overdue FROM t_p80499285_psot_realization_pro.pab_records pr JOIN t_p80499285_psot_realization_pro.users u ON LOWER(pr.inspector_fio) = LOWER(u.fio) WHERE u.id = %s",
                    (user_id,)
                )
            pab_stats = cur.fetchone()
            
            # Статистика наблюдений (выписанных на пользователя как ответственного через responsible_person)
            if use_date_filter:
                cur.execute(
                    "SELECT COUNT(obs.id) as total, COUNT(CASE WHEN obs.status = 'completed' THEN 1 END) as completed, COUNT(CASE WHEN obs.status IN ('in_work', 'new') THEN 1 END) as in_progress, COUNT(CASE WHEN obs.status = 'overdue' OR (obs.deadline < CURRENT_DATE AND obs.status != 'completed') THEN 1 END) as overdue FROM t_p80499285_psot_realization_pro.pab_observations obs JOIN t_p80499285_psot_realization_pro.users u ON LOWER(obs.responsible_person) = LOWER(u.fio) WHERE u.id = %s AND obs.created_at::date BETWEEN %s AND %s",
                    (user_id, start_date, end_date)
                )
            else:
                cur.execute(
                    "SELECT COUNT(obs.id) as total, COUNT(CASE WHEN obs.status = 'completed' THEN 1 END) as completed, COUNT(CASE WHEN obs.status IN ('in_work', 'new') THEN 1 END) as in_progress, COUNT(CASE WHEN obs.status = 'overdue' OR (obs.deadline < CURRENT_DATE AND obs.status != 'completed') THEN 1 END) as overdue FROM t_p80499285_psot_realization_pro.pab_observations obs JOIN t_p80499285_psot_realization_pro.users u ON LOWER(obs.responsible_person) = LOWER(u.fio) WHERE u.id = %s",
                    (user_id,)
                )
            obs_stats = cur.fetchone()
            
            # Статистика предписаний ПК (выписанных на пользователя из Списка Производственного Контроля)
            if use_date_filter:
                cur.execute(
                    "SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed, COUNT(CASE WHEN status = 'in_work' AND deadline >= CURRENT_DATE THEN 1 END) as in_progress, COUNT(CASE WHEN deadline < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue FROM t_p80499285_psot_realization_pro.production_prescription_violations WHERE assigned_user_id = %s AND created_at::date BETWEEN %s AND %s",
                    (user_id, start_date, end_date)
                )
            else:
                cur.execute(
                    "SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed, COUNT(CASE WHEN status = 'in_work' AND deadline >= CURRENT_DATE THEN 1 END) as in_progress, COUNT(CASE WHEN deadline < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue FROM t_p80499285_psot_realization_pro.production_prescription_violations WHERE assigned_user_id = %s",
                    (user_id,)
                )
            presc_stats = cur.fetchone()
            
            # Статистика нарушений ПК (выписанных на пользователя как ответственного)
            if use_date_filter:
                cur.execute(
                    "SELECT COUNT(*) as total, COUNT(CASE WHEN v.status = 'completed' THEN 1 END) as completed, COUNT(CASE WHEN v.status IN ('in_progress', 'new') THEN 1 END) as in_progress, COUNT(CASE WHEN v.deadline < CURRENT_DATE AND v.status != 'completed' THEN 1 END) as overdue FROM t_p80499285_psot_realization_pro.production_control_violations v WHERE v.responsible_user_id = %s AND v.created_at::date BETWEEN %s AND %s",
                    (user_id, start_date, end_date)
                )
            else:
                cur.execute(
                    "SELECT COUNT(*) as total, COUNT(CASE WHEN v.status = 'completed' THEN 1 END) as completed, COUNT(CASE WHEN v.status IN ('in_progress', 'new') THEN 1 END) as in_progress, COUNT(CASE WHEN v.deadline < CURRENT_DATE AND v.status != 'completed' THEN 1 END) as overdue FROM t_p80499285_psot_realization_pro.production_control_violations v WHERE v.responsible_user_id = %s",
                    (user_id,)
                )
            pc_violations_stats = cur.fetchone()
            
            # Количество проведенных аудитов (ПАБ которые пользователь создал)
            if use_date_filter:
                cur.execute(
                    "SELECT COUNT(*) FROM t_p80499285_psot_realization_pro.pab_records WHERE user_id = %s AND doc_date BETWEEN %s AND %s",
                    (user_id, start_date, end_date)
                )
            else:
                cur.execute(
                    "SELECT COUNT(*) FROM t_p80499285_psot_realization_pro.pab_records WHERE user_id = %s",
                    (user_id,)
                )
            audits_conducted = cur.fetchone()[0] or 0
            
            # Получаем плановые показатели из таблицы pab_schedule_files
            user_position = row[6] or ''  # position пользователя
            plan_audits = None
            plan_observations = None
            
            cur.execute("""
                SELECT file_data
                FROM t_p80499285_psot_realization_pro.pab_schedule_files
                WHERE is_active = true
                LIMIT 1
            """)
            
            schedule_row = cur.fetchone()
            if schedule_row and user_position:
                import json as json_module
                file_data = schedule_row[0]
                sheets_data = file_data.get('sheetsData', {})
                
                # Ищем должность пользователя во всех листах
                for sheet_name, positions in sheets_data.items():
                    for pos_data in positions:
                        if pos_data.get('position', '').strip().lower() == user_position.strip().lower():
                            plan_audits = pos_data.get('audits')
                            plan_observations = pos_data.get('observations')
                            break
                    if plan_audits is not None:
                        break
            
            stats = {
                'user_id': row[0],
                'display_name': row[1] or f"ID№{str(row[0]).zfill(5)}",
                'fio': row[2],
                'email': row[3],
                'company': row[4] or '',
                'subdivision': row[5] or '',
                'position': row[6] or '',
                'registered_count': registered_count,
                'online_count': online_count,
                'offline_count': offline_count,
                'pab_total': pab_stats[0] or 0,
                'pab_completed': pab_stats[1] or 0,
                'pab_in_progress': pab_stats[2] or 0,
                'pab_overdue': pab_stats[3] or 0,
                'observations_issued': obs_stats[0] or 0,
                'observations_completed': obs_stats[1] or 0,
                'observations_in_progress': obs_stats[2] or 0,
                'observations_overdue': obs_stats[3] or 0,
                'prescriptions_issued': presc_stats[0] or 0,
                'prescriptions_completed': presc_stats[1] or 0,
                'prescriptions_in_progress': presc_stats[2] or 0,
                'prescriptions_overdue': presc_stats[3] or 0,
                'pc_violations_issued': pc_violations_stats[0] or 0,
                'pc_violations_completed': pc_violations_stats[1] or 0,
                'pc_violations_in_progress': pc_violations_stats[2] or 0,
                'pc_violations_overdue': pc_violations_stats[3] or 0,
                'audits_conducted': audits_conducted,
                'plan_audits': plan_audits,
                'plan_observations': plan_observations
            }
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'stats': stats})
            }
        
        elif action == 'registered_users':
            user_id = params.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})
                }
            
            # Получаем organization_id текущего пользователя
            cur.execute(
                "SELECT organization_id FROM t_p80499285_psot_realization_pro.users WHERE id = %s",
                (user_id,)
            )
            
            row = cur.fetchone()
            
            if not row or not row[0]:
                cur.close()
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'users': []})
                }
            
            organization_id = row[0]
            
            # Получаем всех пользователей из той же организации
            cur.execute(
                "SELECT id, fio, display_name, position, subdivision, company, email FROM t_p80499285_psot_realization_pro.users WHERE organization_id = %s AND role NOT IN ('admin', 'superadmin', 'miniadmin') ORDER BY fio",
                (organization_id,)
            )
            
            users = []
            for user_row in cur.fetchall():
                users.append({
                    'id': user_row[0],
                    'fio': user_row[1] or user_row[2] or f"ID№{str(user_row[0]).zfill(5)}",
                    'position': user_row[3] or '',
                    'subdivision': user_row[4] or '',
                    'company': user_row[5] or '',
                    'email': user_row[6] or ''
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'users': users})
            }
        
        elif action == 'user_observations':
            user_id = params.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})
                }
            
            # Получаем ФИО пользователя
            cur.execute(
                "SELECT fio FROM t_p80499285_psot_realization_pro.users WHERE id = %s",
                (user_id,)
            )
            
            user_row = cur.fetchone()
            if not user_row or not user_row[0]:
                cur.close()
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'observations': []})
                }
            
            user_fio = user_row[0]
            
            # Получаем наблюдения из ПАБ, где пользователь — проверяющий (inspector_fio)
            cur.execute(
                "SELECT obs.id, obs.pab_record_id, obs.observation_number, obs.description, obs.category, obs.conditions_actions, obs.hazard_factors, obs.measures, obs.responsible_person, obs.deadline, obs.status, obs.photo_url, obs.created_at FROM t_p80499285_psot_realization_pro.pab_observations obs JOIN t_p80499285_psot_realization_pro.pab_records pr ON obs.pab_record_id = pr.id WHERE LOWER(pr.inspector_fio) = LOWER(%s) ORDER BY obs.created_at DESC",
                (user_fio,)
            )
            
            observations = []
            for obs_row in cur.fetchall():
                observations.append({
                    'id': obs_row[0],
                    'pab_record_id': obs_row[1],
                    'observation_number': obs_row[2],
                    'description': obs_row[3] or '',
                    'category': obs_row[4] or '',
                    'conditions_actions': obs_row[5] or '',
                    'hazard_factors': obs_row[6] or '',
                    'measures': obs_row[7] or '',
                    'responsible_person': obs_row[8] or '',
                    'deadline': obs_row[9].isoformat() if obs_row[9] else None,
                    'status': obs_row[10] or 'Новый',
                    'photo_url': obs_row[11] or '',
                    'created_at': obs_row[12].isoformat() if obs_row[12] else None
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'observations': observations})
            }
        
        elif action == 'user_prescriptions':
            user_id = params.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})
                }
            
            # Получаем предписания выписанные на пользователя
            cur.execute(
                "SELECT id, prescription_id, violation_text, assigned_user_id, assigned_user_fio, status, deadline, completed_at, confirmed_by_issuer, created_at, updated_at FROM t_p80499285_psot_realization_pro.production_prescription_violations WHERE assigned_user_id = %s ORDER BY created_at DESC",
                (user_id,)
            )
            
            prescriptions = []
            for presc_row in cur.fetchall():
                prescriptions.append({
                    'id': presc_row[0],
                    'prescription_id': presc_row[1],
                    'violation_text': presc_row[2] or '',
                    'assigned_user_id': presc_row[3],
                    'assigned_user_fio': presc_row[4] or '',
                    'status': presc_row[5] or 'В работе',
                    'deadline': presc_row[6].isoformat() if presc_row[6] else None,
                    'completed_at': presc_row[7].isoformat() if presc_row[7] else None,
                    'confirmed_by_issuer': presc_row[8] or False,
                    'created_at': presc_row[9].isoformat() if presc_row[9] else None,
                    'updated_at': presc_row[10].isoformat() if presc_row[10] else None
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'prescriptions': prescriptions})
            }
        
        elif action == 'user_pc_violations':
            user_id = params.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})
                }
            
            # Получаем нарушения ПК выписанные на пользователя как ответственного
            cur.execute(
                "SELECT v.id, v.report_id, v.item_number, v.description, v.measures, v.responsible_user_id, v.deadline, v.status, v.created_at, r.doc_number, r.doc_date, r.issuer_name FROM t_p80499285_psot_realization_pro.production_control_violations v LEFT JOIN t_p80499285_psot_realization_pro.production_control_reports r ON v.report_id = r.id WHERE v.responsible_user_id = %s ORDER BY v.created_at DESC",
                (user_id,)
            )
            
            violations = []
            for v_row in cur.fetchall():
                violations.append({
                    'id': v_row[0],
                    'report_id': v_row[1],
                    'item_number': v_row[2],
                    'description': v_row[3] or '',
                    'measures': v_row[4] or '',
                    'responsible_user_id': v_row[5],
                    'deadline': v_row[6].isoformat() if v_row[6] else None,
                    'status': v_row[7] or 'new',
                    'created_at': v_row[8].isoformat() if v_row[8] else None,
                    'doc_number': v_row[9] or '',
                    'doc_date': v_row[10].isoformat() if v_row[10] else None,
                    'issuer_name': v_row[11] or ''
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'violations': violations})
            }
        
        elif action == 'online_users':
            user_id = params.get('userId')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'User ID required'})
                }
            
            # Получаем organization_id текущего пользователя
            cur.execute(
                "SELECT organization_id FROM t_p80499285_psot_realization_pro.users WHERE id = %s",
                (user_id,)
            )
            
            row = cur.fetchone()
            
            if not row or not row[0]:
                cur.close()
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True, 'users': []})
                }
            
            organization_id = row[0]
            
            # Получаем онлайн пользователей из той же организации (активные сессии < 5 минут)
            cur.execute(
                "SELECT DISTINCT u.id, u.fio, u.display_name, u.position, u.subdivision, u.company, u.email, s.last_seen FROM t_p80499285_psot_realization_pro.users u JOIN t_p80499285_psot_realization_pro.sessions s ON s.user_id = u.id WHERE u.organization_id = %s AND u.role NOT IN ('admin', 'superadmin', 'miniadmin') AND s.expires_at > NOW() AND s.last_seen > NOW() - INTERVAL '5 minutes' ORDER BY s.last_seen DESC",
                (organization_id,)
            )
            
            users = []
            for user_row in cur.fetchall():
                users.append({
                    'id': user_row[0],
                    'fio': user_row[1] or user_row[2] or f"ID№{str(user_row[0]).zfill(5)}",
                    'position': user_row[3] or '',
                    'subdivision': user_row[4] or '',
                    'company': user_row[5] or '',
                    'email': user_row[6] or '',
                    'last_activity': user_row[7].isoformat() if user_row[7] else None
                })
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'users': users})
            }
    
    if method == 'PUT':
        session = _verify_session(event)
        if not session:
            return _unauth()

        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('userId')
        action = body_data.get('action')
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        if action == 'update_role':
            new_role = body_data.get('role')
            cur.execute(
                "UPDATE t_p80499285_psot_realization_pro.users SET role = %s WHERE id = %s",
                (new_role, user_id)
            )
            conn.commit()
            
        elif action == 'update_profile':
            fio = body_data.get('fio')
            company = body_data.get('company')
            subdivision = body_data.get('subdivision')
            position = body_data.get('position')
            
            # Получаем organization_id для новой компании
            organization_id = None
            if company:
                cur.execute(
                    "SELECT id FROM t_p80499285_psot_realization_pro.organizations WHERE LOWER(name) = LOWER(%s)",
                    (company,)
                )
                org_row = cur.fetchone()
                organization_id = org_row[0] if org_row else None
            
            # Обновляем пользователя включая organization_id
            cur.execute(
                "UPDATE t_p80499285_psot_realization_pro.users SET fio = %s, company = %s, subdivision = %s, position = %s, organization_id = %s WHERE id = %s",
                (fio or None, company or None, subdivision or None, position or None, organization_id, user_id)
            )
            conn.commit()
            
        elif action == 'change_email':
            new_email = body_data.get('newEmail')
            
            cur.execute(
                "SELECT id FROM t_p80499285_psot_realization_pro.users WHERE email = %s AND id != %s",
                (new_email, user_id)
            )
            if cur.fetchone():
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Email already exists'})
                }
            
            cur.execute(
                "UPDATE t_p80499285_psot_realization_pro.users SET email = %s WHERE id = %s",
                (new_email, user_id)
            )
            conn.commit()
            
        elif action == 'change_password':
            new_password = body_data.get('newPassword')
            new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
            
            cur.execute(
                "UPDATE t_p80499285_psot_realization_pro.users SET password_hash = %s WHERE id = %s",
                (new_hash, user_id)
            )
            conn.commit()
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'success': True})
        }
    
    if method == 'POST':
        session = _verify_session(event)
        if not session:
            return _unauth()

        import secrets
        import string
        
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        if action == 'bulk_import':
            company_id = body_data.get('companyId')
            fio = body_data.get('fio')
            email = body_data.get('email', '').strip()
            subdivision = body_data.get('subdivision')
            position = body_data.get('position')
            
            if not email:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Email обязателен для заполнения'})
                }
            
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            
            cur.execute(
                "SELECT id FROM t_p80499285_psot_realization_pro.users WHERE email = %s",
                (email,)
            )
            if cur.fetchone():
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Email уже существует'})
                }
            
            temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
            password_hash = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()
            
            cur.execute(
                "SELECT name FROM t_p80499285_psot_realization_pro.organizations WHERE id = %s",
                (company_id,)
            )
            company_row = cur.fetchone()
            company_name = company_row[0] if company_row else ''
            
            cur.execute(
                "INSERT INTO t_p80499285_psot_realization_pro.users (email, password_hash, fio, company, subdivision, position, role, organization_id) VALUES (%s, %s, %s, %s, %s, %s, 'user', %s) RETURNING id",
                (email, password_hash, fio or '', company_name, subdivision or '', position or '', company_id)
            )
            
            user_id = cur.fetchone()[0]
            
            cur.execute(
                "INSERT INTO t_p80499285_psot_realization_pro.user_stats (user_id, registered_count) VALUES (%s, 1)",
                (user_id,)
            )
            
            cur.execute(
                "SELECT registration_code FROM t_p80499285_psot_realization_pro.organizations WHERE id = %s",
                (company_id,)
            )
            org_code_row = cur.fetchone()
            org_code = org_code_row[0] if org_code_row else ''
            
            base_url = event.get('headers', {}).get('Origin', 'https://your-domain.com')
            login_link = f"{base_url}/org/{org_code}?email={email}&password={temp_password}"
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'loginLink': login_link})
            }
        
        elif action == 'send_bulk_links':
            users_data = body_data.get('users', [])
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'sent': len(users_data)})
            }
        
        elif action == 'create_user':
            email = body_data.get('email')
            password = body_data.get('password')
            fio = body_data.get('fio')
            company = body_data.get('company')
            subdivision = body_data.get('subdivision')
            position = body_data.get('position')
            role = body_data.get('role', 'user')
            
            password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            
            cur.execute(
                "SELECT id FROM t_p80499285_psot_realization_pro.users WHERE email = %s",
                (email,)
            )
            if cur.fetchone():
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': False, 'error': 'Email already exists'})
                }
            
            cur.execute(
                "INSERT INTO t_p80499285_psot_realization_pro.users (email, password_hash, fio, company, subdivision, position, role) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (email, password_hash, fio or None, company or None, subdivision or None, position or None, role)
            )
            
            user_id = cur.fetchone()[0]
            
            cur.execute(
                "INSERT INTO t_p80499285_psot_realization_pro.user_stats (user_id) VALUES (%s)",
                (user_id,)
            )
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'userId': user_id, 'email': email})
            }
    
    if method == 'DELETE':
        import psycopg2
        
        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('userId')
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        cur.execute("DELETE FROM t_p80499285_psot_realization_pro.user_stats WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM t_p80499285_psot_realization_pro.prescriptions WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM t_p80499285_psot_realization_pro.audits WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM t_p80499285_psot_realization_pro.violations WHERE user_id = %s", (user_id,))
        cur.execute("DELETE FROM t_p80499285_psot_realization_pro.users WHERE id = %s", (user_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'success': True})
        }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }