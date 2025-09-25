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
        
        # Create rclone-compatible manifest (array of file objects)
        rclone_manifest = []
        
        for book in books:
            # Add all images for this book
            for image in book.get('images', []):
                # Convert local path to rclone-style path
                relative_path = image['path'].replace(folder_path, '').lstrip('/')
                rclone_path = f"CROP-ShuSpot/{relative_path}"
                
                rclone_manifest.append({
                    "Path": rclone_path,
                    "Name": image['name'],
                    "Size": image['size'],
                    "MimeType": self._get_mime_type(image['name']),
                    "ModTime": datetime.now().isoformat(),
                    "IsDir": False,
                    "Tier": "STANDARD"
                })
            
            # Add all audio files for this book
            for audio in book.get('audio_files', []):
                relative_path = audio['path'].replace(folder_path, '').lstrip('/')
                rclone_path = f"CROP-ShuSpot/{relative_path}"
                
                rclone_manifest.append({
                    "Path": rclone_path,
                    "Name": audio['name'],
                    "Size": audio['size'],
                    "MimeType": self._get_mime_type(audio['name']),
                    "ModTime": datetime.now().isoformat(),
                    "IsDir": False,
                    "Tier": "STANDARD"
                })
            
            # Add description.txt if it exists
            desc_file = os.path.join(book['folder_path'], 'description.txt')
            if os.path.exists(desc_file):
                relative_path = desc_file.replace(folder_path, '').lstrip('/')
                rclone_path = f"CROP-ShuSpot/{relative_path}"
                
                rclone_manifest.append({
                    "Path": rclone_path,
                    "Name": "description.txt",
                    "Size": os.path.getsize(desc_file),
                    "MimeType": "text/plain; charset=utf-8",
                    "ModTime": datetime.now().isoformat(),
                    "IsDir": False,
                    "Tier": "STANDARD"
                })
        
        # Save rclone-compatible manifest
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(rclone_manifest, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Created rclone-compatible manifest with {len(rclone_manifest)} files from {len(books)} books")
        print(f"📁 Saved to: {output_file}")
        
        # Return both formats for compatibility
        book_manifest = {
            'books': books,
            'metadata': {
                'generated_by': 'Local Manifest Generator',
                'source_folder': folder_path,
                'total_books': len(books),
                'created_at': datetime.now().isoformat(),
                'generator_version': '1.0'
            }
        }
        
        return output_file, rclone_manifest, book_manifest
    
    def _get_mime_type(self, filename):
        """Get MIME type for file"""
        ext = filename.lower().split('.')[-1]
        mime_types = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'm4a': 'audio/mp4',
            'ogg': 'audio/ogg',
            'txt': 'text/plain; charset=utf-8'
        }
        return mime_types.get(ext, 'application/octet-stream')

def main():
    if len(sys.argv) < 2:
        print("Usage: python local_manifest.py <folder_path>")
        print("Example: python local_manifest.py /Users/yourname/Downloads/CROP-ShuSpot/Baking")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    generator = LocalManifestGenerator()
    
    try:
        output_file, rclone_manifest, book_manifest = generator.create_manifest(folder_path)
        
        print("\n🎉 Manifest created successfully!")
        print(f"📊 Found {len(book_manifest['books'])} books")
        print(f"📁 Generated {len(rclone_manifest)} file entries")
        print("Next steps:")
        print("1. Use this manifest in your book admin interface")
        print("2. Import to local or live database")
        print(f"3. Manifest file: {output_file}")
        
    except Exception as e:
        print(f"❌ Error creating manifest: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()