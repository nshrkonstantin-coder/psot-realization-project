import json
import os
from typing import Dict, Any, List
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Аналитика ПАБ с AI-прогнозированием
    Возвращает статистику, тренды и прогнозы по данным ПАБ
    '''
    method: str = event.get('httpMethod', 'GET')
    
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
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters') or {}
    organization_id = params.get('organization_id', '')
    period = params.get('period', '30')
    
    if not organization_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'organization_id required'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL', '')
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    days = int(period)
    start_date = datetime.now() - timedelta(days=days)
    
    cur.execute("""
        SELECT 
            COUNT(*) as total_pab,
            COUNT(CASE WHEN pr.status = 'draft' THEN 1 END) as draft_count,
            COUNT(CASE WHEN pr.status = 'completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN pr.status = 'in_work' THEN 1 END) as in_work_count
        FROM t_p80499285_psot_realization_pro.pab_records pr
        JOIN t_p80499285_psot_realization_pro.users u ON pr.user_id = u.id
        WHERE u.organization_id = %s
    """, (organization_id,))
    
    stats = cur.fetchone()
    
    cur.execute("""
        SELECT 
            DATE(pr.created_at) as date,
            COUNT(*) as count
        FROM t_p80499285_psot_realization_pro.pab_records pr
        JOIN t_p80499285_psot_realization_pro.users u ON pr.user_id = u.id
        WHERE u.organization_id = %s AND pr.created_at >= %s
        GROUP BY DATE(pr.created_at)
        ORDER BY date
    """, (organization_id, start_date))
    
    daily_stats = cur.fetchall()
    
    cur.execute("""
        SELECT 
            o.description,
            COUNT(*) as frequency
        FROM t_p80499285_psot_realization_pro.pab_observations o
        JOIN t_p80499285_psot_realization_pro.pab_records pr ON o.pab_record_id = pr.id
        JOIN t_p80499285_psot_realization_pro.users u ON pr.user_id = u.id
        WHERE u.organization_id = %s
        GROUP BY o.description
        ORDER BY frequency DESC
        LIMIT 10
    """, (organization_id,))
    
    top_observations = cur.fetchall()
    
    cur.execute("""
        SELECT 
            o.responsible_person,
            COUNT(*) as count,
            COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed
        FROM t_p80499285_psot_realization_pro.pab_observations o
        JOIN t_p80499285_psot_realization_pro.pab_records pr ON o.pab_record_id = pr.id
        JOIN t_p80499285_psot_realization_pro.users u ON pr.user_id = u.id
        WHERE u.organization_id = %s AND o.responsible_person IS NOT NULL
        GROUP BY o.responsible_person
        ORDER BY count DESC
        LIMIT 10
    """, (organization_id,))
    
    responsible_stats = cur.fetchall()
    
    timeline = [{'date': str(item['date']), 'count': item['count']} for item in daily_stats]
    
    if len(timeline) >= 7:
        recent_avg = sum(item['count'] for item in timeline[-7:]) / 7
        previous_avg = sum(item['count'] for item in timeline[-14:-7]) / 7 if len(timeline) >= 14 else recent_avg
        
        trend = 'up' if recent_avg > previous_avg else 'down' if recent_avg < previous_avg else 'stable'
        change_percent = ((recent_avg - previous_avg) / previous_avg * 100) if previous_avg > 0 else 0
        
        next_week_forecast = int(recent_avg * 7)
        
        if trend == 'up':
            insight = f'Количество ПАБ растёт на {abs(change_percent):.1f}%. Прогноз на неделю: ~{next_week_forecast} новых ПАБ'
            recommendation = 'Усильте контроль качества и проверьте процессы'
        elif trend == 'down':
            insight = f'Количество ПАБ снижается на {abs(change_percent):.1f}%. Улучшение качества работ!'
            recommendation = 'Продолжайте текущие меры контроля'
        else:
            insight = 'Ситуация стабильная, изменений не наблюдается'
            recommendation = 'Поддерживайте текущий уровень контроля'
    else:
        trend = 'stable'
        change_percent = 0
        next_week_forecast = 0
        insight = 'Недостаточно данных для анализа трендов'
        recommendation = 'Продолжайте регистрировать ПАБ для аналитики'
    
    top_issues = [item['description'][:50] + '...' if len(item['description']) > 50 else item['description'] 
                  for item in top_observations[:3]]
    
    cur.close()
    conn.close()
    
    result = {
        'stats': {
            'total': stats['total_pab'],
            'draft': stats['draft_count'],
            'completed': stats['completed_count'],
            'in_work': stats['in_work_count']
        },
        'timeline': timeline,
        'trend': {
            'direction': trend,
            'change_percent': round(change_percent, 1),
            'forecast_next_week': next_week_forecast
        },
        'insights': {
            'main': insight,
            'recommendation': recommendation,
            'top_issues': top_issues
        },
        'top_observations': [
            {'text': item['description'], 'count': item['frequency']} 
            for item in top_observations
        ],
        'responsible_performance': [
            {
                'name': item['responsible_person'],
                'total': item['count'],
                'completed': item['completed'],
                'completion_rate': round(item['completed'] / item['count'] * 100, 1) if item['count'] > 0 else 0
            }
            for item in responsible_stats
        ]
    }
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result, ensure_ascii=False),
        'isBase64Encoded': False
    }