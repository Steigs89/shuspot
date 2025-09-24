# Database Manipulation Guide

This guide explains how to use the various database manipulation tools to test and modify your ShuSpot book database.

## 🚀 Quick Start

### 1. Test Your Manifest Import

```bash
cd book-admin/tools
python test_manifest_import.py
```

This will:
- Create a test database (`test_books.db`)
- Import your Solar System manifest
- Test basic modifications
- Export the results

### 2. Run Comprehensive Tests

```bash
python test_database_operations.py
```

This runs all test scenarios including:
- URL restructuring
- Page manipulation
- Batch operations
- Folder structure changes

## 📚 Available Tools

### 1. Basic Database Manipulator (`database_manipulator.py`)

**Import a manifest:**
```bash
python database_manipulator.py import manifest_Our_Solar_System_ready.json
```

**List all books:**
```bash
python database_manipulator.py list
```

**Get book details:**
```bash
python database_manipulator.py details 12
```

**Update a book field:**
```bash
python database_manipulator.py update 12 description "New description here"
```

**Search books:**
```bash
python database_manipulator.py search "Solar System"
```

**Export books:**
```bash
python database_manipulator.py export my_export.json --books 12 13 14
```

### 2. Advanced Database Manipulator (`advanced_db_manipulator.py`)

**Update URL structure:**
```bash
python advanced_db_manipulator.py update-urls 12 "old-domain\.com" "new-domain.com"
```

**Batch update URLs for all books:**
```bash
python advanced_db_manipulator.py batch-urls "CROP-ShuSpot" "ShuSpot-Books"
```

**Validate book URLs:**
```bash
python advanced_db_manipulator.py validate 12
```

**Reorder pages:**
```bash
python advanced_db_manipulator.py reorder 12 3 1 2 4 5 6 7 8 9 10
```

## 🔧 Common Use Cases

### Scenario 1: Change Folder Structure

If you need to update URLs from one folder structure to another:

```python
from advanced_db_manipulator import AdvancedDatabaseManipulator

db = AdvancedDatabaseManipulator("books.db")

# Change from "Our%20Solar%20System" to "Solar_System"
db.batch_update_urls(r"Our%20Solar%20System", "Solar_System")

# Change from "resized" to "optimized"
db.batch_update_urls(r"/resized/", "/optimized/")
```

### Scenario 2: Fix URL Encoding Issues

```python
# Fix spaces in URLs
db.batch_update_urls(r"%20", "_")

# Fix multiple slashes
db.batch_update_urls(r"/+", "/")
```

### Scenario 3: Reorder Book Pages

```python
# If pages are out of order, reorder them
new_order = [1, 3, 2, 4, 5, 6, 7, 8, 9, 10]  # Move page 3 before page 2
db.reorder_pages(book_id, new_order)
```

### Scenario 4: Add Missing Pages

```python
# Add missing pages
missing_pages = {
    23: "https://example.com/books/page-23.png",
    24: "https://example.com/books/page-24.png"
}
db.add_missing_pages(book_id, missing_pages)
```

## 🌐 Frontend Manifest Generation

### Using the Web Interface

1. Open your book admin frontend
2. Click on the "Generate Manifest" tab
3. Enter the folder path containing your book files
4. Fill in the book metadata (title, author, etc.)
5. Click "Generate Manifest"
6. Download or upload the generated manifest

### Folder Structure Expected

```
/path/to/book/folder/
├── page-1.png
├── page-2.png
├── page-3.png
├── ...
├── audio/
│   ├── page-1.mp3
│   ├── page-2.mp3
│   └── ...
└── cover.png (optional)
```

## 🧪 Testing Scenarios

### Test Different Folder Structures

The tools can handle various folder structures:

1. **Standard Structure:**
   ```
   BookName/
   ├── images/
   │   ├── page-1.png
   │   └── page-2.png
   └── audio/
       ├── page-1.mp3
       └── page-2.mp3
   ```

2. **Flat Structure:**
   ```
   BookName/
   ├── page-1.png
   ├── page-2.png
   ├── page-1.mp3
   └── page-2.mp3
   ```

3. **Nested Structure:**
   ```
   BookName/
   ├── content/
   │   ├── images/
   │   └── audio/
   └── metadata.json
   ```

### URL Pattern Examples

Common URL patterns you might need to change:

```python
# From Supabase storage to local files
old_pattern = r"https://.*\.supabase\.co/storage/v1/object/public/books/"
new_pattern = "http://localhost:3000/books/"

# From encoded spaces to underscores
old_pattern = r"%20"
new_pattern = "_"

# From one folder structure to another
old_pattern = r"CROP-ShuSpot/Our%20Solar%20System"
new_pattern = "Books/Solar_System"
```

## 🔍 Debugging Tips

### Check Database Contents

```python
from database_manipulator import DatabaseManipulator

db = DatabaseManipulator("books.db")
books = db.list_books()
for book in books:
    print(f"Book ID: {book[0]}, Title: {book[1]}")
```

### Validate All URLs

```python
from advanced_db_manipulator import AdvancedDatabaseManipulator

db = AdvancedDatabaseManipulator("books.db")
books = db.list_books()

for book in books:
    book_id = book[0]
    print(f"\nValidating book {book_id}: {book[1]}")
    db.validate_urls(book_id)
```

### Export for Inspection

```python
# Export specific books for inspection
db.export_to_manifest("debug_export.json", [12, 13, 14])
```

## 📝 Best Practices

1. **Always use test databases first:**
   ```python
   db = DatabaseManipulator("test_books.db")  # Use test DB
   ```

2. **Backup before major changes:**
   ```bash
   cp books.db books_backup.db
   ```

3. **Test URL patterns on one book first:**
   ```python
   # Test on one book before batch operations
   db.update_url_structure(12, old_pattern, new_pattern)
   db.validate_urls(12)
   ```

4. **Use the validation functions:**
   ```python
   # Always validate after changes
   db.validate_urls(book_id)
   ```

5. **Export results for review:**
   ```python
   # Export modified books for review
   db.export_to_manifest("modified_books.json", [book_id])
   ```

## 🚨 Troubleshooting

### Common Issues

1. **"Book not found" errors:**
   - Check if the book was imported correctly
   - Use `db.list_books()` to see available books

2. **URL pattern not matching:**
   - Test your regex pattern with a simple string first
   - Use raw strings (`r"pattern"`) for regex patterns

3. **Database locked errors:**
   - Make sure no other processes are using the database
   - Close any open database connections

4. **Import failures:**
   - Check the manifest JSON format
   - Ensure file paths are correct
   - Look for encoding issues in the manifest

### Getting Help

If you encounter issues:

1. Check the error messages carefully
2. Use the validation functions to identify problems
3. Test with a small subset of data first
4. Export and inspect the data manually

## 📊 Performance Tips

- Use batch operations for multiple books
- Test regex patterns on small datasets first
- Use specific book IDs when possible instead of processing all books
- Export results incrementally for large datasets

This guide should help you effectively test and manipulate your book database structure to handle different folder layouts and URL patterns!