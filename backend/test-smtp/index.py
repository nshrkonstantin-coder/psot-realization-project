import json
import os
import smtplib

def handler(event, context):
    '''
    Тестовая функция для проверки SMTP подключения
    '''
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
    
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD_NEW') or os.environ.get('SMTP_PASSWORD')
    
    print(f'[TEST] SMTP_HOST: {smtp_host}')
    print(f'[TEST] SMTP_PORT: {smtp_port}')
    print(f'[TEST] SMTP_USER: {smtp_user}')
    print(f'[TEST] SMTP_PASSWORD length: {len(smtp_password) if smtp_password else 0}')
    
    result = {
        'config': {
            'host': smtp_host,
            'port': smtp_port,
            'user': smtp_user,
            'password_length': len(smtp_password) if smtp_password else 0
        },
        'test_result': None,
        'error': None
    }
    
    try:
        print('[TEST] Connecting to SMTP...')
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        print('[TEST] Connected, starting TLS...')
        server.starttls()
        print('[TEST] TLS started, attempting login...')
        server.login(smtp_user, smtp_password)
        print('[TEST] Login successful!')
        server.quit()
        
        result['test_result'] = 'SUCCESS'
        result['message'] = 'SMTP подключение работает!'
        
    except smtplib.SMTPAuthenticationError as e:
        print(f'[ERROR] Authentication failed: {str(e)}')
        result['test_result'] = 'AUTH_FAILED'
        result['error'] = str(e)
        result['message'] = 'Ошибка аутентификации - неверный логин или пароль'
        
    except Exception as e:
        print(f'[ERROR] Connection failed: {str(e)}')
        result['test_result'] = 'CONNECTION_FAILED'
        result['error'] = str(e)
        result['message'] = f'Ошибка подключения: {str(e)}'
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result, ensure_ascii=False),
        'isBase64Encoded': False
    }