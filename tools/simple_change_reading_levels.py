#!/usr/bin/env python3
"""
Simple script to change all reading levels to "G2"
Just run: python simple_change_reading_levels.py
"""
from database_manipulator import DatabaseManipulator

def main():
    print("🔄 Changing all reading levels to 'G2'")
    print("=" * 40)
    
    # Use your main database (change this if needed)
    db = DatabaseManipulator("books.db")
    
    # Get all books
    books = db.list_books()
    
    if not books:
        print("❌ No books found")
        return
    
    print(f"📚 Found {len(books)} books")
    
    # Update each book
    updated = 0
    for book in books:
        book_id = book[0]
        book_title = book[1]
        
        # Update reading level to G2
        if db.update_book_field(book_id, 'reading_level', 'G2'):
            print(f"✅ Updated: {book_title}")
            updated += 1
        else:
            print(f"❌ Failed: {book_title}")
    
    print(f"\n🎉 Updated {updated} books to reading level 'G2'")
    
    # Show verification
    print(f"\n🔍 Verification:")
    for book in books[:3]:  # Show first 3 books
        book_id = book[0]
        details = db.get_book_details(book_id)
        if details:
            print(f"   📖 {details['title']}: {details['reading_level']}")

if __name__ == '__main__':
    main()