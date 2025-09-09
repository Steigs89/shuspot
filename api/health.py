from http.server import BaseHTTPRequestHandler
import json
from datetime import datetime

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "ok": True,
            "service": "book-admin-api",
            "version": "1.0.1"
        }
        
        self.wfile.write(json.dumps(response).encode())
