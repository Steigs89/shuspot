#!/usr/bin/env python3
"""
Search for books in the database
"""
from database_manipulator import ShuSpotDatabaseManipulator

def main():
    db = ShuSpotDatabaseManipulator("books.db")
    books = db.load_books()
    
    print(f"📚 Found {len(books)} books")
    print("🔍 Searching for books with 'Safe', 'Cake', or 'Baking':")
    print("=" * 60)
    
    found = False
    for book in books:
        title = book.get('title', '')
        if any(word.lower() in title.lower() for word in ['safe', 'cake', 'baking']):
            print(f"✅ Found: {title}")
            print(f"   ID: {book.get('id')}")
            print(f"   Genre: {book.get('genre')}")
            print()
            found = True
    
    if not found:
        print("❌ No books found with 'Safe', 'Cake', or 'Baking' in title")
        print("\n📋 First 10 book titles:")
        for i, book in enumerate(books[:10]):
            print(f"  {i+1}. {book.get('title', 'No title')}")

if __name__ == '__main__':
    main()