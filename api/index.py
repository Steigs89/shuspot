# api/index.py
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os, json
from datetime import datetime

"""
Storage notes:
- On platforms like Render/Netlify Functions, only /tmp is writable at runtime.
- Previously we honored TMPDIR, but if that points to a non-writable/missing path, writes could fail silently.
- We now default to /tmp and only use TMPDIR if it points to an existing, writable directory.
"""

def _resolve_tmp_dir() -> str:
    candidate = os.environ.get("TMPDIR")
    if candidate and os.path.isdir(candidate) and os.access(candidate, os.W_OK):
        return candidate
    return "/tmp"

TMP_DIR = _resolve_tmp_dir()
DB_PATH = os.path.join(TMP_DIR, "books.json")

def load_db() -> Dict[str, Any]:
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, 'r') as f:
                return json.load(f)
        except Exception as e:
            # Corrupt or unreadable file; reset to empty and try to salvage by rewriting
            try:
                with open(DB_PATH, 'w') as f:
                    json.dump({"books": []}, f)
            except Exception:
                pass
            return {"books": []}
    return {"books": []}

def save_db(data: Dict[str, Any]):
    # Ensure parent dir exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    # Do not swallow errors; let caller handle and report
    with open(DB_PATH, 'w') as f:
        json.dump(data, f)

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

@router.get("/admin/debug")
def debug_state():
    exists = os.path.exists(DB_PATH)
    size = os.path.getsize(DB_PATH) if exists else 0
    writable = os.access(os.path.dirname(DB_PATH), os.W_OK)
    return {
        "db_path": DB_PATH,
        "tmp_dir": TMP_DIR,
        "exists": exists,
        "size": size,
        "writable": writable,
        "time": datetime.now().isoformat(),
    }

# --- Helpers ---
def normalize_book(b: Dict[str, Any]) -> Dict[str, Any]:
    """Return a book dict with normalized keys expected by the frontend.
    Preserves original fields and adds: title, author, genre, reading_level, url, notes.
    """
    n: Dict[str, Any] = dict(b)
    # Title
    n.setdefault("title", b.get("title") or b.get("Name") or b.get("name"))
    # Author
    n.setdefault("author", b.get("author") or b.get("Author"))
    # Genre/category
    n.setdefault("genre", b.get("genre") or b.get("Category") or b.get("Subject"))
    # Optional fields commonly used
    n.setdefault("reading_level", b.get("reading_level") or b.get("Age"))
    n.setdefault("url", b.get("url") or b.get("URL"))
    n.setdefault("notes", b.get("notes") or b.get("Notes"))
    return n

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
            b2 = normalize_book(dict(b))
            b2["id"] = base_id + i + 1
            existing.append(b2)
        db["books"] = existing
        # Persist; if this fails we report back with error
        try:
            save_db(db)
        except Exception as e:
            if safe:
                return {"success": False, "db_imported": 0, "errors": [f"Failed to save DB: {e}"]}
            raise
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
    raw = db.get("books", [])
    normalized = [normalize_book(b) for b in raw]
    return {"books": normalized}

@router.put("/books/{book_id}")
async def update_book(book_id: int, request: Request):
    form = await request.form()
    db = load_db()
    books = db.get("books", [])
    for b in books:
        if b.get("id") == book_id:
            for k, v in form.items():
                b[k] = v
                # Keep legacy fields in sync for key fields
                if k == "title":
                    b["Name"] = v
                elif k == "author":
                    b["Author"] = v
                elif k == "genre":
                    b["Category"] = v
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
            # Sync legacy for known fields
            if field == "title":
                b["Name"] = value
            elif field == "author":
                b["Author"] = value
            elif field == "genre":
                b["Category"] = value
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
    raw = db.get("books", [])
    books = [normalize_book(b) for b in raw]
    authors = sorted({b.get("author") for b in books if b.get("author")})
    genres = sorted({b.get("genre") for b in books if b.get("genre")})
    return {
        "total_books": len(books),
        "unique_authors": len(authors),
        "unique_genres": len(genres),
        "authors": authors,
        "genres": genres,
        "generated_at": datetime.now().isoformat(),
    }

@router.get("/export/csv")
def export_csv():
    db = load_db()
    import io, csv
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "title", "author", "genre"])
    for b in db.get("books", []):
        n = normalize_book(b)
        writer.writerow([n.get("id"), n.get("title"), n.get("author"), n.get("genre")])
    return {"csv_data": buf.getvalue()}

# Mount router at multiple prefixes to handle Vercel path forwarding
app.include_router(router)  # '/'
app.include_router(router, prefix="/index")  # '/index'
app.include_router(router, prefix="/api")  # '/api/*'
app.include_router(router, prefix="/api/index")  # '/api/index/*'

# Diagnostic catch-all (last) to inspect path mapping in Vercel
from fastapi import Request
@app.api_route("/{rest_of_path:path}", methods=["GET","POST","PUT","DELETE","PATCH"])
async def _catch_all(rest_of_path: str, request: Request):
    return {
        "catch_all": True,
        "path": request.url.path,
        "root_path": request.scope.get("root_path"),
        "routes": [getattr(r, "path", str(r)) for r in app.routes][:50],
    }
