import os
import re
import json
from typing import Dict, List, Optional
from pathlib import Path
import logging

class TxtMetadataParser:
    """Parse metadata from .txt files in book folders"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Common field mappings
        self.field_mappings = {
            'title': ['title', 'book title', 'name', 'book name'],
            'author': ['author', 'by', 'written by', 'creator'],
            'publisher': ['publisher', 'published by', 'publication'],
            'description': ['description', 'summary', 'about', 'synopsis', 'overview'],
            'genre': ['genre', 'category', 'type', 'classification'],
            'isbn': ['isbn', 'isbn-10', 'isbn-13'],
            'year': ['year', 'published', 'publication year', 'date'],
            'pages': ['pages', 'page count', 'length'],
            'language': ['language', 'lang'],
            'series': ['series', 'collection'],
            'reading_level': ['reading level', 'grade level', 'age group', 'target age'],
            'format': ['format', 'type', 'media type'],
            'notes': ['notes', 'comments', 'additional info']
        }
    
    def parse_txt_file(self, txt_path: str) -> Dict:
        """Parse a single .txt file and extract metadata"""
        
        if not os.path.exists(txt_path):
            return {}
        
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            self.logger.error(f"Error reading {txt_path}: {e}")
            return {}
        
        metadata = {}
        
        # Try different parsing strategies
        metadata.update(self._parse_key_value_pairs(content))
        metadata.update(self._parse_structured_text(content))
        metadata.update(self._parse_json_like(content))
        
        # Clean and normalize the data
        metadata = self._normalize_metadata(metadata)
        
        return metadata
    
    def _parse_key_value_pairs(self, content: str) -> Dict:
        """Parse key: value pairs from text"""
        metadata = {}
        
        # Look for patterns like "Title: Book Name" or "Author: Author Name"
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if ':' in line:
                parts = line.split(':', 1)
                if len(parts) == 2:
                    key = parts[0].strip().lower()
                    value = parts[1].strip()
                    
                    # Map to standard fields
                    for standard_field, variations in self.field_mappings.items():
                        if key in variations:
                            metadata[standard_field] = value
                            break
                    else:
                        # Store unmapped fields as-is
                        metadata[key] = value
        
        return metadata
    
    def _parse_structured_text(self, content: str) -> Dict:
        """Parse structured text blocks"""
        metadata = {}
        
        # Look for common patterns
        patterns = {
            'title': [
                r'title[:\s]+(.+?)(?:\n|$)',
                r'book title[:\s]+(.+?)(?:\n|$)',
                r'^(.+?)(?:\n|\r\n)',  # First line as title
            ],
            'author': [
                r'author[:\s]+(.+?)(?:\n|$)',
                r'by[:\s]+(.+?)(?:\n|$)',
                r'written by[:\s]+(.+?)(?:\n|$)',
            ],
            'description': [
                r'description[:\s]+(.+?)(?:\n\n|\r\n\r\n|$)',
                r'summary[:\s]+(.+?)(?:\n\n|\r\n\r\n|$)',
                r'about[:\s]+(.+?)(?:\n\n|\r\n\r\n|$)',
            ],
            'isbn': [
                r'isbn[:\s]*(\d{10}|\d{13}|\d{1,5}-\d{1,7}-\d{1,7}-[\dX])',
            ],
            'year': [
                r'(?:published|year)[:\s]*(\d{4})',
            ]
        }
        
        for field, field_patterns in patterns.items():
            for pattern in field_patterns:
                match = re.search(pattern, content, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                if match:
                    metadata[field] = match.group(1).strip()
                    break
        
        return metadata
    
    def _parse_json_like(self, content: str) -> Dict:
        """Try to parse JSON-like structures"""
        metadata = {}
        
        # Look for JSON blocks
        json_pattern = r'\{[^{}]*\}'
        matches = re.findall(json_pattern, content, re.DOTALL)
        
        for match in matches:
            try:
                data = json.loads(match)
                if isinstance(data, dict):
                    metadata.update(data)
            except json.JSONDecodeError:
                continue
        
        return metadata
    
    def _normalize_metadata(self, metadata: Dict) -> Dict:
        """Clean and normalize metadata"""
        normalized = {}
        
        for key, value in metadata.items():
            if not value or not isinstance(value, str):
                continue
            
            # Clean the value
            value = value.strip()
            value = re.sub(r'\s+', ' ', value)  # Normalize whitespace
            
            # Skip empty values
            if not value:
                continue
            
            # Normalize key
            key = key.lower().strip()
            
            # Map to standard fields
            mapped = False
            for standard_field, variations in self.field_mappings.items():
                if key in variations:
                    normalized[standard_field] = value
                    mapped = True
                    break
            
            if not mapped:
                normalized[key] = value
        
        return normalized
    
    def parse_folder(self, folder_path: str) -> Dict:
        """Parse all .txt files in a folder and combine metadata"""
        
        if not os.path.exists(folder_path):
            return {}
        
        combined_metadata = {}
        txt_files = []
        
        # Find all .txt files
        for file in os.listdir(folder_path):
            if file.lower().endswith('.txt'):
                txt_files.append(os.path.join(folder_path, file))
        
        # Parse each txt file
        for txt_file in txt_files:
            metadata = self.parse_txt_file(txt_file)
            
            # Merge metadata (later files override earlier ones)
            combined_metadata.update(metadata)
        
        # Add folder-based metadata
        folder_name = os.path.basename(folder_path)
        
        # Try to extract title/author from folder name
        if not combined_metadata.get('title'):
            # Common patterns: "Title - Author", "Author - Title", "Title (Year)"
            if ' - ' in folder_name:
                parts = folder_name.split(' - ', 1)
                combined_metadata['title'] = parts[0].strip()
                if len(parts) > 1:
                    combined_metadata['author'] = parts[1].strip()
            else:
                combined_metadata['title'] = folder_name
        
        return combined_metadata
    
    def batch_parse_folders(self, root_directory: str, max_folders: int = 1000) -> List[Dict]:
        """Parse metadata from multiple book folders"""
        
        if not os.path.exists(root_directory):
            self.logger.error(f"Directory not found: {root_directory}")
            return []
        
        results = []
        processed = 0
        
        for item in os.listdir(root_directory):
            if processed >= max_folders:
                break
            
            item_path = os.path.join(root_directory, item)
            
            if os.path.isdir(item_path):
                self.logger.info(f"Processing folder: {item}")
                
                metadata = self.parse_folder(item_path)
                
                if metadata:
                    # Add folder path for reference
                    metadata['folder_path'] = item_path
                    metadata['folder_name'] = item
                    
                    # Detect file types in folder
                    file_types = self._detect_file_types(item_path)
                    metadata['available_formats'] = file_types
                    
                    results.append(metadata)
                
                processed += 1
        
        self.logger.info(f"Processed {processed} folders, found {len(results)} with metadata")
        return results
    
    def _detect_file_types(self, folder_path: str) -> List[str]:
        """Detect what file types are available in the folder"""
        
        formats = []
        
        for file in os.listdir(folder_path):
            file_lower = file.lower()
            
            if file_lower.endswith(('.pdf')):
                formats.append('PDF')
            elif file_lower.endswith(('.mp3', '.m4a', '.wav', '.aac')):
                formats.append('Audio')
            elif file_lower.endswith(('.mp4', '.mov', '.avi', '.mkv', '.webm')):
                formats.append('Video')
            elif file_lower.endswith(('.epub', '.mobi')):
                formats.append('eBook')
            elif file_lower.endswith(('.docx', '.doc')):
                formats.append('Document')
        
        return list(set(formats))  # Remove duplicates
    
    def export_to_google_sheets_format(self, metadata_list: List[Dict]) -> List[Dict]:
        """Convert parsed metadata to ShuSpot Google Sheets format"""
        
        sheets_data = []
        
        for metadata in metadata_list:
            # Determine media type based on available formats
            formats = metadata.get('available_formats', [])
            if 'Video' in formats:
                media_type = 'Video'
            elif 'Audio' in formats:
                media_type = 'Audio'
            elif 'PDF' in formats:
                media_type = 'PDF'
            else:
                media_type = 'Book'
            
            # Map to ShuSpot Google Sheets schema
            sheets_row = {
                'Name': metadata.get('title', ''),
                'Category': metadata.get('genre', ''),
                'Media': media_type,
                'URL': self._find_file_path(metadata.get('folder_path', ''), ['.pdf', '.mp3', '.mp4']),
                'Author': metadata.get('author', ''),
                'Age': self._extract_age_from_reading_level(metadata.get('reading_level', '')),
                'Read time': self._estimate_read_time(metadata),
                'AR Level': metadata.get('ar_level', ''),
                'Lexile': metadata.get('lexile', ''),
                'GRL': metadata.get('grl', ''),
                'Pages': metadata.get('pages', ''),
                'Audiobook Length': self._get_audio_length(metadata.get('folder_path', '')),
                'Video Length': self._get_video_length(metadata.get('folder_path', '')),
                'Status': 'Active',
                'Notes': metadata.get('notes', '')
            }
            
            sheets_data.append(sheets_row)
        
        return sheets_data
    
    def _extract_age_from_reading_level(self, reading_level: str) -> str:
        """Convert reading level to age range"""
        if 'Pre-K' in reading_level or 'Grade 1' in reading_level or 'Grade 2' in reading_level:
            return '4-7'
        elif 'Grade 3' in reading_level or 'Grade 4' in reading_level or 'Grade 5' in reading_level:
            return '8-10'
        elif 'Grade 6' in reading_level or 'Grade 7' in reading_level or 'Grade 8' in reading_level:
            return '11-13'
        elif 'Grade 9' in reading_level or 'Grade 10' in reading_level or 'Grade 11' in reading_level or 'Grade 12' in reading_level:
            return '14-18'
        return ''
    
    def _estimate_read_time(self, metadata: Dict) -> str:
        """Estimate reading time based on pages or content"""
        pages = metadata.get('pages')
        if pages:
            try:
                page_count = int(pages)
                # Estimate 1-2 minutes per page for children's books
                minutes = page_count * 1.5
                if minutes < 60:
                    return f"{int(minutes)} min"
                else:
                    hours = minutes / 60
                    return f"{hours:.1f} hr"
            except:
                pass
        return ''
    
    def _get_audio_length(self, folder_path: str) -> str:
        """Get audio file duration if available"""
        if not folder_path or not os.path.exists(folder_path):
            return ''
        
        audio_files = []
        for file in os.listdir(folder_path):
            if file.lower().endswith(('.mp3', '.m4a', '.wav', '.aac')):
                audio_files.append(file)
        
        if audio_files:
            # For now, return placeholder - could integrate with mutagen for actual duration
            return 'TBD'
        return ''
    
    def _get_video_length(self, folder_path: str) -> str:
        """Get video file duration if available"""
        if not folder_path or not os.path.exists(folder_path):
            return ''
        
        video_files = []
        for file in os.listdir(folder_path):
            if file.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
                video_files.append(file)
        
        if video_files:
            # For now, return placeholder - could integrate with ffmpeg for actual duration
            return 'TBD'
        return ''
    
    def _determine_book_type(self, metadata: Dict) -> str:
        """Determine book type based on available formats"""
        
        formats = metadata.get('available_formats', [])
        
        if 'Video' in formats:
            return 'Video Book'
        elif 'Audio' in formats:
            return 'Audiobook'
        elif 'PDF' in formats:
            return 'Read-to-Me'
        else:
            return 'Book'
    
    def _find_file_path(self, folder_path: str, extensions: List[str]) -> str:
        """Find the first file with matching extension in folder"""
        
        if not folder_path or not os.path.exists(folder_path):
            return ''
        
        for file in os.listdir(folder_path):
            file_lower = file.lower()
            for ext in extensions:
                if file_lower.endswith(ext.lower()):
                    return os.path.join(folder_path, file)
        
        return ''


class TxtIngestionPipeline:
    """Complete pipeline for ingesting TXT metadata to Google Sheets"""
    
    def __init__(self, google_sheets_manager):
        self.sheets_manager = google_sheets_manager
        self.parser = TxtMetadataParser()
        self.logger = logging.getLogger(__name__)
    
    def ingest_from_directory(self, root_directory: str, max_folders: int = 1000) -> Dict:
        """Complete ingestion pipeline"""
        
        self.logger.info(f"Starting ingestion from: {root_directory}")
        
        # Parse all folders
        metadata_list = self.parser.batch_parse_folders(root_directory, max_folders)
        
        if not metadata_list:
            return {"error": "No metadata found"}
        
        # Convert to Google Sheets format
        sheets_data = self.parser.export_to_google_sheets_format(metadata_list)
        
        # Upload to Google Sheets
        results = self.sheets_manager.bulk_add_books(sheets_data)
        
        self.logger.info(f"Ingestion complete: {results}")
        
        return {
            "total_folders_processed": len(metadata_list),
            "books_added": results.get("success", 0),
            "duplicates_skipped": results.get("duplicates", 0),
            "errors": results.get("errors", 0)
        }