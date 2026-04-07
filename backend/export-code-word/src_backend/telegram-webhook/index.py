import json
import os
import psycopg2
import random
import string
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Обработка входящих сообщений от Telegram-бота для привязки аккаунтов
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
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body = json.loads(event.get('body', '{}'))
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    schema = 't_p80499285_psot_realization_pro'
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    
    if 'callback_query' in body:
        callback = body['callback_query']
        callback_id = callback['id']
        chat_id = callback['message']['chat']['id']
        message_id = callback['message']['message_id']
        data = callback['data']
        user = callback['from']
        username = user.get('username', '')
        
        import urllib.request
        import urllib.parse
        
        parts = data.split('_')
        if len(parts) == 3 and parts[0] == 'accept':
            notification_type = parts[1]
            violation_id = int(parts[2])
            
            cur.execute(f"""
                SELECT id, fio FROM {schema}.users 
                WHERE telegram_chat_id = {chat_id}
            """)
            user_data = cur.fetchone()
            
            if user_data:
                user_id, user_fio = user_data
                user_fio_esc = str(user_fio).replace("'", "''")
                
                if notification_type == 'pc':
                    cur.execute(f"""
                        UPDATE {schema}.production_prescription_violations
                        SET status = 'in_work', updated_at = NOW()
                        WHERE id = {violation_id}
                    """)
                    table_name = 'ПК'
                elif notification_type == 'pab':
                    cur.execute(f"""
                        UPDATE {schema}.pab_observations
                        SET created_at = NOW()
                        WHERE id = {violation_id}
                    """)
                    table_name = 'ПАБ'
                
                conn.commit()
                
                cur.execute(f"""
                    INSERT INTO {schema}.system_notifications
                    (notification_type, severity, title, message, user_id, user_fio, 
                     is_read, created_at)
                    VALUES ('acceptance', 'info', 
                            '✅ Предписание принято в работу', 
                            '{user_fio_esc} принял в работу предписание {table_name} #{violation_id}',
                            {user_id}, '{user_fio_esc}', false, NOW())
                """)
                conn.commit()
                
                answer_url = f"https://api.telegram.org/bot{bot_token}/answerCallbackQuery"
                answer_data = urllib.parse.urlencode({
                    'callback_query_id': callback_id,
                    'text': '✅ Принято в работу!'
                }).encode()
                urllib.request.urlopen(answer_url, data=answer_data, timeout=5)
                
                edit_url = f"https://api.telegram.org/bot{bot_token}/editMessageReplyMarkup"
                edit_data = json.dumps({
                    'chat_id': chat_id,
                    'message_id': message_id,
                    'reply_markup': {'inline_keyboard': []}
                }).encode()
                req = urllib.request.Request(
                    edit_url,
                    data=edit_data,
                    headers={'Content-Type': 'application/json'}
                )
                urllib.request.urlopen(req, timeout=5)
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True}),
            'isBase64Encoded': False
        }
    
    if 'message' not in body:
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True}),
            'isBase64Encoded': False
        }
    
    message = body['message']
    chat_id = message['chat']['id']
    text = message.get('text', '')
    username = message['from'].get('username', '')
    
    if text.startswith('/start'):
        parts = text.split()
        
        if len(parts) == 1:
            response_text = (
                "👋 Привет! Я бот для уведомлений о предписаниях ПСОТ.\n\n"
                "Чтобы привязать аккаунт:\n"
                "1. Зайди в свой профиль на сайте\n"
                "2. Нажми кнопку 'Подключить Telegram'\n"
                "3. Скопируй код и отправь мне команду:\n"
                "/start КОД"
            )
        else:
            link_code = parts[1]
            
            cur.execute(
                f"SELECT id, fio FROM {schema}.users WHERE telegram_link_code = %s",
                (link_code,)
            )
            user = cur.fetchone()
            
            if user:
                user_id, fio = user
                cur.execute(
                    f"""UPDATE {schema}.users 
                    SET telegram_chat_id = %s, 
                        telegram_username = %s, 
                        telegram_linked_at = NOW(),
                        telegram_link_code = NULL
                    WHERE id = %s""",
                    (chat_id, username, user_id)
                )
                conn.commit()
                
                response_text = (
                    f"✅ Отлично! Твой аккаунт ({fio}) успешно привязан.\n\n"
                    "Теперь я буду присылать уведомления о новых предписаниях."
                )
            else:
                response_text = (
                    "❌ Код не найден или уже использован.\n\n"
                    "Получи новый код в профиле на сайте."
                )
        
        import urllib.request
        import urllib.parse
        
        send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        data = urllib.parse.urlencode({
            'chat_id': chat_id,
            'text': response_text
        }).encode()
        
        try:
            urllib.request.urlopen(send_url, data=data, timeout=5)
        except Exception as e:
            print(f'[Telegram] Failed to send message: {e}')
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True}),
        'isBase64Encoded': False
    }
