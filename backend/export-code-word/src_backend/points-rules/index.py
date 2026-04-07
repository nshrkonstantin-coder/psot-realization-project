import json
import os
import psycopg2
from typing import Dict, Any

def get_db_connection():
    """Создает подключение к базе данных"""
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API для управления правилами начисления баллов
    GET / - получить все правила
    GET /?org_id=X - получить правила для предприятия
    POST / - создать новое правило
    PUT / - обновить правило или настройки предприятия
    """
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            org_id = params.get('org_id')
            
            if org_id:
                cur.execute("""
                    SELECT 
                        pr.id, pr.rule_name, pr.action_type, pr.points_amount, 
                        pr.description, pr.is_active,
                        opr.is_enabled, opr.multiplier, opr.id as org_rule_id
                    FROM t_p80499285_psot_realization_pro.points_rules pr
                    LEFT JOIN t_p80499285_psot_realization_pro.organization_points_rules opr 
                        ON pr.id = opr.rule_id AND opr.organization_id = %s
                    WHERE pr.is_active = true
                    ORDER BY pr.action_type, pr.rule_name
                """, (org_id,))
                
                rules = []
                for row in cur.fetchall():
                    rules.append({
                        'id': row[0],
                        'rule_name': row[1],
                        'action_type': row[2],
                        'points_amount': float(row[3]) if row[3] else 0,
                        'description': row[4],
                        'is_active': row[5],
                        'org_enabled': row[6] if row[6] is not None else False,
                        'org_multiplier': float(row[7]) if row[7] else 1.0,
                        'org_rule_id': row[8]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(rules, ensure_ascii=False),
                    'isBase64Encoded': False
                }
            
            else:
                cur.execute("""
                    SELECT id, rule_name, action_type, points_amount, description, is_active, created_at
                    FROM t_p80499285_psot_realization_pro.points_rules
                    ORDER BY action_type, rule_name
                """)
                
                rules = []
                for row in cur.fetchall():
                    rules.append({
                        'id': row[0],
                        'rule_name': row[1],
                        'action_type': row[2],
                        'points_amount': float(row[3]) if row[3] else 0,
                        'description': row[4],
                        'is_active': row[5],
                        'created_at': row[6].isoformat() if row[6] else None
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(rules, ensure_ascii=False),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            org_id = body.get('org_id')
            action_type = body.get('action_type')
            user_id = body.get('user_id')
            
            if not org_id or not action_type:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'org_id и action_type обязательны'}, ensure_ascii=False),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT op.is_enabled FROM t_p80499285_psot_realization_pro.organization_points
                WHERE organization_id = %s
            """, (org_id,))
            
            org_points = cur.fetchone()
            if not org_points or not org_points[0]:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Баллы для предприятия не включены', 'points_added': 0}, ensure_ascii=False),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT 
                    pr.points_amount, pr.rule_name,
                    COALESCE(opr.multiplier, 1.0) as multiplier
                FROM t_p80499285_psot_realization_pro.points_rules pr
                LEFT JOIN t_p80499285_psot_realization_pro.organization_points_rules opr
                    ON pr.id = opr.rule_id AND opr.organization_id = %s
                WHERE pr.action_type = %s 
                    AND pr.is_active = true
                    AND (opr.is_enabled = true OR opr.is_enabled IS NULL)
                LIMIT 1
            """, (org_id, action_type))
            
            rule = cur.fetchone()
            
            if not rule:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Правило не найдено или выключено', 'points_added': 0}, ensure_ascii=False),
                    'isBase64Encoded': False
                }
            
            base_points = float(rule[0])
            rule_name = rule[1]
            multiplier = float(rule[2])
            points_to_add = base_points * multiplier
            
            cur.execute("""
                UPDATE t_p80499285_psot_realization_pro.organization_points
                SET points_balance = points_balance + %s,
                    total_earned = total_earned + %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE organization_id = %s
            """, (points_to_add, points_to_add, org_id))
            
            cur.execute("""
                INSERT INTO t_p80499285_psot_realization_pro.points_history
                (organization_id, points_amount, operation_type, description)
                VALUES (%s, %s, %s, %s)
            """, (org_id, points_to_add, action_type, f'Автоначисление: {rule_name}'))
            
            if user_id:
                cur.execute("""
                    UPDATE t_p80499285_psot_realization_pro.user_stats
                    SET total_actions = total_actions + 1
                    WHERE user_id = %s
                """, (user_id,))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message': 'Баллы начислены',
                    'points_added': points_to_add,
                    'rule_name': rule_name
                }, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            
            org_id = body.get('org_id')
            rule_id = body.get('rule_id')
            is_enabled = body.get('is_enabled')
            multiplier = body.get('multiplier', 1.0)
            
            if not org_id or not rule_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'org_id и rule_id обязательны'}, ensure_ascii=False),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT id FROM t_p80499285_psot_realization_pro.organization_points_rules
                WHERE organization_id = %s AND rule_id = %s
            """, (org_id, rule_id))
            
            existing = cur.fetchone()
            
            if existing:
                cur.execute("""
                    UPDATE t_p80499285_psot_realization_pro.organization_points_rules
                    SET is_enabled = %s, multiplier = %s
                    WHERE organization_id = %s AND rule_id = %s
                """, (is_enabled, multiplier, org_id, rule_id))
            else:
                cur.execute("""
                    INSERT INTO t_p80499285_psot_realization_pro.organization_points_rules
                    (organization_id, rule_id, is_enabled, multiplier)
                    VALUES (%s, %s, %s, %s)
                """, (org_id, rule_id, is_enabled, multiplier))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Настройки правила обновлены'}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Метод не поддерживается'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()
