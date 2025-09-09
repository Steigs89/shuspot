from http.server import BaseHTTPRequestHandler
from datetime import datetime
import json

def handler(request, context):
    """
    Vercel Python HTTP handler function
    """
    # Determine path from request
    path = request.get("path", "/")
    
    # Create response based on path
    if path == "/api/health" or path == "/health":
        response = {
            "ok": True,
            "service": "book-admin-api",
            "version": "1.0.1"
        }
    elif path == "/api/ping" or path == "/ping":
        response = {
            "timestamp": datetime.now().isoformat(),
            "service": "book-admin-api",
            "version": "1.0.1"
        }
    else:
        response = {
            "message": "API is running from api/index.py handler",
            "timestamp": datetime.now().isoformat(),
            "path": path
        }
    
    # Return the response
    return {
        "statusCode": 200,
        "body": json.dumps(response),
        "headers": {
            "Content-Type": "application/json"
        }
    }
