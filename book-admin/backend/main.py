from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import asyncio
from datetime import datetime
import pandas as pd
from io import BytesIO

from database import get_db, Book, UPLOAD_DIR
from parsers import MetadataParser

app = FastAPI(title="Book Admin API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Book Admin API is running"}

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
            Book.author.contains(search) |
            Book.notes.contains(search)
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

@app.put("/books/{book_id}")
async def update_book(
    book_id: int,
    title: str = Form(...),
    author: str = Form(...),
    genre: str = Form(...),
    book_type: str = Form(...),
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
    book.reading_level = reading_level
    book.cover_image_url = cover_image_url
    book.notes = notes
    
    db.commit()
    db.refresh(book)
    
    return book.to_dict()

@app.put("/books/bulk-update")
async def bulk_update_books(
    book_ids: List[int] = Form(...),
    field: str = Form(...),
    value: str = Form(...),
    db: Session = Depends(get_db)
):
    """Bulk update multiple books"""
    
    if field not in ["title", "author", "genre", "book_type", "reading_level", "cover_image_url", "notes"]:
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

@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get database statistics"""
    
    total_books = db.query(Book).count()
    genres = db.query(Book.genre).distinct().all()
    authors = db.query(Book.author).distinct().all()
    
    # File type distribution
    file_types = db.query(Book.file_type).all()
    file_type_counts = {}
    for ft in file_types:
        file_type_counts[ft[0]] = file_type_counts.get(ft[0], 0) + 1
    
    return {
        "total_books": total_books,
        "unique_genres": len(genres),
        "unique_authors": len(authors),
        "file_types": file_type_counts,
        "genres": [g[0] for g in genres],
        "authors": [a[0] for a in authors]
    }

@app.get("/export/csv")
async def export_csv(db: Session = Depends(get_db)):
    """Export all books to CSV"""
    
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
            "File Type": book.file_type,
            "File Size (bytes)": book.file_size,
            "Uploaded At": book.uploaded_at,
            "Notes": book.notes
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)