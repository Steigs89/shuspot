#!/usr/bin/env python3
"""
Quick Audio Test - No OCR Required
==================================

Simple tool to test audio-page matching based on filename patterns only.
Good for initial testing before setting up OCR.

Usage:
    python quick_audio_test.py "/path/to/book/folder"
"""

import os
import re
import json
from pathlib import Path
import sys

def extract_page_number(filename):
    """Extract page number from crop-N.png"""
    match = re.search(r'crop-(\d+)', filename)
    return int(match.group(1)) if match else 0

def parse_audio_filename(audio_file):
    """Parse audio filename patterns"""
    name = audio_file.stem.lower()
    
    # Test patterns
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
                    'filename': audio_file.name
                }
            elif type_name == 'single_page':
                page = int(match.group(1))
                return {
                    'type': 'single_page',
                    'page': page,
                    'pages': [page],
                    'filename': audio_file.name
                }
            elif type_name == 'intro':
                return {
                    'type': 'intro',
                    'pages': [1],
                    'filename': audio_file.name
                }
            elif type_name == 'outro':
                return {
                    'type': 'outro',
                    'pages': [-1],  # Will be resolved later
                    'filename': audio_file.name
                }
    
    # Fallback: extract any number
    number_match = re.search(r'(\d+)', name)
    if number_match:
        page = int(number_match.group(1))
        return {
            'type': 'inferred',
            'page': page,
            'pages': [page],
            'filename': audio_file.name
        }
    
    return {
        'type': 'unknown',
        'pages': [],
        'filename': audio_file.name
    }

def test_book_folder(book_path):
    """Test audio matching for a book folder"""
    book_folder = Path(book_path)
    
    if not book_folder.exists():
        print(f"❌ Folder not found: {book_path}")
        return
    
    print(f"📁 Testing: {book_folder.name}")
    print("="*50)
    
    # Find audio files
    audio_files = []
    for ext in ['.mp3', '.m4a', '.wav']:
        audio_files.extend(book_folder.glob(f"*{ext}"))
    
    # Find page images
    resized_folder = book_folder / "resized"
    page_images = []
    if resized_folder.exists():
        for ext in ['.png', '.jpg', '.jpeg']:
            page_images.extend(resized_folder.glob(f"crop-*{ext}"))
    
    page_images.sort(key=lambda x: extract_page_number(x.name))
    
    print(f"🎵 Audio files found: {len(audio_files)}")
    for audio in sorted(audio_files):
        print(f"   - {audio.name}")
    
    print(f"\n🖼️  Page images found: {len(page_images)}")
    for img in page_images[:5]:  # Show first 5
        page_num = extract_page_number(img.name)
        print(f"   - {img.name} (page {page_num})")
    if len(page_images) > 5:
        print(f"   ... and {len(page_images) - 5} more")
    
    print(f"\n🔗 Audio-Page Mappings:")
    mappings = {}
    
    for audio_file in audio_files:
        mapping = parse_audio_filename(audio_file)
        
        # Resolve outro to last page
        if mapping['type'] == 'outro' and mapping['pages'] == [-1]:
            mapping['pages'] = [len(page_images)]
        
        mappings[audio_file.name] = mapping
        
        pages_str = ", ".join(map(str, mapping['pages']))
        print(f"   {audio_file.name} → Pages {pages_str} ({mapping['type']})")
    
    # Check coverage
    mapped_pages = set()
    for mapping in mappings.values():
        mapped_pages.update(mapping['pages'])
    
    all_pages = set(extract_page_number(img.name) for img in page_images)
    unmapped_pages = all_pages - mapped_pages
    
    print(f"\n📊 Coverage Analysis:")
    print(f"   Total pages: {len(all_pages)}")
    print(f"   Mapped pages: {len(mapped_pages)}")
    print(f"   Coverage: {len(mapped_pages)/len(all_pages)*100:.1f}%")
    
    if unmapped_pages:
        print(f"   ⚠️  Unmapped pages: {sorted(unmapped_pages)}")
    else:
        print(f"   ✅ All pages covered!")
    
    # Generate simple manifest
    manifest = {
        'book_name': book_folder.name,
        'total_pages': len(page_images),
        'audio_mappings': mappings,
        'coverage_percent': len(mapped_pages)/len(all_pages)*100 if all_pages else 0
    }
    
    output_file = f"audio_test_{book_folder.name.replace(' ', '_')}.json"
    with open(output_file, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n✅ Test results saved to: {output_file}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python quick_audio_test.py '/path/to/book/folder'")
        print("\nExample:")
        print("  python quick_audio_test.py '/Users/john/Books/A Safe Cake'")
        sys.exit(1)
    
    test_book_folder(sys.argv[1])