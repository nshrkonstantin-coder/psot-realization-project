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
    
    if 'message' not in body:
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
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    schema = 't_p80499285_psot_realization_pro'
    
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    
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
        
        urllib.request.urlopen(send_url, data=data)
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True}),
        'isBase64Encoded': False
    }
