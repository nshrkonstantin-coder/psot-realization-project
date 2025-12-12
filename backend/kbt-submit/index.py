import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Save KBT report to database
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
        
        department = body_data.get('department')
        head_name = body_data.get('head_name')
        period_from = body_data.get('period_from')
        period_to = body_data.get('period_to')
        user_id = body_data.get('user_id')
        organization_id = body_data.get('organization_id')
        word_file_url = body_data.get('word_file_url', '')
        
        if not all([department, head_name, period_from, period_to, user_id, organization_id]):
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
            # Escape all string fields
            fields = [
                'department', 'head_name', 'sick_count', 'suspended', 'injuries', 
                'micro_injuries', 'sick_leave', 'accidents', 'acts_count', 'inspector',
                'violations_count', 'responsible_person', 'fixed_count', 'in_progress_count',
                'overdue_count', 'reasons', 'actions_taken', 'internal_checks_count',
                'internal_violations_count', 'internal_responsible', 'internal_fixed_count',
                'internal_in_progress_count', 'internal_overdue_count', 'internal_reasons',
                'internal_actions_taken', 'gov_agency', 'act_number', 'gov_violations',
                'gov_responsible', 'gov_fixed_count', 'gov_in_progress_count', 
                'gov_overdue_count', 'gov_reasons', 'pab_plan_department', 
                'pab_fact_department', 'pab_diff_department', 'pab_reason_department',
                'pab_plan_personal', 'pab_fact_personal', 'pab_diff_personal', 'pab_reason_personal',
                'tools_condition', 'workplaces_condition', 'improvement_measures',
                'involved_workers_count', 'involved_workers_list', 'not_involved_workers_count',
                'involved_engineers_count', 'involved_engineers_list', 'not_involved_engineers_count',
                'involvement_work'
            ]
            
            escaped_values = {}
            for field in fields:
                value = body_data.get(field, '')
                escaped_values[field] = str(value).replace("'", "''") if value else ''
            
            word_file_url_esc = str(word_file_url).replace("'", "''")
            
            # Build SQL query
            cur.execute(f"""
                INSERT INTO t_p80499285_psot_realization_pro.kbt_reports 
                (department, head_name, period_from, period_to, sick_count, suspended, injuries,
                 micro_injuries, sick_leave, accidents, acts_count, inspector, violations_count,
                 responsible_person, fixed_count, in_progress_count, overdue_count, reasons,
                 actions_taken, internal_checks_count, internal_violations_count, internal_responsible,
                 internal_fixed_count, internal_in_progress_count, internal_overdue_count, internal_reasons,
                 internal_actions_taken, gov_agency, act_number, gov_violations, gov_responsible,
                 gov_fixed_count, gov_in_progress_count, gov_overdue_count, gov_reasons,
                 pab_plan_department, pab_fact_department, pab_diff_department, pab_reason_department,
                 pab_plan_personal, pab_fact_personal, pab_diff_personal, pab_reason_personal,
                 tools_condition, workplaces_condition, improvement_measures,
                 involved_workers_count, involved_workers_list, not_involved_workers_count,
                 involved_engineers_count, involved_engineers_list, not_involved_engineers_count,
                 involvement_work, user_id, organization_id, word_file_url)
                VALUES ('{escaped_values['department']}', '{escaped_values['head_name']}', '{period_from}', '{period_to}',
                        '{escaped_values['sick_count']}', '{escaped_values['suspended']}', '{escaped_values['injuries']}',
                        '{escaped_values['micro_injuries']}', '{escaped_values['sick_leave']}', '{escaped_values['accidents']}',
                        '{escaped_values['acts_count']}', '{escaped_values['inspector']}', '{escaped_values['violations_count']}',
                        '{escaped_values['responsible_person']}', '{escaped_values['fixed_count']}', '{escaped_values['in_progress_count']}',
                        '{escaped_values['overdue_count']}', '{escaped_values['reasons']}', '{escaped_values['actions_taken']}',
                        '{escaped_values['internal_checks_count']}', '{escaped_values['internal_violations_count']}', '{escaped_values['internal_responsible']}',
                        '{escaped_values['internal_fixed_count']}', '{escaped_values['internal_in_progress_count']}', '{escaped_values['internal_overdue_count']}',
                        '{escaped_values['internal_reasons']}', '{escaped_values['internal_actions_taken']}', '{escaped_values['gov_agency']}',
                        '{escaped_values['act_number']}', '{escaped_values['gov_violations']}', '{escaped_values['gov_responsible']}',
                        '{escaped_values['gov_fixed_count']}', '{escaped_values['gov_in_progress_count']}', '{escaped_values['gov_overdue_count']}',
                        '{escaped_values['gov_reasons']}', '{escaped_values['pab_plan_department']}', '{escaped_values['pab_fact_department']}',
                        '{escaped_values['pab_diff_department']}', '{escaped_values['pab_reason_department']}',
                        '{escaped_values['pab_plan_personal']}', '{escaped_values['pab_fact_personal']}',
                        '{escaped_values['pab_diff_personal']}', '{escaped_values['pab_reason_personal']}',
                        '{escaped_values['tools_condition']}', '{escaped_values['workplaces_condition']}', '{escaped_values['improvement_measures']}',
                        '{escaped_values['involved_workers_count']}', '{escaped_values['involved_workers_list']}', '{escaped_values['not_involved_workers_count']}',
                        '{escaped_values['involved_engineers_count']}', '{escaped_values['involved_engineers_list']}', '{escaped_values['not_involved_engineers_count']}',
                        '{escaped_values['involvement_work']}', {user_id}, {organization_id}, '{word_file_url_esc}')
                RETURNING id
            """)
            report_id = cur.fetchone()[0]
            
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
            print(f'Error saving KBT report: {str(e)}')
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