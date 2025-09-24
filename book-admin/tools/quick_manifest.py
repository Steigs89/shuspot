#!/usr/bin/env python3
"""
Quick Manifest Generator
========================

Creates a targeted manifest for specific book folders instead of 
processing the entire 43k+ file Supabase bucket.

Usage:
    python quick_manifest.py CROP-ShuSpot/Baking
    python quick_manifest.py CROP-ShuSpot/Baking "A Safe Cake"
"""

import sys
import json
import subprocess
import os
import re
from pathlib import Path

class ManifestGenerator:
    """Generate manifests from local folder structures"""
    
    def __init__(self):
        self.supported_image_formats = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
        self.supported_audio_formats = ['.mp3', '.wav', '.m4a', '.ogg']
    
    def generate_from_folder(self, folder_path, title="Unknown Title", author="Unknown Author", 
                           genre="Unknown Genre", book_type="Read to Me", 
                           reading_level="Elementary", description=""):
        """Generate manifest for a single book from a folder"""
        
        if not os.path.exists(folder_path):
            raise FileNotFoundError(f"Folder not found: {folder_path}")
        
        # Scan for images and audio files
        images = []
        audio_files = []
        
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                file_ext = os.path.splitext(file)[1].lower()
                
                if file_ext in self.supported_image_formats:
                    # Extract page number from filename
                    page_num = self._extract_page_number(file)
                    if page_num:
                        images.append({
                            'page_number': page_num,
                            'file_path': file_path,
                            'filename': file
                        })
                
                elif file_ext in self.supported_audio_formats:
                    # Extract page number from filename
                    page_num = self._extract_page_number(file)
                    if page_num:
                        audio_files.append({
                            'page_number': page_num,
                            'file_path': file_path,
                            'filename': file
                        })
        
        # Sort by page number
        images.sort(key=lambda x: x['page_number'])
        audio_files.sort(key=lambda x: x['page_number'])
        
        # Generate URLs (you might want to customize this)
        base_url = "https://example.com/books"  # Replace with your actual base URL
        
        page_sequence = []
        for img in images:
            page_sequence.append({
                'page_number': img['page_number'],
                'image_url': f"{base_url}/{os.path.relpath(img['file_path'], folder_path)}"
            })
        
        audio_sequence = []
        for audio in audio_files:
            audio_sequence.append({
                'page_number': audio['page_number'],
                'audio_url': f"{base_url}/{os.path.relpath(audio['file_path'], folder_path)}"
            })
        
        # Find cover image (usually page 1 or a file named 'cover')
        cover_url = ""
        if page_sequence:
            cover_url = page_sequence[0]['image_url']
        
        # Create book object
        book = {
            'id': 1,
            'title': title,
            'author': author,
            'genre': genre,
            'book_type': book_type,
            'reading_level': reading_level,
            'description': description,
            'cover_image_url': cover_url,
            'page_sequence': page_sequence,
            'audio_files': audio_sequence,
            'notes': None
        }
        
        return {'books': [book]}
    
    def generate_multi_book_manifest(self, base_folder, default_metadata=None):
        """Generate manifest for multiple books in a folder structure"""
        
        if not os.path.exists(base_folder):
            raise FileNotFoundError(f"Base folder not found: {base_folder}")
        
        if default_metadata is None:
            default_metadata = {}
        
        books = []
        book_id = 1
        
        # Look for book folders (folders containing images)
        for item in os.listdir(base_folder):
            item_path = os.path.join(base_folder, item)
            
            if os.path.isdir(item_path):
                # Check if this folder contains images (indicating it's a book)
                has_images = any(
                    os.path.splitext(f)[1].lower() in self.supported_image_formats
                    for f in os.listdir(item_path)
                    if os.path.isfile(os.path.join(item_path, f))
                )
                
                if has_images:
                    # Generate manifest for this book
                    book_title = self._clean_folder_name(item)
                    book_genre = default_metadata.get('genre', self._extract_genre_from_path(item_path))
                    
                    try:
                        book_manifest = self.generate_from_folder(
                            folder_path=item_path,
                            title=book_title,
                            author=default_metadata.get('author', 'Unknown Author'),
                            genre=book_genre,
                            book_type=default_metadata.get('book_type', 'Read to Me'),
                            reading_level=default_metadata.get('reading_level', 'Elementary'),
                            description=default_metadata.get('description', f'A book about {book_title}')
                        )
                        
                        # Update book ID
                        if book_manifest['books']:
                            book_manifest['books'][0]['id'] = book_id
                            books.extend(book_manifest['books'])
                            book_id += 1
                            
                    except Exception as e:
                        print(f"Warning: Failed to process book folder {item}: {e}")
                        continue
        
        return {'books': books}
    
    def _extract_page_number(self, filename):
        """Extract page number from filename"""
        # Look for patterns like: page-1, page_1, 1, crop-1, etc.
        patterns = [
            r'page[-_]?(\d+)',
            r'crop[-_]?(\d+)',
            r'^(\d+)(?:\.|$)',
            r'(\d+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, filename.lower())
            if match:
                return int(match.group(1))
        
        return None
    
    def _clean_folder_name(self, folder_name):
        """Clean folder name to make a nice book title"""
        # Replace underscores and hyphens with spaces
        title = folder_name.replace('_', ' ').replace('-', ' ')
        # Remove common prefixes
        title = re.sub(r'^(book|chapter|part)\s*\d*\s*[-:]?\s*', '', title, flags=re.IGNORECASE)
        # Capitalize words
        title = ' '.join(word.capitalize() for word in title.split())
        return title.strip()
    
    def _extract_genre_from_path(self, path):
        """Try to extract genre from folder path"""
        path_parts = Path(path).parts
        
        # Look for common genre indicators in path
        genre_keywords = {
            'science': 'Science',
            'solar': 'Science',
            'space': 'Science',
            'math': 'Mathematics',
            'reading': 'Language Arts',
            'writing': 'Language Arts',
            'history': 'History',
            'geography': 'Geography',
            'art': 'Art',
            'music': 'Music',
            'baking': 'Life Skills',
            'cooking': 'Life Skills'
        }
        
        for part in path_parts:
            part_lower = part.lower()
            for keyword, genre in genre_keywords.items():
                if keyword in part_lower:
                    return genre
        
        return 'General'

def create_targeted_manifest(base_path, book_folder=None):
    """Create manifest for specific path with full paths"""
    
    if book_folder:
        full_path = f"supa:books/{base_path}/{book_folder}"
        output_name = f"manifest_{book_folder.replace(' ', '_')}.json"
        prefix_path = f"{base_path}/{book_folder}"
    else:
        full_path = f"supa:books/{base_path}"
        output_name = f"manifest_{Path(base_path).name}.json"
        prefix_path = base_path
    
    print(f"Creating manifest for: {full_path}")
    print(f"Output file: {output_name}")
    
    try:
        # Use rclone lsjson with specific path
        cmd = ['rclone', 'lsjson', '--recursive', full_path]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        manifest_data = json.loads(result.stdout)
        
        # Fix the paths to include the full path from bucket root
        for entry in manifest_data:
            if 'Path' in entry:
                # Convert relative path to full path
                entry['Path'] = f"{prefix_path}/{entry['Path']}"
        
        with open(output_name, 'w') as f:
            json.dump(manifest_data, f, indent=2)
        
        print(f"✅ Created manifest with {len(manifest_data)} files")
        print(f"📁 Saved to: {output_name}")
        
        return output_name
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Rclone error: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON error: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python quick_manifest.py <base_path> [book_folder]")
        print("Examples:")
        print("  python quick_manifest.py CROP-ShuSpot/Baking")
        print("  python quick_manifest.py CROP-ShuSpot/Baking 'A Safe Cake'")
        sys.exit(1)
    
    base_path = sys.argv[1]
    book_folder = sys.argv[2] if len(sys.argv) > 2 else None
    
    manifest_file = create_targeted_manifest(base_path, book_folder)
    
    if manifest_file:
        print("\n🎉 Manifest created successfully!")
        print("Next steps:")
        print("1. Open your book admin interface")
        print("2. Go to 'Local Database' tab")
        print("3. Choose 'Rclone + Supabase' method")
        print(f"4. Upload: {manifest_file}")
    else:
        print("❌ Failed to create manifest")
        sys.exit(1)

if __name__ == '__main__':
    main()