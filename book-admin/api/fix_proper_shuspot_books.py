#!/usr/bin/env python3
"""
Script to fix only books that have proper ShuSpot Screenshot naming:
- Screenshot (1).png, Screenshot (2).png, etc.
- Or books with cover.jpg/cover.png + Screenshot files
"""

import json
import re
from database import SessionLocal, Book

def has_proper_shuspot_naming(files_data):
    """Check if book has proper ShuSpot Screenshot naming pattern"""
    if not files_data or 'images' not in files_data:
        return False
    
    images = files_data['images']
    
    # Look for Screenshot  (number).png pattern (with two spaces)
    proper_screenshots = []
    for filename in images:
        match = re.search(r'^Screenshot  \((\d+)\)\.png$', filename)
        if match:
            proper_screenshots.append({
                'number': int(match.group(1)),
                'filename': filename
            })
    
    # Must have at least Screenshot  (1) and Screenshot  (2)
    if len(proper_screenshots) < 2:
        return False
    
    # Check if we have sequential numbering starting from 1
    numbers = sorted([s['number'] for s in proper_screenshots])
    return numbers[0] == 1 and len(numbers) >= 2

def has_cover_plus_screenshots(files_data):
    """Check if book has cover.jpg/png plus Screenshot files"""
    if not files_data or 'images' not in files_data:
        return False
    
    images = files_data['images']
    
    # Look for cover file
    has_cover = any(img.lower().startswith('cover.') and img.lower().endswith(('.jpg', '.png', '.jpeg')) 
                   for img in images)
    
    # Look for any Screenshot files
    has_screenshots = any('Screenshot' in img for img in images)
    
    return has_cover and has_screenshots

def generate_proper_shuspot_sequence(files_data):
    """Generate page sequence for proper ShuSpot books"""
    if not files_data or 'images' not in files_data:
        return None
    
    images = files_data['images']
    
    # Method 1: Screenshot (1), Screenshot (2), etc.
    if has_proper_shuspot_naming(files_data):
        screenshot_data = []
        for filename in images:
            match = re.search(r'^Screenshot  \((\d+)\)\.png$', filename)
            if match:
                screenshot_data.append({
                    'number': int(match.group(1)),
                    'filename': filename
                })
        
        # Sort by number
        screenshot_data.sort(key=lambda x: x['number'])
        
        # Generate page sequence
        page_sequence = []
        for screenshot in screenshot_data:
            page_info = {
                'screenshot_number': screenshot['number'],
                'file_path': f"placeholder_path/{screenshot['filename']}",
                'file_name': screenshot['filename'],
                'is_cover': screenshot['number'] == 1,  # Screenshot (1) is cover
                'page_number': 0 if screenshot['number'] == 1 else screenshot['number'] - 1,
                'display_name': 'Cover/TOC' if screenshot['number'] == 1 else f'Page {screenshot["number"] - 1}'
            }
            page_sequence.append(page_info)
        
        return page_sequence
    
    # Method 2: cover.jpg + Screenshot files (for future implementation)
    elif has_cover_plus_screenshots(files_data):
        # For now, skip these - we can implement this later if needed
        return None
    
    return None

def fix_proper_shuspot_books():
    """Fix only books with proper ShuSpot Screenshot naming"""
    db = SessionLocal()
    
    try:
        # Get all books
        books = db.query(Book).all()
        fixed_count = 0
        skipped_count = 0
        
        print("Looking for books with proper ShuSpot Screenshot naming...")
        print("Pattern: Screenshot  (1).png, Screenshot  (2).png, etc. (with two spaces)")
        print()
        
        for book in books:
            if not book.notes:
                continue
                
            try:
                notes_data = json.loads(book.notes)
                
                # Skip if already has page sequence
                if 'page_sequence' in notes_data and notes_data['page_sequence']:
                    continue
                
                # Check if book has proper ShuSpot naming
                files_data = notes_data.get('files', {})
                
                if not has_proper_shuspot_naming(files_data):
                    skipped_count += 1
                    continue
                
                print(f"✅ Processing: {book.title}")
                
                # Show the Screenshot files found
                images = files_data.get('images', [])
                proper_screenshots = [img for img in images if re.match(r'^Screenshot  \(\d+\)\.png$', img)]
                print(f"   Found {len(proper_screenshots)} proper Screenshots: {proper_screenshots[:3]}...")
                
                page_sequence = generate_proper_shuspot_sequence(files_data)
                
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
                    print(f"   ✅ Added {len(page_sequence)} pages (Cover + {len(page_sequence)-1} content pages)")
                    print()
                    
            except json.JSONDecodeError as e:
                print(f"❌ Error parsing notes for {book.title}: {e}")
                continue
            except Exception as e:
                print(f"❌ Error processing {book.title}: {e}")
                continue
        
        db.commit()
        print(f"🎉 Results:")
        print(f"   Fixed: {fixed_count} books with proper ShuSpot naming")
        print(f"   Skipped: {skipped_count} books (wrong naming pattern)")
        
    finally:
        db.close()

if __name__ == "__main__":
    fix_proper_shuspot_books()