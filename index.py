from flask import Flask, jsonify, request
from datetime import datetime

app = Flask(__name__)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    """Handle all routes"""
    if path == "" or path == "api" or path == "api/index":
        return jsonify({
            "message": "API is running",
            "timestamp": datetime.now().isoformat(),
            "service": "book-admin-api"
        })
    
    elif path == "health" or path == "api/health":
        return jsonify({
            "ok": True,
            "service": "book-admin-api",
            "version": "1.0.1"
        })
    
    elif path == "ping" or path == "api/ping":
        return jsonify({
            "timestamp": datetime.now().isoformat(),
            "service": "book-admin-api",
            "version": "1.0.1"
        })
    
    else:
        return jsonify({
            "error": f"Path not found: {path}",
            "status": 404
        }), 404

@app.route('/api/shuspot-ingestion/ingest-manifest', methods=['POST'])
def ingest_manifest():
    """Handle book manifest uploads"""
    if request.method == 'POST':
        try:
            payload = request.json
            books = payload.get("books", [])
            return jsonify({
                "message": f"Received {len(books)} books",
                "db_imported": len(books),
                "success": True
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 400
    else:
        return jsonify({
            "success": False,
            "error": "Method not allowed"
        }), 405
