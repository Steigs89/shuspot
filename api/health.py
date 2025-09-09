import json

def handler(request):
    """
    Health check endpoint for the API
    """
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
        },
        'body': json.dumps({
            'ok': True,
            'service': 'book-admin-api',
            'version': '1.0.1'
        })
    }
