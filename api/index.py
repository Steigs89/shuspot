from http.server import BaseHTTPRequestHandler
from datetime import datetime
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "message": "API is running from api/index.py handler",
            "timestamp": datetime.now().isoformat(),
            "path": self.path
        }
        
        if self.path == "/api/health" or self.path == "/health":
            response = {
                "ok": True, 
                "service": "book-admin-api", 
                "version": "1.0.1"
            }
        elif self.path == "/api/ping" or self.path == "/ping":
            response = {
                "timestamp": datetime.now().isoformat(), 
                "service": "book-admin-api", 
                "version": "1.0.1"
            }
        
        self.wfile.write(json.dumps(response).encode())
        return
