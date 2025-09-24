#!/usr/bin/env python3
"""
Local Database Manipulator for ShuSpot Books
Test script to rearrange and modify book data in the local database
"""

import json
import os
import sqlite3
from pathlib import Path
from typing import Dict, List, Any, Optional
import argparse
from datetime import datetime

class ShuSpotDatabaseManipulator:
    def __init__(self, db_path: str = None):
        """Initialize with database path"""
        if db_path is None:
            # Look for the database in common locations
            possible_paths = [
                "books.db",
                "../books.db", 
                "../../books.db",
                "/tmp/books.json"
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    db_path = path
                    break
        
        self.db_path = db_path
        self.is_sqlite = db_path and db_path.endswith('.db')
        self.is_json = db_path and db_path.endswith('.json')
        
        print(f"📁 Database path: {self.db_path}")
        print(f"📊 Database type: {'SQLite' if self.is_sqlite else 'JSON' if self.is_json else 'Unknown'}")
    
    def load_books(self) -> List[Dict]:
        """Load books from database"""
        if not self.db_path or not os.path.exists(self.db_path):
            print("❌ Database not found")
            return []
        
        if self.is_sqlite:
            return self._load_from_sqlite()
        elif self.is_json:
            return self._load_from_json()
        else:
            print("❌ Unsupported database format")
            return []
    
    def _load_from_sqlite(self) -> List[Dict]:
        """Load books from SQLite database"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Enable dict-like access
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM books")
            rows = cursor.fetchall()
            
            books = []
            for row in rows:
                book = dict(row)
                # Parse JSON fields
                if book.get('_page_sequence'):
                    try:
                        book['_page_sequence'] = json.loads(book['_page_sequence'])
                    except:
                        pass
                books.append(book)
            
            conn.close()
            print(f"📚 Loaded {len(books)} books from SQLite")
            return books
            
        except Exception as e:
            print(f"❌ Error loading from SQLite: {e}")
            return []
    
    def _load_from_json(self) -> List[Dict]:
        """Load books from JSON database"""
        try:
            with open(self.db_path, 'r') as f:
                data = json.load(f)
            
            books = data.get('books', []) if isinstance(data, dict) else data
            print(f"📚 Loaded {len(books)} books from JSON")
            return books
            
        except Exception as e:
            print(f"❌ Error loading from JSON: {e}")
            return []
    
    def save_books(self, books: List[Dict]) -> bool:
        """Save books back to database"""
        if self.is_sqlite:
            return self._save_to_sqlite(books)
        elif self.is_json:
            return self._save_to_json(books)
        else:
            print("❌ Cannot save to unknown database format")
            return False
    
    def _save_to_sqlite(self, books: List[Dict]) -> bool:
        """Save books to SQLite database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Clear existing books
            cursor.execute("DELETE FROM books")
            
            # Insert updated books
            for book in books:
                # Convert page sequence to JSON string
                if book.get('_page_sequence'):
                    book['_page_sequence'] = json.dumps(book['_page_sequence'])
                
                # Get column names
                columns = list(book.keys())
                placeholders = ', '.join(['?' for _ in columns])
                column_names = ', '.join(columns)
                
                cursor.execute(
                    f"INSERT INTO books ({column_names}) VALUES ({placeholders})",
                    list(book.values())
                )
            
            conn.commit()
            conn.close()
            print(f"✅ Saved {len(books)} books to SQLite")
            return True
            
        except Exception as e:
            print(f"❌ Error saving to SQLite: {e}")
            return False
    
    def _save_to_json(self, books: List[Dict]) -> bool:
        """Save books to JSON database"""
        try:
            data = {"books": books}
            with open(self.db_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"✅ Saved {len(books)} books to JSON")
            return True
            
        except Exception as e:
            print(f"❌ Error saving to JSON: {e}")
            return False
    
    def list_books(self, limit: int = 10) -> None:
        """List books in the database"""
        books = self.load_books()
        
        print(f"\\n📚 Books in Database ({len(books)} total):")
        print("=" * 60)
        
        for i, book in enumerate(books[:limit]):
            print(f"{i+1:2d}. {book.get('title', 'Unknown Title')}")
            print(f"    ID: {book.get('id', 'No ID')}")
            print(f"    Genre: {book.get('genre', 'Unknown')}")
            print(f"    Folder: {book.get('_folder_path', 'No folder')}")
            if book.get('_page_sequence'):
                pages = len(book['_page_sequence'])
                print(f"    Pages: {pages}")
            print()
        
        if len(books) > limit:
            print(f"... and {len(books) - limit} more books")
    
    def find_book(self, search_term: str) -> List[Dict]:
        """Find books by title, ID, or folder path"""
        books = self.load_books()
        matches = []
        
        search_lower = search_term.lower()
        
        for book in books:
            if (search_lower in book.get('title', '').lower() or
                search_lower in str(book.get('id', '')).lower() or
                search_lower in book.get('_folder_path', '').lower()):
                matches.append(book)
        
        print(f"🔍 Found {len(matches)} books matching '{search_term}':")
        for book in matches:
            print(f"  - {book.get('title')} (ID: {book.get('id')})")
        
        return matches
    
    def update_book_field(self, book_id: str, field: str, value: Any) -> bool:
        """Update a specific field for a book"""
        books = self.load_books()
        
        for book in books:
            if str(book.get('id')) == str(book_id):
                old_value = book.get(field, 'Not set')
                book[field] = value
                
                print(f"📝 Updated book '{book.get('title')}':")
                print(f"  Field: {field}")
                print(f"  Old: {old_value}")
                print(f"  New: {value}")
                
                return self.save_books(books)
        
        print(f"❌ Book with ID '{book_id}' not found")
        return False
    
    def rearrange_book_order(self, new_order: List[str]) -> bool:
        """Rearrange books in a specific order by ID"""
        books = self.load_books()
        book_dict = {str(book.get('id')): book for book in books}
        
        # Create new ordered list
        reordered_books = []
        
        # Add books in specified order
        for book_id in new_order:
            if book_id in book_dict:
                reordered_books.append(book_dict[book_id])
                del book_dict[book_id]
        
        # Add remaining books at the end
        reordered_books.extend(book_dict.values())
        
        print(f"📋 Rearranged {len(reordered_books)} books")
        print("New order:")
        for i, book in enumerate(reordered_books[:10]):
            print(f"  {i+1}. {book.get('title')} (ID: {book.get('id')})")
        
        return self.save_books(reordered_books)
    
    def move_book_to_category(self, book_id: str, new_genre: str) -> bool:
        """Move a book to a different category/genre"""
        return self.update_book_field(book_id, 'genre', new_genre)
    
    def clone_book_with_changes(self, book_id: str, changes: Dict[str, Any]) -> bool:
        """Clone a book and apply changes"""
        books = self.load_books()
        
        for book in books:
            if str(book.get('id')) == str(book_id):
                # Create a copy
                new_book = book.copy()
                
                # Apply changes
                for field, value in changes.items():
                    new_book[field] = value
                
                # Generate new ID if not provided
                if 'id' not in changes:
                    max_id = max([int(b.get('id', 0)) for b in books if str(b.get('id', '')).isdigit()] + [0])
                    new_book['id'] = str(max_id + 1)
                
                books.append(new_book)
                
                print(f"📋 Cloned book '{book.get('title')}' with changes:")
                for field, value in changes.items():
                    print(f"  {field}: {value}")
                print(f"  New ID: {new_book['id']}")
                
                return self.save_books(books)
        
        print(f"❌ Book with ID '{book_id}' not found")
        return False
    
    def backup_database(self, backup_path: str = None) -> str:
        """Create a backup of the current database"""
        if backup_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = f"database_backup_{timestamp}.json"
        
        books = self.load_books()
        
        backup_data = {
            "backup_timestamp": datetime.now().isoformat(),
            "original_db_path": self.db_path,
            "books": books
        }
        
        with open(backup_path, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        print(f"💾 Database backed up to: {backup_path}")
        return backup_path
    
    def restore_from_backup(self, backup_path: str) -> bool:
        """Restore database from backup"""
        try:
            with open(backup_path, 'r') as f:
                backup_data = json.load(f)
            
            books = backup_data.get('books', [])
            success = self.save_books(books)
            
            if success:
                print(f"✅ Restored {len(books)} books from backup")
            
            return success
            
        except Exception as e:
            print(f"❌ Error restoring from backup: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Manipulate ShuSpot local database')
    parser.add_argument('--db', help='Database path (auto-detected if not provided)')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # List books
    list_parser = subparsers.add_parser('list', help='List books in database')
    list_parser.add_argument('--limit', type=int, default=10, help='Number of books to show')
    
    # Find books
    find_parser = subparsers.add_parser('find', help='Find books by search term')
    find_parser.add_argument('search', help='Search term (title, ID, or folder)')
    
    # Update book field
    update_parser = subparsers.add_parser('update', help='Update a book field')
    update_parser.add_argument('book_id', help='Book ID to update')
    update_parser.add_argument('field', help='Field name to update')
    update_parser.add_argument('value', help='New value for the field')
    
    # Rearrange books
    order_parser = subparsers.add_parser('reorder', help='Rearrange book order')
    order_parser.add_argument('order', nargs='+', help='Book IDs in desired order')
    
    # Move to category
    move_parser = subparsers.add_parser('move', help='Move book to different category')
    move_parser.add_argument('book_id', help='Book ID to move')
    move_parser.add_argument('genre', help='New genre/category')
    
    # Clone book
    clone_parser = subparsers.add_parser('clone', help='Clone book with changes')
    clone_parser.add_argument('book_id', help='Book ID to clone')
    clone_parser.add_argument('--title', help='New title')
    clone_parser.add_argument('--genre', help='New genre')
    clone_parser.add_argument('--author', help='New author')
    
    # Backup/restore
    backup_parser = subparsers.add_parser('backup', help='Backup database')
    backup_parser.add_argument('--output', help='Backup file path')
    
    restore_parser = subparsers.add_parser('restore', help='Restore from backup')
    restore_parser.add_argument('backup_file', help='Backup file to restore from')
    
    args = parser.parse_args()
    
    # Initialize manipulator
    manipulator = ShuSpotDatabaseManipulator(args.db)
    
    if not args.command:
        print("No command specified. Use --help for available commands.")
        return
    
    # Execute commands
    if args.command == 'list':
        manipulator.list_books(args.limit)
    
    elif args.command == 'find':
        manipulator.find_book(args.search)
    
    elif args.command == 'update':
        # Try to parse value as JSON, fallback to string
        try:
            value = json.loads(args.value)
        except:
            value = args.value
        
        manipulator.update_book_field(args.book_id, args.field, value)
    
    elif args.command == 'reorder':
        manipulator.rearrange_book_order(args.order)
    
    elif args.command == 'move':
        manipulator.move_book_to_category(args.book_id, args.genre)
    
    elif args.command == 'clone':
        changes = {}
        if args.title:
            changes['title'] = args.title
        if args.genre:
            changes['genre'] = args.genre
        if args.author:
            changes['author'] = args.author
        
        if changes:
            manipulator.clone_book_with_changes(args.book_id, changes)
        else:
            print("❌ No changes specified for cloning")
    
    elif args.command == 'backup':
        manipulator.backup_database(args.output)
    
    elif args.command == 'restore':
        manipulator.restore_from_backup(args.backup_file)

if __name__ == "__main__":
    print("🛠️  ShuSpot Database Manipulator")
    print("=" * 50)
    
    if len(os.sys.argv) == 1:
        print("\\nUsage Examples:")
        print("  python database_manipulator.py list")
        print("  python database_manipulator.py find 'Sun'")
        print("  python database_manipulator.py update 12 title 'New Title'")
        print("  python database_manipulator.py move 12 'Science'")
        print("  python database_manipulator.py reorder 12 15 8 3")
        print("  python database_manipulator.py clone 12 --title 'Copy of Sun Book'")
        print("  python database_manipulator.py backup")
        print("  python database_manipulator.py restore backup_file.json")
        print()
    
    main()