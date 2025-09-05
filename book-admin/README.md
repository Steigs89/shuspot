# Book Admin Tool - Enhanced with Google Sheets Integration

A powerful web-based tool for bulk uploading and managing book metadata for the ShuSpot platform, now with centralized Google Sheets management and TXT file ingestion capabilities.

## 🚀 New Features

### Google Sheets Integration
- **Centralized Database**: Use Google Sheets as your single source of truth for all ShuSpot content
- **Real-time Sync**: Automatic synchronization between local database and Google Sheets
- **Duplicate Detection**: Built-in deduplication checks and management
- **Bulk Operations**: Mass update attributes across thousands of books
- **Status Management**: Track book lifecycle (Active, Inactive, Deleted)

### TXT File Ingestion Pipeline
- **Metadata Parsing**: Extract book information from .txt files in book folders
- **Batch Processing**: Handle hundreds or thousands of books at once
- **Format Detection**: Automatically identify available file formats (PDF, Audio, Video)
- **Custom Scripts**: Execute Python scripts directly from the web interface

### Enhanced Management
- **Three-Tab Interface**: Local Database, Google Sheets, and TXT Ingestion
- **Advanced Filtering**: Search and filter across all data sources
- **Quality Control**: Validation and error checking for book data
- **Export Options**: Multiple export formats and sync capabilities

## Quick Start

1. **Start the admin tool**:
   ```bash
   cd book-admin
   ./start.sh
   ```

2. **Open in browser**: http://localhost:3001

3. **Choose your workflow**:
   - **Local Database**: Traditional file upload and management
   - **Google Sheets**: Centralized spreadsheet management
   - **TXT Ingestion**: Bulk import from existing book collections

## Architecture

- **Backend**: FastAPI (Python) with Google Sheets API integration
- **Frontend**: React with tabbed interface for different workflows
- **Database**: SQLite for local storage + Google Sheets for centralized management
- **File Processing**: Enhanced metadata extraction and validation
- **Script Execution**: Safe Python script execution environment

## Google Sheets Setup

### Prerequisites
1. Google Cloud Console account
2. Google Sheets API enabled
3. Service Account with JSON credentials
4. Google Sheet shared with service account

### Quick Setup
1. Navigate to "Google Sheets" tab in the admin tool
2. Upload your service account JSON credentials
3. Enter your spreadsheet name
4. Click "Connect to Google Sheets"

**Detailed setup instructions**: See [GOOGLE_SHEETS_SETUP_GUIDE.md](./GOOGLE_SHEETS_SETUP_GUIDE.md)

## TXT File Ingestion

### Supported Folder Structure
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

### TXT File Formats Supported
- **Key-Value Pairs**: `Title: Book Name`
- **Structured Text**: Natural language descriptions
- **JSON-like**: Structured data blocks
- **Mixed Formats**: Combination of above

### Usage
1. Go to "TXT Ingestion" tab
2. Enter your books directory path
3. Choose processing method:
   - **Parse Single Folder**: Test with one book
   - **Batch Parse Preview**: Preview multiple books
   - **Ingest to Google Sheets**: Full pipeline to spreadsheet

## Custom Python Scripts

Execute custom data processing scripts directly from the web interface:

```python
# Example: Parse and upload fiction books only
parser = TxtMetadataParser()
metadata_list = parser.batch_parse_folders(root_directory, 100)

fiction_books = [book for book in metadata_list 
                if 'fiction' in book.get('genre', '').lower()]

sheets_data = parser.export_to_google_sheets_format(fiction_books)

if sheets_manager:
    results = sheets_manager.bulk_add_books(sheets_data)
    print(f"Uploaded {results.get('success', 0)} fiction books")
```

**Example scripts**: See [example_scripts.py](./example_scripts.py)

## File Support

### Supported Formats
- **Documents**: PDF, DOCX, DOC, EPUB, TXT, RTF
- **Audio**: MP3, M4A, WAV, AAC
- **Video**: MP4, MOV, AVI, MKV, WEBM
- **Images**: JPG, JPEG, PNG (for covers)

### Enhanced Metadata Extraction
- **Multi-source parsing**: Filename, file content, folder structure, TXT files
- **Smart classification**: Automatic book type assignment based on available formats
- **Reading level detection**: Intelligent classification based on content analysis
- **Series detection**: Extract series information from titles
- **Quality validation**: Built-in data quality checks and validation

## Three-Tab Interface

### 1. Local Database Tab
- Traditional file upload and management
- Bulk operations on local database
- Export and filtering capabilities
- Real-time statistics

### 2. Google Sheets Tab
- **Setup Section**: Configure Google Sheets connection
- **Management Interface**: View and edit books in spreadsheet
- **Sync Operations**: Sync local database to Google Sheets
- **Duplicate Detection**: Find and resolve duplicate entries

### 3. TXT Ingestion Tab
- **Directory Processing**: Parse metadata from book folders
- **Preview Mode**: Review data before uploading
- **Custom Scripts**: Execute Python processing scripts
- **Batch Operations**: Handle large collections efficiently

## API Endpoints

### Enhanced Endpoints

#### Google Sheets Integration
- `POST /google-sheets/setup` - Configure Google Sheets connection
- `GET /google-sheets/status` - Check connection status
- `GET /google-sheets/books` - Retrieve books from spreadsheet
- `POST /google-sheets/sync-from-db` - Sync local DB to sheets
- `PUT /google-sheets/books/{id}` - Update book in spreadsheet
- `GET /google-sheets/duplicates` - Find duplicate entries

#### TXT File Ingestion
- `POST /txt-ingestion/parse-folder` - Parse single folder
- `POST /txt-ingestion/batch-parse` - Parse multiple folders
- `POST /txt-ingestion/ingest-to-sheets` - Full ingestion pipeline
- `POST /execute-python-script` - Execute custom Python scripts

#### Traditional Endpoints
- `GET /books` - List books with filtering
- `POST /upload-books` - Upload multiple files
- `PUT /books/{id}` - Update single book
- `PUT /books/bulk-update` - Update multiple books
- `DELETE /books/{id}` - Delete book
- `GET /stats` - Database statistics
- `GET /export/csv` - Export books to CSV

## Google Sheets Schema

The ShuSpot master spreadsheet includes these columns:

| Column | Description | Example |
|--------|-------------|---------|
| Name | Book title | "The Great Adventure" |
| Category | Genre/Subject classification | "Adventure Fiction", "Math" |
| Media | Content format | "PDF", "Audio", "Video" |
| URL | File path or web URL | "/path/to/book.pdf" |
| Author | Author name | "John Smith" |
| Age | Target age range | "8-10", "4-7" |
| Read time | Estimated reading time | "15 min", "1.2 hr" |
| AR Level | Accelerated Reader level | "3.5", "K.2" |
| Lexile | Lexile reading measure | "450L", "BR200L" |
| GRL | Guided Reading Level | "J", "M" |
| Pages | Number of pages | "32", "156" |
| Audiobook Length | Audio duration | "25 min", "2.5 hr" |
| Video Length | Video duration | "12 min", "45 min" |
| Status | Book status | "Active", "Inactive" |
| Date Added | Creation timestamp | "2024-01-15 10:30:00" |
| Date Modified | Last update | "2024-01-15 10:30:00" |
| Notes | Additional information | "Needs review" |

## Development

### Backend Setup
```bash
cd book-admin/backend
pip install -r requirements.txt
python main.py
```

### Frontend Setup
```bash
cd book-admin/frontend
npm install
npm start
```

### New Dependencies
- `gspread`: Google Sheets API client
- `google-auth`: Google authentication
- `pandas`: Data processing
- Enhanced metadata parsing libraries

## Configuration

### Environment Variables
- `UPLOAD_DIR`: Directory for storing uploaded files
- `DATABASE_URL`: SQLite database path
- `GOOGLE_CREDENTIALS_PATH`: Path to service account JSON (optional)

### Google Sheets Configuration
- Service account JSON credentials
- Spreadsheet name (default: "ShuSpot Books Master")
- Sheet permissions (Editor access required)

## Workflows

### Workflow 1: Traditional Upload
1. Use "Local Database" tab
2. Upload files via drag-and-drop
3. Review and edit metadata
4. Export or sync to Google Sheets

### Workflow 2: Centralized Management
1. Set up Google Sheets integration
2. Use spreadsheet as master database
3. Sync local database when needed
4. Manage all content from Google Sheets

### Workflow 3: Bulk TXT Ingestion
1. Organize books in folders with TXT metadata
2. Use "TXT Ingestion" tab
3. Parse and preview metadata
4. Upload directly to Google Sheets
5. Sync to local database if needed

### Workflow 4: Custom Processing
1. Write custom Python scripts
2. Execute from "TXT Ingestion" tab
3. Process data with custom logic
4. Upload results to Google Sheets

## Best Practices

### Data Organization
- Use consistent folder naming: "Author - Title"
- Include metadata.txt files in each book folder
- Organize cover images with standard names
- Maintain consistent genre classifications

### Google Sheets Management
- Regular duplicate detection and cleanup
- Use status fields to manage book lifecycle
- Backup spreadsheet regularly
- Monitor sync operations for errors

### Performance Optimization
- Process books in batches (50-100 at a time)
- Use preview mode before full ingestion
- Monitor system resources during large operations
- Regular database maintenance and cleanup

## Troubleshooting

### Google Sheets Issues
- **Connection failed**: Check service account permissions
- **Spreadsheet not found**: Verify sharing settings
- **API quota exceeded**: Reduce batch sizes or add delays

### TXT Ingestion Issues
- **No metadata found**: Check TXT file formats and naming
- **Parsing errors**: Review file encoding and structure
- **Missing files**: Verify folder paths and permissions

### Performance Issues
- **Slow processing**: Reduce batch sizes
- **Memory errors**: Process smaller datasets
- **Network timeouts**: Check internet connection for Google Sheets

## Integration with Main ShuSpot App

The enhanced Book Admin Tool maintains full compatibility with the main ShuSpot application:

- **Shared Database Schema**: Same table structure and field types
- **File Path Compatibility**: Consistent file organization
- **Metadata Standards**: Compatible book types and categories
- **Real-time Updates**: Changes reflect immediately in main app
- **API Compatibility**: Same endpoints and data formats

Books managed through any workflow (local upload, Google Sheets, or TXT ingestion) are immediately available in the main ShuSpot application.

## Support and Documentation

- **Setup Guide**: [GOOGLE_SHEETS_SETUP_GUIDE.md](./GOOGLE_SHEETS_SETUP_GUIDE.md)
- **Example Scripts**: [example_scripts.py](./example_scripts.py)
- **API Documentation**: Available at http://localhost:8000/docs when running
- **Frontend Interface**: Intuitive web interface with built-in help

## License

This tool is part of the ShuSpot platform and follows the same licensing terms.