import json

def handler(request, context):
    """
    Vercel Python HTTP handler for health check
    """
    response = {
        "ok": True,
        "service": "book-admin-api",
        "version": "1.0.1"
    }
    
    return {
        "statusCode": 200,
        "body": json.dumps(response),
        "headers": {
            "Content-Type": "application/json"
        }
    }
