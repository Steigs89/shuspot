# api/index.py
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
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
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
DEFAULT_SEED = os.environ.get(
    "BOOKS_SEED_PATH",
    os.path.join(REPO_ROOT, "book-admin", "backend", "parsed_books.json"),
)

def _load_seed_books() -> list:
    try:
        path = DEFAULT_SEED
        if not os.path.exists(path):
            return []
        with open(path, "r") as f:
            data = json.load(f)
            # Accept either {books: [...]} or a list
            raw = data.get("books", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            return [normalize_book(b) for b in raw]
    except Exception:
        return []

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
    # Cold start: try to auto-seed from repo manifest so UI isn't empty
    seeded = _load_seed_books()
    if seeded:
        try:
            save_db({"books": [
                {**b, "id": i + 1} if "id" not in b else b for i, b in enumerate(seeded)
            ]})
            return {"books": load_db().get("books", [])}
        except Exception:
            pass
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
def _clean_str(v: Any) -> Any:
    if isinstance(v, str):
        return v.strip() or None
    return v

def _canon_book_type(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    s = v.strip().lower()
    mapping = {
        "read to me": "Read to Me",
        "read to me stories": "Read to Me",
        "video books": "Video Book",
        "video book": "Video Book",
        "video": "Video",
        "audiobooks": "Audiobook",
        "audiobook": "Audiobook",
        "books": "Book",
        "book": "Book",
    }
    return mapping.get(s, v.strip())

def _derive_genre_from_path(path: Optional[str], book_type: Optional[str]) -> Optional[str]:
    if not path or not isinstance(path, str):
        return None
    # Normalize path separators
    parts = [p for p in path.split("/") if p]
    lowered = [p.lower() for p in parts]
    # Heuristic: For Read to Me, use the folder after "Read to Me Stories" as genre
    if book_type == "Read to Me":
        for key in ("read to me stories", "read to me"):
            if key in lowered:
                idx = lowered.index(key)
                # Next segment (if exists) is the subject bucket
                if idx + 1 < len(parts):
                    return parts[idx + 1].strip()
    # For Books and Video Book often no category folder; avoid guessing from title folder
    return None

def normalize_book(b: Dict[str, Any]) -> Dict[str, Any]:
    """Return a book dict with normalized keys expected by the frontend.
    Preserves original fields and ensures: title, author, genre, reading_level, url, notes.
    If an existing key is present but empty/None, fill it from fallbacks.
    """
    def first_non_empty(*vals):
        for v in vals:
            if v is not None and (not isinstance(v, str) or v.strip() != ""):
                return v
        return None

    n: Dict[str, Any] = dict(b)
    # Trim common string fields up front
    for k in list(n.keys()):
        n[k] = _clean_str(n[k])

    TOP_LEVEL = {"read to me", "video books", "video book", "audiobooks", "audiobook", "books", "videos", "read to me stories"}
    # Title
    n["title"] = first_non_empty(n.get("title"), b.get("Name"), b.get("name"))
    # Author
    n["author"] = first_non_empty(n.get("author"), b.get("Author"))
    # Book type strictly from Media when available
    bt_in = first_non_empty(n.get("book_type"), b.get("book_type"), b.get("Media"), b.get("media"))
    n["book_type"] = _canon_book_type(bt_in)
    # Genre/category (avoid top-level media values)
    candidate_genre = first_non_empty(n.get("genre"), b.get("Genre"), b.get("Category"), b.get("Subject"))
    if isinstance(candidate_genre, str):
        candidate_genre = candidate_genre.strip()
    if isinstance(candidate_genre, str) and candidate_genre.strip().lower() in TOP_LEVEL:
        candidate_genre = None
    # Also avoid genre duplicating book_type
    if candidate_genre and n.get("book_type") and str(candidate_genre).strip().lower() == str(n.get("book_type")).strip().lower():
        candidate_genre = None
    # Derive from folder path if still missing and we can infer safely
    if not candidate_genre:
        derived = _derive_genre_from_path(b.get("_folder_path"), n.get("book_type"))
        candidate_genre = _clean_str(derived)
    n["genre"] = candidate_genre
    # Optional fields commonly used
    n["reading_level"] = first_non_empty(n.get("reading_level"), b.get("Age"))
    # Rich metadata pass-through from dashed description parsing
    if not n.get("description") and b.get("description"):
        n["description"] = b.get("description")
    if not n.get("illustrator") and b.get("Illustrator"):
        n["illustrator"] = b.get("Illustrator")
    if not n.get("tags") and isinstance(b.get("tags"), list):
        n["tags"] = b.get("tags")
    if not n.get("spotlight_words") and isinstance(b.get("spotlight_words"), list):
        n["spotlight_words"] = b.get("spotlight_words")
    if not n.get("age_range") and b.get("age_range"):
        n["age_range"] = b.get("age_range")
    if not n.get("gr_level") and (b.get("gr_level") or b.get("GR Level") or b.get("GRL")):
        n["gr_level"] = first_non_empty(b.get("gr_level"), b.get("GR Level"), b.get("GRL"))
    if "quiz_available" in b and n.get("quiz_available") is None:
        n["quiz_available"] = bool(b.get("quiz_available"))
    n["url"] = first_non_empty(n.get("url"), b.get("URL"))
    n["notes"] = first_non_empty(n.get("notes"), b.get("Notes"))
    # Carry through internal fields used by the reader/launcher
    if b.get("_folder_path") and not n.get("_folder_path"):
        n["_folder_path"] = b.get("_folder_path")
    if b.get("_page_sequence") and not n.get("_page_sequence"):
        n["_page_sequence"] = b.get("_page_sequence")
    if b.get("_total_pages") and not n.get("_total_pages"):
        n["_total_pages"] = b.get("_total_pages")
    if b.get("cover_image_url") and not n.get("cover_image_url"):
        n["cover_image_url"] = b.get("cover_image_url")
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
def get_books(
    search: Optional[str] = None,
    author: Optional[str] = None,
    genre: Optional[str] = None,
    book_type: Optional[str] = None,
):
    db = load_db()
    raw = db.get("books", [])
    books = [normalize_book(b) for b in raw]
    # Derive book_type strictly from Media if missing
    for b in books:
        if not b.get("book_type"):
            bt = b.get("Media") or b.get("media") or ""
            b["book_type"] = _canon_book_type(bt)
    def match(b):
        if search:
            q = search.lower()
            hay = f"{b.get('title','')} {b.get('author','')} {b.get('genre','')} {b.get('notes','')}".lower()
            if q not in hay:
                return False
        if author and (b.get("author") or "").lower() != author.lower():
            return False
        if genre and (b.get("genre") or "").lower() != genre.lower():
            return False
        if book_type and (b.get("book_type") or "").lower() != book_type.lower():
            return False
        return True
    filtered = [b for b in books if match(b)]
    return {"books": filtered}

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
            elif field == "book_type":
                b["Media"] = value
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
    "total": len(books),
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
    writer.writerow(["id", "title", "author", "genre", "book_type"])
    for b in db.get("books", []):
        n = normalize_book(b)
        writer.writerow([n.get("id"), n.get("title"), n.get("author"), n.get("genre"), n.get("book_type")])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv")

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
