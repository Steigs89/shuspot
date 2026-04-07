#!/usr/bin/env python3
"""
Quick check of what's in your databases
"""
import os
import sqlite3
import json

def check_sqlite_db():
    """Check SQLite database"""
    db_path = "books.db"
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM books')
            count = cursor.fetchone()[0]
            
            if count > 0:
                cursor.execute('SELECT id, title, reading_level FROM books LIMIT 5')
                books = cursor.fetchall()
                print(f"📚 SQLite Database (books.db): {count} books")
                for book in books:
                    print(f"   ID {book[0]}: {book[1]} - Level: {book[2]}")
            else:
                print("📚 SQLite Database (books.db): Empty")
            
            conn.close()
            return count
        except Exception as e:
            print(f"❌ SQLite Error: {e}")
            return 0
    else:
        print("📚 SQLite Database (books.db): Not found")
        return 0

def check_json_db():
    """Check JSON database"""
    # Check common locations
    json_paths = [
        "/tmp/books.json",
        "../backend/parsed_books.json",
        "books.json"
    ]
    
    for path in json_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    data = json.load(f)
                books = data.get('books', []) if isinstance(data, dict) else data
                print(f"📄 JSON Database ({path}): {len(books)} books")
                for i, book in enumerate(books[:3]):
                    title = book.get('title', 'Unknown')
                    level = book.get('reading_level', 'Unknown')
                    print(f"   {i+1}: {title} - Level: {level}")
                return len(books)
            except Exception as e:
                print(f"❌ JSON Error ({path}): {e}")
    
    print("📄 JSON Database: Not found")
    return 0

def main():
    print("🔍 Database Check")
    print("=" * 40)
    
    sqlite_count = check_sqlite_db()
    print()
    json_count = check_json_db()
    
    print("\n" + "=" * 40)
    print("📊 Summary:")
    print(f"   SQLite: {sqlite_count} books")
    print(f"   JSON: {json_count} books")
    
    if sqlite_count == 0 and json_count == 0:
        print("\n💡 No books found! Try:")
        print("   1. Import a manifest: python database_manipulator.py import manifest_Our_Solar_System_ready.json")
        print("   2. Or upload books through the frontend")
    elif sqlite_count > 0:
        print(f"\n✅ You have {sqlite_count} books in SQLite - ready to use TXT Ingestion!")
    
if __name__ == '__main__':
    main()