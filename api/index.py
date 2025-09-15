# api/index.py
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os, json
from datetime import datetime

TMP_DIR = os.environ.get("TMPDIR", "/tmp")
DB_PATH = os.path.join(TMP_DIR, "books.json")

def load_db() -> Dict[str, Any]:
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            return {"books": []}
    return {"books": []}

def save_db(data: Dict[str, Any]):
    try:
        with open(DB_PATH, 'w') as f:
            json.dump(data, f)
    except Exception:
        pass

app = FastAPI(title="Book Admin API")
router = APIRouter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@router.get("/")
def root():
    return {"message": "Book Admin API is running", "timestamp": datetime.now().isoformat()}

@router.get("/ping")
@router.get("/health")
@router.get("/healthz")
def health():
    return {"ok": True, "service": "book-admin-api", "timestamp": datetime.now().isoformat()}

@router.get("/whoami")
async def whoami(request: Request):
    return {
        "scope_path": request.scope.get("path"),
        "root_path": request.scope.get("root_path"),
        "headers": {k.decode(): v.decode() for k, v in request.scope.get("headers", []) if k.decode() in ("host", "x-forwarded-host", "x-forwarded-uri", "x-vercel-id")},
    }

# Local uploader manifest endpoint (safe by default)
@router.post("/shuspot-ingestion/ingest-manifest")
async def ingest_manifest(request: Request, safe: bool = Query(True), dry_run: bool = Query(False)):
    try:
        payload = await request.json()
        books = payload.get("books", []) if isinstance(payload, dict) else (payload if isinstance(payload, list) else [])
        if not books:
            if safe:
                return {"success": False, "db_imported": 0, "errors": ["No books provided in manifest"]}
            raise HTTPException(status_code=400, detail="No books provided in manifest")

        if dry_run:
            return {"message": f"Validated {len(books)} books (dry-run)", "db_imported": 0, "success": True, "errors": []}

        db = load_db()
        existing = db.get("books", [])
        # Assign simple incremental ids
        base_id = len(existing)
        for i, b in enumerate(books):
            b2 = dict(b)
            b2["id"] = base_id + i + 1
            existing.append(b2)
        db["books"] = existing
        save_db(db)
        return {"message": f"Imported {len(books)} books", "db_imported": len(books), "success": True, "errors": []}
    except Exception as e:
        if safe:
            return {"success": False, "db_imported": 0, "errors": [str(e)]}
        raise

# Basic book models
class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    genre: Optional[str] = None
    description: Optional[str] = None

@router.post("/upload-books")
async def upload_books(files: List[UploadFile] = File(...)):
    filenames = [f.filename for f in files]
    return {"uploaded": len(files), "files": filenames}

@router.get("/books")
def get_books():
    db = load_db()
    return {"books": db.get("books", [])}

@router.put("/books/{book_id}")
async def update_book(book_id: int, request: Request):
    form = await request.form()
    db = load_db()
    books = db.get("books", [])
    for b in books:
        if b.get("id") == book_id:
            for k, v in form.items():
                b[k] = v
            save_db(db)
            return {"ok": True, "book": b}
    raise HTTPException(status_code=404, detail="Book not found")

@router.put("/books/bulk-update")
async def bulk_update_books(request: Request):
    form = await request.form()
    ids = [int(v) for k, v in form.multi_items() if k == "book_ids"]
    field = form.get("field")
    value = form.get("value")
    if not field:
        raise HTTPException(status_code=400, detail="Missing 'field'")
    db = load_db()
    count = 0
    for b in db.get("books", []):
        if b.get("id") in ids:
            b[field] = value
            count += 1
    save_db(db)
    return {"ok": True, "updated": count}

@router.delete("/books/{book_id}")
def delete_book(book_id: int):
    db = load_db()
    before = len(db.get("books", []))
    db["books"] = [b for b in db.get("books", []) if b.get("id") != book_id]
    save_db(db)
    return {"ok": True, "deleted": before - len(db["books"]) }

@router.delete("/books/clear/all")
def clear_all():
    save_db({"books": []})
    return {"ok": True, "cleared": True}

@router.get("/stats")
def stats():
    db = load_db()
    total = len(db.get("books", []))
    return {"total_books": total, "generated_at": datetime.now().isoformat()}

@router.get("/export/csv")
def export_csv():
    db = load_db()
    import io, csv
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "title", "author", "genre"])
    for b in db.get("books", []):
        writer.writerow([b.get("id"), b.get("title"), b.get("author"), b.get("genre")])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv")

# Mount router at multiple prefixes to handle Vercel path forwarding
app.include_router(router)  # '/'
app.include_router(router, prefix="/index")  # '/index'
app.include_router(router, prefix="/api")  # '/api/*'
app.include_router(router, prefix="/api/index")  # '/api/index/*'
