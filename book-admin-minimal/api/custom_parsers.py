"""
Custom Parsers Module
Add new parsing logic here without modifying the main parsers.py file
"""

import re
import os
import json
from typing import Dict, List, Optional
from abc import ABC, abstractmethod

class BaseCustomParser(ABC):
    """Base class for custom parsers"""
    
    @abstractmethod
    def can_parse(self, file_path: str, filename: str, folder_path: str = None) -> bool:
        """Return True if this parser can handle the given file"""
        pass
    
    @abstractmethod
    def parse(self, file_path: str, filename: str, folder_path: str = None) -> Dict:
        """Parse the file and return metadata dictionary"""
        pass
    
    def get_priority(self) -> int:
        """Return parser priority (higher = runs first)"""
        return 0

class SeriesEpisodeParser(BaseCustomParser):
    """
    Example: Parse files like "Series Name S01E02 - Episode Title.mp4"
    """
    
    def can_parse(self, file_path: str, filename: str, folder_path: str = None) -> bool:
        # Check if filename matches series pattern
        pattern = r'(.+?)\s+S(\d+)E(\d+)\s*-\s*(.+)'
        return bool(re.search(pattern, filename, re.IGNORECASE))
    
    def parse(self, file_path: str, filename: str, folder_path: str = None) -> Dict:
        base_name = os.path.splitext(filename)[0]
        pattern = r'(.+?)\s+S(\d+)E(\d+)\s*-\s*(.+)'
        match = re.search(pattern, base_name, re.IGNORECASE)
        
        if match:
            return {
                'title': match.group(4).strip(),
                'series_name': match.group(1).strip(),
                'season': int(match.group(2)),
                'episode': int(match.group(3)),
                'book_type': 'Video Book',
                'genre': 'Educational Series',
                'notes': f"Season {match.group(2)}, Episode {match.group(3)}"
            }
        return {}
    
    def get_priority(self) -> int:
        return 10  # High priority for specific pattern

class GradeLevelParser(BaseCustomParser):
    """
    Example: Parse files like "Grade3_Math_Addition_Workbook.pdf"
    """
    
    def can_parse(self, file_path: str, filename: str, folder_path: str = None) -> bool:
        pattern = r'Grade(\d+)_([^_]+)_(.+)'
        return bool(re.search(pattern, filename, re.IGNORECASE))
    
    def parse(self, file_path: str, filename: str, folder_path: str = None) -> Dict:
        base_name = os.path.splitext(filename)[0]
        pattern = r'Grade(\d+)_([^_]+)_(.+)'
        match = re.search(pattern, base_name, re.IGNORECASE)
        
        if match:
            grade = int(match.group(1))
            subject = match.group(2).replace('_', ' ').title()
            title = match.group(3).replace('_', ' ').title()
            
            # Map grade to reading level
            if grade <= 2:
                reading_level = "Pre-K to Grade 2"
            elif grade <= 5:
                reading_level = "Grade 3-5"
            elif grade <= 8:
                reading_level = "Grade 6-8"
            else:
                reading_level = "Grade 9-12"
            
            return {
                'title': title,
                'genre': subject,
                'reading_level': reading_level,
                'book_type': 'Read-to-Me',
                'notes': f"Grade {grade} {subject} material"
            }
        return {}

class PublisherSeriesParser(BaseCustomParser):
    """
    Example: Parse files like "Scholastic - Magic School Bus - The Human Body.pdf"
    """
    
    def can_parse(self, file_path: str, filename: str, folder_path: str = None) -> bool:
        # Check for Publisher - Series - Title format
        parts = filename.split(' - ')
        return len(parts) >= 3
    
    def parse(self, file_path: str, filename: str, folder_path: str = None) -> Dict:
        base_name = os.path.splitext(filename)[0]
        parts = base_name.split(' - ')
        
        if len(parts) >= 3:
            publisher = parts[0].strip()
            series = parts[1].strip()
            title = ' - '.join(parts[2:]).strip()  # In case title has dashes
            
            return {
                'title': title,
                'publisher': publisher,
                'series': series,
                'author': f"{series} Series",
                'book_type': 'Read-to-Me',
                'notes': f"Part of {series} series by {publisher}"
            }
        return {}

class FolderBasedParser(BaseCustomParser):
    """
    Example: Extract metadata from folder structure like "Author Name/Series Name/Book Title/"
    """
    
    def can_parse(self, file_path: str, filename: str, folder_path: str = None) -> bool:
        return folder_path is not None and len(folder_path.split(os.sep)) >= 3
    
    def parse(self, file_path: str, filename: str, folder_path: str = None) -> Dict:
        if not folder_path:
            return {}
        
        path_parts = folder_path.split(os.sep)
        if len(path_parts) >= 3:
            # Assuming structure: .../Author/Series/BookTitle/
            author = path_parts[-3]
            series = path_parts[-2] 
            book_folder = path_parts[-1]
            
            # Use book folder name as title if not in filename
            title = os.path.splitext(filename)[0]
            if title.lower() in ['book', 'main', 'content']:
                title = book_folder
            
            return {
                'title': title,
                'author': author,
                'series': series,
                'notes': f"From {author}/{series} collection"
            }
        return {}

class XMLMetadataParser(BaseCustomParser):
    """
    Example: Parse XML-like TXT files
    Format:
    <title>Book Name</title>
    <author>Author Name</author>
    <grade>3</grade>
    """
    
    def can_parse(self, file_path: str, filename: str, folder_path: str = None) -> bool:
        if not filename.lower().endswith('.txt'):
            return False
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(500)  # Read first 500 chars
                return '<title>' in content.lower() and '<author>' in content.lower()
        except:
            return False
    
    def parse(self, file_path: str, filename: str, folder_path: str = None) -> Dict:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            metadata = {}
            
            # Extract XML-like tags
            patterns = {
                'title': r'<title>(.*?)</title>',
                'author': r'<author>(.*?)</author>',
                'grade': r'<grade>(.*?)</grade>',
                'subject': r'<subject>(.*?)</subject>',
                'description': r'<description>(.*?)</description>',
                'isbn': r'<isbn>(.*?)</isbn>',
                'publisher': r'<publisher>(.*?)</publisher>'
            }
            
            for field, pattern in patterns.items():
                match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
                if match:
                    metadata[field] = match.group(1).strip()
            
            # Convert grade to reading level
            if 'grade' in metadata:
                try:
                    grade = int(metadata['grade'])
                    if grade <= 2:
                        metadata['reading_level'] = "Pre-K to Grade 2"
                    elif grade <= 5:
                        metadata['reading_level'] = "Grade 3-5"
                    elif grade <= 8:
                        metadata['reading_level'] = "Grade 6-8"
                    else:
                        metadata['reading_level'] = "Grade 9-12"
                except:
                    pass
            
            # Map subject to genre
            if 'subject' in metadata:
                metadata['genre'] = metadata['subject']
            
            return metadata
            
        except Exception as e:
            print(f"Error parsing XML metadata: {e}")
            return {}

class PipeDelimitedParser(BaseCustomParser):
    """
    Example: Parse TXT files with pipe-delimited format
    Format: "Title|Author|Grade|Subject|Description"
    """
    
    def can_parse(self, file_path: str, filename: str, folder_path: str = None) -> bool:
        if not filename.lower().endswith('.txt'):
            return False
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                first_line = f.readline().strip()
                return first_line.count('|') >= 3  # At least 4 fields
        except:
            return False
    
    def parse(self, file_path: str, filename: str, folder_path: str = None) -> Dict:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                first_line = f.readline().strip()
            
            parts = first_line.split('|')
            if len(parts) >= 4:
                metadata = {
                    'title': parts[0].strip(),
                    'author': parts[1].strip(),
                    'genre': parts[3].strip() if len(parts) > 3 else '',
                }
                
                # Handle grade
                if len(parts) > 2 and parts[2].strip():
                    try:
                        grade_text = parts[2].strip().lower()
                        grade = int(re.search(r'\d+', grade_text).group()) if re.search(r'\d+', grade_text) else 0
                        
                        if grade <= 2:
                            metadata['reading_level'] = "Pre-K to Grade 2"
                        elif grade <= 5:
                            metadata['reading_level'] = "Grade 3-5"
                        elif grade <= 8:
                            metadata['reading_level'] = "Grade 6-8"
                        else:
                            metadata['reading_level'] = "Grade 9-12"
                    except:
                        pass
                
                # Handle description
                if len(parts) > 4:
                    metadata['description'] = parts[4].strip()
                
                return metadata
            
        except Exception as e:
            print(f"Error parsing pipe-delimited metadata: {e}")
        
        return {}

# Registry of all custom parsers
CUSTOM_PARSERS = [
    SeriesEpisodeParser(),
    GradeLevelParser(), 
    PublisherSeriesParser(),
    FolderBasedParser(),
    XMLMetadataParser(),
    PipeDelimitedParser(),
]

def get_custom_parsers() -> List[BaseCustomParser]:
    """Get all registered custom parsers, sorted by priority"""
    return sorted(CUSTOM_PARSERS, key=lambda p: p.get_priority(), reverse=True)

def parse_with_custom_parsers(file_path: str, filename: str, folder_path: str = None) -> Dict:
    """
    Try all custom parsers and return metadata from the first one that can parse the file
    """
    for parser in get_custom_parsers():
        if parser.can_parse(file_path, filename, folder_path):
            try:
                metadata = parser.parse(file_path, filename, folder_path)
                if metadata:  # If parser returned any metadata
                    metadata['_parser_used'] = parser.__class__.__name__
                    return metadata
            except Exception as e:
                print(f"Error in {parser.__class__.__name__}: {e}")
                continue
    
    return {}

def add_custom_parser(parser: BaseCustomParser):
    """Add a new custom parser to the registry"""
    CUSTOM_PARSERS.append(parser)
    CUSTOM_PARSERS.sort(key=lambda p: p.get_priority(), reverse=True)

# Example of how to create a new parser dynamically
def create_regex_parser(name: str, pattern: str, field_mapping: Dict[int, str], priority: int = 5):
    """
    Create a simple regex-based parser
    
    Args:
        name: Parser name
        pattern: Regex pattern with capture groups
        field_mapping: Dict mapping capture group numbers to metadata fields
        priority: Parser priority
    """
    
    class DynamicRegexParser(BaseCustomParser):
        def __init__(self):
            self.name = name
            self.pattern = pattern
            self.field_mapping = field_mapping
            self.priority = priority
        
        def can_parse(self, file_path: str, filename: str, folder_path: str = None) -> bool:
            return bool(re.search(self.pattern, filename, re.IGNORECASE))
        
        def parse(self, file_path: str, filename: str, folder_path: str = None) -> Dict:
            base_name = os.path.splitext(filename)[0]
            match = re.search(self.pattern, base_name, re.IGNORECASE)
            
            if match:
                metadata = {}
                for group_num, field_name in self.field_mapping.items():
                    try:
                        value = match.group(group_num)
                        if value:
                            metadata[field_name] = value.strip()
                    except IndexError:
                        continue
                return metadata
            return {}
        
        def get_priority(self) -> int:
            return self.priority
    
    return DynamicRegexParser()

# Example usage of dynamic parser creation:
# isbn_parser = create_regex_parser(
#     name="ISBN Parser",
#     pattern=r'ISBN[:\s]*(\d{10}|\d{13})',
#     field_mapping={1: 'isbn'},
#     priority=8
# )
# add_custom_parser(isbn_parser)