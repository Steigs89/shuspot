import os
import re
from pathlib import Path
import json
from typing import Dict, List, Optional

# Optional heavy dependencies
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    PyPDF2 = None

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    docx = None

try:
    import ebooklib
    from ebooklib import epub
    EPUB_AVAILABLE = True
except ImportError:
    EPUB_AVAILABLE = False
    ebooklib = None
    epub = None

try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    magic = None

class MetadataParser:
    """Extract metadata from various file types and filenames"""
    
    # Book type mapping based on keywords in filename or folder structure
    BOOK_TYPE_KEYWORDS = {
        "Read to Me": ["read-to-me", "readtome", "read_to_me", "narrated", "audio-story"],
        "Voice Coach": ["voice-coach", "voicecoach", "voice_coach", "pronunciation", "speaking", "practice"],
        "Audiobooks": ["audiobook", "audio-book", "audio_book", "mp3", "m4a", "wav"],
        "Video Books": ["video-book", "videobook", "video_book", "mp4", "avi", "mov", "educational-video"],
        "Books": ["book", "text", "reading", "literature", "novel", "story"]
    }
    
    # Reading level patterns
    READING_LEVEL_PATTERNS = [
        r'grade[\s-]?(\d+)',
        r'level[\s-]?([a-z]+)',
        r'(\d+)(?:st|nd|rd|th)[\s-]?grade',
        r'([a-z])[\s-]?level',
        r'pre[\s-]?k',
        r'kindergarten',
        r'k[\s-]?(\d+)'
    ]
    
    @staticmethod
    def parse_filename(filename: str) -> dict:
        """Extract title and author from filename using common patterns"""
        # Remove file extension
        name = Path(filename).stem
        
        # Common patterns for "Author - Title" or "Title - Author"
        patterns = [
            r'^(.+?)\s*-\s*(.+)$',  # "Author - Title" or "Title - Author"
            r'^(.+?)\s*by\s*(.+)$',  # "Title by Author"
            r'^(.+?)\s*\((.+?)\)$',  # "Title (Author)"
        ]
        
        for pattern in patterns:
            match = re.match(pattern, name, re.IGNORECASE)
            if match:
                part1, part2 = match.groups()
                
                # Heuristic: if part1 looks like a name (has common name patterns), it's probably author
                if MetadataParser._looks_like_author(part1):
                    return {"title": part2.strip(), "author": part1.strip()}
                else:
                    return {"title": part1.strip(), "author": part2.strip()}
        
        # If no pattern matches, use filename as title
        return {"title": name, "author": "Unknown"}
    
    @staticmethod
    def _looks_like_author(text: str) -> bool:
        """Simple heuristic to determine if text looks like an author name"""
        # Check for common author patterns
        author_indicators = [
            r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b',  # "First Last"
            r'\b[A-Z]\.\s*[A-Z][a-z]+\b',      # "F. Last"
            r'\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b', # "Last, First"
        ]
        
        for pattern in author_indicators:
            if re.search(pattern, text):
                return True
        return False
    
    @staticmethod
    def parse_pdf_metadata(file_path: str) -> dict:
        """Extract metadata from PDF files"""
        if not PDF_AVAILABLE:
            return {}
            
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                metadata = reader.metadata
                
                if metadata:
                    return {
                        "title": metadata.get('/Title', '').strip() or None,
                        "author": metadata.get('/Author', '').strip() or None,
                        "subject": metadata.get('/Subject', '').strip() or None,
                    }
        except Exception as e:
            print(f"Error parsing PDF metadata: {e}")
        
        return {}
    
    @staticmethod
    def parse_docx_metadata(file_path: str) -> dict:
        """Extract metadata from DOCX files"""
        if not DOCX_AVAILABLE:
            return {}
            
        try:
            doc = docx.Document(file_path)
            props = doc.core_properties
            
            return {
                "title": props.title or None,
                "author": props.author or None,
                "subject": props.subject or None,
            }
        except Exception as e:
            print(f"Error parsing DOCX metadata: {e}")
        
        return {}
    
    @staticmethod
    def parse_epub_metadata(file_path: str) -> dict:
        """Extract metadata from EPUB files"""
        if not EPUB_AVAILABLE:
            return {}
            
        try:
            book = epub.read_epub(file_path)
            
            title = book.get_metadata('DC', 'title')
            author = book.get_metadata('DC', 'creator')
            subject = book.get_metadata('DC', 'subject')
            
            return {
                "title": title[0][0] if title else None,
                "author": author[0][0] if author else None,
                "subject": subject[0][0] if subject else None,
            }
        except Exception as e:
            print(f"Error parsing EPUB metadata: {e}")
        
        return {}
    
    @staticmethod
    def get_file_type(file_path: str) -> str:
        """Determine file type using python-magic"""
        try:
            if MAGIC_AVAILABLE:
                mime = magic.from_file(file_path, mime=True)
                return mime
        except:
            pass
            
        # Fallback to extension
            ext = Path(file_path).suffix.lower()
            type_map = {
                '.pdf': 'application/pdf',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.doc': 'application/msword',
                '.epub': 'application/epub+zip',
                '.txt': 'text/plain',
                '.rtf': 'application/rtf'
            }
            return type_map.get(ext, 'application/octet-stream')
    
    @staticmethod
    def detect_book_type(file_path: str, filename: str, folder_path: str = None) -> str:
        """Detect book type based on filename, folder structure, and file type"""
        # Combine all text sources for analysis
        text_sources = [filename.lower()]
        
        if folder_path:
            # Add folder names to analysis
            folder_parts = Path(folder_path).parts
            text_sources.extend([part.lower() for part in folder_parts])
        
        # Check file extension for obvious types
        ext = Path(filename).suffix.lower()
        if ext in ['.mp3', '.m4a', '.wav', '.ogg']:
            return "Audiobooks"
        elif ext in ['.mp4', '.avi', '.mov', '.mkv', '.webm']:
            return "Video Books"
        
        # Check for keywords in all text sources
        combined_text = ' '.join(text_sources)
        
        for book_type, keywords in MetadataParser.BOOK_TYPE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in combined_text:
                    return book_type
        
        # Default to "Books"
        return "Books"
    
    @staticmethod
    def detect_reading_level(filename: str, folder_path: str = None) -> str:
        """Extract reading level from filename or folder structure"""
        # Combine filename and folder path for analysis
        text_sources = [filename.lower()]
        if folder_path:
            text_sources.append(folder_path.lower())
        
        combined_text = ' '.join(text_sources)
        
        for pattern in MetadataParser.READING_LEVEL_PATTERNS:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                if 'pre' in pattern or 'kindergarten' in pattern:
                    return "Pre-K"
                elif match.groups():
                    level = match.group(1)
                    # Normalize the level format
                    if level.isdigit():
                        return f"Grade {level}"
                    else:
                        return f"Level {level.upper()}"
                else:
                    return "Pre-K"
        
        return "Unknown"
    
    @staticmethod
    def find_cover_image(file_path: str) -> Optional[str]:
        """Find associated cover image for a book file"""
        book_path = Path(file_path)
        book_dir = book_path.parent
        book_stem = book_path.stem
        
        # Common cover image patterns
        cover_patterns = [
            f"{book_stem}.jpg",
            f"{book_stem}.jpeg",
            f"{book_stem}.png",
            f"{book_stem}.webp",
            f"{book_stem}_cover.jpg",
            f"{book_stem}_cover.jpeg",
            f"{book_stem}_cover.png",
            "cover.jpg",
            "cover.jpeg",
            "cover.png",
            "thumbnail.jpg",
            "thumbnail.jpeg",
            "thumbnail.png"
        ]
        
        # Look for cover images in the same directory
        for pattern in cover_patterns:
            cover_path = book_dir / pattern
            if cover_path.exists():
                return str(cover_path)
        
        # Look for images in a covers subdirectory
        covers_dir = book_dir / "covers"
        if covers_dir.exists():
            for pattern in cover_patterns:
                cover_path = covers_dir / pattern
                if cover_path.exists():
                    return str(cover_path)
        
        return None
    
    @staticmethod
    def parse_metadata_json(folder_path: str) -> Dict:
        """Parse metadata.json file if it exists in the folder"""
        metadata_file = Path(folder_path) / "metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error parsing metadata.json: {e}")
        return {}
    
    @staticmethod
    def parse_file_metadata(file_path: str, filename: str, folder_path: str = None) -> dict:
        """Enhanced method to extract all available metadata from a file"""
        
        # First try custom parsers (highest priority)
        custom_metadata = {}
        try:
            from custom_parsers import parse_with_custom_parsers
            custom_metadata = parse_with_custom_parsers(file_path, filename, folder_path)
            if custom_metadata:
                print(f"Custom parser used: {custom_metadata.get('_parser_used', 'Unknown')}")
        except ImportError:
            # Custom parsers not available
            pass
        except Exception as e:
            print(f"Error in custom parsers: {e}")
        
        # Start with filename parsing
        metadata = MetadataParser.parse_filename(filename)
        
        # Get file type
        file_type = MetadataParser.get_file_type(file_path)
        
        # Extract embedded metadata based on file type
        embedded_metadata = {}
        
        if 'pdf' in file_type:
            embedded_metadata = MetadataParser.parse_pdf_metadata(file_path)
        elif 'wordprocessingml' in file_type or 'msword' in file_type:
            embedded_metadata = MetadataParser.parse_docx_metadata(file_path)
        elif 'epub' in file_type:
            embedded_metadata = MetadataParser.parse_epub_metadata(file_path)
        
        # Parse folder metadata if available
        folder_metadata = {}
        if folder_path:
            folder_metadata = MetadataParser.parse_metadata_json(folder_path)
        
        # Detect book type and reading level
        book_type = MetadataParser.detect_book_type(file_path, filename, folder_path)
        reading_level = MetadataParser.detect_reading_level(filename, folder_path)
        
        # Find cover image
        cover_image_url = MetadataParser.find_cover_image(file_path)
        
        # Merge metadata with priority: custom > folder_metadata > embedded > filename
        final_metadata = {
            "title": (custom_metadata.get("title") or
                     folder_metadata.get("title") or 
                     embedded_metadata.get("title") or 
                     metadata.get("title", "Unknown")),
            "author": (custom_metadata.get("author") or
                      folder_metadata.get("author") or 
                      embedded_metadata.get("author") or 
                      metadata.get("author", "Unknown")),
            "genre": (custom_metadata.get("genre") or
                     folder_metadata.get("genre", "Unknown")),
            "book_type": (custom_metadata.get("book_type") or
                         folder_metadata.get("book_type", book_type)),
            "reading_level": (custom_metadata.get("reading_level") or
                             folder_metadata.get("reading_level", reading_level)),
            "cover_image_url": (custom_metadata.get("cover_image_url") or
                               folder_metadata.get("cover_image_url", cover_image_url)),
            "file_type": file_type,
            "subject": (custom_metadata.get("subject") or
                       folder_metadata.get("subject") or 
                       embedded_metadata.get("subject"))
        }
        
        # Add any additional fields from custom parser
        for key, value in custom_metadata.items():
            if key not in final_metadata and not key.startswith('_'):
                final_metadata[key] = value
        
        # Clean up metadata
        for key, value in final_metadata.items():
            if isinstance(value, str):
                final_metadata[key] = value.strip()
        
        return final_metadata