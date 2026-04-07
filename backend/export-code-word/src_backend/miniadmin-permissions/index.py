import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление правами минадминистраторов
    GET - получить права пользователя
    POST - назначить/обновить права минадминистратора
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {}) or {}
        user_id = params.get('user_id')
        
        if not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'user_id required'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        safe_user_id = int(user_id)
        cur.execute(f'''
            SELECT module, can_view, can_edit, can_remove, assigned_at
            FROM t_p80499285_psot_realization_pro.miniadmin_permissions
            WHERE user_id = {safe_user_id}
            ORDER BY module
        ''')
        
        rows = cur.fetchall()
        permissions = []
        
        for row in rows:
            permissions.append({
                'module': row[0],
                'canView': row[1],
                'canEdit': row[2],
                'canDelete': row[3],
                'assignedAt': row[4].isoformat() if row[4] else None
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'permissions': permissions}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        organization_id = body.get('organization_id')
        permissions = body.get('permissions', [])
        assigned_by = body.get('assigned_by')
        
        if not user_id or not organization_id or not permissions:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'user_id, organization_id and permissions required'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        safe_user_id = int(user_id)
        safe_org_id = int(organization_id)
        safe_assigned_by = int(assigned_by) if assigned_by else 'NULL'
        
        cur.execute(f'''
            SELECT role FROM t_p80499285_psot_realization_pro.users WHERE id = {safe_user_id}
        ''')
        user_role = cur.fetchone()
        
        if user_role and user_role[0] != 'miniadmin':
            cur.execute(f'''
                UPDATE t_p80499285_psot_realization_pro.users 
                SET role = 'miniadmin', updated_at = CURRENT_TIMESTAMP
                WHERE id = {safe_user_id}
            ''')
        
        for perm in permissions:
            module = perm.get('module', '')
            can_view = perm.get('canView', False)
            can_edit = perm.get('canEdit', False)
            can_delete = perm.get('canDelete', False)
            
            safe_module = module.replace("'", "''")
            
            cur.execute(f'''
                INSERT INTO t_p80499285_psot_realization_pro.miniadmin_permissions 
                (user_id, organization_id, module, can_view, can_edit, can_remove, assigned_by, assigned_at, updated_at)
                VALUES ({safe_user_id}, {safe_org_id}, '{safe_module}', {can_view}, {can_edit}, {can_delete}, {safe_assigned_by}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, organization_id, module) 
                DO UPDATE SET 
                    can_view = {can_view},
                    can_edit = {can_edit},
                    can_remove = {can_delete},
                    assigned_by = {safe_assigned_by},
                    updated_at = CURRENT_TIMESTAMP
            ''')
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'message': 'Права успешно назначены'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}, ensure_ascii=False),
        'isBase64Encoded': False
    }
