#!/usr/bin/env python3
"""
Test script to create a sample book with page sequence data
and verify the Launch Book feature works.
"""

import json
from database import SessionLocal, Book
from datetime import datetime

def create_test_book():
    """Create a test book with Screenshot files and page sequence"""
    db = SessionLocal()
    
    try:
        # Create sample page sequence data
        page_sequence = [
            {
                'screenshot_number': 1,
                'file_path': '/test/path/Screenshot (1).png',
                'file_name': 'Screenshot (1).png',
                'is_cover': True,
                'page_number': 0,
                'display_name': 'Cover/TOC'
            },
            {
                'screenshot_number': 2,
                'file_path': '/test/path/Screenshot (2).png',
                'file_name': 'Screenshot (2).png',
                'is_cover': False,
                'page_number': 1,
                'display_name': 'Page 1'
            },
            {
                'screenshot_number': 3,
                'file_path': '/test/path/Screenshot (3).png',
                'file_name': 'Screenshot (3).png',
                'is_cover': False,
                'page_number': 2,
                'display_name': 'Page 2'
            }
        ]
        
        # Create notes with page sequence data
        notes_data = {
            'url': 'https://example.com/test-book',
            'ar_level': '2.5',
            'lexile': '450L',
            'pages': '2',
            'folder_path': '/test/path',
            'cover_image_path': '/test/path/Screenshot (1).png',
            'files': {
                'images': ['Screenshot (1).png', 'Screenshot (2).png', 'Screenshot (3).png'],
                'audio': ['page1.mp3', 'page2.mp3'],
                'video': [],
                'text': ['description.txt'],
                'other': []
            },
            'page_sequence': page_sequence,
            'total_pages': 2
        }
        
        # Create test book
        test_book = Book(
            title="Test Book with Screenshots",
            author="Test Author",
            genre="Test Category",
            book_type="Book",
            reading_level="5-7",
            cover_image_url="/test/path/Screenshot (1).png",
            file_path="/test/path",
            file_name="Test Book with Screenshots.shuspot",
            file_size=0,
            file_type="FOLDER",
            uploaded_at=datetime.utcnow(),
            notes=json.dumps(notes_data)
        )
        
        db.add(test_book)
        db.commit()
        
        print("Created test book with page sequence data")
        
        # Test the to_dict method
        book_dict = test_book.to_dict()
        print(f"Book title: {book_dict['title']}")
        print(f"Has _page_sequence: {'_page_sequence' in book_dict}")
        if '_page_sequence' in book_dict:
            print(f"Page sequence length: {len(book_dict['_page_sequence'])}")
            print("SUCCESS: Launch Book feature should work!")
        else:
            print("FAILED: No _page_sequence in book_dict")
            
    finally:
        db.close()

if __name__ == "__main__":
    create_test_book()