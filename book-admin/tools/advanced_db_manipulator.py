#!/usr/bin/env python3
"""
Advanced Database Manipulator for ShuSpot Books
Handles URL restructuring, path routing, and folder structure changes
"""
import sqlite3
import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse
from database_manipulator import DatabaseManipulator

class AdvancedDatabaseManipulator(DatabaseManipulator):
    def __init__(self, db_path="books.db"):
        super().__init__(db_path)
    
    def update_url_structure(self, book_id, old_pattern, new_pattern):
        """
        Update URL structure for a book's images and audio files
        
        Args:
            book_id: ID of the book to update
            old_pattern: Regex pattern to match in URLs
            new_pattern: Replacement pattern
        """
        book = self.get_book_details(book_id)
        if not book:
            return False
        
        updated_pages = []
        updated_audio = []
        changes_made = False
        
        # Update page sequence URLs
        for page in book['page_sequence']:
            old_url = page['image_url']
            new_url = re.sub(old_pattern, new_pattern, old_url)
            if new_url != old_url:
                changes_made = True
                print(f"📄 Page {page['page_number']}: {old_url} → {new_url}")
            updated_pages.append({
                'page_number': page['page_number'],
                'image_url': new_url
            })
        
        # Update audio file URLs
        for audio in book['audio_files']:
            old_url = audio['audio_url']
            new_url = re.sub(old_pattern, new_pattern, old_url)
            if new_url != old_url:
                changes_made = True
                print(f"🎵 Audio {audio['page_number']}: {old_url} → {new_url}")
            updated_audio.append({
                'page_number': audio['page_number'],
                'audio_url': new_url
            })
        
        # Update cover image URL
        old_cover = book['cover_image_url']
        new_cover = re.sub(old_pattern, new_pattern, old_cover) if old_cover else old_cover
        if new_cover != old_cover:
            changes_made = True
            print(f"🖼️ Cover: {old_cover} → {new_cover}")
        
        if changes_made:
            # Save changes to database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE books SET 
                    cover_image_url = ?,
                    page_sequence = ?,
                    audio_files = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                new_cover,
                json.dumps(updated_pages),
                json.dumps(updated_audio),
                book_id
            ))
            
            conn.commit()
            conn.close()
            
            print(f"✅ Updated URL structure for book ID {book_id}")
            return True
        else:
            print(f"ℹ️ No URL changes needed for book ID {book_id}")
            return False
    
    def batch_update_urls(self, old_pattern, new_pattern, book_ids=None):
        """
        Update URL structure for multiple books
        
        Args:
            old_pattern: Regex pattern to match in URLs
            new_pattern: Replacement pattern
            book_ids: List of book IDs to update (None for all books)
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if book_ids:
            placeholders = ','.join('?' * len(book_ids))
            cursor.execute(f'SELECT id, title FROM books WHERE id IN ({placeholders})', book_ids)
        else:
            cursor.execute('SELECT id, title FROM books')
        
        books = cursor.fetchall()
        conn.close()
        
        if not books:
            print("❌ No books found to update")
            return
        
        print(f"🔄 Updating URL structure for {len(books)} books...")
        print(f"   Pattern: {old_pattern} → {new_pattern}")
        print("-" * 60)
        
        updated_count = 0
        for book_id, title in books:
            print(f"\n📖 Processing: {title} (ID: {book_id})")
            if self.update_url_structure(book_id, old_pattern, new_pattern):
                updated_count += 1
        
        print(f"\n📊 Summary: Updated {updated_count} out of {len(books)} books")
    
    def change_folder_structure(self, book_id, folder_mappings):
        """
        Change folder structure in URLs based on mappings
        
        Args:
            book_id: ID of the book to update
            folder_mappings: Dict of old_folder -> new_folder mappings
        """
        book = self.get_book_details(book_id)
        if not book:
            return False
        
        changes_made = False
        
        for old_folder, new_folder in folder_mappings.items():
            pattern = re.escape(old_folder)
            replacement = new_folder
            
            if self.update_url_structure(book_id, pattern, replacement):
                changes_made = True
        
        return changes_made
    
    def fix_common_url_issues(self, book_id):
        """
        Fix common URL issues like spaces, special characters, etc.
        """
        book = self.get_book_details(book_id)
        if not book:
            return False
        
        print(f"🔧 Fixing common URL issues for: {book['title']}")
        
        # Common fixes
        fixes = [
            (r'%20', ' '),  # URL encoded spaces
            (r'\s+', '%20'),  # Spaces to URL encoding
            (r'/+', '/'),  # Multiple slashes
        ]
        
        changes_made = False
        for pattern, replacement in fixes:
            if self.update_url_structure(book_id, pattern, replacement):
                changes_made = True
        
        return changes_made
    
    def validate_urls(self, book_id):
        """
        Validate that all URLs in a book are properly formatted
        """
        book = self.get_book_details(book_id)
        if not book:
            return False
        
        print(f"🔍 Validating URLs for: {book['title']}")
        
        issues = []
        
        # Check cover image
        if book['cover_image_url']:
            try:
                parsed = urlparse(book['cover_image_url'])
                if not parsed.scheme or not parsed.netloc:
                    issues.append(f"Invalid cover URL: {book['cover_image_url']}")
            except Exception as e:
                issues.append(f"Cover URL parse error: {e}")
        
        # Check page images
        for page in book['page_sequence']:
            try:
                parsed = urlparse(page['image_url'])
                if not parsed.scheme or not parsed.netloc:
                    issues.append(f"Invalid page {page['page_number']} URL: {page['image_url']}")
            except Exception as e:
                issues.append(f"Page {page['page_number']} URL parse error: {e}")
        
        # Check audio files
        for audio in book['audio_files']:
            try:
                parsed = urlparse(audio['audio_url'])
                if not parsed.scheme or not parsed.netloc:
                    issues.append(f"Invalid audio {audio['page_number']} URL: {audio['audio_url']}")
            except Exception as e:
                issues.append(f"Audio {audio['page_number']} URL parse error: {e}")
        
        if issues:
            print("❌ URL Issues found:")
            for issue in issues:
                print(f"   • {issue}")
            return False
        else:
            print("✅ All URLs are valid")
            return True
    
    def reorder_pages(self, book_id, new_order):
        """
        Reorder pages in a book
        
        Args:
            book_id: ID of the book
            new_order: List of page numbers in new order
        """
        book = self.get_book_details(book_id)
        if not book:
            return False
        
        print(f"🔄 Reordering pages for: {book['title']}")
        
        # Create mapping of old page numbers to page data
        page_map = {page['page_number']: page for page in book['page_sequence']}
        
        # Create new page sequence
        new_pages = []
        for i, old_page_num in enumerate(new_order, 1):
            if old_page_num in page_map:
                page_data = page_map[old_page_num].copy()
                page_data['page_number'] = i  # Assign new page number
                new_pages.append(page_data)
                print(f"   Page {old_page_num} → Page {i}")
            else:
                print(f"   ⚠️ Page {old_page_num} not found, skipping")
        
        # Update database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE books SET 
                page_sequence = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (json.dumps(new_pages), book_id))
        
        conn.commit()
        conn.close()
        
        print(f"✅ Reordered {len(new_pages)} pages")
        return True
    
    def add_missing_pages(self, book_id, page_urls):
        """
        Add missing pages to a book
        
        Args:
            book_id: ID of the book
            page_urls: Dict of {page_number: url} for new pages
        """
        book = self.get_book_details(book_id)
        if not book:
            return False
        
        print(f"➕ Adding pages to: {book['title']}")
        
        # Get existing pages
        existing_pages = {page['page_number']: page for page in book['page_sequence']}
        
        # Add new pages
        for page_num, url in page_urls.items():
            if page_num not in existing_pages:
                existing_pages[page_num] = {
                    'page_number': page_num,
                    'image_url': url
                }
                print(f"   ➕ Added page {page_num}: {url}")
            else:
                print(f"   ⚠️ Page {page_num} already exists, skipping")
        
        # Sort pages by page number
        sorted_pages = sorted(existing_pages.values(), key=lambda x: x['page_number'])
        
        # Update database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE books SET 
                page_sequence = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (json.dumps(sorted_pages), book_id))
        
        conn.commit()
        conn.close()
        
        print(f"✅ Book now has {len(sorted_pages)} pages")
        return True

def main():
    """Interactive CLI for advanced database manipulation"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Advanced ShuSpot database manipulation')
    parser.add_argument('--db', default='books.db', help='Database file path')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # URL update command
    url_parser = subparsers.add_parser('update-urls', help='Update URL structure')
    url_parser.add_argument('book_id', type=int, help='Book ID')
    url_parser.add_argument('old_pattern', help='Old URL pattern (regex)')
    url_parser.add_argument('new_pattern', help='New URL pattern')
    
    # Batch URL update
    batch_parser = subparsers.add_parser('batch-urls', help='Batch update URLs')
    batch_parser.add_argument('old_pattern', help='Old URL pattern (regex)')
    batch_parser.add_argument('new_pattern', help='New URL pattern')
    batch_parser.add_argument('--books', nargs='+', type=int, help='Specific book IDs')
    
    # Validate URLs
    validate_parser = subparsers.add_parser('validate', help='Validate book URLs')
    validate_parser.add_argument('book_id', type=int, help='Book ID')
    
    # Reorder pages
    reorder_parser = subparsers.add_parser('reorder', help='Reorder book pages')
    reorder_parser.add_argument('book_id', type=int, help='Book ID')
    reorder_parser.add_argument('order', nargs='+', type=int, help='New page order')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize advanced manipulator
    db = AdvancedDatabaseManipulator(args.db)
    
    # Execute command
    if args.command == 'update-urls':
        db.update_url_structure(args.book_id, args.old_pattern, args.new_pattern)
    elif args.command == 'batch-urls':
        db.batch_update_urls(args.old_pattern, args.new_pattern, args.books)
    elif args.command == 'validate':
        db.validate_urls(args.book_id)
    elif args.command == 'reorder':
        db.reorder_pages(args.book_id, args.order)

if __name__ == '__main__':
    main()