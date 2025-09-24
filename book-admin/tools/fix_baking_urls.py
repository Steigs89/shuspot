#!/usr/bin/env python3
"""
Fix URLs for books uploaded to Baking folder
"""
from database_manipulator import DatabaseManipulator

def fix_baking_book_urls():
    """Fix URLs for books that should be in the Baking folder"""
    
    db = DatabaseManipulator("books.db")  # Use your actual database
    
    # Get all books
    books = db.list_books()
    
    print("🔍 Looking for books that need URL fixes...")
    
    for book in books:
        book_id = book[0]
        book_title = book[1]
        
        # Get book details
        book_details = db.get_book_details(book_id)
        if not book_details:
            continue
            
        # Check if this is a baking book that needs fixing
        if 'cake' in book_title.lower() or 'baking' in book_details.get('genre', '').lower():
            print(f"\n📖 Checking book: {book_title} (ID: {book_id})")
            
            # Check current URLs
            cover_url = book_details.get('cover_image_url', '')
            if cover_url and '/A%20Safe%20Cake/' in cover_url and '/Baking/' not in cover_url:
                print(f"🔧 Fixing URLs for: {book_title}")
                
                # Fix cover URL
                new_cover_url = cover_url.replace('/books/A%20Safe%20Cake/', '/books/Baking/A%20Safe%20Cake/')
                
                # Fix page URLs
                page_sequence = book_details.get('page_sequence', [])
                for page in page_sequence:
                    if 'image_url' in page:
                        old_url = page['image_url']
                        if '/A%20Safe%20Cake/' in old_url and '/Baking/' not in old_url:
                            page['image_url'] = old_url.replace('/books/A%20Safe%20Cake/', '/books/Baking/A%20Safe%20Cake/')
                
                # Fix audio URLs
                audio_files = book_details.get('audio_files', [])
                for audio in audio_files:
                    if 'audio_url' in audio:
                        old_url = audio['audio_url']
                        if '/A%20Safe%20Cake/' in old_url and '/Baking/' not in old_url:
                            audio['audio_url'] = old_url.replace('/books/A%20Safe%20Cake/', '/books/Baking/A%20Safe%20Cake/')
                
                # Update the database
                import sqlite3
                import json
                
                conn = sqlite3.connect("books.db")
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE books SET 
                        cover_image_url = ?,
                        page_sequence = ?,
                        audio_files = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (
                    new_cover_url,
                    json.dumps(page_sequence),
                    json.dumps(audio_files),
                    book_id
                ))
                
                conn.commit()
                conn.close()
                
                print(f"✅ Fixed URLs for: {book_title}")
                print(f"   Old: /books/A%20Safe%20Cake/")
                print(f"   New: /books/Baking/A%20Safe%20Cake/")
            else:
                print(f"ℹ️  URLs already correct for: {book_title}")

if __name__ == '__main__':
    fix_baking_book_urls()
    print("\n🎉 URL fix complete! Try launching the book again.")