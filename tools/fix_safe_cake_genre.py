#!/usr/bin/env python3
"""
Fix the genre for "A Safe Cake" book to "Baking"
"""
from database_manipulator import ShuSpotDatabaseManipulator

def main():
    print("🍰 Fixing 'A Safe Cake' book genre")
    print("=" * 40)
    
    db = ShuSpotDatabaseManipulator("books.db")
    
    # Find "A Safe Cake" book
    books = db.load_books()
    safe_cake_book = None
    
    for book in books:
        book_id = book.get('id')
        book_title = book.get('title', '')
        if "Safe" in book_title or "Cake" in book_title:
            safe_cake_book = (book_id, book_title)
            break
    
    if not safe_cake_book:
        print("❌ 'A Safe Cake' book not found")
        return
    
    book_id, book_title = safe_cake_book
    print(f"📚 Found book: {book_title} (ID: {book_id})")
    
    # Update genre to "Baking"
    if db.update_book_field(book_id, 'genre', 'Baking'):
        print("✅ Updated genre to 'Baking'")
        
        # Verify the change
        updated_books = db.load_books()
        for book in updated_books:
            if book.get('id') == book_id:
                print(f"🔍 Verification: {book.get('title')} - Genre: {book.get('genre')}")
                break
    else:
        print("❌ Failed to update genre")

if __name__ == '__main__':
    main()