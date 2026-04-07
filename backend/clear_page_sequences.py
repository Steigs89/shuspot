#!/usr/bin/env python3
"""
Script to clear existing page sequences so we can start fresh
with only proper ShuSpot books.
"""

import json
from database import SessionLocal, Book

def clear_page_sequences():
    """Clear page sequences from all books"""
    db = SessionLocal()
    
    try:
        books = db.query(Book).all()
        cleared_count = 0
        
        for book in books:
            if not book.notes:
                continue
                
            try:
                notes_data = json.loads(book.notes)
                
                # Remove page sequence data if it exists
                if 'page_sequence' in notes_data:
                    del notes_data['page_sequence']
                    cleared_count += 1
                
                if 'total_pages' in notes_data:
                    del notes_data['total_pages']
                
                book.notes = json.dumps(notes_data)
                    
            except json.JSONDecodeError:
                continue
        
        db.commit()
        print(f"Cleared page sequences from {cleared_count} books")
        
    finally:
        db.close()

if __name__ == "__main__":
    clear_page_sequences()