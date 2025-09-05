# Book Admin Tool - Parsing Reference Guide for ChatGPT

## Overview
This guide provides ChatGPT with clear reference points for modifying the parsing logic when dealing with different upload formats and metadata structures.

## Key Files to Modify

### 1. Primary Parser File
**File**: `book-admin/backend/parsers.py`
**Purpose**: Main metadata extraction logic
**Key Classes**: `MetadataParser`
**Key Methods**: 
- `parse_file_metadata()` - Main parsing entry point
- `extract_from_filename()` - Filename parsing
- `extract_from_content()` - File content parsing

### 2. TXT Ingestion Parser
**File**: `book-admin/backend/txt_ingestion.py`
**Purpose**: Parse .txt metadata files in book folders
**Key Classes**: `TxtMetadataParser`
**Key Methods**:
- `parse_txt_file()` - Parse single .txt file
- `_parse_key_value_pairs()` - Handle "Key: Value" format
- `_parse_structured_text()` - Handle natural language format
- `_parse_json_like()` - Handle JSON-like structures

### 3. Custom Script Execution
**File**: Execute via web interface "TXT Ingestion" tab → "Python Script Editor"
**Purpose**: Custom processing logic for specific formats
**Available Variables**: `parser`, `sheets_manager`, `root_directory`

## Common Modification Patterns

### Pattern 1: Adding New Filename Formats
**Location**: `parsers.py` → `MetadataParser.extract_from_filename()`
**Current Patterns**:
```python
# Author - Title format
if ' - ' in base_name:
    parts = base_name.split(' - ', 1)
    metadata['author'] = parts[0].strip()
    metadata['title'] = parts[1].strip()

# Title (Year) format  
year_match = re.search(r'\((\d{4})\)', base_name)
if year_match:
    metadata['year'] = year_match.group(1)
```

**To Add New Pattern**:
```python
# Add after existing patterns in extract_from_filename()
# [NEW PATTERN] - Your description
if 'your_pattern_indicator' in base_name:
    # Your parsing logic here
    metadata['field'] = extracted_value
```

### Pattern 2: Adding New TXT File Formats
**Location**: `txt_ingestion.py` → `TxtMetadataParser._parse_key_value_pairs()`
**Current Field Mappings**:
```python
self.field_mappings = {
    'title': ['title', 'book title', 'name', 'book name'],
    'author': ['author', 'by', 'written by', 'creator'],
    'publisher': ['publisher', 'published by', 'publication'],
    # ... more mappings
}
```

**To Add New Fields**:
```python
# Add to field_mappings in __init__()
'your_field': ['your_key1', 'your_key2', 'alternative_name'],
```

### Pattern 3: Adding New Content Extraction
**Location**: `parsers.py` → `MetadataParser.extract_from_content()`
**Current Extractors**:
- PDF metadata extraction
- DOCX properties extraction
- Audio file tags (MP3, M4A)
- Video file metadata

**To Add New Extractor**:
```python
# Add in extract_from_content() method
elif file_extension == '.your_format':
    try:
        # Your extraction logic
        metadata.update(self._extract_your_format_metadata(file_path))
    except Exception as e:
        print(f"Error extracting your_format metadata: {e}")
```

## Reference Points for ChatGPT Instructions

### 1. Filename Pattern Instructions
**Tell ChatGPT**: "Modify the filename parsing in `parsers.py` at the `extract_from_filename()` method. Add the new pattern after line X (where existing patterns are)."

**Example Instruction**:
```
In book-admin/backend/parsers.py, in the MetadataParser class, 
modify the extract_from_filename() method to handle this new pattern:
"Series Name S01E02 - Episode Title.mp4"

Add the parsing logic after the existing "Author - Title" pattern around line 45.
Extract: series_name, season, episode, episode_title
```

### 2. TXT File Format Instructions
**Tell ChatGPT**: "Modify the TXT parsing in `txt_ingestion.py` in the `TxtMetadataParser` class."

**Example Instruction**:
```
In book-admin/backend/txt_ingestion.py, modify the TxtMetadataParser class:

1. Add new field mappings in __init__() method around line 25
2. Add new parsing pattern in _parse_structured_text() method around line 85
3. Handle this new format: [show example of your TXT format]
```

### 3. Custom Script Instructions
**Tell ChatGPT**: "Create a custom Python script for the web interface that handles this specific format."

**Example Instruction**:
```
Create a Python script for the Book Admin Tool's script editor that:
1. Parses files with this specific naming convention: [your convention]
2. Extracts these fields: [list fields]
3. Applies this custom logic: [your logic]
4. Uploads to Google Sheets with proper categorization

Use the available variables: parser, sheets_manager, root_directory
```

## File Structure Reference

```
book-admin/
├── backend/
│   ├── main.py              # FastAPI endpoints - rarely modified
│   ├── parsers.py           # 🎯 PRIMARY: Filename & content parsing
│   ├── txt_ingestion.py     # 🎯 PRIMARY: TXT file parsing  
│   ├── google_sheets.py     # Google Sheets API - rarely modified
│   └── database.py          # Database models - rarely modified
├── frontend/               # UI - rarely needs parsing changes
└── example_scripts.py      # 🎯 REFERENCE: Example custom scripts
```

## Common Upload Scenarios & Solutions

### Scenario 1: New Filename Convention
**Problem**: Files named like "Grade3_Math_Addition_Workbook.pdf"
**Solution**: Modify `parsers.py` → `extract_from_filename()`
**ChatGPT Instruction**: "Add parsing for underscore-separated format with grade level prefix"

### Scenario 2: New TXT Metadata Format
**Problem**: TXT files with XML-like structure
**Solution**: Add new parsing method in `txt_ingestion.py`
**ChatGPT Instruction**: "Add XML parsing method to TxtMetadataParser class"

### Scenario 3: Bulk Processing with Custom Logic
**Problem**: Need to categorize 1000+ books by specific rules
**Solution**: Create custom script for web interface
**ChatGPT Instruction**: "Create script that applies these categorization rules: [rules]"

### Scenario 4: New File Type Support
**Problem**: Need to extract metadata from .epub files
**Solution**: Add new extractor in `parsers.py` → `extract_from_content()`
**ChatGPT Instruction**: "Add EPUB metadata extraction using ebooklib"

## Testing Your Changes

### 1. Test Single File
```python
# Test in Python console
from parsers import MetadataParser
parser = MetadataParser()
result = parser.parse_file_metadata('/path/to/test/file.ext', 'filename.ext')
print(result)
```

### 2. Test TXT Parsing
```python
# Test TXT parsing
from txt_ingestion import TxtMetadataParser
parser = TxtMetadataParser()
result = parser.parse_txt_file('/path/to/metadata.txt')
print(result)
```

### 3. Test via Web Interface
1. Upload a few test files
2. Check results in "Local Database" tab
3. Verify metadata extraction accuracy

## Quick Reference: Line Numbers (Approximate)

### parsers.py
- Line 15-30: Imports and class definition
- Line 45-80: `extract_from_filename()` method ← ADD FILENAME PATTERNS HERE
- Line 85-150: `extract_from_content()` method ← ADD CONTENT EXTRACTORS HERE
- Line 155-200: Helper methods for specific file types

### txt_ingestion.py
- Line 15-35: Field mappings dictionary ← ADD NEW FIELD MAPPINGS HERE
- Line 50-85: `_parse_key_value_pairs()` ← MODIFY KEY-VALUE PARSING HERE
- Line 90-130: `_parse_structured_text()` ← ADD NEW TEXT PATTERNS HERE
- Line 135-160: `_parse_json_like()` ← MODIFY JSON PARSING HERE

### Custom Scripts
- Use web interface: "TXT Ingestion" tab → "Show Python Script Editor"
- Available variables: `parser`, `sheets_manager`, `root_directory`
- Can access all parsing classes and methods

## Example ChatGPT Prompts

### For Filename Changes:
```
I need to modify the Book Admin Tool parsing. In the file book-admin/backend/parsers.py, 
in the MetadataParser class, modify the extract_from_filename() method around line 45-80 
to handle files named like: "Subject_Grade_Topic_BookTitle.pdf"

Extract: subject, grade_level, topic, title
Map grade_level to the reading_level field.
```

### For TXT Format Changes:
```
In book-admin/backend/txt_ingestion.py, modify the TxtMetadataParser class to handle 
TXT files with this format:
[TITLE] Book Name Here
[AUTHOR] Author Name
[GRADE] 3rd Grade
[SUBJECT] Mathematics

Add the parsing logic in the _parse_structured_text() method around line 90-130.
```

### For Custom Processing:
```
Create a Python script for the Book Admin Tool that processes a folder of books where:
- Each folder contains: book.pdf, cover.jpg, info.txt
- info.txt has format: "Title|Author|Grade|Subject"
- Need to categorize by subject and assign reading levels by grade
- Upload results to Google Sheets

Use the script editor in the web interface.
```

This reference guide gives you clear instruction points for ChatGPT to modify the parsing logic for any new upload format you encounter!