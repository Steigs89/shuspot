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
async def ingest_manifest(
    request: Request,
    safe: bool = Query(True),
    dry_run: bool = Query(False),
    upsert: bool = Query(True),
):
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

    print("🚀 Upload ZIP endpoint called - START")
    print(f"📦 ZIP file: {zip_file.filename}, size: {getattr(zip_file, 'size', 'unknown')}")

    # Quick validation before processing
    if not zip_file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not zip_file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP file")

    # CRITICAL: Return response IMMEDIATELY before ANY file processing
    # Don't even read the file or start threads yet
    job_id = f"upload-{int(time.time())}-{hash(zip_file.filename) % 10000}"

    print(f"📋 Generated job ID: {job_id}")
    print("⚡ Returning response immediately - no processing yet")

    # Start background processing AFTER response is sent
    # Use a timer to delay the start slightly to ensure response is sent
    import asyncio

    async def delayed_start():
        await asyncio.sleep(0.1)  # Small delay to ensure response is sent
        try:
            thread = threading.Thread(target=_do_zip_upload_background, args=(job_id, zip_file), daemon=True)
            thread.start()
            print(f"✅ Background thread started for job {job_id}")
        except Exception as e:
            print(f"❌ Failed to start background thread: {e}")

    # Start the delayed background task
    asyncio.create_task(delayed_start())

    # Return response IMMEDIATELY
    return {
        "message": "Upload started in background. Check Render logs for completion.",
        "job_id": job_id,
        "status": "processing",
        "estimated_time": "2-5 minutes"
    }

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
