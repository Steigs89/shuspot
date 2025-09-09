from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from datetime import datetime
import os

app = FastAPI()

@app.get("/{path:path}")
async def catch_all(request: Request, path: str = ""):
    """
    Catch-all endpoint that handles all requests
    """
    # Get the full path including query parameters
    full_path = request.url.path
    
    if path == "" or path == "index" or path == "api" or path == "api/index":
        return JSONResponse(content={"message": "API is running", "path": full_path})
    
    elif path == "health" or path == "api/health":
        return JSONResponse(content={"ok": True, "service": "book-admin-api", "version": "1.0.1"})
    
    elif path == "ping" or path == "api/ping":
        return JSONResponse(content={"timestamp": datetime.now().isoformat(), "service": "book-admin-api", "version": "1.0.1"})
    
    elif "shuspot-ingestion/ingest-manifest" in path or "api/shuspot-ingestion/ingest-manifest" in path:
        return JSONResponse(content={
            "message": "Manifest endpoint (POST only)",
            "success": False,
            "error": "POST method required"
        })
    
    # Default 404 response for other paths
    return JSONResponse(
        status_code=404,
        content={"detail": f"Path not found: {full_path}"}
    )
