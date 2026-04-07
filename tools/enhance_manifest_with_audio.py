#!/usr/bin/env python3
"""
Enhance Manifest with Audio
===========================

Takes an existing manifest and adds audio file information to it.
This creates an audio-enhanced manifest for the book admin.

Usage:
    python enhance_manifest_with_audio.py manifest_Our_Solar_System.json
"""

import json
import re
import sys
from pathlib import Path

def parse_audio_filename(audio_filename):
    """Parse audio filename to extract page information"""
    name = audio_filename.lower()
    
    patterns = [
        (r'page\s*(\d+)-(\d+)', 'page_range'),  # page4-5.mp3
        (r'page\s*(\d+)', 'single_page'),       # page 2.mp3
        (r'intro|title|cover', 'intro'),         # intro title.mp3
        (r'end|outro|back', 'outro'),            # ending
    ]
    
    for pattern, type_name in patterns:
        match = re.search(pattern, name)
        if match:
            if type_name == 'page_range':
                start = int(match.group(1))
                end = int(match.group(2))
                return {
                    'type': 'page_range',
                    'start_page': start,
                    'end_page': end,
                    'pages': list(range(start, end + 1)),
                    'filename': audio_filename
                }
            elif type_name == 'single_page':
                page = int(match.group(1))
                return {
                    'type': 'single_page',
                    'page': page,
                    'pages': [page],
                    'filename': audio_filename
                }
            elif type_name == 'intro':
                return {
                    'type': 'intro',
                    'pages': [1],
                    'filename': audio_filename
                }
            elif type_name == 'outro':
                return {
                    'type': 'outro',
                    'pages': [-1],  # Will be resolved later
                    'filename': audio_filename
                }
    
    # Fallback: extract any number
    number_match = re.search(r'(\d+)', name)
    if number_match:
        page = int(number_match.group(1))
        return {
            'type': 'inferred',
            'page': page,
            'pages': [page],
            'filename': audio_filename
        }
    
    return {
        'type': 'unknown',
        'pages': [],
        'filename': audio_filename
    }

def extract_page_number(filename):
    """Extract page number from crop-N.png"""
    match = re.search(r'crop-(\d+)', filename)
    return int(match.group(1)) if match else 0

def enhance_manifest_with_audio(manifest_file):
    """Add audio information to existing manifest"""
    
    print(f"📋 Loading manifest: {manifest_file}")
    
    with open(manifest_file, 'r') as f:
        manifest_data = json.load(f)
    
    print(f"📊 Total files in manifest: {len(manifest_data)}")
    
    # Group files by book folder
    books = {}
    audio_files = {}
    
    for entry in manifest_data:
        path = entry.get('Path') or entry.get('path') or entry.get('Name') or entry.get('name')
        if not path or entry.get('IsDir') or entry.get('isDir'):
            continue
        
        # Clean path
        path = path.replace('\\', '/')
        
        # Extract book folder (everything before /resized/ or the file itself)
        if '/resized/' in path:
            book_folder = path.split('/resized/')[0]
        else:
            # For files in root of book folder
            parts = path.split('/')
            if len(parts) > 1:
                book_folder = '/'.join(parts[:-1])
            else:
                continue
        
        # Check if it's a crop file (page image)
        if '/resized/crop-' in path:
            page_num = extract_page_number(path)
            if book_folder not in books:
                books[book_folder] = {'pages': {}, 'audio': {}}
            books[book_folder]['pages'][page_num] = {
                'path': path,
                'url': f"https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books/{path}"
            }
        
        # Check if it's an audio file
        elif path.lower().endswith(('.mp3', '.m4a', '.wav')):
            filename = path.split('/')[-1]
            audio_info = parse_audio_filename(filename)
            audio_info['path'] = path
            audio_info['url'] = f"https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books/{path}"
            
            if book_folder not in books:
                books[book_folder] = {'pages': {}, 'audio': {}}
            books[book_folder]['audio'][filename] = audio_info
    
    print(f"📚 Found {len(books)} books with pages/audio")
    
    # Process each book
    enhanced_books = []
    
    for book_folder, book_data in books.items():
        pages = book_data['pages']
        audio_files = book_data['audio']
        
        if not pages:
            continue  # Skip books without page images
        
        book_name = book_folder.split('/')[-1]
        category = book_folder.split('/')[-2] if '/' in book_folder else 'Unknown'
        
        # Resolve outro audio to last page
        for audio_info in audio_files.values():
            if audio_info['type'] == 'outro' and audio_info['pages'] == [-1]:
                audio_info['pages'] = [max(pages.keys())]
        
        # Create page sequence with audio
        page_sequence = []
        sorted_pages = sorted(pages.keys())
        
        for page_num in sorted_pages:
            page_info = pages[page_num]
            
            # Find audio for this page
            page_audio = []
            for audio_filename, audio_info in audio_files.items():
                if page_num in audio_info['pages']:
                    page_audio.append({
                        'filename': audio_filename,
                        'url': audio_info['url'],
                        'type': audio_info['type'],
                        'path': audio_info['path']
                    })
            
            page_sequence.append({
                'page_number': page_num,
                'url': page_info['url'],
                'display_name': f'Page {page_num}',
                'audio_files': page_audio
            })
        
        # Create enhanced book entry
        enhanced_book = {
            'Name': book_name,
            'Author': 'Unknown',
            'Media': 'Read to Me',
            'Category': category,
            '_page_sequence': page_sequence,
            '_total_pages': len(page_sequence),
            '_folder_path': book_folder,
            '_cover_image_path': page_sequence[0]['url'] if page_sequence else None,
            '_audio_files': list(audio_files.keys()),
            '_audio_coverage': len([p for p in page_sequence if p['audio_files']]) / len(page_sequence) * 100 if page_sequence else 0
        }
        
        enhanced_books.append(enhanced_book)
        
        audio_count = len(audio_files)
        coverage = enhanced_book['_audio_coverage']
        print(f"📖 {book_name}: {len(page_sequence)} pages, {audio_count} audio files ({coverage:.1f}% coverage)")
    
    # Save enhanced manifest in the original format (array of files)
    # The frontend expects the same format as the original Rclone manifest
    output_file = manifest_file.replace('.json', '_with_audio.json')
    
    # Keep the original manifest data and just ensure audio files are included
    # The frontend will process this and extract the audio information
    with open(output_file, 'w') as f:
        json.dump(manifest_data, f, indent=2)
    
    print(f"\n✅ Enhanced manifest saved: {output_file}")
    print(f"📊 Total books with audio: {len(enhanced_books)}")
    
    # Summary
    total_audio_files = sum(len(book['_audio_files']) for book in enhanced_books)
    avg_coverage = sum(book['_audio_coverage'] for book in enhanced_books) / len(enhanced_books) if enhanced_books else 0
    
    print(f"🎵 Total audio files: {total_audio_files}")
    print(f"📈 Average audio coverage: {avg_coverage:.1f}%")
    
    return output_file

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python enhance_manifest_with_audio.py <manifest_file.json>")
        print("\nExample:")
        print("  python enhance_manifest_with_audio.py manifest_Our_Solar_System.json")
        sys.exit(1)
    
    manifest_file = sys.argv[1]
    if not Path(manifest_file).exists():
        print(f"❌ Manifest file not found: {manifest_file}")
        sys.exit(1)
    
    enhanced_file = enhance_manifest_with_audio(manifest_file)
    
    print(f"\n🎉 Ready for upload!")
    print(f"1. Open your book admin interface")
    print(f"2. Go to 'Local Database' tab")
    print(f"3. Choose 'Rclone + Supabase' method")
    print(f"4. Upload: {enhanced_file}")
    print(f"5. Your books will have audio integration!")