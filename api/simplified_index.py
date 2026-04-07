from fastapi import FastAPI, Body, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Book Admin API is running"}

@app.get("/health")
@app.get("/api/health")
async def health():
    return {"ok": True, "service": "book-admin-api"}

@app.get("/ping")
@app.get("/api/ping")
async def ping():
    return {"timestamp": datetime.now().isoformat(), "service": "book-admin-api"}

@app.post("/shuspot-ingestion/ingest-manifest")
@app.post("/api/shuspot-ingestion/ingest-manifest")
async def ingest_manifest(
    request: Request,
    safe: bool = Query(False),
    dry_run: bool = Query(False),
):
    """Simplified manifest ingestion for testing"""
    try:
        payload = await request.json()
        books = payload.get("books", [])
        if not books and isinstance(payload, list):
            books = payload
            
        if not books:
            if safe:
                return {"success": False, "db_imported": 0, "errors": ["No books provided in manifest"]}
            return JSONResponse(
                status_code=400,
                content={"detail": "No books provided in manifest"}
            )
            
        # Just echo back the data for testing purposes
        return {
            "message": f"Received {len(books)} books",
            "db_imported": len(books),
            "success": True
        }
    except Exception as e:
        if safe:
            return {"success": False, "db_imported": 0, "errors": [str(e)]}
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error processing manifest: {str(e)}"}
        )

# Add catch-all route
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(path: str, request: Request):
    return {
        "message": f"Route handled: /{path}",
        "method": request.method,
        "timestamp": datetime.now().isoformat()
    }
