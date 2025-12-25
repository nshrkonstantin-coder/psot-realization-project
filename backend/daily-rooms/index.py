import json
import os
import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''API для создания Daily.co видеокомнат'''
    
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Только POST запросы'}),
            'isBase64Encoded': False
        }
    
    api_key = os.environ.get('DAILY_API_KEY')
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DAILY_API_KEY не настроен'}),
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        room_name = body.get('room_name')
        
        # Создаём комнату в Daily.co
        response = requests.post(
            'https://api.daily.co/v1/rooms',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'name': room_name,
                'privacy': 'public',
                'properties': {
                    'enable_screenshare': True,
                    'enable_chat': True,
                    'start_video_off': False,
                    'start_audio_off': False,
                    'enable_recording': 'cloud',
                    'enable_prejoin_ui': False,
                    'enable_people_ui': True,
                    'enable_pip_ui': True,
                    'enable_emoji_reactions': True,
                    'max_participants': 200
                }
            },
            timeout=10
        )
        
        if response.status_code == 200:
            room_data = response.json()
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'room_url': room_data['url'],
                    'room_name': room_data['name']
                }),
                'isBase64Encoded': False
            }
        else:
            return {
                'statusCode': response.status_code,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'error': 'Ошибка создания комнаты',
                    'details': response.text
                }),
                'isBase64Encoded': False
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
