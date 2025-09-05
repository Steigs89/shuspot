# Example Python Scripts for Book Admin Tool
# Copy and paste these into the script editor

# ============================================================================
# SCRIPT 1: Basic TXT File Ingestion
# ============================================================================

"""
Basic script to parse TXT files and upload to Google Sheets
"""

# Initialize the parser
parser = TxtMetadataParser()

# Parse all folders in the root directory (limit to 50 for testing)
metadata_list = parser.batch_parse_folders(root_directory, 50)

print(f"Found {len(metadata_list)} books with metadata")

# Show preview of first 5 books
for i, book in enumerate(metadata_list[:5]):
    print(f"\nBook {i+1}:")
    print(f"  Title: {book.get('title', 'Unknown')}")
    print(f"  Author: {book.get('author', 'Unknown')}")
    print(f"  Genre: {book.get('genre', 'Unknown')}")
    print(f"  Available formats: {book.get('available_formats', [])}")

# Convert to Google Sheets format
sheets_data = parser.export_to_google_sheets_format(metadata_list)

# Upload to Google Sheets if connected
if sheets_manager:
    results = sheets_manager.bulk_add_books(sheets_data)
    print(f"\nUpload Results:")
    print(f"  Successfully added: {results.get('success', 0)} books")
    print(f"  Duplicates skipped: {results.get('duplicates', 0)} books")
    print(f"  Errors: {results.get('errors', 0)} books")
else:
    print("\nGoogle Sheets not connected - showing preview only")

# ============================================================================
# SCRIPT 2: Filter and Process Specific Genres
# ============================================================================

"""
Process only books from specific genres
"""

# Initialize parser
parser = TxtMetadataParser()
metadata_list = parser.batch_parse_folders(root_directory, 100)

# Define genres you want to process
target_genres = ['fiction', 'adventure', 'mystery', 'fantasy', 'science fiction']

# Filter books by genre
filtered_books = []
for book in metadata_list:
    genre = book.get('genre', '').lower()
    if any(target in genre for target in target_genres):
        filtered_books.append(book)

print(f"Found {len(filtered_books)} books matching target genres")
print(f"Target genres: {', '.join(target_genres)}")

# Convert and upload
sheets_data = parser.export_to_google_sheets_format(filtered_books)

if sheets_manager:
    results = sheets_manager.bulk_add_books(sheets_data)
    print(f"Uploaded {results.get('success', 0)} genre-specific books")

# ============================================================================
# SCRIPT 3: Reading Level Classification
# ============================================================================

"""
Automatically classify books by reading level based on various criteria
"""

import re

def classify_reading_level(book_data):
    """Classify reading level based on available information"""
    
    title = book_data.get('title', '').lower()
    description = book_data.get('description', '').lower()
    genre = book_data.get('genre', '').lower()
    
    # Early readers indicators
    early_indicators = ['first', 'beginning', 'easy', 'simple', 'picture book']
    if any(indicator in title or indicator in description for indicator in early_indicators):
        return 'Pre-K to Grade 2'
    
    # Elementary indicators
    elementary_indicators = ['elementary', 'chapter book', 'young reader']
    if any(indicator in title or indicator in description for indicator in elementary_indicators):
        return 'Grade 3-5'
    
    # Middle grade indicators
    middle_indicators = ['middle grade', 'tween', 'ages 8-12', 'ages 9-13']
    if any(indicator in description for indicator in middle_indicators):
        return 'Grade 6-8'
    
    # Young adult indicators
    ya_indicators = ['young adult', 'teen', 'ages 13+', 'high school']
    if any(indicator in description for indicator in ya_indicators):
        return 'Grade 9-12'
    
    # Genre-based classification
    if 'picture' in genre or 'early' in genre:
        return 'Pre-K to Grade 2'
    elif 'middle' in genre:
        return 'Grade 6-8'
    elif 'young adult' in genre or 'teen' in genre:
        return 'Grade 9-12'
    
    # Default classification
    return 'Grade 3-5'

# Process books
parser = TxtMetadataParser()
metadata_list = parser.batch_parse_folders(root_directory, 100)

# Classify reading levels
for book in metadata_list:
    if not book.get('reading_level'):
        book['reading_level'] = classify_reading_level(book)

print("Reading level classification complete:")
level_counts = {}
for book in metadata_list:
    level = book.get('reading_level', 'Unknown')
    level_counts[level] = level_counts.get(level, 0) + 1

for level, count in level_counts.items():
    print(f"  {level}: {count} books")

# Upload with reading levels
sheets_data = parser.export_to_google_sheets_format(metadata_list)

if sheets_manager:
    results = sheets_manager.bulk_add_books(sheets_data)
    print(f"Uploaded {results.get('success', 0)} books with reading level classification")

# ============================================================================
# SCRIPT 4: Duplicate Detection and Cleanup
# ============================================================================

"""
Find and report potential duplicates before uploading
"""

parser = TxtMetadataParser()
metadata_list = parser.batch_parse_folders(root_directory, 200)

# Create duplicate detection
seen_books = {}
duplicates = []

for book in metadata_list:
    title = book.get('title', '').lower().strip()
    author = book.get('author', '').lower().strip()
    
    # Create a key for duplicate detection
    key = f"{title}_{author}"
    
    if key in seen_books:
        duplicates.append({
            'key': key,
            'original': seen_books[key],
            'duplicate': book
        })
    else:
        seen_books[key] = book

print(f"Processed {len(metadata_list)} books")
print(f"Found {len(duplicates)} potential duplicates")

if duplicates:
    print("\nPotential duplicates:")
    for i, dup in enumerate(duplicates[:10]):  # Show first 10
        print(f"\n{i+1}. {dup['key']}")
        print(f"   Original folder: {dup['original'].get('folder_name', 'Unknown')}")
        print(f"   Duplicate folder: {dup['duplicate'].get('folder_name', 'Unknown')}")

# Remove duplicates (keep first occurrence)
unique_books = list(seen_books.values())
print(f"\nAfter deduplication: {len(unique_books)} unique books")

# Upload unique books only
sheets_data = parser.export_to_google_sheets_format(unique_books)

if sheets_manager:
    results = sheets_manager.bulk_add_books(sheets_data)
    print(f"Uploaded {results.get('success', 0)} unique books")

# ============================================================================
# SCRIPT 5: File Format Analysis and Book Type Assignment
# ============================================================================

"""
Analyze available file formats and assign appropriate book types
"""

def determine_book_type(available_formats, title, description):
    """Determine the most appropriate book type based on available formats"""
    
    formats = [f.lower() for f in available_formats]
    title_lower = title.lower()
    desc_lower = description.lower()
    
    # Video book - has video files
    if 'video' in formats:
        return 'Video Book'
    
    # Audiobook - has audio files
    if 'audio' in formats:
        # Check if it's specifically for voice coaching
        if 'voice' in title_lower or 'pronunciation' in desc_lower or 'speaking' in desc_lower:
            return 'Voice Coach'
        else:
            return 'Audiobook'
    
    # PDF-based books
    if 'pdf' in formats:
        # Check for read-along indicators
        if 'read along' in title_lower or 'read-along' in title_lower:
            return 'Read-Along'
        elif 'voice' in title_lower or 'coach' in title_lower:
            return 'Voice Coach'
        else:
            return 'Read-to-Me'
    
    # eBook formats
    if any(fmt in formats for fmt in ['epub', 'mobi']):
        return 'eBook'
    
    # Default
    return 'Book'

# Process books
parser = TxtMetadataParser()
metadata_list = parser.batch_parse_folders(root_directory, 100)

# Analyze formats and assign book types
format_analysis = {}
type_counts = {}

for book in metadata_list:
    formats = book.get('available_formats', [])
    title = book.get('title', '')
    description = book.get('description', '')
    
    # Determine book type
    book_type = determine_book_type(formats, title, description)
    book['book_type'] = book_type
    
    # Count formats
    for fmt in formats:
        format_analysis[fmt] = format_analysis.get(fmt, 0) + 1
    
    # Count types
    type_counts[book_type] = type_counts.get(book_type, 0) + 1

print("File Format Analysis:")
for fmt, count in sorted(format_analysis.items()):
    print(f"  {fmt}: {count} books")

print("\nBook Type Distribution:")
for book_type, count in sorted(type_counts.items()):
    print(f"  {book_type}: {count} books")

# Upload with book types
sheets_data = parser.export_to_google_sheets_format(metadata_list)

if sheets_manager:
    results = sheets_manager.bulk_add_books(sheets_data)
    print(f"\nUploaded {results.get('success', 0)} books with format analysis")

# ============================================================================
# SCRIPT 6: Custom Metadata Enhancement
# ============================================================================

"""
Enhance metadata with custom logic and external data
"""

import re

def enhance_metadata(book_data):
    """Add custom enhancements to book metadata"""
    
    title = book_data.get('title', '')
    author = book_data.get('author', '')
    description = book_data.get('description', '')
    
    # Extract series information from title
    series_match = re.search(r'(.+?)\s+(?:Book|Vol\.?|#)\s*(\d+)', title, re.IGNORECASE)
    if series_match:
        book_data['series'] = series_match.group(1).strip()
        book_data['series_number'] = series_match.group(2)
    
    # Extract age ranges from description
    age_match = re.search(r'ages?\s+(\d+)[-\s]*(?:to\s+)?(\d+)?', description, re.IGNORECASE)
    if age_match:
        min_age = age_match.group(1)
        max_age = age_match.group(2) or min_age
        book_data['age_range'] = f"{min_age}-{max_age} years"
    
    # Detect educational content
    educational_keywords = ['learn', 'teach', 'education', 'curriculum', 'lesson', 'study']
    if any(keyword in description.lower() for keyword in educational_keywords):
        book_data['educational'] = 'Yes'
    else:
        book_data['educational'] = 'No'
    
    # Extract ISBN if present
    isbn_match = re.search(r'isbn[:\s]*(\d{10}|\d{13})', description, re.IGNORECASE)
    if isbn_match:
        book_data['isbn'] = isbn_match.group(1)
    
    # Generate tags based on content
    tags = []
    if 'adventure' in description.lower():
        tags.append('adventure')
    if 'magic' in description.lower() or 'wizard' in description.lower():
        tags.append('fantasy')
    if 'animal' in description.lower():
        tags.append('animals')
    if 'friend' in description.lower():
        tags.append('friendship')
    
    if tags:
        book_data['tags'] = ', '.join(tags)
    
    return book_data

# Process and enhance books
parser = TxtMetadataParser()
metadata_list = parser.batch_parse_folders(root_directory, 100)

enhanced_count = 0
for book in metadata_list:
    original_keys = set(book.keys())
    enhanced_book = enhance_metadata(book)
    new_keys = set(enhanced_book.keys())
    
    if new_keys > original_keys:
        enhanced_count += 1

print(f"Enhanced {enhanced_count} books with additional metadata")

# Show enhancement examples
print("\nEnhancement examples:")
for i, book in enumerate(metadata_list[:3]):
    print(f"\nBook {i+1}: {book.get('title', 'Unknown')}")
    if book.get('series'):
        print(f"  Series: {book['series']} #{book.get('series_number', '?')}")
    if book.get('age_range'):
        print(f"  Age Range: {book['age_range']}")
    if book.get('educational'):
        print(f"  Educational: {book['educational']}")
    if book.get('tags'):
        print(f"  Tags: {book['tags']}")

# Convert and upload enhanced data
sheets_data = parser.export_to_google_sheets_format(metadata_list)

if sheets_manager:
    results = sheets_manager.bulk_add_books(sheets_data)
    print(f"\nUploaded {results.get('success', 0)} enhanced books")

# ============================================================================
# SCRIPT 7: Quality Control and Validation
# ============================================================================

"""
Validate book data quality and flag issues
"""

def validate_book_data(book_data):
    """Validate book data and return list of issues"""
    issues = []
    
    # Required fields check
    required_fields = ['title', 'author']
    for field in required_fields:
        if not book_data.get(field) or book_data[field].strip() == '':
            issues.append(f"Missing {field}")
    
    # Title validation
    title = book_data.get('title', '')
    if len(title) < 3:
        issues.append("Title too short")
    if len(title) > 200:
        issues.append("Title too long")
    
    # Author validation
    author = book_data.get('author', '')
    if author and len(author) < 2:
        issues.append("Author name too short")
    
    # Description validation
    description = book_data.get('description', '')
    if description and len(description) < 10:
        issues.append("Description too short")
    
    # File format validation
    formats = book_data.get('available_formats', [])
    if not formats:
        issues.append("No file formats detected")
    
    # Genre validation
    genre = book_data.get('genre', '')
    if not genre:
        issues.append("Missing genre")
    
    return issues

# Process and validate books
parser = TxtMetadataParser()
metadata_list = parser.batch_parse_folders(root_directory, 100)

valid_books = []
invalid_books = []
all_issues = []

for book in metadata_list:
    issues = validate_book_data(book)
    
    if issues:
        invalid_books.append({
            'book': book,
            'issues': issues
        })
        all_issues.extend(issues)
    else:
        valid_books.append(book)

print(f"Validation Results:")
print(f"  Valid books: {len(valid_books)}")
print(f"  Books with issues: {len(invalid_books)}")

# Show most common issues
issue_counts = {}
for issue in all_issues:
    issue_counts[issue] = issue_counts.get(issue, 0) + 1

print(f"\nMost common issues:")
for issue, count in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  {issue}: {count} books")

# Show examples of problematic books
if invalid_books:
    print(f"\nExamples of books with issues:")
    for i, item in enumerate(invalid_books[:5]):
        book = item['book']
        issues = item['issues']
        print(f"\n{i+1}. {book.get('title', 'Unknown Title')}")
        print(f"   Folder: {book.get('folder_name', 'Unknown')}")
        print(f"   Issues: {', '.join(issues)}")

# Upload only valid books
if valid_books:
    sheets_data = parser.export_to_google_sheets_format(valid_books)
    
    if sheets_manager:
        results = sheets_manager.bulk_add_books(sheets_data)
        print(f"\nUploaded {results.get('success', 0)} validated books")
else:
    print("\nNo valid books to upload - please fix validation issues first")

print(f"\nQuality control complete. Review issues above before proceeding.")