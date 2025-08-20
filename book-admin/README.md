# Book Admin Tool

A localhost admin tool for bulk book uploading and metadata management.

## Features
- Bulk upload up to 500 books at once
- Automatic metadata parsing from filenames and file content
- Spreadsheet-style UI for editing metadata
- Bulk operations (edit multiple books at once)
- Search and filter functionality
- CSV export/import

## Tech Stack
- **Backend**: FastAPI + SQLite
- **Frontend**: React with AG-Grid (spreadsheet-like interface)
- **File Processing**: Python libraries for metadata extraction

## Quick Start

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

Visit http://localhost:3000 for the admin interface.

## Project Structure
```
book-admin/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models.py            # Database models
│   ├── database.py          # Database setup
│   ├── parsers.py           # Metadata parsing logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.js
│   └── package.json
└── uploads/                 # Uploaded book files
```