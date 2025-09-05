# Google Sheets Integration Setup Guide

## Overview

The Book Admin Tool now includes powerful Google Sheets integration that allows you to:

- **Centralized Management**: Use Google Sheets as your single source of truth for all ShuSpot content
- **Bulk Operations**: Mass update attributes, find duplicates, and manage thousands of books
- **TXT File Ingestion**: Parse metadata from .txt files in book folders and upload to Google Sheets
- **Custom Python Scripts**: Execute custom data processing scripts directly from the web interface
- **Real-time Sync**: Changes in Google Sheets can automatically reflect on your ShuSpot site

## Features

### 1. Google Sheets as Master Database
- Each row represents one book
- Columns include: Title, Author, Publisher, Description, Category/Genre, Format attributes, File paths, etc.
- Built-in deduplication checks (flags if Title + Author already exists)
- Status management (Active, Inactive, Deleted)

### 2. TXT File Ingestion Pipeline
- Parse metadata from .txt files in book folders
- Support for various metadata formats (key:value pairs, structured text, JSON-like)
- Batch processing of hundreds/thousands of books
- Automatic file type detection (PDF, Audio, Video, etc.)

### 3. Custom Python Script Execution
- Execute custom Python scripts directly from the web interface
- Access to parsing libraries, Google Sheets API, and file system
- Safe execution environment with output capture

## Setup Instructions

### Step 1: Google Cloud Console Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google Sheets API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

3. **Create Service Account**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in service account details
   - Click "Create and Continue"

4. **Generate JSON Key**
   - In the service account list, click on your new service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Select "JSON" format
   - Download the JSON file (keep it secure!)

### Step 2: Google Sheets Setup

1. **Create Your Master Spreadsheet**
   - Create a new Google Sheet
   - Name it "ShuSpot Books Master" (or your preferred name)

2. **Share with Service Account**
   - Open your Google Sheet
   - Click "Share" button
   - Add the service account email (found in your JSON file)
   - Give "Editor" permissions
   - Uncheck "Notify people"

### Step 3: Book Admin Tool Configuration

1. **Start the Admin Tool**
   ```bash
   cd book-admin
   ./start.sh
   ```

2. **Navigate to Google Sheets Tab**
   - Open http://localhost:3001
   - Click on "Google Sheets" tab

3. **Upload Credentials**
   - Click "Choose credentials file..."
   - Select your downloaded JSON file
   - Enter your spreadsheet name
   - Click "Connect to Google Sheets"

4. **Verify Connection**
   - You should see "Connected" status
   - The spreadsheet will be automatically created with proper headers

## Using the TXT Ingestion System

### Folder Structure Expected

```
/your/books/directory/
├── Book Title 1 - Author Name/
│   ├── book.pdf
│   ├── metadata.txt
│   ├── cover.jpg
│   └── audio.mp3
├── Book Title 2 - Author Name/
│   ├── book.pdf
│   ├── info.txt
│   └── cover.png
└── ...
```

### TXT File Format Examples

**Key-Value Format:**
```
Title: The Great Adventure
Author: John Smith
Publisher: Adventure Books Inc
Description: An exciting tale of discovery and courage
Genre: Adventure
Reading Level: Grade 5
Year: 2023
```

**Structured Text Format:**
```
The Great Adventure

By John Smith
Published by Adventure Books Inc

Description:
An exciting tale of discovery and courage that follows
a young explorer on their journey through unknown lands.

Category: Adventure Fiction
Target Age: 8-12 years
```

**JSON-like Format:**
```
{
  "title": "The Great Adventure",
  "author": "John Smith",
  "publisher": "Adventure Books Inc",
  "description": "An exciting tale of discovery and courage",
  "genre": "Adventure",
  "reading_level": "Grade 5"
}
```

### Using the Ingestion Interface

1. **Navigate to TXT Ingestion Tab**
   - Click on "TXT Ingestion" tab in the admin tool

2. **Set Root Directory**
   - Enter the path to your books directory
   - Example: `/Users/yourname/Books/ShuSpot_Collection`

3. **Choose Processing Method**
   - **Parse Single Folder**: Test with one book folder
   - **Batch Parse Preview**: Preview metadata from multiple folders
   - **Ingest to Google Sheets**: Full ingestion to your spreadsheet

4. **Monitor Progress**
   - View processing results
   - Check for duplicates and errors
   - Review parsed metadata before final upload

## Custom Python Scripts

### Example Script for Advanced Processing

```python
# Access the TXT parser
parser = TxtMetadataParser()

# Parse all folders in the root directory
metadata_list = parser.batch_parse_folders(root_directory, 100)

print(f"Found {len(metadata_list)} books with metadata")

# Filter books by criteria
fiction_books = [book for book in metadata_list 
                if 'fiction' in book.get('genre', '').lower()]

print(f"Found {len(fiction_books)} fiction books")

# Convert to Google Sheets format
sheets_data = parser.export_to_google_sheets_format(fiction_books)

# Upload to Google Sheets if connected
if sheets_manager:
    results = sheets_manager.bulk_add_books(sheets_data)
    print(f"Upload results: {results}")
    
    # Update specific fields for all uploaded books
    sheets_manager.bulk_update_books(
        {'Status': 'Active'}, 
        {'Category/Genre': 'Fiction'}
    )
else:
    print("Google Sheets not connected")
    
# Export preview
for i, book in enumerate(sheets_data[:5]):
    print(f"Book {i+1}: {book['Title']} by {book['Author']}")
    print(f"  Genre: {book['Category/Genre']}")
    print(f"  Formats: {book['Format Attributes']}")
    print()
```

### Available Variables in Scripts

- `root_directory`: The directory path you specified
- `sheets_manager`: Google Sheets manager instance (if connected)
- `TxtMetadataParser`: Parser class for TXT files
- Standard Python libraries: `os`, `json`, `pandas`

## Google Sheets Schema

The master spreadsheet includes these columns:

| Column | Description | Example |
|--------|-------------|---------|
| ID | Unique identifier | 1, 2, 3... |
| Title | Book title | "The Great Adventure" |
| Author | Author name | "John Smith" |
| Publisher | Publisher name | "Adventure Books Inc" |
| Description | Book description/summary | "An exciting tale..." |
| Category/Genre | Genre classification | "Adventure Fiction" |
| Reading Level | Target reading level | "Grade 5" |
| Book Type | Content type | "Read-to-Me", "Audiobook", etc. |
| Format Attributes | Available formats | "PDF, Audio, Video" |
| PDF Path | Path to PDF file | "/path/to/book.pdf" |
| Audio Path | Path to audio file | "/path/to/audio.mp3" |
| Video Path | Path to video file | "/path/to/video.mp4" |
| Cover Image URL | Cover image path/URL | "/path/to/cover.jpg" |
| Status | Book status | "Active", "Inactive", "Deleted" |
| Date Added | When added to system | "2024-01-15 10:30:00" |
| Date Modified | Last modification | "2024-01-15 10:30:00" |
| Notes | Additional notes | "Needs review" |
| Duplicate Check | Deduplication key | "title_author" |

## Management Features

### Duplicate Detection
- Automatically flags potential duplicates based on Title + Author
- View duplicates in a dedicated interface
- Bulk actions to resolve duplicates

### Bulk Operations
- Mass update any field across multiple books
- Filter and select books by criteria
- Status management (activate/deactivate/delete)

### Sync with Local Database
- One-click sync from local database to Google Sheets
- Preserves existing Google Sheets data
- Handles conflicts intelligently

## Troubleshooting

### Common Issues

1. **"Permission denied" error**
   - Ensure service account has Editor access to the spreadsheet
   - Check that the JSON credentials file is valid

2. **"Spreadsheet not found" error**
   - Verify the spreadsheet name matches exactly
   - Ensure the spreadsheet is shared with the service account

3. **TXT parsing returns empty results**
   - Check that .txt files exist in the book folders
   - Verify the metadata format is supported
   - Try parsing a single folder first to debug

4. **Script execution fails**
   - Check Python syntax in the script editor
   - Ensure you're using only allowed libraries
   - Review the error message in the output

### Getting Help

- Check the browser console for detailed error messages
- Review the backend logs in the terminal
- Test with a small subset of data first
- Verify all file paths are correct and accessible

## Best Practices

1. **Start Small**: Test with a few books before processing thousands
2. **Backup Data**: Keep backups of your Google Sheet and local database
3. **Consistent Naming**: Use consistent folder and file naming conventions
4. **Regular Sync**: Sync your local database with Google Sheets regularly
5. **Monitor Duplicates**: Regularly check for and resolve duplicates
6. **Status Management**: Use status fields to manage book lifecycle

## API Integration

The Google Sheets integration provides endpoints for external systems:

- `GET /google-sheets/books` - Retrieve books from sheets
- `PUT /google-sheets/books/{id}` - Update specific book
- `POST /google-sheets/sync-from-db` - Sync local DB to sheets
- `GET /google-sheets/duplicates` - Find duplicate entries

This allows your main ShuSpot application to read directly from the Google Sheets master database, ensuring consistency across all systems.