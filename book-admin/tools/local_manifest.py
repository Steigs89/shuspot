#!/usr/bin/env python3
"""
Local Manifest Generator
========================

Creates manifests from local folder structures (not rclone remotes).
Designed for use with the local server.

Usage:
    python local_manifest.py /path/to/folder
"""

import sys
import json
import os
import re
from pathlib import Path
from datetime import datetime

class LocalManifestGenerator:
    """Generate manifests from local folder structures"""
    
    def __init__(self):
        self.supported_image_formats = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
        self.supported_audio_formats = ['.mp3', '.wav', '.m4a', '.ogg']
    
    def scan_folder_for_books(self, folder_path):
        """Scan a folder for book subfolders"""
        books = []
        
        if not os.path.exists(folder_path):
            print(f"❌ Folder not found: {folder_path}")
            return books
        
        print(f"📁 Scanning folder: {folder_path}")
        
        # Check if this folder itself is a book (has images)
        if self._is_book_folder(folder_path):
            book = self._process_book_folder(folder_path)
            if book:
                books.append(book)
                print(f"📚 Found book: {book['title']}")
        else:
            # Scan subfolders for books
            for item in os.listdir(folder_path):
                item_path = os.path.join(folder_path, item)
                if os.path.isdir(item_path) and not item.startswith('.'):
                    if self._is_book_folder(item_path):
                        book = self._process_book_folder(item_path)
                        if book:
                            books.append(book)
                            print(f"📚 Found book: {book['title']}")
        
        return books
    
    def _is_book_folder(self, folder_path):
        """Check if a folder contains book images"""
        image_count = 0
        for file in os.listdir(folder_path):
            if any(file.lower().endswith(ext) for ext in self.supported_image_formats):
                image_count += 1
                if image_count >= 3:  # At least 3 images to be considered a book
                    return True
        return False
    
    def _process_book_folder(self, folder_path):
        """Process a single book folder"""
        folder_name = os.path.basename(folder_path)
        
        # Get images
        images = []
        for file in sorted(os.listdir(folder_path)):
            if any(file.lower().endswith(ext) for ext in self.supported_image_formats):
                file_path = os.path.join(folder_path, file)
                file_size = os.path.getsize(file_path)
                
                images.append({
                    'name': file,
                    'path': file_path,
                    'size': file_size,
                    'type': 'image'
                })
        
        # Get audio files
        audio_files = []
        for file in sorted(os.listdir(folder_path)):
            if any(file.lower().endswith(ext) for ext in self.supported_audio_formats):
                file_path = os.path.join(folder_path, file)
                file_size = os.path.getsize(file_path)
                
                audio_files.append({
                    'name': file,
                    'path': file_path,
                    'size': file_size,
                    'type': 'audio'
                })
        
        # Read description if available
        description = ""
        description_file = os.path.join(folder_path, 'description.txt')
        if os.path.exists(description_file):
            try:
                with open(description_file, 'r', encoding='utf-8') as f:
                    description = f.read().strip()
            except:
                pass
        
        # Create book entry
        book = {
            'id': folder_name.lower().replace(' ', '_').replace('-', '_'),
            'title': folder_name,
            'author': 'Unknown Author',
            'genre': self._guess_genre_from_path(folder_path),
            'reading_level': 'Elementary',
            'book_type': 'Read to Me',
            'description': description,
            'folder_path': folder_path,
            'images': images,
            'audio_files': audio_files,
            'total_pages': len(images),
            'has_audio': len(audio_files) > 0,
            'cover_image': self._find_cover_image(images),
            'created_at': datetime.now().isoformat()
        }
        
        return book
    
    def _guess_genre_from_path(self, folder_path):
        """Guess genre from folder path"""
        path_lower = folder_path.lower()
        
        if 'baking' in path_lower or 'cooking' in path_lower:
            return 'Baking'
        elif 'science' in path_lower:
            return 'Science'
        elif 'math' in path_lower:
            return 'Math'
        elif 'solar' in path_lower or 'space' in path_lower:
            return 'Our Solar System'
        elif 'reading' in path_lower:
            return 'Reading'
        else:
            return 'General'
    
    def _find_cover_image(self, images):
        """Find the cover image from the list"""
        # Look for cover.jpg/png first
        for img in images:
            if 'cover' in img['name'].lower():
                return img['path']
        
        # Look for first image or screenshot 1
        for img in images:
            if 'screenshot 1' in img['name'].lower() or img['name'].lower().startswith('1.'):
                return img['path']
        
        # Return first image as fallback
        return images[0]['path'] if images else None
    
    def create_manifest(self, folder_path, output_file=None):
        """Create manifest from local folder"""
        books = self.scan_folder_for_books(folder_path)
        
        if not output_file:
            folder_name = os.path.basename(folder_path.rstrip('/'))
            output_file = f"manifest_{folder_name}.json"
        
        manifest = {
            'books': books,
            'metadata': {
                'generated_by': 'Local Manifest Generator',
                'source_folder': folder_path,
                'total_books': len(books),
                'created_at': datetime.now().isoformat(),
                'generator_version': '1.0'
            }
        }
        
        # Save manifest
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Created manifest with {len(books)} books")
        print(f"📁 Saved to: {output_file}")
        
        return output_file, manifest

def main():
    if len(sys.argv) < 2:
        print("Usage: python local_manifest.py <folder_path>")
        print("Example: python local_manifest.py /Users/yourname/Downloads/CROP-ShuSpot/Baking")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    generator = LocalManifestGenerator()
    
    try:
        output_file, manifest = generator.create_manifest(folder_path)
        
        print("\n🎉 Manifest created successfully!")
        print(f"📊 Found {len(manifest['books'])} books")
        print("Next steps:")
        print("1. Use this manifest in your book admin interface")
        print("2. Import to local database")
        print(f"3. Manifest file: {output_file}")
        
    except Exception as e:
        print(f"❌ Error creating manifest: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()