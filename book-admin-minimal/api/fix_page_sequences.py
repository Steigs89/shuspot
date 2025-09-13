#!/usr/bin/env python3
"""
Script to fix existing books in the database by generating page sequences
for books that have Screenshot files but are missing _page_sequence data.
"""

import json
import re
from database import SessionLocal, Book

def generate_page_sequence_from_files(files_data):
    """Generate page sequence from files data"""
    if not files_data or 'images' not in files_data:
        return None
    
    images = files_data['images']
    screenshot_files = [f for f in images if 'Screenshot' in f and '.png' in f]
    
    if not screenshot_files:
        return None
    
    # Extract screenshot numbers and sort - handle different formats
    screenshot_data = []
    for filename in screenshot_files:
        # Try different Screenshot patterns
        patterns = [
            r'Screenshot\s*\((\d+)\)\.png',  # Screenshot (1).png
            r'Screenshot\s+(\d+)\.png',      # Screenshot 1.png  
            r'Screenshot.*?(\d+)\.png'       # Any Screenshot with number
        ]
        
        for pattern in patterns:
            match = re.search(pattern, filename)
            if match:
                screenshot_data.append({
                    'number': int(match.group(1)),
                    'filename': filename
                })
                break
    
    if not screenshot_data:
        return None
    
    # Sort by number
    screenshot_data.sort(key=lambda x: x['number'])
    
    # Generate page sequence
    page_sequence = []
    for screenshot in screenshot_data:
        page_info = {
            'screenshot_number': screenshot['number'],
            'file_path': f"placeholder_path/{screenshot['filename']}",  # Will be updated with actual path
            'file_name': screenshot['filename'],
            'is_cover': screenshot['number'] == 1,
            'page_number': 0 if screenshot['number'] == 1 else screenshot['number'] - 1,
            'display_name': 'Cover/TOC' if screenshot['number'] == 1 else f'Page {screenshot["number"] - 1}'
        }
        page_sequence.append(page_info)
    
    return page_sequence

def fix_books_with_screenshots():
    """Fix books that have Screenshot files but missing page sequences"""
    db = SessionLocal()
    
    try:
        # Get all books
        books = db.query(Book).all()
        fixed_count = 0
        
        for book in books:
            if not book.notes:
                continue
                
            try:
                notes_data = json.loads(book.notes)
                
                # Skip if already has page sequence (and it's not empty)
                if 'page_sequence' in notes_data and notes_data['page_sequence']:
                    print(f"Skipping {book.title} - already has page sequence")
                    continue
                
                # Check if book has Screenshot files
                files_data = notes_data.get('files', {})
                if not files_data or 'images' not in files_data:
                    continue
                    
                images = files_data['images']
                screenshot_files = [f for f in images if 'Screenshot' in f and '.png' in f]
                
                if not screenshot_files:
                    print(f"Skipping {book.title} - no Screenshot files")
                    continue
                
                print(f"Processing {book.title} - found {len(screenshot_files)} Screenshot files")
                page_sequence = generate_page_sequence_from_files(files_data)
                
                if page_sequence:
                    # Update notes with page sequence
                    notes_data['page_sequence'] = page_sequence
                    notes_data['total_pages'] = len([p for p in page_sequence if not p['is_cover']])
                    
                    # Update file paths with actual folder path
                    folder_path = notes_data.get('folder_path', '')
                    if folder_path:
                        for page in page_sequence:
                            page['file_path'] = f"{folder_path}/{page['file_name']}"
                    
                    book.notes = json.dumps(notes_data)
                    fixed_count += 1
                    print(f"✅ Fixed: {book.title} - added {len(page_sequence)} pages")
                    
            except json.JSONDecodeError as e:
                print(f"Error parsing notes for {book.title}: {e}")
                continue
            except Exception as e:
                print(f"Error processing {book.title}: {e}")
                continue
        
        db.commit()
        print(f"\n🎉 Fixed {fixed_count} books with page sequences")
        
    finally:
        db.close()

if __name__ == "__main__":
    fix_books_with_screenshots()