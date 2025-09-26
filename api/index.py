# api/index.py
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
import os, json, re
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

# Configure for large file uploads (up to 5GB)
import starlette.requests
from starlette.datastructures import UploadFile as StarletteUploadFile

# Increase the maximum request size
starlette.requests.Request.max_body_size = 5 * 1024 * 1024 * 1024  # 5GB
# Increase upload file size limit  
StarletteUploadFile.max_size = 5 * 1024 * 1024 * 1024  # 5GB

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
    
@router.get("/admin/ai-status")
def ai_status():
    """
    Lightweight readiness probe for the AI integration at top-level API.
    Does NOT expose secrets. Returns booleans on env/deps.
    """
    key_present = bool(os.environ.get("OPENAI_API_KEY"))
    try:
        import openai  # type: ignore
        pkg_ok = True
        pkg_ver = getattr(openai, "__version__", None)
    except Exception:
        pkg_ok = False
        pkg_ver = None
    return {
        "openai_api_key_present": key_present,
        "openai_package_installed": pkg_ok,
        "openai_package_version": pkg_ver,
        "configured_model": os.environ.get("OPENAI_MODEL", "gpt-4"),
    }

class GenerateScriptRequest(BaseModel):
    prompt: str

from .generate_script import generate_python_script as _gen_script_top

@router.post("/admin/generate-script")
async def admin_generate_script(request: GenerateScriptRequest):
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")
    try:
        generated_code = _gen_script_top(request.prompt)
        return {"script": generated_code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate script: {e}")

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
async def ingest_manifest(
    request: Request,
    safe: bool = Query(True),
    dry_run: bool = Query(False),
    upsert: bool = Query(True),
):
    try:
        payload = await request.json()
        print(f"[DEBUG] Payload type: {type(payload)}")
        print(f"[DEBUG] Payload keys: {list(payload.keys()) if isinstance(payload, dict) else 'Not a dict'}")
        books = payload.get("books", []) if isinstance(payload, dict) else (payload if isinstance(payload, list) else [])
        print(f"[DEBUG] Books found: {len(books)}")
        if not books:
            if safe:
                return {"success": False, "db_imported": 0, "errors": ["No books provided in manifest"]}
            raise HTTPException(status_code=400, detail="No books provided in manifest")

        if dry_run:
            return {"message": f"Validated {len(books)} books (dry-run)", "db_imported": 0, "success": True, "errors": []}

        db = load_db()
        existing = db.get("books", [])
        # Build an index for idempotent upsert by (title, author) normalized
        def key_of(x: Dict[str, Any]) -> Tuple[str, str]:
            n = normalize_book(x)
            t = (n.get("title") or "").strip().lower()
            a = (n.get("author") or "").strip().lower()
            return (t, a)

        index: Dict[Tuple[str, str], int] = {}
        for idx, rec in enumerate(existing):
            index[key_of(rec)] = idx

        next_id = max([b.get("id", 0) for b in existing] or [0]) + 1
        imported = 0
        for raw in books:
            b2 = normalize_book(dict(raw))
            k = key_of(b2)
            if upsert and k in index:
                # Merge fields into existing record, preserving id
                tgt_idx = index[k]
                current = existing[tgt_idx]
                preserved_id = current.get("id")
                # Prefer non-empty new fields over old; keep old if new is empty
                for field, value in b2.items():
                    if field == "id":
                        continue
                    if value is None or (isinstance(value, str) and value.strip() == ""):
                        continue
                    current[field] = value
                if preserved_id is not None:
                    current["id"] = preserved_id
                existing[tgt_idx] = current
            else:
                # Insert new record with incremental id
                b2["id"] = next_id
                next_id += 1
                existing.append(b2)
                imported += 1
        db["books"] = existing
        # Persist; if this fails we report back with error
        try:
            save_db(db)
        except Exception as e:
            if safe:
                return {"success": False, "db_imported": 0, "errors": [f"Failed to save DB: {e}"]}
            raise
        return {"message": f"Imported {imported} books (upserted {len(books) - imported})", "db_imported": imported, "success": True, "errors": []}
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
    try:
        form = await request.form()
        print("📝 Bulk update form data:", dict(form))
        
        ids = [int(v) for k, v in form.multi_items() if k == "book_ids"]
        field = form.get("field")
        value = form.get("value")
        
        print(f"📝 Bulk update: ids={ids}, field={field}, value={value}")
        
        if not field:
            raise HTTPException(status_code=400, detail="Missing 'field'")
        if not ids:
            raise HTTPException(status_code=400, detail="No book IDs provided")
            
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
                    
        print(f"📝 Updated {count} books")
        save_db(db)
        return {"ok": True, "updated": count}
        
    except Exception as e:
        print(f"❌ Bulk update error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Bulk update failed: {str(e)}")

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
    import io, csv, sys
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "title", "author", "genre", "book_type"])
    for b in db.get("books", []):
        n = normalize_book(b)
        writer.writerow([n.get("id"), n.get("title"), n.get("author"), n.get("genre"), n.get("book_type")])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv")

# ========================= Supabase ZIP Upload Endpoint =========================

@router.get("/test-upload-endpoint")
def test_upload_endpoint():
    return {"message": "Upload endpoint is reachable", "timestamp": datetime.now().isoformat()}

@router.post("/test-post-endpoint")
async def test_post_endpoint():
    """Test POST endpoint that returns immediately"""
    return {"message": "POST endpoint works", "timestamp": datetime.now().isoformat()}

@router.post("/shuspot-ingestion/upload-zip-to-supabase")
async def upload_zip_to_supabase(zip_file: UploadFile = File(...)):
    """Upload ZIP, extract, upload all files to Supabase, and create database entries with Supabase URLs."""
    import threading
    import time
    import tempfile
    import os

    print("🚀 Upload ZIP endpoint called - START")
    print(f"📦 ZIP file: {zip_file.filename}, size: {getattr(zip_file, 'size', 'unknown')}")

    # Quick validation before processing
    if not zip_file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not zip_file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP file")

    # Generate job ID
    job_id = f"upload-{int(time.time())}-{hash(zip_file.filename) % 10000}"
    print(f"📋 Generated job ID: {job_id}")

    # CRITICAL: Save file to disk in chunks BEFORE returning response
    # This prevents timeout during file reading
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, f"{job_id}.zip")
    
    try:
        print(f"💾 Streaming large file to disk: {temp_file_path}")
        
        # Stream file to disk in chunks to handle large files
        with open(temp_file_path, "wb") as temp_file:
            chunk_size = 8192 * 16  # 128KB chunks for faster streaming
            while True:
                chunk = await zip_file.read(chunk_size)
                if not chunk:
                    break
                temp_file.write(chunk)
        
        print(f"✅ Large file saved successfully: {temp_file_path}")
        
        # Start background processing with the saved file path
        import asyncio

        async def delayed_start():
            await asyncio.sleep(0.1)  # Small delay to ensure response is sent
            try:
                thread = threading.Thread(
                    target=_do_zip_upload_background_from_file, 
                    args=(job_id, temp_file_path, zip_file.filename), 
                    daemon=True
                )
                thread.start()
                print(f"✅ Background thread started for job {job_id}")
            except Exception as e:
                print(f"❌ Failed to start background thread: {e}")

        # Start the delayed background task
        asyncio.create_task(delayed_start())

    except Exception as e:
        print(f"❌ Error streaming large file: {e}")
        # Clean up temp file if it was created
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to process large file: {str(e)}")

    # Return response IMMEDIATELY after file is saved
    return {
        "message": "Large file upload completed. Processing started in background.",
        "job_id": job_id,
        "status": "processing",
        "estimated_time": "2-5 minutes"
    }

def _do_zip_upload_background_from_file(job_id: str, temp_file_path: str, original_filename: str):
    """Background processing function for ZIP uploads using a saved file"""
    try:
        print(f"📂 Job {job_id}: Starting ZIP processing from saved file...")

        # Step 1: Extract ZIP to temporary directory
        import tempfile
        import zipfile
        import os
        import json

        with tempfile.TemporaryDirectory() as tmpdir:
            print(f"📁 Job {job_id}: Using temp directory: {tmpdir}")
            
            # Extract the ZIP file
            extract_dir = os.path.join(tmpdir, 'extracted')
            os.makedirs(extract_dir, exist_ok=True)
            
            try:
                print(f"📦 Job {job_id}: Extracting ZIP from: {temp_file_path}")
                with zipfile.ZipFile(temp_file_path, 'r') as zf:
                    zf.extractall(extract_dir)
                print(f"✅ Job {job_id}: ZIP extracted successfully")
            except Exception as e:
                print(f"❌ Job {job_id}: Failed to extract ZIP: {e}")
                return
            finally:
                # Clean up the temporary ZIP file
                try:
                    os.remove(temp_file_path)
                    print(f"🗑️ Job {job_id}: Cleaned up temp ZIP file")
                except Exception as e:
                    print(f"⚠️ Job {job_id}: Could not clean up temp ZIP file: {e}")

            # Find CROP-ShuSpot folder
            print(f"🔍 Job {job_id}: Looking for CROP-ShuSpot...")
            crop_src = None
            for root, dirs, files in os.walk(extract_dir):
                if 'CROP-ShuSpot' in dirs:
                    crop_src = os.path.join(root, 'CROP-ShuSpot')
                    print(f"✅ Job {job_id}: Found CROP-ShuSpot at: {crop_src}")
                    break

            if not crop_src or not os.path.exists(crop_src):
                print(f"❌ Job {job_id}: CROP-ShuSpot folder not found")
                return

            # Step 2: Upload to Supabase using Python
            print(f"📤 Job {job_id}: Starting Supabase upload...")
            try:
                import supabase
                from supabase import create_client, Client

                # Use the same Supabase credentials as the frontend
                supabase_url = os.environ.get('SUPABASE_URL', 'https://xzwdtcczndgglqikmlwj.supabase.co')
                supabase_key = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6d2R0Y2N6bmRnZ2xxaWttbHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTkyNzUsImV4cCI6MjA2ODg3NTI3NX0.05oCSZ1d3eJHr79B1UvCoQTIL-UBGAKdRBk4CUwe7wE')

                if not supabase_url or not supabase_key:
                    print(f"❌ Job {job_id}: Missing Supabase credentials")
                    return

                print(f"✅ Job {job_id}: Supabase credentials found")
                client: Client = create_client(supabase_url, supabase_key)

                # Collect all files to upload
                files_to_upload = []
                for root, dirs, files in os.walk(crop_src):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, crop_src)
                        files_to_upload.append((full_path, rel_path))

                print(f"📁 Job {job_id}: Found {len(files_to_upload)} files to upload")

                if not files_to_upload:
                    print(f"❌ Job {job_id}: No files found to upload")
                    return

                uploaded_count = 0
                failed_count = 0

                # Upload files
                for i, (full_path, rel_path) in enumerate(files_to_upload):
                    try:
                        with open(full_path, 'rb') as f:
                            file_data = f.read()

                        result = client.storage.from_('books').upload(
                            rel_path, file_data, {'upsert': 'true'}
                        )

                        if hasattr(result, 'status_code') and result.status_code not in [200, 201]:
                            print(f"⚠️ Job {job_id}: Upload failed for {rel_path}: HTTP {result.status_code}")
                            failed_count += 1
                        else:
                            uploaded_count += 1

                        # Progress update every 10 files
                        if (i + 1) % 10 == 0:
                            print(f"📤 Job {job_id}: Progress: {i + 1}/{len(files_to_upload)} files processed")

                    except Exception as e:
                        print(f"❌ Job {job_id}: Exception uploading {rel_path}: {e}")
                        failed_count += 1

                print(f"✅ Job {job_id}: Upload complete: {uploaded_count} successful, {failed_count} failed")

                if uploaded_count == 0:
                    print(f"❌ Job {job_id}: All file uploads failed")
                    return

                print(f"✅ Job {job_id}: Python upload successful: {uploaded_count} files uploaded")

            except Exception as e:
                print(f"❌ Job {job_id}: Supabase upload error: {e}")
                return

            # Step 3: Parse and create database entries
            print(f"🗄️ Job {job_id}: Creating database entries...")

            try:
                from shuspot_folder_parser import ShuSpotFolderParser
            except ImportError:
                print(f"⚠️ Job {job_id}: ShuSpotFolderParser not available, using basic parsing")
                ShuSpotFolderParser = None

            supabase_base_url = "https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books"

            def convert_to_supabase_url(local_path):
                if crop_src in local_path:
                    rel_path = os.path.relpath(local_path, crop_src)
                    return f"{supabase_base_url}/{rel_path.replace(os.sep, '/')}"
                return local_path

            if ShuSpotFolderParser:
                parser = ShuSpotFolderParser(extract_dir)
                books = parser.parse_all_books()
            else:
                books = []
                for root, dirs, files in os.walk(extract_dir):
                    if 'CROP-ShuSpot' in root:
                        crop_files = [f for f in files if f.startswith('crop-') and f.endswith('.png')]
                        if crop_files:
                            folder_name = os.path.basename(root)
                            parent_name = os.path.basename(os.path.dirname(root))
                            cover_url = f"{supabase_base_url}/{parent_name}/{folder_name}/cover.jpg"

                            def extract_number(filename):
                                import re
                                match = re.search(r'crop-(\d+)', filename)
                                return int(match.group(1)) if match else 0

                            sorted_crop_files = sorted(crop_files, key=extract_number)
                            page_sequence = []
                            for i, crop_file in enumerate(sorted_crop_files):
                                page_sequence.append({
                                    "page_number": i + 1,
                                    "url": f"{supabase_base_url}/{parent_name}/{folder_name}/resized/{crop_file}",
                                    "display_name": f"Page {i + 1}"
                                })

                            books.append({
                                "Name": folder_name,
                                "Author": "Unknown",
                                "Media": "Read to Me",
                                "Category": parent_name,
                                "_page_sequence": page_sequence,
                                "_total_pages": len(page_sequence),
                                "_folder_path": f"{parent_name}/{folder_name}",
                                "_cover_image_path": cover_url,
                            })

            if not books:
                print(f"⚠️ Job {job_id}: No books found in ZIP")
                return

            # Create database entries using local JSON database
            print(f"🗄️ Job {job_id}: Adding books to local database...")
            
            try:
                db_data = load_db()
                existing_books = db_data.get("books", [])
                
                next_id = max([b.get("id", 0) for b in existing_books] or [0]) + 1
                imported_count = 0
                updated_count = 0
                
                for book_data in books:
                    title = book_data.get('Name', 'Unknown Title')
                    author = book_data.get('Author', 'Unknown Author')
                    
                    # Check if book already exists
                    existing_book = None
                    for i, book in enumerate(existing_books):
                        if book.get('title') == title and book.get('author') == author:
                            existing_book = book
                            break
                    
                    if existing_book:
                        # Update existing book
                        existing_book['genre'] = book_data.get('Category', existing_book.get('genre', 'Unknown'))
                        existing_book['book_type'] = book_data.get('Media', existing_book.get('book_type', 'Read to Me'))
                        existing_book['reading_level'] = book_data.get('Age', existing_book.get('reading_level', ''))
                        existing_book['cover_image_url'] = book_data.get('_cover_image_path', existing_book.get('cover_image_url', ''))
                        existing_book['description'] = book_data.get('Notes', existing_book.get('description', ''))
                        existing_book['_page_sequence'] = book_data.get('_page_sequence', existing_book.get('_page_sequence', []))
                        existing_book['_total_pages'] = book_data.get('_total_pages', existing_book.get('_total_pages', 0))
                        existing_book['_folder_path'] = book_data.get('_folder_path', existing_book.get('_folder_path', ''))
                        updated_count += 1
                    else:
                        # Add new book
                        new_book = {
                            'id': next_id,
                            'title': title,
                            'author': author,
                            'genre': book_data.get('Category', 'Unknown'),
                            'book_type': book_data.get('Media', 'Read to Me'),
                            'reading_level': book_data.get('Age', ''),
                            'cover_image_url': book_data.get('_cover_image_path', ''),
                            'description': book_data.get('Notes', ''),
                            '_page_sequence': book_data.get('_page_sequence', []),
                            '_total_pages': book_data.get('_total_pages', 0),
                            '_folder_path': book_data.get('_folder_path', ''),
                            'url': '',
                            'notes': ''
                        }
                        existing_books.append(new_book)
                        next_id += 1
                        imported_count += 1
                
                # Save updated database
                db_data['books'] = existing_books
                save_db(db_data)
                
                print(f"✅ Job {job_id}: Database update complete: {imported_count} imported, {updated_count} updated")
                
            except Exception as e:
                print(f"❌ Job {job_id}: Database update error: {e}")

        print(f"🎉 Job {job_id}: Processing complete!")

    except Exception as e:
        print(f"💥 Job {job_id}: Critical error: {e}")
        import traceback
        traceback.print_exc()
        # Clean up temp file on error
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
        except:
            pass

def _do_zip_upload_background(job_id: str, zip_file: UploadFile):
    """Background processing function for ZIP uploads"""
    try:
        print(f"📂 Job {job_id}: Starting ZIP extraction...")

        # Step 1: Extract ZIP to temporary directory
        import tempfile
        import zipfile
        import os
        import json

        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = os.path.join(tmpdir, zip_file.filename or "upload.zip")
            content = zip_file.file.read()
            with open(zip_path, 'wb') as f:
                f.write(content)

            extract_dir = os.path.join(tmpdir, 'extracted')
            os.makedirs(extract_dir, exist_ok=True)
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(extract_dir)

            # Find CROP-ShuSpot folder
            print(f"🔍 Job {job_id}: Looking for CROP-ShuSpot...")
            crop_src = None
            for root, dirs, files in os.walk(extract_dir):
                if 'CROP-ShuSpot' in dirs:
                    crop_src = os.path.join(root, 'CROP-ShuSpot')
                    print(f"✅ Job {job_id}: Found CROP-ShuSpot at: {crop_src}")
                    break

            if not crop_src or not os.path.exists(crop_src):
                print(f"❌ Job {job_id}: CROP-ShuSpot folder not found")
                return

            # Step 2: Upload to Supabase using Python
            print(f"📤 Job {job_id}: Starting Supabase upload...")
            try:
                import supabase
                from supabase import create_client, Client

                # Use the same Supabase credentials as the frontend
                supabase_url = os.environ.get('SUPABASE_URL', 'https://xzwdtcczndgglqikmlwj.supabase.co')
                supabase_key = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6d2R0Y2N6bmRnZ2xxaWttbHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTkyNzUsImV4cCI6MjA2ODg3NTI3NX0.05oCSZ1d3eJHr79B1UvCoQTIL-UBGAKdRBk4CUwe7wE')

                if not supabase_url or not supabase_key:
                    print(f"❌ Job {job_id}: Missing Supabase credentials")
                    return

                print(f"✅ Job {job_id}: Supabase credentials found")
                client: Client = create_client(supabase_url, supabase_key)

                # Collect all files to upload
                files_to_upload = []
                for root, dirs, files in os.walk(crop_src):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, crop_src)
                        files_to_upload.append((full_path, rel_path))

                print(f"📁 Job {job_id}: Found {len(files_to_upload)} files to upload")

                if not files_to_upload:
                    print(f"❌ Job {job_id}: No files found to upload")
                    return

                uploaded_count = 0
                failed_count = 0

                # Upload files
                for i, (full_path, rel_path) in enumerate(files_to_upload):
                    try:
                        with open(full_path, 'rb') as f:
                            file_data = f.read()

                        result = client.storage.from_('books').upload(
                            rel_path, file_data, {'upsert': 'true'}
                        )

                        if hasattr(result, 'status_code') and result.status_code not in [200, 201]:
                            print(f"⚠️ Job {job_id}: Upload failed for {rel_path}: HTTP {result.status_code}")
                            failed_count += 1
                        else:
                            uploaded_count += 1

                        # Progress update every 10 files
                        if (i + 1) % 10 == 0:
                            print(f"📤 Job {job_id}: Progress: {i + 1}/{len(files_to_upload)} files processed")

                    except Exception as e:
                        print(f"❌ Job {job_id}: Exception uploading {rel_path}: {e}")
                        failed_count += 1

                print(f"✅ Job {job_id}: Upload complete: {uploaded_count} successful, {failed_count} failed")

                if uploaded_count == 0:
                    print(f"❌ Job {job_id}: All file uploads failed")
                    return

                print(f"✅ Job {job_id}: Python upload successful: {uploaded_count} files uploaded")

            except Exception as e:
                print(f"❌ Job {job_id}: Supabase upload error: {e}")
                return

            # Step 3: Parse and create database entries
            print(f"🗄️ Job {job_id}: Creating database entries...")

            try:
                from shuspot_folder_parser import ShuSpotFolderParser
            except ImportError:
                print(f"⚠️ Job {job_id}: ShuSpotFolderParser not available, using basic parsing")
                ShuSpotFolderParser = None

            supabase_base_url = "https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books"

            def convert_to_supabase_url(local_path):
                if crop_src in local_path:
                    rel_path = os.path.relpath(local_path, crop_src)
                    return f"{supabase_base_url}/{rel_path.replace(os.sep, '/')}"
                return local_path

            if ShuSpotFolderParser:
                parser = ShuSpotFolderParser(extract_dir)
                books = parser.parse_all_books()
            else:
                books = []
                for root, dirs, files in os.walk(extract_dir):
                    if 'CROP-ShuSpot' in root:
                        crop_files = [f for f in files if f.startswith('crop-') and f.endswith('.png')]
                        if crop_files:
                            folder_name = os.path.basename(root)
                            parent_name = os.path.basename(os.path.dirname(root))
                            cover_url = f"{supabase_base_url}/{parent_name}/{folder_name}/cover.jpg"

                            def extract_number(filename):
                                import re
                                match = re.search(r'crop-(\d+)', filename)
                                return int(match.group(1)) if match else 0

                            sorted_crop_files = sorted(crop_files, key=extract_number)
                            page_sequence = []
                            for i, crop_file in enumerate(sorted_crop_files):
                                page_sequence.append({
                                    "page_number": i + 1,
                                    "url": f"{supabase_base_url}/{parent_name}/{folder_name}/resized/{crop_file}",
                                    "display_name": f"Page {i + 1}"
                                })

                            books.append({
                                "Name": folder_name,
                                "Author": "Unknown",
                                "Media": "Read to Me",
                                "Category": parent_name,
                                "_page_sequence": page_sequence,
                                "_total_pages": len(page_sequence),
                                "_folder_path": f"{parent_name}/{folder_name}",
                                "_cover_image_path": cover_url,
                            })

            if not books:
                print(f"⚠️ Job {job_id}: No books found in ZIP")
                return

            # Create database entries using local JSON database
            print(f"🗄️ Job {job_id}: Adding books to local database...")
            
            try:
                db_data = load_db()
                existing_books = db_data.get("books", [])
                
                next_id = max([b.get("id", 0) for b in existing_books] or [0]) + 1
                imported_count = 0
                updated_count = 0
                
                for book_data in books:
                    title = book_data.get('Name', 'Unknown Title')
                    author = book_data.get('Author', 'Unknown Author')
                    
                    # Check if book already exists
                    existing_book = None
                    for i, book in enumerate(existing_books):
                        if book.get('title') == title and book.get('author') == author:
                            existing_book = book
                            break
                    
                    if existing_book:
                        # Update existing book
                        existing_book['genre'] = book_data.get('Category', existing_book.get('genre', 'Unknown'))
                        existing_book['book_type'] = book_data.get('Media', existing_book.get('book_type', 'Read to Me'))
                        existing_book['reading_level'] = book_data.get('Age', existing_book.get('reading_level', ''))
                        existing_book['cover_image_url'] = book_data.get('_cover_image_path', existing_book.get('cover_image_url', ''))
                        existing_book['description'] = book_data.get('Notes', existing_book.get('description', ''))
                        existing_book['_page_sequence'] = book_data.get('_page_sequence', existing_book.get('_page_sequence', []))
                        existing_book['_total_pages'] = book_data.get('_total_pages', existing_book.get('_total_pages', 0))
                        existing_book['_folder_path'] = book_data.get('_folder_path', existing_book.get('_folder_path', ''))
                        updated_count += 1
                    else:
                        # Add new book
                        new_book = {
                            'id': next_id,
                            'title': title,
                            'author': author,
                            'genre': book_data.get('Category', 'Unknown'),
                            'book_type': book_data.get('Media', 'Read to Me'),
                            'reading_level': book_data.get('Age', ''),
                            'cover_image_url': book_data.get('_cover_image_path', ''),
                            'description': book_data.get('Notes', ''),
                            '_page_sequence': book_data.get('_page_sequence', []),
                            '_total_pages': book_data.get('_total_pages', 0),
                            '_folder_path': book_data.get('_folder_path', ''),
                            'url': '',
                            'notes': ''
                        }
                        existing_books.append(new_book)
                        next_id += 1
                        imported_count += 1
                
                # Save updated database
                db_data['books'] = existing_books
                save_db(db_data)
                
                print(f"✅ Job {job_id}: Database update complete: {imported_count} imported, {updated_count} updated")
                
            except Exception as e:
                print(f"❌ Job {job_id}: Database update error: {e}")

        print(f"🎉 Job {job_id}: Processing complete!")

    except Exception as e:
        print(f"💥 Job {job_id}: Critical error: {e}")
        import traceback
        traceback.print_exc()

# ========================= Manifest Generation Endpoint =========================
from pathlib import Path

@router.post("/generate-manifest")
async def generate_manifest(request: Request):
    """Generate manifest from local folder"""
    try:
        payload = await request.json()
        folder_path = payload.get('folder_path', '')
        generation_mode = payload.get('generation_mode', 'multi')
        book_metadata = payload.get('book_metadata', {})
        processing_script = payload.get('processing_script')  # Optional field
        
        if not folder_path:
            raise HTTPException(status_code=400, detail="folder_path is required")
        
        folder = Path(folder_path)
        if not folder.exists():
            # Check if it looks like a local path being accessed from cloud deployment
            if folder_path.startswith(("/Users/", "/home/", "C:\\", "D:\\")):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Local folder path '{folder_path}' cannot be accessed from cloud deployment. Please use a path relative to the server or upload your files first. Try checking if your files are in 'uploads/' or another server directory."
                )
            else:
                # Suggest alternative paths if common patterns don't exist
                suggestions = []
                if Path("uploads").exists():
                    suggestions.append("uploads/")
                if Path("books").exists():
                    suggestions.append("books/")
                
                suggestion_text = f" Suggestions: {', '.join(suggestions)}" if suggestions else ""
                raise HTTPException(status_code=400, detail=f"Folder not found: {folder_path}.{suggestion_text}")
        
        books = []
        
        if generation_mode == "single":
            # Single book mode - treat entire folder as one book
            pages = list(folder.glob("**/resized/crop-*.png"))
            if not pages:
                pages = list(folder.glob("**/*.png"))
            
            # Sort pages by numeric order (crop-1, crop-2, crop-10, etc.)
            def extract_number(filename):
                match = re.search(r'crop-(\d+)', filename.name)
                return int(match.group(1)) if match else 0
            pages = sorted(pages, key=extract_number)
            
            # Look for audio files
            audio_files = list(folder.glob("**/*.mp3")) + list(folder.glob("**/*.wav")) + list(folder.glob("**/*.m4a"))
            
            book = {
                "title": book_metadata.get('title', folder.name),
                "author": book_metadata.get('author', 'Unknown'),
                "genre": book_metadata.get('genre', 'Unknown'),
                "reading_level": book_metadata.get('reading_level', 'Elementary'),
                "book_type": book_metadata.get('book_type', 'Read to Me'),
                "description": book_metadata.get('description', ''),
                "folder_path": str(folder),
                "page_sequence": [{"page_number": i+1, "file_path": str(p)} for i, p in enumerate(pages)],
                "audio_files": [{"file_path": str(a), "file_name": a.name} for a in audio_files],
                "total_pages": len(pages)
            }
            books.append(book)
            
        else:
            # Multi-book mode - each subfolder is a book
            for subfolder in folder.iterdir():
                if not subfolder.is_dir():
                    continue
                    
                pages = list(subfolder.glob("**/resized/crop-*.png"))
                if not pages:
                    pages = list(subfolder.glob("**/*.png"))
                
                # Sort pages by numeric order (crop-1, crop-2, crop-10, etc.)
                def extract_number(filename):
                    match = re.search(r'crop-(\d+)', filename.name)
                    return int(match.group(1)) if match else 0
                pages = sorted(pages, key=extract_number)
                
                # Look for audio files
                audio_files = list(subfolder.glob("**/*.mp3")) + list(subfolder.glob("**/*.wav")) + list(subfolder.glob("**/*.m4a"))
                
                # Try to read description.txt
                desc_file = subfolder / "description.txt"
                book_title = book_metadata.get('title') or subfolder.name
                book_description = book_metadata.get('description', '')
                book_author = book_metadata.get('author', 'Unknown')
                book_genre = book_metadata.get('genre', 'Unknown')
                book_reading_level = book_metadata.get('reading_level', 'Elementary')
                
                if desc_file.exists():
                    try:
                        desc_content = desc_file.read_text(encoding="utf-8", errors="ignore")
                        lines = desc_content.splitlines()
                        
                        # Parse structured format
                        genres = []
                        for i, line in enumerate(lines):
                            line = line.strip()
                            
                            # Extract title (usually line 2, after URL)
                            if i == 1 and line and not line.startswith("http"):
                                book_title = line
                            
                            # Extract author
                            elif line.lower().startswith("by:"):
                                book_author = line.replace("By:", "").replace("by:", "").strip()
                            
                            # Extract genre categories (all caps words, usually middle section)
                            elif line.isupper() and len(line) > 2 and line.isalpha():
                                genres.append(line)
                            
                            # Extract reading level (GR Level line)
                            elif "GR Level" in lines and i < len(lines) - 1:
                                next_line = lines[i + 1].strip()
                                if next_line and len(next_line) <= 2:  # Single letter or short level
                                    book_reading_level = next_line
                            
                            # Extract age range for additional context
                            elif "Age Range" in lines and i < len(lines) - 1:
                                age_range = lines[i + 1].strip()
                                # Convert age range to reading level if no GR level found
                                if book_reading_level == book_metadata.get('reading_level', 'Elementary'):
                                    if "5-7" in age_range or "4-6" in age_range:
                                        book_reading_level = "Elementary"
                                    elif "8-10" in age_range or "7-9" in age_range:
                                        book_reading_level = "Intermediate"
                                    elif "11-13" in age_range or "10-12" in age_range:
                                        book_reading_level = "Middle Grade"
                        
                        # Set genre from parsed categories
                        if genres:
                            book_genre = ", ".join(genres[:3])  # Take first 3 categories
                        
                        # Use full description if not overridden by user
                        if not book_metadata.get('description'):
                            book_description = desc_content
                            
                    except Exception as e:
                        # Use basic logging since logging module might not be configured
                        print(f"Could not read description.txt in {subfolder}: {e}")
                
                # Find cover image
                cover_image = None
                cover_candidates = ["cover.jpg", "cover.png", "cover.jpeg"]
                for candidate in cover_candidates:
                    cover_path = subfolder / candidate
                    if cover_path.exists():
                        # Convert absolute path to web-accessible URL
                        # /Users/.../CROP-ShuSpot/Fractions/Half or Whole?/cover.jpg
                        # becomes /CROP-ShuSpot/Fractions/Half or Whole?/cover.jpg
                        relative_path = str(cover_path)
                        if "CROP-ShuSpot" in relative_path:
                            web_path = "/" + relative_path.split("CROP-ShuSpot", 1)[1]
                            web_path = "/CROP-ShuSpot" + web_path
                            cover_image = web_path
                        else:
                            cover_image = str(cover_path)
                        break
                
                # Convert page paths to web-accessible URLs
                web_pages = []
                for i, page_path in enumerate(pages):
                    web_url = str(page_path)
                    if "CROP-ShuSpot" in web_url:
                        web_path = "/" + web_url.split("CROP-ShuSpot", 1)[1]
                        web_path = "/CROP-ShuSpot" + web_path
                        web_url = web_path
                    web_pages.append({"page_number": i+1, "file_path": web_url})
                
                # Convert audio paths to web-accessible URLs  
                web_audio = []
                for audio_path in audio_files:
                    web_url = str(audio_path)
                    if "CROP-ShuSpot" in web_url:
                        web_path = "/" + web_url.split("CROP-ShuSpot", 1)[1]
                        web_path = "/CROP-ShuSpot" + web_path
                        web_url = web_path
                    web_audio.append({"file_path": web_url, "file_name": audio_path.name})
                
                book = {
                    "title": book_title,
                    "author": book_author,
                    "genre": book_genre,
                    "reading_level": book_reading_level,
                    "book_type": book_metadata.get('book_type', 'Read to Me'),
                    "description": book_description,
                    "folder_path": str(subfolder),
                    "cover_image": cover_image,
                    "page_sequence": web_pages,
                    "audio_files": web_audio,
                    "total_pages": len(pages)
                }
                books.append(book)
        
        manifest = {
            "books": books,
            "generated_at": datetime.now().isoformat(),
            "folder_path": folder_path,
            "generation_mode": generation_mode,
            "total_books": len(books),
            "processing_script_included": bool(processing_script)
        }
        
        return {"manifest": manifest}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to generate manifest: {str(e)}"
        raise HTTPException(status_code=500, detail=error_msg)

# ========================= Chunked Upload Processing =========================

@router.post("/shuspot-ingestion/upload-chunk")
async def upload_chunk(chunk: UploadFile = File(...), upload_id: str = Form(...), 
                      chunk_number: str = Form(...), total_chunks: str = Form(...),
                      original_filename: str = Form(...)):
    """Upload a single chunk to temporary storage with improved error handling"""
    import tempfile
    import os
    import shutil
    
    chunk_path = None
    try:
        # Check available disk space first
        temp_base = tempfile.gettempdir()
        free_space = shutil.disk_usage(temp_base).free
        required_space = 100 * 1024 * 1024  # Require 100MB free space
        
        if free_space < required_space:
            print(f"❌ Insufficient disk space: {free_space / (1024*1024):.1f}MB free, need {required_space / (1024*1024)}MB")
            raise HTTPException(status_code=507, detail=f"Insufficient disk space. Available: {free_space / (1024*1024):.1f}MB")
        
        # Create temp directory for this upload if it doesn't exist
        temp_dir = os.path.join(temp_base, f"chunks_{upload_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save the chunk to temporary storage
        chunk_filename = f"chunk_{chunk_number.zfill(4)}"
        chunk_path = os.path.join(temp_dir, chunk_filename)
        
        chunk_num = int(chunk_number) + 1
        print(f"💾 Saving chunk {chunk_num}/{total_chunks} to {chunk_path}")
        print(f"📊 Free disk space: {free_space / (1024*1024):.1f}MB")
        
        # Write chunk data to file in smaller increments to avoid memory issues
        content_size = 0
        with open(chunk_path, "wb") as chunk_file:
            while True:
                # Read in 1MB chunks to avoid loading entire file into memory
                data = await chunk.read(1024 * 1024)  # 1MB at a time
                if not data:
                    break
                chunk_file.write(data)
                content_size += len(data)
        
        # Verify the file was written correctly
        if not os.path.exists(chunk_path):
            raise HTTPException(status_code=500, detail=f"Failed to save chunk {chunk_num}")
            
        actual_size = os.path.getsize(chunk_path)
        if actual_size != content_size:
            print(f"⚠️ Size mismatch: expected {content_size}, got {actual_size}")
        
        print(f"✅ Chunk {chunk_num}/{total_chunks} saved ({actual_size} bytes)")
        
        return {
            "success": True,
            "chunk_id": chunk_filename,
            "chunk_number": int(chunk_number),
            "total_chunks": int(total_chunks),
            "upload_id": upload_id,
            "size": actual_size,
            "free_space_mb": free_space // (1024 * 1024)
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        if chunk_path and os.path.exists(chunk_path):
            try:
                os.remove(chunk_path)
                print(f"🗑️ Cleaned up failed chunk: {chunk_path}")
            except Exception as cleanup_error:
                print(f"⚠️ Could not clean up failed chunk: {cleanup_error}")
        raise
    except Exception as e:
        # Clean up on any other error
        if chunk_path and os.path.exists(chunk_path):
            try:
                os.remove(chunk_path)
                print(f"🗑️ Cleaned up failed chunk: {chunk_path}")
            except Exception as cleanup_error:
                print(f"⚠️ Could not clean up failed chunk: {cleanup_error}")
        
        error_msg = f"Chunk {int(chunk_number) + 1} upload failed: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/shuspot-ingestion/process-chunked-upload")
async def process_chunked_upload(request: Request):
    """Reassemble chunks uploaded to Supabase and process the complete ZIP file"""
    import threading
    import time
    import tempfile
    import os

    try:
        payload = await request.json()
        upload_id = payload.get('upload_id')
        chunks = payload.get('chunks', [])
        original_filename = payload.get('original_filename')
        total_size = payload.get('total_size', 0)

        if not upload_id or not chunks or not original_filename:
            raise HTTPException(status_code=400, detail="Missing required parameters")

        job_id = f"chunked-{upload_id}"
        print(f"🔧 Job {job_id}: Starting chunk reassembly for {original_filename}")
        print(f"📊 Job {job_id}: {len(chunks)} chunks, total size: {total_size} bytes")

        # Start background reassembly and processing
        import asyncio

        async def delayed_start():
            await asyncio.sleep(0.1)
            try:
                thread = threading.Thread(
                    target=_reassemble_and_process_chunks,
                    args=(job_id, chunks, original_filename, upload_id),
                    daemon=True
                )
                thread.start()
                print(f"✅ Background chunk processing started for job {job_id}")
            except Exception as e:
                print(f"❌ Failed to start chunk processing: {e}")

        asyncio.create_task(delayed_start())

        return {
            "message": "Chunked upload reassembly started in background.",
            "job_id": job_id,
            "status": "reassembling",
            "chunks_received": len(chunks),
            "estimated_time": "3-7 minutes"
        }

    except Exception as e:
        print(f"❌ Chunked upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Chunked upload processing failed: {str(e)}")

def _reassemble_and_process_chunks(job_id: str, chunks: list, original_filename: str, upload_id: str = None):
    """Background function to reassemble chunks and process the complete ZIP"""
    temp_file_path = None
    chunks_dir = None
    
    try:
        print(f"🔧 Job {job_id}: Starting chunk reassembly...")
        
        # Create temporary file for reassembled ZIP
        import tempfile
        import os
        
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, f"{job_id}.zip")
        
        # Extract upload_id from job_id if not provided
        if not upload_id and job_id.startswith('chunked-'):
            upload_id = job_id.replace('chunked-', '')
        
        # Local chunks directory
        chunks_dir = os.path.join(temp_dir, f"chunks_{upload_id}")
        
        print(f"📦 Job {job_id}: Reassembling {len(chunks)} chunks from {chunks_dir}...")
        
        # Reassemble chunks into single file from local storage
        with open(temp_file_path, 'wb') as output_file:
            # Sort chunks by chunk number (chunk_0000, chunk_0001, etc.)
            sorted_chunks = sorted(chunks, key=lambda x: int(x.split('_')[1]) if '_' in x else 0)
            
            for i, chunk_name in enumerate(sorted_chunks):
                try:
                    chunk_path = os.path.join(chunks_dir, chunk_name)
                    print(f"📖 Job {job_id}: Reading chunk {i + 1}/{len(chunks)} from {chunk_path}")
                    
                    if not os.path.exists(chunk_path):
                        print(f"❌ Job {job_id}: Chunk file not found: {chunk_path}")
                        return
                    
                    # Read chunk from local storage
                    with open(chunk_path, 'rb') as chunk_file:
                        chunk_data = chunk_file.read()
                        output_file.write(chunk_data)
                        print(f"✅ Job {job_id}: Wrote chunk {i + 1} ({len(chunk_data)} bytes)")
                        
                except Exception as e:
                    print(f"❌ Job {job_id}: Error reading chunk {chunk_name}: {e}")
                    return
        
        print(f"✅ Job {job_id}: Reassembly complete, file size: {os.path.getsize(temp_file_path)} bytes")
        
        # Clean up local chunks
        print(f"🗑️ Job {job_id}: Cleaning up temporary chunks...")
        try:
            import shutil
            if chunks_dir and os.path.exists(chunks_dir):
                shutil.rmtree(chunks_dir)
                print(f"✅ Job {job_id}: Chunks directory cleaned up")
        except Exception as e:
            print(f"⚠️ Job {job_id}: Could not clean up chunks directory: {e}")
        
        # Process the reassembled ZIP file
        print(f"⚡ Job {job_id}: Starting ZIP processing...")
        _do_zip_upload_background_from_file(job_id, temp_file_path, original_filename)
        
    except Exception as e:
        print(f"💥 Job {job_id}: Critical error during chunk reassembly: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                print(f"🗑️ Job {job_id}: Temp ZIP file cleaned up")
            except Exception as e:
                print(f"⚠️ Job {job_id}: Could not clean up temp file: {e}")
        
        # Clean up temp file on error
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass

# ========================= TXT Ingestion Endpoints =========================

@router.post("/txt-ingestion/execute-script")
async def execute_txt_script(
    script: str = Form(...),
    preview_mode: bool = Form(True),
    upload_to_database: bool = Form(False),
    root_directory: str = Form("")
):
    """Execute custom Python script for TXT file ingestion with preview"""
    try:
        import sys
        import io
        import json
        import re
        import glob
        from contextlib import redirect_stdout, redirect_stderr
        import traceback
        import os
        
        # Use provided root directory or default tmp directory
        script_root = root_directory if root_directory else TMP_DIR
        
        # Load existing database (if present) so scripts can modify current records
        # Normalize to a list[dict] regardless of storage shape {"books": [...]} vs [...]
        existing_books = []
        try:
            if os.path.exists(DB_PATH):
                with open(DB_PATH, 'r', encoding='utf-8') as f:
                    raw_db = json.load(f)
                if isinstance(raw_db, dict):
                    existing_books = raw_db.get('books', []) or []
                elif isinstance(raw_db, list):
                    existing_books = raw_db
                else:
                    existing_books = []
        except Exception as e:
            print(f"⚠️ Could not read existing DB: {e}")

        # Available variables for the script
        script_globals = {
            'root_directory': script_root,
            'os': __import__('os'),
            'json': json,
            're': re,
            'glob': glob,
            'pathlib': __import__('pathlib'),
            'results': [],  # To collect results
            'preview_data': [],  # To collect preview data
            'existing_books': existing_books,  # Current DB snapshot for update scripts
            'db_path': DB_PATH,  # Path to local DB (read/write if needed)
        }
        
        # Capture stdout and stderr
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        
        execution_result = {
            "success": False,
            "output": "",
            "error": "",
            "preview_data": [],
            "processed_count": 0,
            "database_uploaded": False
        }
        
        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                # Execute the script
                exec(script, script_globals)
                
                # Get results from script
                preview_data = script_globals.get('preview_data', [])
                results = script_globals.get('results', [])

                # If running an update-only script that modifies existing_books in-place,
                # allow using it as the result set when importing.
                if (not preview_mode and upload_to_database) and (not results or len(results) == 0):
                    existing_books_after = script_globals.get('existing_books', [])
                    if isinstance(existing_books_after, list) and len(existing_books_after) > 0:
                        results = existing_books_after
                        print("ℹ️ No explicit 'results' from script; using 'existing_books' as results for import.")
                
                # For preview, prefer preview_data; if empty but results exist, mirror results into preview
                if preview_mode:
                    if (not preview_data or len(preview_data) == 0) and results and len(results) > 0:
                        preview_data = results
                    processed_count = len(preview_data)
                else:
                    processed_count = len(results)
                execution_result.update({
                    "success": True,
                    "output": stdout_capture.getvalue(),
                    "preview_data": preview_data,
                    "processed_count": processed_count
                })
                
                print(f"📋 Script execution completed: {len(results)} items processed")
                
                # If not in preview mode and we have results, save to JSON database
                if not preview_mode and results and upload_to_database:
                    try:
                        # Load existing books or create new list, normalized to list
                        if os.path.exists(DB_PATH):
                            with open(DB_PATH, 'r', encoding='utf-8') as f:
                                raw_db2 = json.load(f)
                            if isinstance(raw_db2, dict):
                                existing_books = raw_db2.get('books', []) or []
                            elif isinstance(raw_db2, list):
                                existing_books = raw_db2
                            else:
                                existing_books = []
                        else:
                            existing_books = []
                        
                        # Add new books to the list
                        books_added = 0
                        books_updated = 0
                        
                        for book_data in results:
                            # Check if book already exists (by title and author)
                            title = book_data.get('title', 'Unknown')
                            author = book_data.get('author', 'Unknown')
                            
                            existing_book = None
                            for i, existing in enumerate(existing_books):
                                if (existing.get('title', '').lower() == title.lower() and 
                                    existing.get('author', '').lower() == author.lower()):
                                    existing_book = existing
                                    existing_books[i] = book_data  # Update existing
                                    books_updated += 1
                                    break
                            
                            if not existing_book:
                                existing_books.append(book_data)
                                books_added += 1
                        
                        # Save updated books list
                        # Persist back using the same shape as our broader API: {"books": [...]} for compatibility
                        with open(DB_PATH, 'w', encoding='utf-8') as f:
                            json.dump({"books": existing_books}, f, indent=2, ensure_ascii=False)
                        
                        execution_result["database_uploaded"] = True
                        execution_result["books_added"] = books_added
                        execution_result["books_updated"] = books_updated
                        
                        print(f"💾 Database updated: {books_added} added, {books_updated} updated")
                        
                    except Exception as e:
                        execution_result["error"] += f"Database update error: {str(e)}\n"
                        print(f"❌ Database update failed: {e}")
                
        except Exception as e:
            execution_result.update({
                "success": False,
                "error": f"Script execution error: {str(e)}\n{traceback.format_exc()}",
                "output": stdout_capture.getvalue()
            })
        
        # Always include any stderr output
        stderr_output = stderr_capture.getvalue()
        if stderr_output:
            execution_result["error"] += f"Warnings: {stderr_output}"
            
        return execution_result
        
    except Exception as e:
        print(f"❌ TXT ingestion error: {e}")
        return {
            "success": False,
            "error": f"General error: {str(e)}",
            "output": "",
            "preview_data": [],
            "processed_count": 0
        }

@router.get("/txt-ingestion/sample-scripts")
async def get_sample_scripts():
    """Get sample ChatGPT instruction scripts for TXT ingestion"""
    return {
        "basic_folder_parser": {
            "name": "Basic Folder Parser",
            "description": "Parse folders with PDF + metadata.txt files",
            "script": """# Basic folder parser following ChatGPT instruction template
import os
import json

print("🔥 Starting basic folder parser...")

# Initialize results storage
results = []
preview_data = []

def parse_metadata_file(metadata_path):
    \"\"\"Parse a metadata.txt file\"\"\"
    metadata = {}
    try:
        with open(metadata_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Parse key-value pairs
        for line in content.split('\\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                metadata[key.strip().lower()] = value.strip()
                
    except Exception as e:
        print(f"Error parsing {metadata_path}: {e}")
    
    return metadata

# Scan root directory for folders with metadata.txt
for item in os.listdir(root_directory):
    folder_path = os.path.join(root_directory, item)
    
    if os.path.isdir(folder_path):
        metadata_path = os.path.join(folder_path, 'metadata.txt')
        pdf_files = [f for f in os.listdir(folder_path) if f.endswith('.pdf')]
        
        if os.path.exists(metadata_path) and pdf_files:
            print(f"Processing folder: {item}")
            
            metadata = parse_metadata_file(metadata_path)
            pdf_file = pdf_files[0]  # Use first PDF found
            
            book_data = {
                "title": metadata.get('title', item),
                "author": metadata.get('author', 'Unknown'),
                "genre": metadata.get('genre', metadata.get('subject', 'Unknown')),
                "reading_level": metadata.get('reading_level', metadata.get('grade', '')),
                "file_name": pdf_file,
                "file_path": os.path.join(folder_path, pdf_file),
                "description": metadata.get('description', ''),
                "series": metadata.get('series', ''),
                "isbn": metadata.get('isbn', ''),
                "publisher": metadata.get('publisher', ''),
                "book_type": "Books",
                "fiction_type": "Fiction"
            }
            
            results.append(book_data)
            preview_data.append(book_data)

print(f"✅ Processed {len(results)} books")
"""
        },
        "shuspot_structure_parser": {
            "name": "ShuSpot Structure Parser", 
            "description": "Parse ShuSpot folder structure with crop images",
            "script": """# ShuSpot structure parser
import os
import json
import re

print("🔥 Starting ShuSpot structure parser...")

results = []
preview_data = []

# Scan for ShuSpot folder structure
for item in os.listdir(root_directory):
    folder_path = os.path.join(root_directory, item)
    
    if os.path.isdir(folder_path):
        print(f"Scanning folder: {item}")
        
        # Look for crop images
        resized_folder = os.path.join(folder_path, 'resized')
        crop_files = []
        
        if os.path.exists(resized_folder):
            crop_files = [f for f in os.listdir(resized_folder) 
                         if f.startswith('crop-') and f.endswith(('.png', '.jpg', '.jpeg'))]
            crop_files.sort()
        
        if crop_files:
            # Extract metadata from folder name and structure
            title = item.replace('_', ' ').replace('-', ' ').title()
            
            book_data = {
                "title": title,
                "author": "Unknown", 
                "genre": "Educational",
                "reading_level": "",
                "file_name": folder_path,
                "file_path": folder_path,
                "description": f"Interactive book with {len(crop_files)} pages",
                "book_type": "Books",
                "fiction_type": "Non-Fiction",
                "crop_count": len(crop_files)
            }
            
            results.append(book_data)
            preview_data.append(book_data)

print(f"✅ Found {len(results)} ShuSpot books")
"""
        }
    }

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
