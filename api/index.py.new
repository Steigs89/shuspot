# api/index.py
from datetime import datetime
import json

def handler(request):
    """
    Simple Vercel Python serverless function
    """
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
        },
        'body': json.dumps({
            'message': 'API is running',
            'timestamp': datetime.now().isoformat(),
            'service': 'book-admin-api'
        })
    }
