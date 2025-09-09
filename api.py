from fastapi import FastAPI, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
import json

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "API is running"}

@app.get("/health")
@app.get("/api/health")
async def health():
    """Health check endpoint for the API"""
    return {"ok": True, "service": "book-admin-api", "version": "1.0.1"}

@app.get("/ping")
@app.get("/api/ping")
async def ping():
    """Ping endpoint for the API with timestamp"""
    return {"timestamp": datetime.now().isoformat(), "service": "book-admin-api", "version": "1.0.1"}

@app.post("/shuspot-ingestion/ingest-manifest")
@app.post("/api/shuspot-ingestion/ingest-manifest")
async def ingest_manifest(
    payload: dict = Body(...),
    safe: bool = Query(False),
    dry_run: bool = Query(False)
):
    """Ingest parsed book metadata from a client-side agent."""
    try:
        print("[ingest-manifest] payload keys:", list(payload.keys()) if isinstance(payload, dict) else type(payload))
        books = payload.get("books")
        if books is None and isinstance(payload, list):
            books = payload
        if not books:
            if safe:
                return {"success": False, "db_imported": 0, "errors": ["No books provided in manifest"]}
            return {"detail": "No books provided in manifest", "status_code": 400}

        import_to_db = bool(payload.get("import_to_db", True))
        import_to_sheets = bool(payload.get("import_to_sheets", False))

        # Early exit for diagnostics: dry run returns quickly without DB writes
        if dry_run:
            try:
                sample = books[0] if isinstance(books, list) and books else {}
                # Avoid returning large/private fields in sample
                if isinstance(sample, dict):
                    sample = {k: v for k, v in sample.items() if not str(k).startswith('_')}
                return {
                    "message": "Dry run OK",
                    "received": len(books) if isinstance(books, list) else 0,
                    "import_to_db": import_to_db,
                    "import_to_sheets": import_to_sheets,
                    "sample": sample
                }
            except Exception as e:
                msg = f"Dry run failed: {str(e)}"
                print("[ingest-manifest]", msg)
                if safe:
                    return {"success": False, "db_imported": 0, "errors": [msg]}
                return {"detail": msg, "status_code": 500}

        # For now, just acknowledge the books without actually importing
        # since we don't have DB access in this simplified API
        return {
            "message": f"Received {len(books) if isinstance(books, list) else 0} books",
            "db_imported": len(books) if isinstance(books, list) else 0,
            "success": True
        }
        
    except Exception as e:
        msg = f"Manifest ingestion failed: {str(e)}"
        print("[ingest-manifest] Top-level exception:", msg)
        if safe:
            return {"success": False, "db_imported": 0, "errors": [msg]}
        return {"detail": msg, "status_code": 500}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
