import os
import json
import re
from typing import Dict, List, Optional
from pathlib import Path
import mimetypes
from datetime import datetime

class ShuSpotFolderParser:
    """
    Custom parser for ShuSpot folder structure:
    Main Folder/
    ├── Read to Me Stories/
    │   ├── Art/
    │   │   ├── A Gift for Sophie/
    │   │   │   ├── description.txt
    │   │   │   ├── cover.jpg
    │   │   │   ├── Screenshot (1).png
    │   │   │   ├── page2.mp3
    │   │   │   └── ...
    ├── Video Books/
    │   ├── A Boy Like You/
    │   │   ├── A Boy Like You.mp4
    │   │   ├── A Boy Like You.rtf
    │   │   └── ...
    ├── Audiobooks/
    ├── Books/
    └── Videos/
    """
    
    def __init__(self, root_path: str):
        self.root_path = Path(root_path)
        self.book_data = []
        
        # Define media type mappings
        self.media_type_mapping = {
            'Read to Me Stories': 'Read to Me',
            'Video Books': 'Video Book',
            'Audiobooks': 'Audiobook',
            'Books': 'Book',
            'Videos': 'Video'
        }
        
        # File patterns - all lowercase for case-insensitive matching
        self.description_patterns = ['description.txt', '*.rtf', '*.txt']
        self.cover_patterns = ['cover.jpg', 'cover.png', 'cover.jpeg']
        self.page_patterns = ['screenshot*.png', 'page*.png', '*.png']  # Use lowercase
        self.audio_patterns = ['*.mp3', '*.wav', '*.m4a']
        self.video_patterns = ['*.mp4', '*.mov', '*.avi']
    
    def parse_all_books(self) -> List[Dict]:
        """Parse all books from the folder structure"""
        print(f"Starting to parse books from: {self.root_path}")
        
        if not self.root_path.exists():
            raise FileNotFoundError(f"Root path does not exist: {self.root_path}")
        
        # Iterate through main sections (Read to Me Stories, Video Books, etc.)
        for section_dir in self.root_path.iterdir():
            if not section_dir.is_dir() or section_dir.name.startswith('.'):
                continue
                
            print(f"Processing section: {section_dir.name}")
            self._parse_section(section_dir)
        
        print(f"Completed parsing. Found {len(self.book_data)} books total.")
        return self.book_data
    
    def _parse_section(self, section_path: Path):
        """Parse a main section (Read to Me Stories, Video Books, etc.)"""
        section_name = section_path.name
        media_type = self.media_type_mapping.get(section_name, 'Book')
        
        # For Read to Me Stories, there are category subdirectories
        if section_name == 'Read to Me Stories':
            self._parse_categorized_section(section_path, media_type)
        else:
            # For Video Books, Audiobooks, etc., books are directly in the section
            self._parse_direct_books(section_path, media_type, section_name)
    
    def _parse_categorized_section(self, section_path: Path, media_type: str):
        """Parse sections with category subdirectories (like Read to Me Stories)"""
        for category_dir in section_path.iterdir():
            if not category_dir.is_dir() or category_dir.name.startswith('.'):
                continue
                
            print(f"  Processing category: {category_dir.name}")
            
            # Each book is in its own folder within the category
            for book_dir in category_dir.iterdir():
                if not book_dir.is_dir() or book_dir.name.startswith('.'):
                    continue
                    
                book_data = self._parse_individual_book(book_dir, media_type, category_dir.name)
                if book_data:
                    self.book_data.append(book_data)
    
    def _parse_direct_books(self, section_path: Path, media_type: str, category: str):
        """Parse sections where books are directly in the section folder"""
        for book_dir in section_path.iterdir():
            if not book_dir.is_dir() or book_dir.name.startswith('.'):
                continue
                
            book_data = self._parse_individual_book(book_dir, media_type, category)
            if book_data:
                self.book_data.append(book_data)
    
    def _parse_individual_book(self, book_path: Path, media_type: str, category: str) -> Optional[Dict]:
        """Parse an individual book folder"""
        try:
            print(f"    Parsing book: {book_path.name}")
            
            # Check if this is a collection folder (contains multiple book subfolders)
            if self._is_collection_folder(book_path):
                print(f"      Detected collection folder, parsing sub-books...")
                self._parse_collection_folder(book_path, media_type, category)
                return None  # Collection folders don't return individual book data
            
            # Use the single book parsing method
            return self._parse_single_book_data(book_path, media_type, category)
            
        except Exception as e:
            print(f"    Error parsing book {book_path.name}: {e}")
            return None
    
    def _catalog_files(self, book_path: Path) -> Dict:
        """Catalog all files in the book folder"""
        files = {
            'images': [],
            'audio': [],
            'video': [],
            'text': [],
            'other': []
        }
        
        for file_path in book_path.iterdir():
            if file_path.is_file() and not file_path.name.startswith('.'):
                ext = file_path.suffix.lower()
                
                if ext in ['.png', '.jpg', '.jpeg', '.gif']:
                    files['images'].append(file_path.name)
                elif ext in ['.mp3', '.wav', '.m4a', '.aac']:
                    files['audio'].append(file_path.name)
                elif ext in ['.mp4', '.mov', '.avi', '.mkv']:
                    files['video'].append(file_path.name)
                elif ext in ['.txt', '.rtf', '.md']:
                    files['text'].append(file_path.name)
                else:
                    files['other'].append(file_path.name)
        
        return files
    
    def _parse_description_file(self, book_path: Path) -> Optional[Dict]:
        """Parse description.txt or .rtf files for metadata"""
        description_data = {}
        
        # Look for description files
        description_files = []
        for pattern in ['description.txt', '*.rtf', '*.txt']:
            if '*' in pattern:
                description_files.extend(book_path.glob(pattern))
            else:
                desc_file = book_path / pattern
                if desc_file.exists():
                    description_files.append(desc_file)
        
        if not description_files:
            return None
        
        # Use the first description file found
        desc_file = description_files[0]
        
        try:
            # Read file content
            if desc_file.suffix.lower() == '.rtf':
                content = self._parse_rtf_content(desc_file)
            else:
                with open(desc_file, 'r', encoding='utf-8') as f:
                    content = f.read()
            
            # Extract metadata using regex patterns
            description_data.update(self._extract_metadata_from_text(content))
            
            # Extract description from between "Start Reading" and "Book Info"
            desc_match = re.search(r'Start Reading\s*(.*?)\s*Book Info', content, re.DOTALL | re.IGNORECASE)
            if desc_match:
                description = desc_match.group(1).strip()
                description_data['description'] = description
            else:
                # Fallback: use full content if no markers found
                description_data['description'] = content[:500] + '...' if len(content) > 500 else content
            
            # Store full content in notes for reference
            description_data['Notes'] = content[:500] + '...' if len(content) > 500 else content
            
        except Exception as e:
            print(f"      Error reading description file {desc_file}: {e}")
        
        return description_data
    
    def _is_collection_folder(self, folder_path: Path) -> bool:
        """Check if a folder is a collection containing multiple books"""
        # Look for subfolders that contain description files or media files
        subfolders_with_content = 0
        
        for subfolder in folder_path.iterdir():
            if not subfolder.is_dir() or subfolder.name.startswith('.'):
                continue
                
            # Check if subfolder has book-like content
            has_description = any(subfolder.glob('description.txt')) or any(subfolder.glob('*.rtf'))
            has_media = any(subfolder.glob('*.mp4')) or any(subfolder.glob('*.mp3')) or any(subfolder.glob('*.png'))
            
            if has_description or has_media:
                subfolders_with_content += 1
        
        # If we have multiple subfolders with content, it's likely a collection
        return subfolders_with_content >= 2
    
    def _parse_collection_folder(self, collection_path: Path, media_type: str, category: str) -> None:
        """Parse a collection folder containing multiple books"""
        for book_folder in collection_path.iterdir():
            if not book_folder.is_dir() or book_folder.name.startswith('.'):
                continue
            
            # Parse each book in the collection
            book_data = self._parse_single_book_data(book_folder, media_type, category)
            if book_data:
                self.book_data.append(book_data)
        
        # Return None since we've already added books to self.book_data
        return None
    
    def _parse_single_book_data(self, book_path: Path, media_type: str, category: str) -> Optional[Dict]:
        """Parse a single book's data (used for both individual books and books within collections)"""
        # Initialize book data
        book_data = {
            'Name': book_path.name,
            'Category': category,
            'Media': media_type,
            'URL': '',  # Will be extracted from description if available
            'Author': '',
            'Age': '',
            'Read time': '',
            'AR Level': '',
            'Lexile': '',
            'GRL': '',
            'Pages': '',
            'Audiobook Length': '',
            'Video Length': '',
            'Status': 'Active',
            'Date Added': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Date Modified': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Notes': '',
            # Additional metadata for processing
            '_folder_path': str(book_path),
            '_files': self._catalog_files(book_path)
        }
        
        # Parse description file
        description_data = self._parse_description_file(book_path)
        if description_data:
            book_data.update(description_data)
        
        # Find cover image
        cover_path = self._find_cover_image(book_path)
        if cover_path:
            book_data['_cover_image_path'] = str(cover_path)
        
        # Get page sequence for PDF reader integration
        page_sequence = self.get_page_sequence(book_path)
        if page_sequence:
            book_data['_page_sequence'] = page_sequence
            book_data['_total_pages'] = len([p for p in page_sequence if not p['is_cover']])
        
        # Count pages and media files
        file_counts = self._count_media_files(book_path)
        book_data.update(file_counts)
        
        return book_data

    def _clean_author_name(self, author_name: str) -> str:
        """Clean up extracted author name"""
        # Remove common prefixes/suffixes
        author_name = re.sub(r'^(by|author|written by|story by):\s*', '', author_name, flags=re.IGNORECASE)
        
        # Remove illustrator info if it got captured
        author_name = re.sub(r'\s*,?\s*(illustrator|illustrated by).*$', '', author_name, flags=re.IGNORECASE)
        
        # Remove extra whitespace
        author_name = ' '.join(author_name.split())
        
        # Remove trailing punctuation
        author_name = author_name.rstrip('.,;:')
        
        return author_name.strip()
    
    def _is_valid_author_name(self, name: str) -> bool:
        """Check if the extracted name looks like a valid author name"""
        if not name or len(name) < 3:
            return False
        
        # Must contain at least one space (first and last name)
        if ' ' not in name:
            return False
        
        # Should not contain numbers (except maybe Jr., III, etc.)
        if re.search(r'\d', name) and not re.search(r'\b(Jr|Sr|II|III|IV)\b', name):
            return False
        
        # Should not be all caps or all lowercase
        if name.isupper() or name.islower():
            return False
        
        # Should not contain common non-author words
        non_author_words = ['book', 'info', 'ages', 'read', 'time', 'level', 'pages', 'isbn', 'publisher', 'description']
        if any(word.lower() in name.lower() for word in non_author_words):
            return False
        
        # Should start with capital letters
        words = name.split()
        if not all(word[0].isupper() for word in words if word):
            return False
        
        return True

    def _parse_rtf_content(self, rtf_file: Path) -> str:
        """Extract plain text from RTF file"""
        try:
            with open(rtf_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Simple RTF to text conversion (removes RTF formatting)
            # This is basic - for production, consider using a proper RTF parser
            text = re.sub(r'\\[a-z]+\d*\s?', '', content)  # Remove RTF commands
            text = re.sub(r'[{}]', '', text)  # Remove braces
            text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
            
            return text.strip()
            
        except Exception as e:
            print(f"      Error parsing RTF file {rtf_file}: {e}")
            return ""
    
    def _extract_metadata_from_text(self, content: str) -> Dict:
        """Extract metadata from description text using regex patterns"""
        metadata = {}
        
        # Epic URL
        url_match = re.search(r'https://www\.getepic\.com/app/read/\d+', content)
        if url_match:
            metadata['URL'] = url_match.group()
        
        # Title - Enhanced patterns for Epic format
        title_patterns = [
            # Epic format: URL on first line, title on second line
            r'https://www\.getepic\.com/app/read/\d+\s*\n([^\n]+)',
            
            # Standard patterns
            r'Title:\s*(.+?)(?:\n|$)',
            r'^([A-Z][^\n]*?)$',  # Line with title case
            r'^(.+?)(?:\n|Author:)',
            
            # Fallback: first non-URL line that looks like a title
            r'(?:^|\n)([A-Z][^\n]{3,50})(?=\n)',
        ]
        
        for pattern in title_patterns:
            title_match = re.search(pattern, content, re.MULTILINE)
            if title_match:
                title = title_match.group(1).strip()
                # Validate it looks like a title
                if len(title) > 3 and not title.startswith('http') and not title.lower().startswith('author'):
                    metadata['Name'] = title
                    break
        
        # Author - Enhanced patterns to catch more variations
        author_patterns = [
            # Standard patterns
            r'Author:\s*([^,\n]+?)(?:\s*,\s*Illustrator:|$|\n)',  # "Author: Name , Illustrator:"
            r'Author:\s*([^,\n]+)',  # "Author: Name"
            r'By:\s*([^,\n]+)',  # "By: Name"
            r'Authors?:\s*([^,\n]+)',  # "Authors: Name"
            r'Written by:\s*([^,\n]+)',  # "Written by: Name"
            r'Story by:\s*([^,\n]+)',  # "Story by: Name"
            
            # Epic-specific patterns (after title, before description)
            r'^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$',  # Standalone author name line
            
            # Pattern for "Title\nAuthor Name\nDescription"
            r'(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?=\n[A-Z][a-z])',  # Author between title and description
            
            # Fallback patterns
            r'(?:^|\n)([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\n|$)',  # Any capitalized name
        ]
        
        for pattern in author_patterns:
            author_match = re.search(pattern, content, re.MULTILINE | re.IGNORECASE)
            if author_match:
                author_name = author_match.group(1).strip()
                
                # Clean up the author name
                author_name = self._clean_author_name(author_name)
                
                # Validate it looks like a real author name
                if self._is_valid_author_name(author_name):
                    metadata['Author'] = author_name
                    break
        
        # Age range
        age_patterns = [
            r'Ages?:\s*([0-9-]+)',
            r'Age[s]?\s*([0-9-]+)',
            r'Ages?:\s*([^\\n]+)'
        ]
        
        for pattern in age_patterns:
            age_match = re.search(pattern, content, re.IGNORECASE)
            if age_match:
                metadata['Age'] = age_match.group(1).strip()
                break
        
        # Reading time
        time_patterns = [
            r'Read time:\s*([^\\n]+)',
            r'Length:\s*([^\\n]+)',
            r'Duration:\s*([^\\n]+)'
        ]
        
        for pattern in time_patterns:
            time_match = re.search(pattern, content, re.IGNORECASE)
            if time_match:
                time_str = time_match.group(1).strip()
                metadata['Read time'] = time_str
                break
        
        # AR Level
        ar_match = re.search(r'AR LEVEL:\s*([0-9.]+)', content, re.IGNORECASE)
        if ar_match:
            metadata['AR Level'] = ar_match.group(1)
        
        # Lexile
        lexile_match = re.search(r'LEXILE[©]?:\s*([A-Z]*[0-9]+L?)', content, re.IGNORECASE)
        if lexile_match:
            metadata['Lexile'] = lexile_match.group(1)
        
        # Pages
        pages_patterns = [
            r'Pages?:\s*([0-9]+)',
            r'([0-9]+)\s*pages?',
            r'Pages?:\s*([0-9]+%)'  # Sometimes shows as percentage
        ]
        
        for pattern in pages_patterns:
            pages_match = re.search(pattern, content, re.IGNORECASE)
            if pages_match:
                metadata['Pages'] = pages_match.group(1)
                break
        
        return metadata
    
    def _find_cover_image(self, book_path: Path) -> Optional[Path]:
        """Find the cover image file - cover.jpg is the primary cover"""
        
        # Direct cover.jpg in the root folder
        cover_jpg = book_path / "cover.jpg"
        if cover_jpg.exists():
            return cover_jpg

        # First priority: cover.jpg/png files in the main folder
        for pattern in self.cover_patterns:
            cover_files = list(book_path.glob(pattern))
            if cover_files:
                return cover_files[0]

        # Second priority: cover.jpg/png in the resized folder
        resized_path = book_path / "resized"
        if resized_path.exists():
            # Look for cover.jpg in resized
            cover_jpg = resized_path / "cover.jpg"
            if cover_jpg.exists():
                return cover_jpg
                
            # Try other cover patterns in resized
            for pattern in self.cover_patterns:
                cover_files = list(resized_path.glob(pattern))
                if cover_files:
                    return cover_files[0]
            
            # Also look for first page in resized folder as it might be the cover
            crop_1 = resized_path / "crop-1.png"
            if crop_1.exists():
                return crop_1

        # Third priority: Screenshot (1) is the cover/table of contents
        screenshot_1 = book_path / "Screenshot (1).png"
        if screenshot_1.exists():
            return screenshot_1
        
        # Fourth priority: look for any image that might be a cover
        image_files = list(book_path.glob('*.jpg')) + list(book_path.glob('*.png'))
        for img_file in image_files:
            if 'cover' in img_file.name.lower():
                return img_file
        
        # Fallback: return first image file that's not in resized folder
        if image_files:
            non_resized_images = [f for f in image_files if 'resized' not in str(f)]
            if non_resized_images:
                return non_resized_images[0]
            return image_files[0]
        
        return None
    
    def _count_media_files(self, book_path: Path) -> Dict:
        """Count different types of media files"""
        counts = {}
        
        # Count page images (screenshots) - Screenshot (1) is cover, rest are pages
        screenshot_files = list(book_path.glob('Screenshot*.png'))
        if screenshot_files:
            # Sort screenshots by number to get proper page count
            screenshot_numbers = []
            for f in screenshot_files:
                # Extract number from "Screenshot (X).png"
                match = re.search(r'Screenshot \((\d+)\)\.png', f.name)
                if match:
                    screenshot_numbers.append(int(match.group(1)))
            
            if screenshot_numbers:
                # Screenshot (1) is cover, so actual pages = total - 1
                max_screenshot = max(screenshot_numbers)
                actual_pages = max_screenshot - 1 if max_screenshot > 1 else 0
                counts['Pages'] = str(actual_pages)
                counts['_total_screenshots'] = len(screenshot_files)
                counts['_max_screenshot_number'] = max_screenshot
        
        # Also count any other page images
        other_page_images = list(book_path.glob('page*.png'))
        if other_page_images and 'Pages' not in counts:
            counts['Pages'] = str(len(other_page_images))
        
        # Count audio files
        audio_files = list(book_path.glob('*.mp3')) + list(book_path.glob('*.wav'))
        if audio_files:
            counts['_audio_file_count'] = len(audio_files)
        
        # Count video files
        video_files = list(book_path.glob('*.mp4')) + list(book_path.glob('*.mov'))
        if video_files:
            counts['_video_file_count'] = len(video_files)
        
        return counts
    
    def _estimate_time(self, book_path: Path, media_type: str, file_counts: Dict) -> Optional[str]:
        """Estimate reading/viewing time based on content"""
        try:
            if media_type == 'Video Book':
                # For video books, try to get actual video duration
                video_files = list(book_path.glob('*.mp4'))
                if video_files:
                    # This would require ffmpeg or similar to get actual duration
                    # For now, return a placeholder
                    return "5-10 mins"
            
            elif media_type == 'Read to Me':
                # Estimate based on number of pages/audio files
                audio_count = file_counts.get('_audio_file_count', 0)
                page_count = int(file_counts.get('Pages', '0'))
                
                if audio_count > 0:
                    # Rough estimate: 30 seconds per audio file
                    total_seconds = audio_count * 30
                    minutes = total_seconds // 60
                    return f"{minutes}-{minutes + 5} mins"
                elif page_count > 0:
                    # Rough estimate: 30 seconds per page
                    minutes = (page_count * 30) // 60
                    return f"{minutes}-{minutes + 5} mins"
            
            return None
            
        except Exception as e:
            print(f"      Error estimating time: {e}")
            return None
    
    def export_to_google_sheets_format(self) -> List[Dict]:
        """Export parsed data in Google Sheets format"""
        sheets_data = []
        
        for book in self.book_data:
            # Create clean data for Google Sheets (remove internal fields)
            clean_book = {k: v for k, v in book.items() if not k.startswith('_')}
            sheets_data.append(clean_book)
        
        return sheets_data
    
    def export_to_json(self, output_file: str):
        """Export all book data to JSON file"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.book_data, f, indent=2, ensure_ascii=False)
        
        print(f"Exported {len(self.book_data)} books to {output_file}")
    
    def get_page_sequence(self, book_path: Path) -> List[Dict]:
        """Get ordered page sequence for PDF reader integration"""
        pages = []
        print(f"\nGenerating page sequence for {book_path}")
        
        # First priority: Look for pages in resized folder if it exists
        resized_path = book_path / "resized"
        print(f"Checking resized folder: {resized_path}")
        print(f"Resized folder exists: {resized_path.exists()}")
        
        if resized_path.exists():
            # Search for crop-#.png files in resized folder
            crop_files = []
            i = 1
            while True:
                crop_path = resized_path / f"crop-{i}.png"
                print(f"Looking for crop file: {crop_path}")
                print(f"Crop file exists: {crop_path.exists()}")
                
                if not crop_path.exists():
                    break
                    
                crop_files.append({
                    'number': i,
                    'file': crop_path,
                    'path': str(crop_path).replace('\\', '/')  # Ensure forward slashes
                })
                i += 1
            
            print(f"Found {len(crop_files)} crop files")
            
            if crop_files:
                # Process resized/crop pages
                for i, page in enumerate(crop_files):
                    is_left_page = (i % 2 == 0)
                    page_info = {
                        'page_number': page['number'],
                        'file_path': page['path'].replace(' ', '%20'),  # URL encode spaces
                        'file_name': page['file'].name,
                        'is_cover': page['number'] == 1,
                        'is_left_page': is_left_page,
                        'display_name': 'Cover' if page['number'] == 1 else f'Page {page["number"]}'
                    }
                    pages.append(page_info)
                    print(f"Added page {page_info['page_number']}: {page_info['file_path']}")
                
                print(f"Returning {len(pages)} pages from crop files")
                return pages  # Return if we found crop files
        
        # Second priority: Look for screenshot #.png pattern in root
        screenshot_files = []
        # First try with exact known format
        i = 1
        while True:
            screenshot_path = book_path / f"screenshot {i}.png"
            if not screenshot_path.exists():
                break
            screenshot_files.append({
                'number': i,
                'file': screenshot_path,
                'path': str(screenshot_path)
            })
            i += 1
        
        if screenshot_files:
            # Process screenshot pages
            for i, page in enumerate(screenshot_files):
                is_left_page = (i % 2 == 0)
                page_info = {
                    'page_number': page['number'],
                    'file_path': page['path'].replace(' ', '%20'),  # URL encode spaces
                    'file_name': page['file'].name,
                    'is_cover': page['number'] == 1,
                    'is_left_page': is_left_page,
                    'display_name': 'Cover' if page['number'] == 1 else f'Page {page["number"]}'
                }
                pages.append(page_info)
            
            return pages
        
        # Third priority: If no numbered sequences found, try to build from any images
        image_files = sorted(
            [f for f in book_path.glob('*.png') if f.name.lower() not in ['cover.png', 'thumbnail.png']],
            key=lambda x: x.name.lower()
        )
        
        if image_files:
            # Create a sequence from the sorted image files
            for i, file in enumerate(image_files):
                is_left_page = (i % 2 == 0)
                page_info = {
                    'page_number': i + 1,  # Start at 1
                    'file_path': str(file).replace(' ', '%20'),  # URL encode spaces
                    'file_name': file.name,
                    'is_cover': i == 0,  # First file is cover
                    'is_left_page': is_left_page,
                    'display_name': 'Cover' if i == 0 else f'Page {i + 1}'
                }
                pages.append(page_info)
        
        return pages
    
    def get_summary_stats(self) -> Dict:
        """Get summary statistics of parsed books"""
        stats = {
            'total_books': len(self.book_data),
            'by_media_type': {},
            'by_category': {},
            'with_cover_images': 0,
            'with_audio': 0,
            'with_video': 0,
            'with_ar_level': 0,
            'with_lexile': 0
        }
        
        for book in self.book_data:
            # Count by media type
            media_type = book.get('Media', 'Unknown')
            stats['by_media_type'][media_type] = stats['by_media_type'].get(media_type, 0) + 1
            
            # Count by category
            category = book.get('Category', 'Unknown')
            stats['by_category'][category] = stats['by_category'].get(category, 0) + 1
            
            # Count features
            if book.get('_cover_image_path'):
                stats['with_cover_images'] += 1
            if book.get('_audio_file_count', 0) > 0:
                stats['with_audio'] += 1
            if book.get('_video_file_count', 0) > 0:
                stats['with_video'] += 1
            if book.get('AR Level'):
                stats['with_ar_level'] += 1
            if book.get('Lexile'):
                stats['with_lexile'] += 1
        
        return stats

# Example usage and testing
if __name__ == "__main__":
    # Test with the provided path
    root_path = "/Users/ethan.steigerwald/Downloads/Materials for Ethan to test and upload to ShuSpot"
    
    parser = ShuSpotFolderParser(root_path)
    
    # Parse all books
    books = parser.parse_all_books()
    
    # Show summary
    stats = parser.get_summary_stats()
    print("\n" + "="*50)
    print("PARSING SUMMARY")
    print("="*50)
    print(f"Total books found: {stats['total_books']}")
    print(f"Books with cover images: {stats['with_cover_images']}")
    print(f"Books with audio: {stats['with_audio']}")
    print(f"Books with video: {stats['with_video']}")
    print(f"Books with AR Level: {stats['with_ar_level']}")
    print(f"Books with Lexile: {stats['with_lexile']}")
    
    print("\nBy Media Type:")
    for media_type, count in stats['by_media_type'].items():
        print(f"  {media_type}: {count}")
    
    print("\nBy Category (top 10):")
    sorted_categories = sorted(stats['by_category'].items(), key=lambda x: x[1], reverse=True)
    for category, count in sorted_categories[:10]:
        print(f"  {category}: {count}")
    
    # Export sample data
    if books:
        print(f"\nSample book data:")
        sample_book = books[0]
        for key, value in sample_book.items():
            if not key.startswith('_'):
                print(f"  {key}: {value}")
    
    # Export to JSON for inspection
    parser.export_to_json("parsed_books.json")
    
    # Export Google Sheets format
    sheets_data = parser.export_to_google_sheets_format()
    with open("google_sheets_format.json", "w") as f:
        json.dump(sheets_data, f, indent=2)
    
    print(f"\nExported data to:")
    print(f"  - parsed_books.json (full data)")
    print(f"  - google_sheets_format.json (Google Sheets format)")