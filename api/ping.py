import json
from datetime import datetime

def handler(request):
    """
    Ping endpoint for the API
    """
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
        },
        'body': json.dumps({
            'timestamp': datetime.now().isoformat(),
            'service': 'book-admin-api',
            'version': '1.0.1'
        })
    }
