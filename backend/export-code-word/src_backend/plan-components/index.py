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
    API для работы с компонентами тарифных планов
    GET /?plan_id=X - список компонентов тарифа
    GET / - список всех доступных типов компонентов (блоки, страницы, кнопки, модули)
    POST / - добавить/обновить компоненты тарифа
    """
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
            plan_id = params.get('plan_id')
            
            if plan_id:
                cur.execute("""
                    SELECT id, component_type, component_name, price, is_included
                    FROM t_p80499285_psot_realization_pro.plan_components
                    WHERE plan_id = %s
                    ORDER BY component_type, component_name
                """, (plan_id,))
                
                components = []
                for row in cur.fetchall():
                    components.append({
                        'id': row[0],
                        'component_type': row[1],
                        'component_name': row[2],
                        'price': float(row[3]) if row[3] else 0,
                        'is_included': row[4]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(components, ensure_ascii=False),
                    'isBase64Encoded': False
                }
            
            else:
                available_components = {
                    'blocks': [
                        {'name': 'Блок "Герой"', 'default_price': 500},
                        {'name': 'Блок "О нас"', 'default_price': 300},
                        {'name': 'Блок "Услуги"', 'default_price': 400},
                        {'name': 'Блок "Портфолио"', 'default_price': 600},
                        {'name': 'Блок "Команда"', 'default_price': 350},
                        {'name': 'Блок "Отзывы"', 'default_price': 450},
                        {'name': 'Блок "Контакты"', 'default_price': 250},
                        {'name': 'Блок "FAQ"', 'default_price': 300},
                        {'name': 'Блок "Прайс"', 'default_price': 400},
                        {'name': 'Блок "Форма"', 'default_price': 500}
                    ],
                    'pages': [
                        {'name': 'Главная страница', 'default_price': 1000},
                        {'name': 'Страница каталога', 'default_price': 800},
                        {'name': 'Страница товара', 'default_price': 600},
                        {'name': 'Страница корзины', 'default_price': 700},
                        {'name': 'Страница оформления', 'default_price': 900},
                        {'name': 'Страница профиля', 'default_price': 500},
                        {'name': 'Страница блога', 'default_price': 600},
                        {'name': 'Страница статьи', 'default_price': 400},
                        {'name': 'Страница контактов', 'default_price': 300}
                    ],
                    'buttons': [
                        {'name': 'Кнопка заказа', 'default_price': 100},
                        {'name': 'Кнопка "В корзину"', 'default_price': 150},
                        {'name': 'Кнопка "Купить"', 'default_price': 150},
                        {'name': 'Кнопка подписки', 'default_price': 100},
                        {'name': 'Кнопка звонка', 'default_price': 80},
                        {'name': 'Кнопка WhatsApp', 'default_price': 80},
                        {'name': 'Кнопка Telegram', 'default_price': 80},
                        {'name': 'Кнопка Email', 'default_price': 80},
                        {'name': 'Кнопка скачивания', 'default_price': 100}
                    ],
                    'modules': [
                        {'name': 'Модуль авторизации', 'default_price': 1500},
                        {'name': 'Модуль оплаты', 'default_price': 2000},
                        {'name': 'Модуль доставки', 'default_price': 1200},
                        {'name': 'Модуль поиска', 'default_price': 800},
                        {'name': 'Модуль фильтров', 'default_price': 900},
                        {'name': 'Модуль отзывов', 'default_price': 600},
                        {'name': 'Модуль уведомлений', 'default_price': 700},
                        {'name': 'Модуль аналитики', 'default_price': 1000},
                        {'name': 'Модуль CRM', 'default_price': 2500},
                        {'name': 'Модуль чата', 'default_price': 1800}
                    ]
                }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(available_components, ensure_ascii=False),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            plan_id = body.get('plan_id')
            components = body.get('components', [])
            
            if not plan_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'plan_id обязателен'}, ensure_ascii=False),
                    'isBase64Encoded': False
                }
            
            for comp in components:
                cur.execute("""
                    SELECT id FROM t_p80499285_psot_realization_pro.plan_components
                    WHERE plan_id = %s AND component_type = %s AND component_name = %s
                """, (plan_id, comp.get('component_type'), comp.get('component_name')))
                
                existing = cur.fetchone()
                
                if existing:
                    cur.execute("""
                        UPDATE t_p80499285_psot_realization_pro.plan_components
                        SET price = %s, is_included = %s
                        WHERE id = %s
                    """, (comp.get('price', 0), comp.get('is_included', False), existing[0]))
                else:
                    cur.execute("""
                        INSERT INTO t_p80499285_psot_realization_pro.plan_components
                        (plan_id, component_type, component_name, price, is_included)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (plan_id, comp.get('component_type'), comp.get('component_name'), 
                          comp.get('price', 0), comp.get('is_included', False)))
            
            cur.execute("""
                UPDATE t_p80499285_psot_realization_pro.subscription_plans
                SET base_price = (
                    SELECT COALESCE(SUM(price), 0) 
                    FROM t_p80499285_psot_realization_pro.plan_components
                    WHERE plan_id = %s AND is_included = true
                ),
                price = (
                    SELECT COALESCE(SUM(price), 0) 
                    FROM t_p80499285_psot_realization_pro.plan_components
                    WHERE plan_id = %s AND is_included = true
                )
                WHERE id = %s
            """, (plan_id, plan_id, plan_id))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Компоненты обновлены'}, ensure_ascii=False),
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
