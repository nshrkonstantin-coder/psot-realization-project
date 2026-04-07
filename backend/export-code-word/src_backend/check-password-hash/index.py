import json
import hashlib
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Check which password variant matches the target SHA256 hash
    '''
    method: str = event.get('httpMethod', 'GET')
    
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
        target_hash = body_data.get('targetHash', '')
        
        passwords = [
            "!2345678",
            "!2345678 ",
            " !2345678",
            " !2345678 "
        ]
        
        results = []
        matched_password = None
        
        for i, password in enumerate(passwords, 1):
            computed_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
            is_match = computed_hash == target_hash
            
            results.append({
                'variant': i,
                'password': password,
                'length': len(password),
                'hash': computed_hash,
                'match': is_match
            })
            
            if is_match:
                matched_password = password
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'targetHash': target_hash,
                'results': results,
                'matchedPassword': matched_password
            })
        }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Method not allowed'})
    }
