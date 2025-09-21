from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import asyncio
from datetime import datetime
from io import BytesIO
import logging
import json
import tempfile
import zipfile
import uuid
from pathlib import Path

# Optional heavy dependencies
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None

from database import get_db, Book, UPLOAD_DIR
from parsers import MetadataParser
from google_sheets import GoogleSheetsManager
from txt_ingestion import TxtIngestionPipeline, TxtMetadataParser
from custom_parsers import get_custom_parsers, parse_with_custom_parsers, add_custom_parser, create_regex_parser

app = FastAPI(title="Book Admin API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for ShuSpot images - support multiple image folders
SHUSPOT_FOLDERS = [
    "../uploads/CROP-ShuSpot"
]

# Create a custom static files handler that handles multiple folders and spaces in filenames
class CustomStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            # First try with URL-decoded path (handle spaces and special characters)
            from urllib.parse import unquote
            decoded_path = unquote(path)
            print(f"[StaticFiles] Requested path: {path}")
            print(f"[StaticFiles] Decoded path: {decoded_path}")
            print(f"[StaticFiles] Full directory: {self.directory}")
            
            # Replace backslashes with forward slashes for consistency
            decoded_path = decoded_path.replace('\\', '/')
            
            # Clean up double slashes
            while '//' in decoded_path:
                decoded_path = decoded_path.replace('//', '/')
            
            # Remove any leading slash
            if decoded_path.startswith('/'):
                decoded_path = decoded_path[1:]
            
            # Build the full path using os.path.join for platform-specific path handling
            full_path = os.path.join(str(self.directory), decoded_path)
            print(f"[StaticFiles] Full file path: {full_path}")
            print(f"[StaticFiles] File exists: {os.path.exists(full_path)}")
            
            if not os.path.exists(full_path):
                print(f"[StaticFiles] Looking for file in folder: {os.listdir(os.path.dirname(full_path))}")
                
            response = await super().get_response(decoded_path, scope)
            print(f"[StaticFiles] Response status: {response.status_code}")
            return response
        except Exception as e:
            print(f"[StaticFiles] Error serving {path}: {str(e)}")
            raise

# Mount each folder that exists
for folder in SHUSPOT_FOLDERS:
    # Ensure folder exists so we can mount now; files may arrive later
    try:
        os.makedirs(folder, exist_ok=True)
    except Exception:
        pass
    print(f"Checking ShuSpot folder: {folder}")
    folder_name = os.path.basename(folder)
    # Mount directly at the folder name since proxy strips /shuspot-images prefix
    app.mount(f"/{folder_name}", CustomStaticFiles(directory=folder), name=f"shuspot-{folder_name}")
    print(f"Static files mounted successfully for {folder} at /{folder_name}")

# Global Google Sheets manager (will be initialized when credentials are provided)
sheets_manager = None
txt_pipeline = None

# Setup logging
logging.basicConfig(level=logging.INFO)

@app.get("/")
async def root():
    return {"message": "Book Admin API is running"}

# Temporary workspace for TXT script ZIP uploads
TXTRUN_ROOT = os.path.join(tempfile.gettempdir(), "txtrun")
os.makedirs(TXTRUN_ROOT, exist_ok=True)

# Chunked upload workspace
CHUNK_ROOT = os.path.join(TXTRUN_ROOT, "chunks")
os.makedirs(CHUNK_ROOT, exist_ok=True)

@app.get("/test-static")
async def test_static():
    """Test static file serving"""
    shuspot_folder = "../uploads/CROP-ShuSpot"
    exists = os.path.exists(shuspot_folder)
    
    # List some files if folder exists
    files = []
    if exists:
        try:
            for root, dirs, filenames in os.walk(shuspot_folder):
                for filename in filenames[:5]:  # First 5 files
                    rel_path = os.path.relpath(os.path.join(root, filename), shuspot_folder)
                    files.append(rel_path)
                if len(files) >= 5:
                    break
        except Exception as e:
            files = [f"Error: {str(e)}"]
    
    return {
        "shuspot_folder": shuspot_folder,
        "exists": exists,
        "sample_files": files
    }

@app.post("/upload-books")
async def upload_books(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Upload multiple books and parse their metadata"""
    
    if len(files) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 files allowed")
    
    results = []
    errors = []
    
    for file in files:
        try:
            # Validate file type
            allowed_extensions = {'.pdf', '.docx', '.doc', '.epub', '.txt', '.rtf', '.mp3', '.m4a', '.wav', '.mp4', '.mov', '.avi', '.mkv', '.webm'}
            file_ext = os.path.splitext(file.filename)[1].lower()
            
            if file_ext not in allowed_extensions:
                errors.append(f"Skipped {file.filename}: Unsupported file type")
                continue
            
            # Create unique filename to avoid conflicts
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = f"{timestamp}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, safe_filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Get file size
            file_size = os.path.getsize(file_path)
            
            # Parse metadata (pass folder info if available)
            folder_path = os.path.dirname(file_path) if hasattr(file, 'folder_path') else None
            metadata = MetadataParser.parse_file_metadata(file_path, file.filename, folder_path)
            
            # Check if book already exists (by filename)
            existing_book = db.query(Book).filter(Book.file_name == file.filename).first()
            if existing_book:
                errors.append(f"Skipped {file.filename}: Already exists")
                os.remove(file_path)  # Remove duplicate file
                continue
            
            # Create database entry
            book = Book(
                title=metadata["title"],
                author=metadata["author"],
                genre=metadata["genre"],
                book_type=metadata["book_type"],
                fiction_type=metadata.get("fiction_type", "Fiction"),
                reading_level=metadata["reading_level"],
                cover_image_url=metadata["cover_image_url"],
                file_path=file_path,
                file_name=file.filename,
                file_size=file_size,
                file_type=metadata["file_type"],
                notes=metadata.get("subject")
            )
            
            db.add(book)
            db.commit()
            db.refresh(book)
            
            results.append(book.to_dict())
            
        except Exception as e:
            errors.append(f"Error processing {file.filename}: {str(e)}")
            # Clean up file if it was created
            if 'file_path' in locals() and os.path.exists(file_path):
                os.remove(file_path)
    
    return {
        "message": f"Processed {len(files)} files",
        "uploaded": len(results),
        "errors": len(errors),
        "results": results,
        "error_details": errors
    }

@app.get("/books")
async def get_books(
    skip: int = 0,
    limit: int = 1000,
    search: Optional[str] = None,
    genre: Optional[str] = None,
    author: Optional[str] = None,
    book_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all books with optional filtering"""
    
    query = db.query(Book)
    
    # Apply filters
    if search:
        query = query.filter(
            Book.title.contains(search) | 
            Book.author.contains(search)
        )
    
    if genre and genre != "All":
        query = query.filter(Book.genre == genre)
    
    if author and author != "All":
        query = query.filter(Book.author == author)
    
    if book_type and book_type != "All":
        query = query.filter(Book.book_type == book_type)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    books = query.offset(skip).limit(limit).all()
    
    return {
        "books": [book.to_dict() for book in books],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@app.post("/books/{book_id}/update")
async def update_book(
    book_id: int,
    title: str = Form(...),
    author: str = Form(...),
    genre: str = Form(...),
    book_type: str = Form(...),
    fiction_type: str = Form(...),
    reading_level: str = Form(...),
    cover_image_url: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Update a single book's metadata"""
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    book.title = title
    book.author = author
    book.genre = genre
    book.book_type = book_type
    book.fiction_type = fiction_type
    book.reading_level = reading_level
    book.cover_image_url = cover_image_url
    if notes is not None:
        book.notes = notes

    # Persist changes
    db.commit()
    db.refresh(book)

    return {"message": "Book updated successfully", "book": book.to_dict()}

@app.post("/books/import-json")
async def import_books_json(
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Import books from a JSON payload. Accepts either {"books": [...]} or a list in the root."""
    try:
        # Support both array or object with books key
        if isinstance(payload, list):
            books_in = payload
        else:
            books_in = payload.get("books", [])

        if not isinstance(books_in, list) or not books_in:
            raise HTTPException(status_code=400, detail="No books provided")

        imported = 0
        skipped = 0
        errors = []

        for item in books_in:
            try:
                title = item.get("title") or item.get("Name") or "Untitled"
                author = item.get("author") or item.get("Author") or "Unknown"

                # Skip duplicates by title+author
                existing = db.query(Book).filter(Book.title == title, Book.author == author).first()
                if existing:
                    skipped += 1
                    continue

                book = Book(
                    title=title,
                    author=author,
                    genre=item.get("genre") or item.get("Category") or "Unknown",
                    book_type=item.get("book_type") or item.get("Media") or "Books",
                    fiction_type=item.get("fiction_type") or item.get("Fiction Type") or "Fiction",
                    reading_level=item.get("reading_level") or item.get("Age") or "Unknown",
                    cover_image_url=item.get("cover_image_url") or item.get("_cover_image_path"),
                    file_path=item.get("file_path") or item.get("URL"),
                    file_name=item.get("file_name") or f"{title}.json",
                    file_size=item.get("file_size") or 0,
                    file_type=item.get("file_type") or "JSON",
                    description=item.get("description") or item.get("Notes", ""),
                    notes=item.get("notes") if isinstance(item.get("notes"), str) else None
                )

                db.add(book)
                imported += 1
            except Exception as e:
                errors.append(f"Error importing {item.get('title', 'Unknown')}: {str(e)}")

        db.commit()

        return {
            "message": f"Imported {imported} books ({skipped} skipped)",
            "imported": imported,
            "skipped": skipped,
            "errors": errors
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@app.post("/books/import-csv")
async def import_books_csv(
    file: UploadFile = File(...),
    delimiter: str = Form(","),
    db: Session = Depends(get_db)
):
    """Import books from a CSV file. Accepts common headers from our export or sheet format."""
    try:
        raw = await file.read()
        try:
            text = raw.decode("utf-8")
        except Exception:
            text = raw.decode("latin-1")

        rows = []
        # Prefer pandas if available
        if PANDAS_AVAILABLE:
            try:
                import pandas as pd  # type: ignore
                df = pd.read_csv(BytesIO(raw), sep=delimiter)
                rows = df.to_dict(orient="records")
            except Exception:
                rows = []
        if not rows:
            import csv, io
            reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
            rows = list(reader)

        if not rows:
            raise HTTPException(status_code=400, detail="CSV file contained no rows")

        imported = 0
        skipped = 0
        errors = []

        for item in rows:
            try:
                title = (item.get("title") or item.get("Title") or "").strip() or "Untitled"
                author = (item.get("author") or item.get("Author") or "").strip() or "Unknown"

                # Skip duplicates by title+author
                existing = db.query(Book).filter(Book.title == title, Book.author == author).first()
                if existing:
                    skipped += 1
                    continue

                book = Book(
                    title=title,
                    author=author,
                    genre=(item.get("genre") or item.get("Category") or item.get("Genre") or "Unknown").strip(),
                    book_type=(item.get("book_type") or item.get("Media") or "Books").strip(),
                    fiction_type=(item.get("fiction_type") or item.get("Fiction Type") or "Fiction").strip(),
                    reading_level=(item.get("reading_level") or item.get("Age") or item.get("Reading Level") or "Unknown").strip(),
                    cover_image_url=item.get("cover_image_url") or item.get("_cover_image_path") or item.get("Cover") or None,
                    file_path=item.get("file_path") or item.get("URL") or None,
                    file_name=item.get("file_name") or item.get("File Name") or f"{title}.csv",
                    file_size=int(item.get("file_size") or 0),
                    file_type=item.get("file_type") or item.get("File Type") or "CSV",
                    description=item.get("description") or item.get("Notes", ""),
                )

                db.add(book)
                imported += 1
            except Exception as e:
                errors.append(f"Error importing {item.get('title', item.get('Title', 'Unknown'))}: {str(e)}")

        db.commit()
        return {
            "message": f"Imported {imported} books ({skipped} skipped)",
            "imported": imported,
            "skipped": skipped,
            "errors": errors,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@app.post("/books/replace-json")
async def replace_books_json(
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Wipe all books and import from JSON in a single operation."""
    # Delete all existing rows
    db.query(Book).delete()
    db.commit()
    # Reuse import logic
    return await import_books_json(payload=payload, db=db)  # type: ignore

@app.post("/books/replace-csv")
async def replace_books_csv(
    file: UploadFile = File(...),
    delimiter: str = Form(","),
    db: Session = Depends(get_db)
):
    """Wipe all books and import from CSV in a single operation."""
    db.query(Book).delete()
    db.commit()
    return await import_books_csv(file=file, delimiter=delimiter, db=db)  # type: ignore

@app.put("/books/bulk-update")
async def bulk_update_books(
    book_ids: List[int] = Form(...),
    field: str = Form(...),
    value: str = Form(...),
    db: Session = Depends(get_db)
):
    """Bulk update multiple books"""
    
    if field not in ["title", "author", "genre", "book_type", "fiction_type", "reading_level", "cover_image_url", "notes"]:
        raise HTTPException(status_code=400, detail="Invalid field")
    
    books = db.query(Book).filter(Book.id.in_(book_ids)).all()
    
    if not books:
        raise HTTPException(status_code=404, detail="No books found")
    
    updated_count = 0
    for book in books:
        setattr(book, field, value)
        updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Updated {updated_count} books",
        "updated_books": [book.to_dict() for book in books]
    }

@app.delete("/books/{book_id}")
async def delete_book(book_id: int, db: Session = Depends(get_db)):
    """Delete a book and its file"""
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Delete file if it exists
    if os.path.exists(book.file_path):
        os.remove(book.file_path)
    
    db.delete(book)
    db.commit()
    
    return {"message": "Book deleted successfully"}

@app.delete("/books/clear/all")
async def clear_database(db: Session = Depends(get_db)):
    """Clear all books from the database"""
    try:
        # Get all books
        books = db.query(Book).all()
        
        # Only delete uploaded files, not ShuSpot source files
        deleted_files = 0
        for book in books:
            if book.file_path and os.path.exists(book.file_path):
                # Only delete files in UPLOAD_DIR (uploaded files), not ShuSpot source materials
                if UPLOAD_DIR in book.file_path:
                    try:
                        os.remove(book.file_path)
                        deleted_files += 1
                    except Exception as e:
                        print(f"Warning: Could not delete file {book.file_path}: {str(e)}")
        
        # Delete all records from database
        db.query(Book).delete()
        db.commit()
        
        return {
            "message": f"Successfully cleared {len(books)} books from database",
            "deleted_files": deleted_files,
            "total_books": len(books)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear database: {str(e)}")

@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get database statistics"""
    
    total_books = db.query(Book).count()
    genres = db.query(Book.genre).distinct().all()
    authors = db.query(Book.author).distinct().all()
    
    return {
        "total_books": total_books,
        "unique_genres": len(genres),
        "unique_authors": len(authors),
        "genres": [g[0] for g in genres],
        "authors": [a[0] for a in authors]
    }

@app.get("/export/csv")
async def export_csv(db: Session = Depends(get_db)):
    """Export all books to CSV"""
    
    if not PANDAS_AVAILABLE:
        raise HTTPException(status_code=501, detail="CSV export not available - pandas not installed")
    
    books = db.query(Book).all()
    
    # Convert to DataFrame
    data = []
    for book in books:
        data.append({
            "ID": book.id,
            "Title": book.title,
            "Author": book.author,
            "Genre": book.genre,
            "File Name": book.file_name,
            "Uploaded At": book.uploaded_at
        })
    
    df = pd.DataFrame(data)
    
    # Create CSV in memory
    csv_buffer = BytesIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    return JSONResponse(
        content={"csv_data": csv_buffer.getvalue().decode()},
        headers={"Content-Disposition": "attachment; filename=books_export.csv"}
    )

# Google Sheets Integration Endpoints

@app.post("/google-sheets/setup")
async def setup_google_sheets(
    credentials_file: UploadFile = File(...),
    spreadsheet_name: str = Form("ShuSpot Books Master"),
    worksheet_name: str = Form(None)
):
    """Setup Google Sheets integration with service account credentials"""
    global sheets_manager, txt_pipeline
    
    try:
        # Save credentials file
        credentials_path = "google_credentials.json"
        with open(credentials_path, "wb") as buffer:
            shutil.copyfileobj(credentials_file.file, buffer)
        
        # Initialize Google Sheets manager
        sheets_manager = GoogleSheetsManager(credentials_path, spreadsheet_name, worksheet_name)
        
        if sheets_manager.connect():
            txt_pipeline = TxtIngestionPipeline(sheets_manager)
            return {
                "message": "Google Sheets connected successfully", 
                "spreadsheet": spreadsheet_name,
                "worksheet": worksheet_name or "First sheet"
            }
        else:
            return {"error": "Failed to connect to Google Sheets"}
            
    except Exception as e:
        return {"error": f"Setup failed: {str(e)}"}

@app.get("/google-sheets/status")
async def google_sheets_status():
    """Check Google Sheets connection status"""
    global sheets_manager
    
    if sheets_manager is None:
        return {"connected": False, "message": "Google Sheets not configured"}
    
    try:
        # Test connection by getting sheet info
        books = sheets_manager.get_all_books()
        return {
            "connected": True, 
            "spreadsheet": sheets_manager.spreadsheet_name,
            "total_books": len(books)
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}

@app.get("/google-sheets/books")
async def get_google_sheets_books(
    limit: int = 100,
    offset: int = 0
):
    """Get books from Google Sheets"""
    global sheets_manager
    
    if not sheets_manager:
        raise HTTPException(status_code=400, detail="Google Sheets not configured")
    
    try:
        all_books = sheets_manager.get_all_books()
        
        # Apply pagination
        paginated_books = all_books[offset:offset + limit]
        
        return {
            "books": paginated_books,
            "total": len(all_books),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching books: {str(e)}")

@app.post("/google-sheets/sync-from-db")
async def sync_db_to_sheets(db: Session = Depends(get_db)):
    """Sync local database books to Google Sheets"""
    global sheets_manager
    
    if not sheets_manager:
        raise HTTPException(status_code=400, detail="Google Sheets not configured")
    
    try:
        # Get all books from local DB
        books = db.query(Book).all()
        
        if not books:
            return {
                "message": "No books found in local database",
                "results": {"success": 0, "errors": 0, "duplicates": 0}
            }
        
        # Convert to ShuSpot Google Sheets format
        sheets_data = []
        for book in books:
            # Determine media type based on file extension and book_type
            media_type = 'Book'  # Default
            if book.file_type:
                file_ext = book.file_type.upper()
                if file_ext in ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM']:
                    media_type = 'Video'
                elif file_ext in ['MP3', 'M4A', 'WAV', 'AAC']:
                    media_type = 'Audio'
                elif file_ext == 'PDF':
                    media_type = 'PDF'
                elif book.book_type == 'Audiobooks':
                    media_type = 'Audio'
                elif book.book_type == 'Video Books':
                    media_type = 'Video'
            
            # Convert reading level to age range
            age_range = ''
            if book.reading_level and book.reading_level != 'Unknown':
                reading_level = book.reading_level.lower()
                if 'pre-k' in reading_level or 'kindergarten' in reading_level or 'grade 1' in reading_level or 'grade 2' in reading_level:
                    age_range = '4-7'
                elif 'grade 3' in reading_level or 'grade 4' in reading_level or 'grade 5' in reading_level:
                    age_range = '8-10'
                elif 'grade 6' in reading_level or 'grade 7' in reading_level or 'grade 8' in reading_level:
                    age_range = '11-13'
                elif 'grade 9' in reading_level or 'high school' in reading_level:
                    age_range = '14-18'
            
            # Create the data row for Google Sheets
            book_data = {
                'Name': book.title or '',
                'Category': book.genre if book.genre != 'Unknown' else '',
                'Media': media_type,
                'URL': book.file_path or '',
                'Author': book.author or '',
                'Age': age_range,
                'Read time': '',  # Not available in local DB
                'AR Level': '',   # Not available in local DB
                'Lexile': '',     # Not available in local DB
                'GRL': '',        # Not available in local DB
                'Pages': '',      # Not available in local DB
                'Audiobook Length': '',  # Not available in local DB
                'Video Length': '',      # Not available in local DB
                'Status': 'Active',
                'Notes': book.notes or ''
            }
            
            sheets_data.append(book_data)
        
        print(f"Prepared {len(sheets_data)} books for sync to Google Sheets")
        
        # Bulk upload to sheets
        results = sheets_manager.bulk_add_books(sheets_data)
        
        return {
            "message": f"Database synced to Google Sheets: {results['success']} added, {results['duplicates']} duplicates, {results['errors']} errors",
            "results": results,
            "total_processed": len(sheets_data)
        }
        
    except Exception as e:
        print(f"Sync error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@app.post("/google-sheets/sync-to-db")
async def sync_sheets_to_db(db: Session = Depends(get_db)):
    """Fetch all rows from Google Sheets and upsert into local DB by (title+author)."""
    global sheets_manager
    if not sheets_manager:
        raise HTTPException(status_code=400, detail="Google Sheets not configured")

    try:
        rows = sheets_manager.get_all_books() or []
        if not rows:
            return {"message": "No rows found in Google Sheets", "imported": 0, "updated": 0}

        imported = 0
        updated = 0
        for r in rows:
            title = r.get('Name') or r.get('Title') or 'Untitled'
            author = r.get('Author') or 'Unknown'

            book = db.query(Book).filter(Book.title == title, Book.author == author).first()
            if not book:
                book = Book(title=title, author=author)
                db.add(book)
                imported += 1

            # Map fields
            book.genre = r.get('Category') or book.genre
            book.book_type = r.get('Media') or book.book_type
            book.fiction_type = r.get('Fiction Type') or book.fiction_type
            book.reading_level = r.get('Age') or book.reading_level
            # Preserve notes/description if present in sheet
            desc = r.get('Notes') or ''
            if desc:
                book.description = desc
            url = r.get('URL') or ''
            if url:
                book.file_path = url
                book.file_name = url.split('/')[-1]
            updated += 1

        db.commit()
        return {"message": f"Sheets synced to DB: {imported} imported, {updated} updated", "imported": imported, "updated": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync to DB failed: {str(e)}")

@app.put("/google-sheets/books/{book_id}")
async def update_google_sheets_book(
    book_id: int,
    updates: dict
):
    """Update a book in Google Sheets"""
    global sheets_manager
    
    if not sheets_manager:
        raise HTTPException(status_code=400, detail="Google Sheets not configured")
    
    try:
        success = sheets_manager.update_book(book_id, updates)
        
        if success:
            return {"message": "Book updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Book not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@app.get("/google-sheets/duplicates")
async def find_duplicates():
    """Find duplicate books in Google Sheets"""
    global sheets_manager
    
    if not sheets_manager:
        raise HTTPException(status_code=400, detail="Google Sheets not configured")
    
    try:
        duplicates = sheets_manager.get_duplicates()
        return {"duplicates": duplicates, "count": len(duplicates)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding duplicates: {str(e)}")

# TXT File Ingestion Endpoints

@app.post("/txt-ingestion/parse-folder")
async def parse_txt_folder(
    folder_path: str = Form(...)
):
    """Parse TXT files from a single folder"""
    
    try:
        parser = TxtMetadataParser()
        metadata = parser.parse_folder(folder_path)
        
        if metadata:
            # Convert to Google Sheets format
            sheets_data = parser.export_to_google_sheets_format([metadata])
            return {"metadata": metadata, "sheets_format": sheets_data[0] if sheets_data else {}}
        else:
            return {"error": "No metadata found in folder"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

@app.post("/txt-ingestion/batch-parse")
async def batch_parse_txt_folders(
    root_directory: str = Form(...),
    max_folders: int = Form(100)
):
    """Parse TXT files from multiple folders"""
    
    try:
        parser = TxtMetadataParser()
        metadata_list = parser.batch_parse_folders(root_directory, max_folders)
        
        # Convert to Google Sheets format
        sheets_data = parser.export_to_google_sheets_format(metadata_list)
        
        return {
            "total_folders": len(metadata_list),
            "metadata": metadata_list[:10],  # Return first 10 for preview
            "sheets_format": sheets_data[:10]  # Return first 10 for preview
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch parsing failed: {str(e)}")

@app.post("/txt-ingestion/ingest-to-sheets")
async def ingest_txt_to_sheets(
    root_directory: str = Form(...),
    max_folders: int = Form(1000)
):
    """Complete TXT ingestion pipeline to Google Sheets"""
    global txt_pipeline
    
    if not txt_pipeline:
        raise HTTPException(status_code=400, detail="Google Sheets not configured")
    
    try:
        results = txt_pipeline.ingest_from_directory(root_directory, max_folders)
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

# ShuSpot Folder Structure Ingestion Endpoints

@app.post("/shuspot-ingestion/parse-folder")
async def parse_shuspot_folder(
    folder_path: str = Form(...)
):
    """Parse ShuSpot folder structure and extract book metadata"""
    try:
        from shuspot_folder_parser import ShuSpotFolderParser
        
        parser = ShuSpotFolderParser(folder_path)
        books = parser.parse_all_books()
        stats = parser.get_summary_stats()
        
        return {
            "success": True,
            "message": f"Successfully parsed {stats['total_books']} books",
            "stats": stats,
            "sample_books": books[:5],  # Return first 5 books as preview
            "total_books": len(books)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Folder parsing failed: {str(e)}")

@app.post("/shuspot-ingestion/parse-and-upload-to-sheets")
async def parse_and_upload_to_sheets(
    folder_path: str = Form(...)
):
    """Parse ShuSpot folder structure and upload directly to Google Sheets"""
    global sheets_manager
    
    if not sheets_manager:
        raise HTTPException(status_code=400, detail="Google Sheets not configured")
    
    try:
        from shuspot_folder_parser import ShuSpotFolderParser
        
        # Parse the folder structure
        parser = ShuSpotFolderParser(folder_path)
        books = parser.parse_all_books()
        
        if not books:
            return {"message": "No books found in folder structure", "results": {"success": 0, "errors": 0, "duplicates": 0}}
        
        # Convert to Google Sheets format
        sheets_data = parser.export_to_google_sheets_format()
        
        # Upload to Google Sheets
        results = sheets_manager.bulk_add_books(sheets_data)
        stats = parser.get_summary_stats()
        
        return {
            "message": f"Successfully parsed and uploaded {results['success']} books to Google Sheets",
            "parsing_stats": stats,
            "upload_results": results,
            "total_parsed": len(books),
            "sample_books": sheets_data[:3]  # Show first 3 for preview
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse and upload failed: {str(e)}")

@app.post("/shuspot-ingestion/parse-and-import-to-db")
async def parse_and_import_to_db(
    folder_path: str = Form(...),
    db: Session = Depends(get_db)
):
    """Parse ShuSpot folder structure and import to local database"""
    try:
        from shuspot_folder_parser import ShuSpotFolderParser
        
        # Parse the folder structure
        parser = ShuSpotFolderParser(folder_path)
        books = parser.parse_all_books()
        
        if not books:
            return {"message": "No books found in folder structure", "imported_count": 0, "errors": []}
        
        imported_count = 0
        errors = []
        
        for book_data in books:
            try:
                # Check if book already exists
                existing_book = db.query(Book).filter(
                    Book.title == book_data.get('Name', ''),
                    Book.author == book_data.get('Author', '')
                ).first()
                
                if existing_book:
                    continue
                
                # Determine file type based on media type
                file_type_mapping = {
                    'Read to Me': 'AUDIO',
                    'Video Book': 'VIDEO',
                    'Audiobook': 'AUDIO',
                    'Book': 'PDF',
                    'Video': 'VIDEO'
                }
                
                # Create new book entry
                book = Book(
                    title=book_data.get('Name', 'Unknown Title'),
                    author=book_data.get('Author', 'Unknown Author'),
                    genre=book_data.get('Category', 'Unknown'),
                    book_type=book_data.get('Media', 'Book'),
                    fiction_type=book_data.get('Fiction Type', 'Fiction'),
                    reading_level=book_data.get('Age', ''),
                    cover_image_url=book_data.get('_cover_image_path', ''),
                    file_path=book_data.get('_folder_path', ''),
                    file_name=f"{book_data.get('Name', 'unknown')}.shuspot",
                    file_size=0,  # Folder-based books don't have single file size
                    file_type=file_type_mapping.get(book_data.get('Media', 'Book'), 'FOLDER'),
                    description=book_data.get('description', ''),  # Add description field
                    notes=json.dumps({
                        'url': book_data.get('URL', ''),
                        'ar_level': book_data.get('AR Level', ''),
                        'lexile': book_data.get('Lexile', ''),
                        'grl': book_data.get('GRL', ''),
                        'pages': book_data.get('Pages', ''),
                        'read_time': book_data.get('Read time', ''),
                        'audiobook_length': book_data.get('Audiobook Length', ''),
                        'video_length': book_data.get('Video Length', ''),
                        'folder_path': book_data.get('_folder_path', ''),
                        'cover_image_path': book_data.get('_cover_image_path', ''),
                        'files': book_data.get('_files', {}),
                        'description': book_data.get('Notes', ''),
                        # Preserve page sequence data for Launch Book feature
                        'page_sequence': book_data.get('_page_sequence', []),
                        'total_pages': book_data.get('_total_pages', 0)
                    })
                )
                
                db.add(book)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Error importing book {book_data.get('Name', 'Unknown')}: {str(e)}")
        
        db.commit()
        stats = parser.get_summary_stats()
        
        return {
            "message": f"Successfully imported {imported_count} ShuSpot books to local database",
            "imported_count": imported_count,
            "parsing_stats": stats,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse and import failed: {str(e)}")

@app.post("/shuspot-ingestion/upload-zip-and-import")
async def upload_zip_and_import(
    zip_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a ShuSpot ZIP, extract, parse, and import into local DB (fast path)."""
    try:
        # Save ZIP to temp and extract
        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = os.path.join(tmpdir, zip_file.filename)
            content = await zip_file.read()
            with open(zip_path, 'wb') as f:
                f.write(content)
            extract_dir = os.path.join(tmpdir, 'extracted')
            os.makedirs(extract_dir, exist_ok=True)
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(extract_dir)

            # Find top-level folder containing expected structure
            root_candidates = [os.path.join(extract_dir, d) for d in os.listdir(extract_dir)]
            root_candidates = [d for d in root_candidates if os.path.isdir(d)]
            if not root_candidates:
                raise HTTPException(status_code=400, detail="ZIP did not contain a folder")
            folder_path = root_candidates[0]

            # Locate CROP-ShuSpot folder within the extracted content
            crop_src = None
            for root, dirs, files in os.walk(folder_path):
                for d in dirs:
                    if d == 'CROP-ShuSpot':
                        crop_src = os.path.join(root, d)
                        break
                if crop_src:
                    break

            # Determine destination uploads path where backend serves static files
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            dest_root = os.path.abspath(os.path.join(backend_dir, '..', 'uploads', 'CROP-ShuSpot'))
            os.makedirs(dest_root, exist_ok=True)

            # If we found a source CROP-ShuSpot, copy its contents into served uploads path
            if crop_src and os.path.exists(crop_src):
                for src_dir, dirs, files in os.walk(crop_src):
                    rel = os.path.relpath(src_dir, crop_src)
                    target_dir = os.path.join(dest_root, rel)
                    os.makedirs(target_dir, exist_ok=True)
                    for fname in files:
                        src_file = os.path.join(src_dir, fname)
                        dest_file = os.path.join(target_dir, fname)
                        try:
                            shutil.copy2(src_file, dest_file)
                        except Exception as e:
                            logging.warning(f"Failed to copy {src_file} -> {dest_file}: {e}")

            def rewrite_to_served_path(p: str) -> str:
                """Rewrite any extracted absolute path under crop_src to served uploads path dest_root."""
                try:
                    if crop_src and p and isinstance(p, str) and 'CROP-ShuSpot' in p:
                        # Normalize paths
                        src_norm = os.path.normpath(crop_src)
                        if p.startswith(src_norm):
                            relp = os.path.relpath(p, src_norm)
                            return os.path.join(dest_root, relp)
                        # If path contains CROP-ShuSpot later in the string
                        idx = p.rfind('CROP-ShuSpot')
                        if idx != -1:
                            relp = p[idx + len('CROP-ShuSpot') + 1:]
                            return os.path.join(dest_root, relp)
                except Exception:
                    pass
                return p

            # Parse and import
            from shuspot_folder_parser import ShuSpotFolderParser
            parser = ShuSpotFolderParser(folder_path)
            books = parser.parse_all_books()
            if not books:
                return {
                    "message": "No books found in ZIP",
                    "imported": 0,
                    "updated": 0,
                    "zip_root": os.path.basename(zip_file.filename),
                    "selected_folder": folder_path,
                }

            imported_count = 0
            updated_count = 0
            for book_data in books:
                # Upsert by title+author
                title = book_data.get('Name', 'Unknown Title')
                author = book_data.get('Author', 'Unknown Author')

                # Rewrite paths to the backend-served uploads location so frontend URLs work
                if book_data.get('_folder_path'):
                    book_data['_folder_path'] = rewrite_to_served_path(book_data['_folder_path'])
                if book_data.get('_cover_image_path'):
                    book_data['_cover_image_path'] = rewrite_to_served_path(book_data['_cover_image_path'])
                if book_data.get('_page_sequence'):
                    for pg in book_data['_page_sequence']:
                        if isinstance(pg, dict) and pg.get('file_path'):
                            pg['file_path'] = rewrite_to_served_path(pg['file_path'])

                existing_book = db.query(Book).filter(Book.title == title, Book.author == author).first()
                if existing_book:
                    # Update selective fields
                    existing_book.genre = book_data.get('Category', existing_book.genre)
                    existing_book.book_type = book_data.get('Media', existing_book.book_type)
                    existing_book.reading_level = book_data.get('Age', existing_book.reading_level)
                    existing_book.cover_image_url = book_data.get('_cover_image_path', existing_book.cover_image_url)
                    existing_book.description = book_data.get('Notes', existing_book.description)

                    # Merge page/asset metadata into notes so reader can load pages
                    try:
                        existing_notes = json.loads(existing_book.notes) if existing_book.notes else {}
                    except Exception:
                        existing_notes = {}
                    merged_notes = {
                        **existing_notes,
                        'page_sequence': book_data.get('_page_sequence', existing_notes.get('page_sequence', [])),
                        'total_pages': book_data.get('_total_pages', existing_notes.get('total_pages', 0)),
                        'folder_path': book_data.get('_folder_path', existing_notes.get('folder_path')),
                        'cover_image_path': book_data.get('_cover_image_path', existing_notes.get('cover_image_path')),
                    }
                    existing_book.notes = json.dumps(merged_notes)
                    existing_book.file_path = book_data.get('_folder_path', existing_book.file_path)
                    existing_book.file_name = f"{title}.shuspot"
                    updated_count += 1
                else:
                    db.add(Book(
                        title=title,
                        author=author,
                        genre=book_data.get('Category', 'Unknown'),
                        book_type=book_data.get('Media', 'Book'),
                        fiction_type=book_data.get('Fiction Type', 'Fiction'),
                        reading_level=book_data.get('Age', ''),
                        cover_image_url=book_data.get('_cover_image_path', ''),
                        file_path=book_data.get('_folder_path', ''),
                        file_name=f"{title}.shuspot",
                        file_size=0,
                        file_type='FOLDER',
                        description=book_data.get('Notes', ''),
                        notes=json.dumps({
                            'page_sequence': book_data.get('_page_sequence', []),
                            'total_pages': book_data.get('_total_pages', 0),
                            'folder_path': book_data.get('_folder_path', ''),
                            'cover_image_path': book_data.get('_cover_image_path', ''),
                        })
                    ))
                    imported_count += 1

            db.commit()
            stats = parser.get_summary_stats()
            return {
                "message": f"ZIP processed: {imported_count} imported, {updated_count} updated",
                "imported": imported_count,
                "updated": updated_count,
                "total_parsed": len(books),
                "parsing_stats": stats,
                "selected_folder": folder_path,
                "sample": books[:3]
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload ZIP import failed: {str(e)}")

# New: Two-step preview/import for ZIP ingestion
@app.post("/shuspot-ingestion/upload-zip-preview")
async def upload_zip_preview(zip_file: UploadFile = File(...)):
    """Upload a ShuSpot ZIP, extract to a temporary token dir, copy CROP-ShuSpot assets,
    rewrite parsed paths to served uploads, and return a token with preview data (no DB writes)."""
    try:
        token = uuid.uuid4().hex
        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = os.path.join(tmpdir, zip_file.filename)
            content = await zip_file.read()
            with open(zip_path, 'wb') as f:
                f.write(content)
            extract_dir = os.path.join(tmpdir, 'extracted')
            os.makedirs(extract_dir, exist_ok=True)
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(extract_dir)

            # Promote extracted folder to a persistent temp area keyed by token
            token_dir = os.path.join(TXTRUN_ROOT, f"zip-{token}")
            os.makedirs(token_dir, exist_ok=True)
            # Move contents
            for name in os.listdir(extract_dir):
                src = os.path.join(extract_dir, name)
                dst = os.path.join(token_dir, name)
                if os.path.isdir(src):
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)

        # Locate root folder and CROP-ShuSpot
        root_candidates = [os.path.join(token_dir, d) for d in os.listdir(token_dir) if os.path.isdir(os.path.join(token_dir, d))]
        folder_path = root_candidates[0] if root_candidates else token_dir

        crop_src = None
        for root, dirs, files in os.walk(folder_path):
            if 'CROP-ShuSpot' in dirs:
                crop_src = os.path.join(root, 'CROP-ShuSpot')
                break

        backend_dir = os.path.dirname(os.path.abspath(__file__))
        dest_root = os.path.abspath(os.path.join(backend_dir, '..', 'uploads', 'CROP-ShuSpot'))
        os.makedirs(dest_root, exist_ok=True)

        if crop_src and os.path.exists(crop_src):
            for src_dir, dirs, files in os.walk(crop_src):
                rel = os.path.relpath(src_dir, crop_src)
                target_dir = os.path.join(dest_root, rel)
                os.makedirs(target_dir, exist_ok=True)
                for fname in files:
                    shutil.copy2(os.path.join(src_dir, fname), os.path.join(target_dir, fname))

        def rewrite_to_served_path(p: str) -> str:
            try:
                if crop_src and p and isinstance(p, str) and 'CROP-ShuSpot' in p:
                    src_norm = os.path.normpath(crop_src)
                    if p.startswith(src_norm):
                        relp = os.path.relpath(p, src_norm)
                        return os.path.join(dest_root, relp)
                    idx = p.rfind('CROP-ShuSpot')
                    if idx != -1:
                        relp = p[idx + len('CROP-ShuSpot') + 1:]
                        return os.path.join(dest_root, relp)
            except Exception:
                pass
            return p

        from shuspot_folder_parser import ShuSpotFolderParser
        parser = ShuSpotFolderParser(folder_path)
        books = parser.parse_all_books()
        for b in books:
            if b.get('_folder_path'):
                b['_folder_path'] = rewrite_to_served_path(b['_folder_path'])
            if b.get('_cover_image_path'):
                b['_cover_image_path'] = rewrite_to_served_path(b['_cover_image_path'])
            if b.get('_page_sequence'):
                for pg in b['_page_sequence']:
                    if isinstance(pg, dict) and pg.get('file_path'):
                        pg['file_path'] = rewrite_to_served_path(pg['file_path'])

        stats = parser.get_summary_stats()
        return {
            "token": token,
            "selected_folder": folder_path,
            "parsing_stats": stats,
            "sample_books": books[:5],
            "total_parsed": len(books)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ZIP preview failed: {str(e)}")

@app.post("/api/shuspot-ingestion/upload-zip-preview")
async def api_upload_zip_preview(zip_file: UploadFile = File(...)):
    return await upload_zip_preview(zip_file)

@app.post("/shuspot-ingestion/confirm-import")
async def confirm_import(token: str = Form(...), db: Session = Depends(get_db)):
    """Finish import using a previously uploaded ZIP (by token)."""
    try:
        token_dir = os.path.join(TXTRUN_ROOT, f"zip-{token}")
        if not os.path.exists(token_dir):
            raise HTTPException(status_code=404, detail="Token not found")

        # Determine folder and crop paths again
        root_candidates = [os.path.join(token_dir, d) for d in os.listdir(token_dir) if os.path.isdir(os.path.join(token_dir, d))]
        folder_path = root_candidates[0] if root_candidates else token_dir
        crop_src = None
        for root, dirs, files in os.walk(folder_path):
            if 'CROP-ShuSpot' in dirs:
                crop_src = os.path.join(root, 'CROP-ShuSpot')
                break

        backend_dir = os.path.dirname(os.path.abspath(__file__))
        dest_root = os.path.abspath(os.path.join(backend_dir, '..', 'uploads', 'CROP-ShuSpot'))
        os.makedirs(dest_root, exist_ok=True)

        def rewrite_to_served_path(p: str) -> str:
            try:
                if crop_src and p and isinstance(p, str) and 'CROP-ShuSpot' in p:
                    src_norm = os.path.normpath(crop_src)
                    if p.startswith(src_norm):
                        relp = os.path.relpath(p, src_norm)
                        return os.path.join(dest_root, relp)
                    idx = p.rfind('CROP-ShuSpot')
                    if idx != -1:
                        relp = p[idx + len('CROP-ShuSpot') + 1:]
                        return os.path.join(dest_root, relp)
            except Exception:
                pass
            return p

        from shuspot_folder_parser import ShuSpotFolderParser
        parser = ShuSpotFolderParser(folder_path)
        books = parser.parse_all_books()

        imported_count = 0
        updated_count = 0
        for book_data in books:
            title = book_data.get('Name', 'Unknown Title')
            author = book_data.get('Author', 'Unknown Author')
            if book_data.get('_folder_path'):
                book_data['_folder_path'] = rewrite_to_served_path(book_data['_folder_path'])
            if book_data.get('_cover_image_path'):
                book_data['_cover_image_path'] = rewrite_to_served_path(book_data['_cover_image_path'])
            if book_data.get('_page_sequence'):
                for pg in book_data['_page_sequence']:
                    if isinstance(pg, dict) and pg.get('file_path'):
                        pg['file_path'] = rewrite_to_served_path(pg['file_path'])

            existing_book = db.query(Book).filter(Book.title == title, Book.author == author).first()
            if existing_book:
                existing_book.genre = book_data.get('Category', existing_book.genre)
                existing_book.book_type = book_data.get('Media', existing_book.book_type)
                existing_book.reading_level = book_data.get('Age', existing_book.reading_level)
                existing_book.cover_image_url = book_data.get('_cover_image_path', existing_book.cover_image_url)
                existing_book.description = book_data.get('Notes', existing_book.description)
                try:
                    existing_notes = json.loads(existing_book.notes) if existing_book.notes else {}
                except Exception:
                    existing_notes = {}
                merged_notes = {
                    **existing_notes,
                    'page_sequence': book_data.get('_page_sequence', existing_notes.get('page_sequence', [])),
                    'total_pages': book_data.get('_total_pages', existing_notes.get('total_pages', 0)),
                    'folder_path': book_data.get('_folder_path', existing_notes.get('folder_path')),
                    'cover_image_path': book_data.get('_cover_image_path', existing_notes.get('cover_image_path')),
                }
                existing_book.notes = json.dumps(merged_notes)
                existing_book.file_path = book_data.get('_folder_path', existing_book.file_path)
                existing_book.file_name = f"{title}.shuspot"
                updated_count += 1
            else:
                db.add(Book(
                    title=title,
                    author=author,
                    genre=book_data.get('Category', 'Unknown'),
                    book_type=book_data.get('Media', 'Book'),
                    fiction_type=book_data.get('Fiction Type', 'Fiction'),
                    reading_level=book_data.get('Age', ''),
                    cover_image_url=book_data.get('_cover_image_path', ''),
                    file_path=book_data.get('_folder_path', ''),
                    file_name=f"{title}.shuspot",
                    file_size=0,
                    file_type='FOLDER',
                    description=book_data.get('Notes', ''),
                    notes=json.dumps({
                        'page_sequence': book_data.get('_page_sequence', []),
                        'total_pages': book_data.get('_total_pages', 0),
                        'folder_path': book_data.get('_folder_path', ''),
                        'cover_image_path': book_data.get('_cover_image_path', ''),
                    })
                ))
                imported_count += 1

        db.commit()
        stats = parser.get_summary_stats()
        # Cleanup is optional; keep for debugging. Comment out removal for now.
        # shutil.rmtree(token_dir, ignore_errors=True)
        return {
            "message": f"ZIP import complete: {imported_count} imported, {updated_count} updated",
            "imported": imported_count,
            "updated": updated_count,
            "parsing_stats": stats,
            "token": token
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Confirm import failed: {str(e)}")

@app.post("/api/shuspot-ingestion/confirm-import")
async def api_confirm_import(token: str = Form(...), db: Session = Depends(get_db)):
    return await confirm_import(token=token, db=db)

# Chunked upload endpoints to bypass reverse-proxy body limits
@app.post("/shuspot-ingestion/chunked/start")
async def chunked_start(filename: str = Form(...), size: Optional[int] = Form(None)):
    upload_id = uuid.uuid4().hex
    upload_dir = os.path.join(CHUNK_ROOT, f"upload-{upload_id}")
    os.makedirs(upload_dir, exist_ok=True)
    meta = {"filename": filename, "size": size, "created_at": datetime.utcnow().isoformat()}
    with open(os.path.join(upload_dir, "meta.json"), "w") as f:
        json.dump(meta, f)
    return {"upload_id": upload_id}

@app.post("/shuspot-ingestion/chunked/upload")
async def chunked_upload(upload_id: str = Form(...), chunk_index: int = Form(...), total_chunks: int = Form(...), chunk: UploadFile = File(...)):
    upload_dir = os.path.join(CHUNK_ROOT, f"upload-{upload_id}")
    if not os.path.exists(upload_dir):
        raise HTTPException(status_code=404, detail="Upload ID not found")
    part_path = os.path.join(upload_dir, f"{chunk_index:06d}.part")
    with open(part_path, "wb") as f:
        shutil.copyfileobj(chunk.file, f)
    return {"received": True, "chunk_index": chunk_index, "total_chunks": total_chunks}

def _assemble_chunks(upload_id: str) -> str:
    upload_dir = os.path.join(CHUNK_ROOT, f"upload-{upload_id}")
    if not os.path.exists(upload_dir):
        raise HTTPException(status_code=404, detail="Upload ID not found")
    parts = sorted([p for p in os.listdir(upload_dir) if p.endswith('.part')])
    if not parts:
        raise HTTPException(status_code=400, detail="No chunks uploaded")
    assembled = os.path.join(upload_dir, "assembled.zip")
    with open(assembled, "wb") as out:
        for name in parts:
            with open(os.path.join(upload_dir, name), "rb") as inp:
                shutil.copyfileobj(inp, out)
    return assembled

def _extract_and_copy_for_token(zip_path: str):
    token = uuid.uuid4().hex
    with tempfile.TemporaryDirectory() as tmpdir:
        extract_dir = os.path.join(tmpdir, 'extracted')
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(extract_dir)
        token_dir = os.path.join(TXTRUN_ROOT, f"zip-{token}")
        os.makedirs(token_dir, exist_ok=True)
        for name in os.listdir(extract_dir):
            src = os.path.join(extract_dir, name)
            dst = os.path.join(token_dir, name)
            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)
    # find folder_path and crop_src
    root_candidates = [os.path.join(token_dir, d) for d in os.listdir(token_dir) if os.path.isdir(os.path.join(token_dir, d))]
    folder_path = root_candidates[0] if root_candidates else token_dir
    crop_src = None
    for root, dirs, files in os.walk(folder_path):
        if 'CROP-ShuSpot' in dirs:
            crop_src = os.path.join(root, 'CROP-ShuSpot')
            break
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    dest_root = os.path.abspath(os.path.join(backend_dir, '..', 'uploads', 'CROP-ShuSpot'))
    os.makedirs(dest_root, exist_ok=True)
    if crop_src and os.path.exists(crop_src):
        for src_dir, dirs, files in os.walk(crop_src):
            rel = os.path.relpath(src_dir, crop_src)
            target_dir = os.path.join(dest_root, rel)
            os.makedirs(target_dir, exist_ok=True)
            for fname in files:
                shutil.copy2(os.path.join(src_dir, fname), os.path.join(target_dir, fname))
    return token, folder_path, crop_src, dest_root

def _rewrite_path_factory(crop_src: Optional[str], dest_root: str):
    def rewrite_to_served_path(p: str) -> str:
        try:
            if crop_src and p and isinstance(p, str) and 'CROP-ShuSpot' in p:
                src_norm = os.path.normpath(crop_src)
                if p.startswith(src_norm):
                    relp = os.path.relpath(p, src_norm)
                    return os.path.join(dest_root, relp)
                idx = p.rfind('CROP-ShuSpot')
                if idx != -1:
                    relp = p[idx + len('CROP-ShuSpot') + 1:]
                    return os.path.join(dest_root, relp)
        except Exception:
            pass
        return p
    return rewrite_to_served_path

@app.post("/shuspot-ingestion/chunked/finish")
async def chunked_finish(upload_id: str = Form(...), mode: str = Form("preview"), db: Session = Depends(get_db)):
    try:
        assembled = _assemble_chunks(upload_id)
        token, folder_path, crop_src, dest_root = _extract_and_copy_for_token(assembled)
        rewrite_to_served_path = _rewrite_path_factory(crop_src, dest_root)

        from shuspot_folder_parser import ShuSpotFolderParser
        parser = ShuSpotFolderParser(folder_path)
        books = parser.parse_all_books()
        for b in books:
            if b.get('_folder_path'):
                b['_folder_path'] = rewrite_to_served_path(b['_folder_path'])
            if b.get('_cover_image_path'):
                b['_cover_image_path'] = rewrite_to_served_path(b['_cover_image_path'])
            if b.get('_page_sequence'):
                for pg in b['_page_sequence']:
                    if isinstance(pg, dict) and pg.get('file_path'):
                        pg['file_path'] = rewrite_to_served_path(pg['file_path'])

        if mode == 'preview':
            stats = parser.get_summary_stats()
            return {
                "token": token,
                "selected_folder": folder_path,
                "parsing_stats": stats,
                "sample_books": books[:5],
                "total_parsed": len(books)
            }
        elif mode == 'import':
            imported_count = 0
            updated_count = 0
            for book_data in books:
                title = book_data.get('Name', 'Unknown Title')
                author = book_data.get('Author', 'Unknown Author')
                existing_book = db.query(Book).filter(Book.title == title, Book.author == author).first()
                if existing_book:
                    existing_book.genre = book_data.get('Category', existing_book.genre)
                    existing_book.book_type = book_data.get('Media', existing_book.book_type)
                    existing_book.reading_level = book_data.get('Age', existing_book.reading_level)
                    existing_book.cover_image_url = book_data.get('_cover_image_path', existing_book.cover_image_url)
                    existing_book.description = book_data.get('Notes', existing_book.description)
                    try:
                        existing_notes = json.loads(existing_book.notes) if existing_book.notes else {}
                    except Exception:
                        existing_notes = {}
                    merged_notes = {
                        **existing_notes,
                        'page_sequence': book_data.get('_page_sequence', existing_notes.get('page_sequence', [])),
                        'total_pages': book_data.get('_total_pages', existing_notes.get('total_pages', 0)),
                        'folder_path': book_data.get('_folder_path', existing_notes.get('folder_path')),
                        'cover_image_path': book_data.get('_cover_image_path', existing_notes.get('cover_image_path')),
                    }
                    existing_book.notes = json.dumps(merged_notes)
                    existing_book.file_path = book_data.get('_folder_path', existing_book.file_path)
                    existing_book.file_name = f"{title}.shuspot"
                    updated_count += 1
                else:
                    db.add(Book(
                        title=title,
                        author=author,
                        genre=book_data.get('Category', 'Unknown'),
                        book_type=book_data.get('Media', 'Book'),
                        fiction_type=book_data.get('Fiction Type', 'Fiction'),
                        reading_level=book_data.get('Age', ''),
                        cover_image_url=book_data.get('_cover_image_path', ''),
                        file_path=book_data.get('_folder_path', ''),
                        file_name=f"{title}.shuspot",
                        file_size=0,
                        file_type='FOLDER',
                        description=book_data.get('Notes', ''),
                        notes=json.dumps({
                            'page_sequence': book_data.get('_page_sequence', []),
                            'total_pages': book_data.get('_total_pages', 0),
                            'folder_path': book_data.get('_folder_path', ''),
                            'cover_image_path': book_data.get('_cover_image_path', ''),
                        })
                    ))
                    imported_count += 1
            db.commit()
            stats = parser.get_summary_stats()
            return {
                "message": f"ZIP import complete: {imported_count} imported, {updated_count} updated",
                "imported": imported_count,
                "updated": updated_count,
                "parsing_stats": stats,
                "token": token
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid mode")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chunked finish failed: {str(e)}")

@app.post("/api/shuspot-ingestion/chunked/start")
async def api_chunked_start(filename: str = Form(...), size: Optional[int] = Form(None)):
    return await chunked_start(filename, size)

@app.post("/api/shuspot-ingestion/chunked/upload")
async def api_chunked_upload(upload_id: str = Form(...), chunk_index: int = Form(...), total_chunks: int = Form(...), chunk: UploadFile = File(...)):
    return await chunked_upload(upload_id, chunk_index, total_chunks, chunk)

@app.post("/api/shuspot-ingestion/chunked/finish")
async def api_chunked_finish(upload_id: str = Form(...), mode: str = Form("preview"), db: Session = Depends(get_db)):
    return await chunked_finish(upload_id=upload_id, mode=mode, db=db)

# Mirror under /api for hosting setups that mount API at /api
@app.post("/api/shuspot-ingestion/upload-zip-and-import")
async def api_upload_zip_and_import(
    zip_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return await upload_zip_and_import(zip_file=zip_file, db=db)

@app.get("/shuspot-ingestion/get-folder-stats")
async def get_folder_stats(
    folder_path: str
):
    """Get quick stats about a ShuSpot folder without full parsing"""
    try:
        from pathlib import Path
        
        root_path = Path(folder_path)
        if not root_path.exists():
            raise HTTPException(status_code=404, detail="Folder path does not exist")
        
        stats = {
            "folder_exists": True,
            "sections": [],
            "estimated_books": 0
        }
        
        # Quick scan of main sections
        for section_dir in root_path.iterdir():
            if section_dir.is_dir() and not section_dir.name.startswith('.'):
                section_info = {
                    "name": section_dir.name,
                    "book_count": 0
                }
                
                # Count books in this section
                if section_dir.name == 'Read to Me Stories':
                    # Count category folders and their books
                    for category_dir in section_dir.iterdir():
                        if category_dir.is_dir() and not category_dir.name.startswith('.'):
                            book_folders = [d for d in category_dir.iterdir() if d.is_dir() and not d.name.startswith('.')]
                            section_info["book_count"] += len(book_folders)
                else:
                    # Count book folders directly
                    book_folders = [d for d in section_dir.iterdir() if d.is_dir() and not d.name.startswith('.')]
                    section_info["book_count"] = len(book_folders)
                
                stats["sections"].append(section_info)
                stats["estimated_books"] += section_info["book_count"]
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get folder stats: {str(e)}")

# Legacy endpoint (kept for compatibility)
@app.post("/execute-python-script")
async def execute_python_script(
    script_code: str = Form(...),
    root_directory: str = Form(None)
):
    """Execute custom Python script for data processing"""
    
    try:
        # Create a safe execution environment
        safe_globals = {
            '__builtins__': {
                'print': print,
                'len': len,
                'str': str,
                'int': int,
                'float': float,
                'list': list,
                'dict': dict,
                'range': range,
                'enumerate': enumerate,
            },
            'os': os,
            'json': json,
            'TxtMetadataParser': TxtMetadataParser,
            'sheets_manager': sheets_manager,
            'root_directory': root_directory,
            'get_custom_parsers': get_custom_parsers,
            'parse_with_custom_parsers': parse_with_custom_parsers,
            'add_custom_parser': add_custom_parser,
            'create_regex_parser': create_regex_parser
        }
        
        # Capture output
        import io
        import sys
        
        old_stdout = sys.stdout
        sys.stdout = captured_output = io.StringIO()
        
        try:
            # Execute the script
            exec(script_code, safe_globals)
            output = captured_output.getvalue()
            
            return {
                "success": True,
                "output": output,
                "message": "Script executed successfully"
            }
            
        finally:
            sys.stdout = old_stdout
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Script execution failed"
        }

# Custom Parser Management Endpoints

@app.get("/custom-parsers")
async def get_custom_parsers_list():
    """Get list of all registered custom parsers"""
    try:
        parsers = get_custom_parsers()
        parser_info = []
        for parser in parsers:
            parser_info.append({
                "name": parser.__class__.__name__,
                "priority": parser.get_priority(),
                "description": parser.__doc__ or "No description available"
            })
        return {
            "parsers": parser_info,
            "total": len(parser_info)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting parsers: {str(e)}")

@app.post("/custom-parsers/test")
async def test_custom_parser(
    file_path: str = Form(...),
    filename: str = Form(...),
    folder_path: Optional[str] = Form(None)
):
    """Test custom parsers against a specific file"""
    try:
        # Test with custom parsers first
        custom_metadata = parse_with_custom_parsers(file_path, filename, folder_path)
        # Also test with standard parser for comparison
        standard_metadata = MetadataParser.parse_file_metadata(file_path, filename, folder_path)
        return {
            "custom_parser_result": custom_metadata,
            "standard_parser_result": standard_metadata,
            "custom_parser_used": custom_metadata.get('_parser_used', 'None'),
            "file_tested": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parser test failed: {str(e)}")

@app.post("/custom-parsers/create-regex")
async def create_regex_parser_endpoint(
    name: str = Form(...),
    pattern: str = Form(...),
    field_mapping: str = Form(...),  # JSON string
    priority: int = Form(5)
):
    """Create a new regex-based parser dynamically"""
    try:
        # Parse field mapping JSON
        field_mapping_dict = json.loads(field_mapping)
        # Convert string keys to integers
        field_mapping_int = {int(k): v for k, v in field_mapping_dict.items()}
        # Create the parser
        new_parser = create_regex_parser(name, pattern, field_mapping_int, priority)
        # Add to registry
        add_custom_parser(new_parser)
        return {
            "message": f"Created regex parser: {name}",
            "parser_name": name,
            "pattern": pattern,
            "field_mapping": field_mapping_int,
            "priority": priority
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in field_mapping")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parser creation failed: {str(e)}")

@app.post("/parse-with-custom")
async def parse_with_custom_parsers_endpoint(
    file_path: str = Form(...),
    filename: str = Form(...),
    folder_path: Optional[str] = Form(None)
):
    """Parse a file using custom parsers"""
    try:
        metadata = parse_with_custom_parsers(file_path, filename, folder_path)
        return {
            "metadata": metadata,
            "parser_used": metadata.get('_parser_used', 'None'),
            "success": bool(metadata)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Custom parsing failed: {str(e)}")

# TXT Ingestion Script Editor Routes
@app.post("/txt-ingestion/execute-script")
async def execute_txt_script(
    script: str = Form(...),
    preview_mode: bool = Form(True),
    upload_to_sheets: bool = Form(False),
    upload_to_database: bool = Form(False),
    root_directory: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Execute custom Python script for TXT file ingestion with preview"""
    try:
        # Import required modules for script execution
        import sys
        import io
        from contextlib import redirect_stdout, redirect_stderr
        import traceback
        
        # Available variables for the script
        script_globals = {
            'root_directory': root_directory or UPLOAD_DIR,
            'sheets_manager': sheets_manager,
            'TxtMetadataParser': TxtMetadataParser,
            'parser': None,
            'os': __import__('os'),
            'json': __import__('json'),
            're': __import__('re'),
            'glob': __import__('glob'),
            'pathlib': __import__('pathlib'),
            'results': [],  # To collect results
            'preview_data': [],  # To collect preview data
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
            "sheets_uploaded": False,
            "database_uploaded": False
        }
        
        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                # Execute the script
                exec(script, script_globals)
                
                # Get results from script
                preview_data = script_globals.get('preview_data', [])
                results = script_globals.get('results', [])
                
                execution_result.update({
                    "success": True,
                    "output": stdout_capture.getvalue(),
                    "preview_data": preview_data,
                    "processed_count": len(results)
                })
                
                # If not in preview mode, upload to destinations
                if not preview_mode and results:
                    if upload_to_sheets and sheets_manager:
                        try:
                            for book_data in results:
                                await sheets_manager.add_book(book_data)
                            execution_result["sheets_uploaded"] = True
                        except Exception as e:
                            execution_result["error"] += f"Sheets upload error: {str(e)}\n"
                    
                    if upload_to_database:
                        try:
                            for book_data in results:
                                # Add to local database
                                db_book = Book(
                                    title=book_data.get('title', 'Unknown'),
                                    author=book_data.get('author', 'Unknown'),
                                    genre=book_data.get('genre', 'Unknown'),
                                    book_type=book_data.get('book_type', 'Books'),
                                    fiction_type=book_data.get('fiction_type', 'Fiction'),
                                    reading_level=book_data.get('reading_level', ''),
                                    file_name=book_data.get('file_name', ''),
                                    file_path=book_data.get('file_path', ''),
                                    description=book_data.get('description', ''),
                                    series=book_data.get('series', ''),
                                    isbn=book_data.get('isbn', ''),
                                    publisher=book_data.get('publisher', ''),
                                    notes=book_data.get('notes', '')
                                )
                                db.add(db_book)
                            db.commit()
                            execution_result["database_uploaded"] = True
                        except Exception as e:
                            db.rollback()
                            execution_result["error"] += f"Database upload error: {str(e)}\n"
                
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
        return {
            "success": False,
            "error": f"General error: {str(e)}",
            "output": "",
            "preview_data": [],
            "processed_count": 0
        }

@app.post("/txt-ingestion/upload-zip")
async def txt_ingestion_upload_zip(zip_file: UploadFile = File(...)):
    """Upload a ZIP of folders/files to a temporary server path and return a root_directory to use in scripts."""
    try:
        token = uuid.uuid4().hex
        target_dir = os.path.join(TXTRUN_ROOT, token)
        os.makedirs(target_dir, exist_ok=True)

        content = await zip_file.read()
        with zipfile.ZipFile(BytesIO(content)) as zf:
            zf.extractall(target_dir)

        # If there is a single top-level folder, prefer that as root
        entries = [os.path.join(target_dir, name) for name in os.listdir(target_dir)]
        dirs = [p for p in entries if os.path.isdir(p)]
        files = [p for p in entries if os.path.isfile(p)]
        root_dir = target_dir
        if len(dirs) == 1 and not files:
            root_dir = dirs[0]

        return {"ok": True, "token": token, "root_directory": root_dir}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ZIP upload failed: {str(e)}")

# Mirror endpoints under /api/* for hosts that mount root differently
@app.post("/api/txt-ingestion/upload-zip")
async def api_txt_ingestion_upload_zip(zip_file: UploadFile = File(...)):
    return await txt_ingestion_upload_zip(zip_file)

@app.post("/api/txt-ingestion/execute-script")
async def api_execute_txt_script(
    script: str = Form(...),
    preview_mode: bool = Form(True),
    upload_to_sheets: bool = Form(False),
    upload_to_database: bool = Form(False),
    root_directory: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    return await execute_txt_script(
        script=script,
        preview_mode=preview_mode,
        upload_to_sheets=upload_to_sheets,
        upload_to_database=upload_to_database,
        root_directory=root_directory,
        db=db
    )

@app.get("/api/txt-ingestion/sample-scripts")
async def api_get_sample_scripts():
    return await get_sample_scripts()

@app.get("/txt-ingestion/sample-scripts")
async def get_sample_scripts():
    """Get sample ChatGPT instruction scripts"""
    samples = {
        "basic_folder_parser": {
            "name": "Basic Folder Parser",
            "description": "Parse folders with PDF + metadata.txt files",
            "script": '''# Basic folder parser following ChatGPT instruction template
import os
import json

print("🔥 Starting basic folder parser...")

# Initialize results storage
results = []
preview_data = []

def parse_metadata_file(metadata_path):
    """Parse a metadata.txt file"""
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
                "notes": f"Folder: {item}"
            }
            
            results.append(book_data)
            preview_data.append({
                "folder": item,
                "title": book_data["title"],
                "author": book_data["author"],
                "file": pdf_file,
                "metadata_found": len(metadata) > 0
            })

print(f"✅ Found {len(results)} books to process")
print(f"📁 Processed {len(preview_data)} folders")'''
        },
        "grade_level_parser": {
            "name": "Grade Level Parser",
            "description": "Parse folders organized by grade levels",
            "script": '''# Grade level parser following ChatGPT instruction template
import os
import re

print("🔥 Starting grade level parser...")

results = []
preview_data = []

def map_grade_to_reading_level(grade_str):
    """Map grade numbers to reading level ranges"""
    grade_mappings = {
        'k': 'K-2', 'kindergarten': 'K-2',
        '1': 'K-2', '2': 'K-2',
        '3': '3-5', '4': '3-5', '5': '3-5',
        '6': '6-8', '7': '6-8', '8': '6-8',
        '9': '9-12', '10': '9-12', '11': '9-12', '12': '9-12'
    }
    
    grade_lower = grade_str.lower().strip()
    for key, level in grade_mappings.items():
        if key in grade_lower:
            return f"Grade {level}"
    return "Unknown"

def extract_grade_from_path(path):
    """Extract grade information from folder path"""
    grade_match = re.search(r'grade[\\s_-]*(\\d+|k|kindergarten)', path.lower())
    if grade_match:
        return grade_match.group(1)
    return None

# Scan for grade-level organized folders
for root, dirs, files in os.walk(root_directory):
    pdf_files = [f for f in files if f.endswith('.pdf')]
    txt_files = [f for f in files if f.endswith('.txt')]
    
    if pdf_files:
        folder_name = os.path.basename(root)
        grade = extract_grade_from_path(root)
        
        # Look for metadata
        metadata = {}
        for txt_file in txt_files:
            if 'metadata' in txt_file.lower() or 'info' in txt_file.lower():
                txt_path = os.path.join(root, txt_file)
                try:
                    with open(txt_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        for line in content.split('\\n'):
                            if ':' in line:
                                key, value = line.split(':', 1)
                                metadata[key.strip().lower()] = value.strip()
                except:
                    pass
        
        for pdf_file in pdf_files:
            book_title = metadata.get('title', os.path.splitext(pdf_file)[0])
            reading_level = map_grade_to_reading_level(grade) if grade else metadata.get('reading_level', '')
            
            book_data = {
                "title": book_title,
                "author": metadata.get('author', 'Unknown'),
                "genre": metadata.get('genre', metadata.get('subject', 'Educational')),
                "reading_level": reading_level,
                "file_name": pdf_file,
                "file_path": os.path.join(root, pdf_file),
                "description": metadata.get('description', ''),
                "series": metadata.get('series', ''),
                "isbn": metadata.get('isbn', ''),
                "publisher": metadata.get('publisher', ''),
                "notes": f"Grade: {grade or 'Unknown'}, Folder: {folder_name}"
            }
            
            results.append(book_data)
            preview_data.append({
                "folder": folder_name,
                "grade": grade or 'Unknown',
                "title": book_title,
                "file": pdf_file,
                "reading_level": reading_level
            })
            
            print(f"Found: {book_title} (Grade {grade}) in {folder_name}")

print(f"✅ Found {len(results)} books across grade levels")'''
        }
    }
    
    return samples

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)