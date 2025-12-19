import json
import os
import base64
from typing import Dict, Any
import urllib.request
import urllib.parse

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Генерация естественного человеческого голоса через Yandex SpeechKit
    Args: event - dict с httpMethod, body (text, voice)
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response с audio в base64
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
        body_data = json.loads(event.get('body', '{}'))
        text = body_data.get('text', '')
        voice = body_data.get('voice', 'alena')
        
        if not text:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'Text is required'})
            }
        
        api_key = os.environ.get('YANDEX_SPEECHKIT_API_KEY')
        if not api_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': 'API key not configured'})
            }
        
        url = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize'
        
        params = {
            'text': text,
            'lang': 'ru-RU',
            'voice': voice,
            'format': 'mp3',
            'speed': '1.0',
            'emotion': 'good'
        }
        
        data = urllib.parse.urlencode(params).encode('utf-8')
        
        req = urllib.request.Request(url, data=data)
        req.add_header('Authorization', f'Api-Key {api_key}')
        
        try:
            with urllib.request.urlopen(req) as response:
                audio_data = response.read()
                audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'success': True,
                        'audio': audio_base64,
                        'format': 'mp3'
                    })
                }
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': False, 'error': str(e)})
            }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({'success': False, 'error': 'Method not allowed'})
    }
