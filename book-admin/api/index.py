from fastapi import FastAPI, APIRouter, UploadFile, File, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os, json
from datetime import datetime

"""
Storage notes:
- On platforms like Render, only /tmp is writable at runtime.
- We default to /tmp and only use TMPDIR if it's an existing, writable directory.
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
        except Exception:
            # Reset to empty if corrupt/unreadable
            try:
                with open(DB_PATH, 'w') as f:
                    json.dump({"books": []}, f)
            except Exception:
                pass
            return {"books": []}
    return {"books": []}

def save_db(data: Dict[str, Any]):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
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
    def first_non_empty(*vals):
        for v in vals:
            if v is not None and (not isinstance(v, str) or v.strip() != ""):
                return v
        return None

    n: Dict[str, Any] = dict(b)
    n["title"] = first_non_empty(n.get("title"), b.get("Name"), b.get("name"))
    n["author"] = first_non_empty(n.get("author"), b.get("Author"))
    n["genre"] = first_non_empty(n.get("genre"), b.get("Category"), b.get("Subject"))
    n["reading_level"] = first_non_empty(n.get("reading_level"), b.get("Age"))
    n["url"] = first_non_empty(n.get("url"), b.get("URL"))
    n["notes"] = first_non_empty(n.get("notes"), b.get("Notes"))
    return n

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
        base_id = len(existing)
        for i, b in enumerate(books):
            b2 = normalize_book(dict(b))
            b2["id"] = base_id + i + 1
            existing.append(b2)
        db["books"] = existing
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
    return PlainTextResponse(buf.getvalue(), media_type="text/csv")

app.include_router(router)  # '/'
app.include_router(router, prefix="/index")  # '/index'
app.include_router(router, prefix="/api")  # '/api/*' (in case full path is forwarded)
app.include_router(router, prefix="/api/index")  # '/api/index/*'

# Diagnostic catch-all to inspect path mapping
from fastapi import Request
@app.api_route("/{rest_of_path:path}", methods=["GET","POST","PUT","DELETE","PATCH"])
async def _catch_all(rest_of_path: str, request: Request):
    return {
        "catch_all": True,
        "path": request.url.path,
        "root_path": request.scope.get("root_path"),
        "routes": [getattr(r, "path", str(r)) for r in app.routes][:50],
    }