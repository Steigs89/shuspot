# ChatGPT Instruction Template for Book Admin Tool Parsing

## Quick Reference for ChatGPT Instructions

Use these templates when asking ChatGPT to modify the Book Download Tool parsing logic for new upload formats.

---

## Template 1: Adding New Filename Pattern

**Use when**: You have files with a specific naming convention that needs custom parsing.

### ChatGPT Instruction:
```
I need to modify the Book Admin Tool to handle a new filename pattern.

CONTEXT:
- File location: book-admin/backend/custom_parsers.py
- I need to add a new custom parser class
- The files are named like: [DESCRIBE YOUR PATTERN]
- I need to extract: [LIST THE FIELDS YOU WANT]

TASK:
Create a new custom parser class in book-admin/backend/custom_parsers.py that:

1. Inherits from BaseCustomParser
2. Implements can_parse() to detect files matching this pattern: [YOUR PATTERN]
3. Implements parse() to extract these fields: [YOUR FIELDS]
4. Sets appropriate priority (higher number = runs first)
5. Add the new parser to the CUSTOM_PARSERS list at the bottom

EXAMPLE FILES:
- Input: "[EXAMPLE FILENAME]"
- Expected output: {"title": "...", "author": "...", etc.}

REFERENCE:
Look at the existing SeriesEpisodeParser and GradeLevelParser classes as examples.
```

### Example Usage:
```
I need to modify the Book Admin Tool to handle a new filename pattern.

CONTEXT:
- File location: book-admin/backend/custom_parsers.py
- I need to add a new custom parser class
- The files are named like: "Publisher_SeriesName_BookNumber_Title.pdf"
- I need to extract: publisher, series_name, book_number, title

TASK:
Create a new custom parser class in book-admin/backend/custom_parsers.py that:

1. Inherits from BaseCustomParser
2. Implements can_parse() to detect files matching this pattern: "Publisher_SeriesName_BookNumber_Title.pdf"
3. Implements parse() to extract publisher, series_name, book_number, title
4. Sets priority to 8
5. Add the new parser to the CUSTOM_PARSERS list at the bottom

EXAMPLE FILES:
- Input: "Scholastic_MagicSchoolBus_03_HumanBody.pdf"
- Expected output: {"title": "Human Body", "publisher": "Scholastic", "series": "Magic School Bus", "book_number": "03"}
```

---

## Template 2: Adding New TXT File Format

**Use when**: You have .txt metadata files in a new format that needs parsing.

### ChatGPT Instruction:
```
I need to modify the Book Admin Tool to handle a new TXT metadata format.

CONTEXT:
- File location: book-admin/backend/txt_ingestion.py
- Modify the TxtMetadataParser class
- The TXT files have this format: [DESCRIBE FORMAT]
- I need to extract: [LIST FIELDS]

TASK:
In book-admin/backend/txt_ingestion.py, modify the TxtMetadataParser class:

1. Add new field mappings in the __init__() method around line 25 if needed
2. Create a new parsing method called _parse_[YOUR_FORMAT_NAME]()
3. Call this new method from the parse_txt_file() method around line 45
4. Handle this specific format: [SHOW EXAMPLE]

EXAMPLE TXT CONTENT:
[PASTE YOUR TXT FILE EXAMPLE]

EXPECTED OUTPUT:
{"title": "...", "author": "...", etc.}

REFERENCE:
Look at existing methods like _parse_key_value_pairs() and _parse_structured_text()
```

### Example Usage:
```
I need to modify the Book Admin Tool to handle a new TXT metadata format.

CONTEXT:
- File location: book-admin/backend/txt_ingestion.py
- Modify the TxtMetadataParser class
- The TXT files have XML-like tags
- I need to extract: title, author, grade, subject

TASK:
In book-admin/backend/txt_ingestion.py, modify the TxtMetadataParser class:

1. Create a new parsing method called _parse_xml_tags()
2. Call this method from parse_txt_file() around line 45
3. Handle this format with XML-like tags

EXAMPLE TXT CONTENT:
<title>The Great Adventure</title>
<author>John Smith</author>
<grade>3</grade>
<subject>Reading</subject>

EXPECTED OUTPUT:
{"title": "The Great Adventure", "author": "John Smith", "reading_level": "Grade 3-5", "genre": "Reading"}
```

---

## Template 3: Creating Custom Processing Script

**Use when**: You need complex logic that can't be handled by simple parsers.

### ChatGPT Instruction:
```
I need a custom Python script for the Book Admin Tool's script editor.

CONTEXT:
- This will be executed in the web interface under "TXT Ingestion" → "Python Script Editor"
- Available variables: parser, sheets_manager, root_directory, TxtMetadataParser
- I have this folder structure: [DESCRIBE STRUCTURE]
- I need this processing logic: [DESCRIBE LOGIC]

TASK:
Create a Python script that:

1. Uses TxtMetadataParser to parse folders
2. Applies this custom logic: [YOUR LOGIC]
3. Processes files in this directory structure: [YOUR STRUCTURE]
4. Uploads results to Google Sheets if connected
5. Provides detailed output of what was processed

FOLDER STRUCTURE:
[DESCRIBE YOUR FOLDER LAYOUT]

PROCESSING RULES:
[LIST YOUR SPECIFIC RULES]

OUTPUT:
The script should print progress and results for monitoring.
```

### Example Usage:
```
I need a custom Python script for the Book Admin Tool's script editor.

CONTEXT:
- This will be executed in the web interface under "TXT Ingestion" → "Python Script Editor"
- Available variables: parser, sheets_manager, root_directory, TxtMetadataParser
- I have folders organized by grade level with mixed content types
- I need to categorize books by reading level and assign book types based on file extensions

TASK:
Create a Python script that:

1. Uses TxtMetadataParser to parse folders
2. Categorizes books by grade level (K-2, 3-5, 6-8, 9-12)
3. Assigns book types: PDF=Read-to-Me, MP3=Audiobook, MP4=Video Book
4. Only processes folders that contain both a PDF and metadata.txt
5. Uploads results to Google Sheets if connected

FOLDER STRUCTURE:
/Grade1/BookTitle/book.pdf + metadata.txt
/Grade3/BookTitle/book.pdf + audio.mp3 + metadata.txt

PROCESSING RULES:
- Skip folders without metadata.txt
- Prefer audio/video over PDF for book type
- Map grade numbers to reading levels
- Add grade info to notes field
```

---

## Template 4: Modifying Existing Parser Logic

**Use when**: You need to enhance the main parsing logic in parsers.py.

### ChatGPT Instruction:
```
I need to modify the main parsing logic in the Book Admin Tool.

CONTEXT:
- File location: book-admin/backend/parsers.py
- Modify the MetadataParser class
- Current issue: [DESCRIBE PROBLEM]
- Need to add: [DESCRIBE ENHANCEMENT]

TASK:
In book-admin/backend/parsers.py, modify the MetadataParser class:

1. Location to modify: [METHOD NAME] around line [APPROXIMATE LINE]
2. Current behavior: [WHAT IT DOES NOW]
3. New behavior needed: [WHAT YOU WANT]
4. Handle these cases: [SPECIFIC CASES]

CURRENT CODE ISSUE:
[DESCRIBE WHAT'S NOT WORKING]

DESIRED BEHAVIOR:
[DESCRIBE WHAT YOU WANT TO HAPPEN]

EXAMPLE:
- Input: [EXAMPLE INPUT]
- Current output: [CURRENT RESULT]
- Desired output: [DESIRED RESULT]
```

---

## Template 5: Testing New Parser

**Use when**: You want to test your new parsing logic.

### ChatGPT Instruction:
```
I need to test the new parser I just added to the Book Admin Tool.

CONTEXT:
- I added a new parser: [PARSER NAME]
- File location: book-admin/backend/custom_parsers.py
- I want to test it with: [TEST FILES]

TASK:
Create a simple Python test script that:

1. Imports the new parser from custom_parsers
2. Tests it against these sample files: [LIST FILES]
3. Shows the parsed metadata output
4. Compares with standard parser results
5. Validates the expected fields are extracted correctly

TEST FILES:
[LIST YOUR TEST FILES WITH EXPECTED RESULTS]

VALIDATION:
Check that these fields are extracted: [LIST EXPECTED FIELDS]
```

---

## Quick Command Reference

### Test a Parser via API:
```bash
curl -X POST "http://localhost:8000/custom-parsers/test" \
  -F "file_path=/path/to/test/file.pdf" \
  -F "filename=test_file.pdf"
```

### List All Parsers:
```bash
curl "http://localhost:8000/custom-parsers"
```

### Create Regex Parser via API:
```bash
curl -X POST "http://localhost:8000/custom-parsers/create-regex" \
  -F "name=MyParser" \
  -F "pattern=(.+)_(\d+)\.pdf" \
  -F "field_mapping={\"1\":\"title\",\"2\":\"number\"}" \
  -F "priority=7"
```

---

## File Locations Quick Reference

| Task | File to Modify | Method/Section |
|------|----------------|----------------|
| New filename pattern | `custom_parsers.py` | Add new class inheriting BaseCustomParser |
| New TXT format | `txt_ingestion.py` | Add method to TxtMetadataParser |
| Main parsing logic | `parsers.py` | Modify MetadataParser methods |
| Custom processing | Web interface | Script editor in TXT Ingestion tab |
| Test parsers | API endpoints | `/custom-parsers/test` |

---

## Common Field Mappings

| Source Field | Target Field | Notes |
|--------------|--------------|-------|
| grade, level | reading_level | Map numbers to ranges |
| subject, category | genre | Subject classification |
| series, collection | series | Series information |
| description, summary | description | Book description |
| isbn, id | isbn | Unique identifier |
| publisher, press | publisher | Publishing company |

---

## Priority Guidelines

- **10+**: Very specific patterns (e.g., series with episodes)
- **5-9**: Common patterns (e.g., grade levels, publishers)
- **1-4**: General patterns (e.g., folder structure)
- **0**: Fallback parsers

Use these templates to give ChatGPT clear, specific instructions for modifying your Book Admin Tool parsing logic!