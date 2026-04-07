#!/usr/bin/env python3
"""
Test Manifest Processing
========================

Test how the backend processes manifests to debug the 0 books issue.
"""

import json
import re
import os
from urllib.parse import quote

def process_manifest_like_backend(manifest_file, bucket="books", prefix="", public_base_url=None):
    """Process manifest the same way the backend does"""
    
    with open(manifest_file, 'r') as f:
        data = json.load(f)
    
    print(f"📋 Processing manifest: {manifest_file}")
    print(f"📊 Total entries: {len(data)}")
    
    # Extract paths like backend does
    paths = []
    for entry in data:
        p = entry.get('Path') or entry.get('path') or entry.get('Name') or entry.get('name')
        if not p or entry.get('IsDir') or entry.get('isDir'):
            continue
        p = p.replace('\\', '/')
        if prefix and not p.startswith(prefix.rstrip('/') + '/'):
            continue
        paths.append(p)
    
    print(f"📁 Valid file paths: {len(paths)}")
    print("Sample paths:")
    for p in paths[:5]:
        print(f"  - {p}")
    
    # Look for crop files like backend does
    crop_re = re.compile(r"^(.*)/resized/crop-(\d+)\.(png|jpg|jpeg|webp)$", re.IGNORECASE)
    groups = {}
    
    for p in paths:
        m = crop_re.match(p)
        if m:
            folder = m.group(1)
            page_no = int(m.group(2))
            groups.setdefault(folder, []).append((page_no, p))
            print(f"✅ Found crop file: {p} -> folder: '{folder}', page: {page_no}")
        else:
            if 'crop-' in p and 'resized' in p:
                print(f"❌ Crop file didn't match regex: {p}")
    
    print(f"\n📚 Book folders found: {len(groups)}")
    
    # Build books like backend does
    books = []
    for folder, items in groups.items():
        items.sort(key=lambda t: t[0])
        folder_name = os.path.basename(folder.rstrip('/')) if folder else "Unknown Book"
        
        page_sequence = []
        for page_no, file_path in items:
            if public_base_url:
                safe_path = quote(file_path.lstrip('/'), safe="/.-_~")
                url = f"{public_base_url.rstrip('/')}/{safe_path}"
            else:
                url = f"/{bucket}/{file_path}"
            
            page_sequence.append({
                "page_number": page_no,
                "url": url,
                "display_name": f"Page {page_no}",
            })
        
        cover_url = page_sequence[0]["url"] if page_sequence else None
        
        book = {
            "Name": folder_name,
            "Author": "Unknown", 
            "Media": "Read to Me",
            "Category": os.path.basename(os.path.dirname(folder.rstrip('/'))) if folder and '/' in folder else "Unknown",
            "_page_sequence": page_sequence,
            "_total_pages": len(page_sequence),
            "_folder_path": folder,
            "_cover_image_path": cover_url,
        }
        books.append(book)
        
        print(f"📖 Book: '{folder_name}' - {len(page_sequence)} pages")
    
    print(f"\n🎉 Total books created: {len(books)}")
    return books

if __name__ == '__main__':
    # Test with the small manifest
    books = process_manifest_like_backend(
        'manifest_A_Safe_Cake.json',
        bucket='books',
        public_base_url='https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books'
    )
    
    if books:
        print("\n📋 Sample book:")
        book = books[0]
        print(f"  Name: {book['Name']}")
        print(f"  Category: {book['Category']}")
        print(f"  Pages: {book['_total_pages']}")
        print(f"  First page URL: {book['_page_sequence'][0]['url'] if book['_page_sequence'] else 'None'}")
    else:
        print("\n❌ No books found - this explains the 0 books issue!")