from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "../uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# SQLite database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./books.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Book(Base):
    __tablename__ = "books"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    author = Column(String, index=True)
    genre = Column(String, default="Unknown")
    book_type = Column(String, default="Books")  # Read to Me, Voice Coach, Books, Audiobooks, Video Books
    fiction_type = Column(String, default="Fiction")  # Fiction or Non-Fiction
    reading_level = Column(String, default="Unknown")  # Grade level
    cover_image_url = Column(String, nullable=True)  # Cover image URL or path
    file_path = Column(String, unique=True)
    file_name = Column(String)
    file_size = Column(Integer)
    file_type = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    
    def to_dict(self):
        book_dict = {
            "id": self.id,
            "title": self.title,
            "author": self.author,
            "genre": self.genre,
            "book_type": self.book_type,
            "fiction_type": self.fiction_type,
            "reading_level": self.reading_level,
            "cover_image_url": self.cover_image_url,
            "file_path": self.file_path,
            "file_name": self.file_name,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "description": self.description or ""
        }
        
        # Parse notes JSON to extract ShuSpot-specific data for Launch Book feature
        if self.notes:
            try:
                import json
                notes_data = json.loads(self.notes)
                
                # Add page sequence data if available
                if 'page_sequence' in notes_data and notes_data['page_sequence']:
                    book_dict['_page_sequence'] = notes_data['page_sequence']
                    book_dict['_total_pages'] = notes_data.get('total_pages', 0)
                    book_dict['_cover_image_path'] = notes_data.get('cover_image_path', '')
                    book_dict['_folder_path'] = notes_data.get('folder_path', '')
                    
            except (json.JSONDecodeError, KeyError):
                pass  # If notes isn't valid JSON, just continue
        
        return book_dict

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()