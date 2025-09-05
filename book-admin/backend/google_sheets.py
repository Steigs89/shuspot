import gspread
from google.oauth2.service_account import Credentials
import pandas as pd
from typing import List, Dict, Optional
import os
import json
from datetime import datetime

class GoogleSheetsManager:
    def __init__(self, credentials_path: str, spreadsheet_name: str = "ShuSpot Books Master", worksheet_name: str = None):
        """Initialize Google Sheets connection"""
        self.credentials_path = credentials_path
        self.spreadsheet_name = spreadsheet_name
        self.worksheet_name = worksheet_name  # Specific sheet name within the document
        self.client = None
        self.sheet = None
        self.worksheet = None
        
        # Define the schema for our master sheet - ShuSpot specific fields
        self.schema = [
            "Name",
            "Category", 
            "Media",
            "Fiction Type",
            "URL",
            "Author",
            "Age",
            "Read time",
            "AR Level",
            "Lexile",
            "GRL",
            "Pages",
            "Audiobook Length",
            "Video Length",
            "Status",
            "Date Added",
            "Date Modified"
        ]
        
    def connect(self):
        """Connect to Google Sheets API"""
        try:
            scope = [
                "https://spreadsheets.google.com/feeds",
                "https://www.googleapis.com/auth/drive"
            ]
            
            creds = Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=scope
            )
            
            self.client = gspread.authorize(creds)
            
            # Try to open existing spreadsheet or create new one
            try:
                self.sheet = self.client.open(self.spreadsheet_name)
                
                # Use specific worksheet if specified, otherwise use first sheet
                if self.worksheet_name:
                    try:
                        self.worksheet = self.sheet.worksheet(self.worksheet_name)
                    except gspread.WorksheetNotFound:
                        # Create the worksheet if it doesn't exist
                        self.worksheet = self.sheet.add_worksheet(title=self.worksheet_name, rows="1000", cols="20")
                        # Set up headers
                        self.worksheet.append_row(self.schema)
                        # Format headers
                        self.worksheet.format('A1:Q1', {
                            "backgroundColor": {"red": 0.2, "green": 0.6, "blue": 0.9},
                            "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}
                        })
                else:
                    self.worksheet = self.sheet.sheet1
                    
            except gspread.SpreadsheetNotFound:
                # Create new spreadsheet
                self.sheet = self.client.create(self.spreadsheet_name)
                self.worksheet = self.sheet.sheet1
                
                # Set up headers
                self.worksheet.append_row(self.schema)
                
                # Format headers
                self.worksheet.format('A1:Q1', {
                    "backgroundColor": {"red": 0.2, "green": 0.6, "blue": 0.9},
                    "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}
                })
                
            print(f"Connected to Google Sheet: {self.spreadsheet_name}")
            return True
            
        except Exception as e:
            print(f"Error connecting to Google Sheets: {e}")
            return False
    
    def get_all_books(self) -> List[Dict]:
        """Get all books from the sheet"""
        if not self.worksheet:
            return []
            
        try:
            records = self.worksheet.get_all_records()
            return records
        except Exception as e:
            print(f"Error getting books: {e}")
            return []
    
    def add_book(self, book_data: Dict) -> bool:
        """Add a single book to the sheet"""
        if not self.worksheet:
            return False
            
        try:
            # Generate duplicate check key - use 'Name' field for ShuSpot schema
            duplicate_key = f"{book_data.get('Name', '').lower()}_{book_data.get('Author', '').lower()}"
            
            # Check for duplicates
            existing_books = self.get_all_books()
            for existing in existing_books:
                existing_key = f"{existing.get('Name', '').lower()}_{existing.get('Author', '').lower()}"
                if existing_key == duplicate_key:
                    print(f"Duplicate found: {book_data.get('Name')} by {book_data.get('Author')}")
                    return False
            
            # Prepare row data for ShuSpot schema
            row_data = [
                book_data.get('Name', ''),
                book_data.get('Category', ''),
                book_data.get('Media', ''),
                book_data.get('Fiction Type', 'Fiction'),
                book_data.get('URL', ''),
                book_data.get('Author', ''),
                book_data.get('Age', ''),
                book_data.get('Read time', ''),
                book_data.get('AR Level', ''),
                book_data.get('Lexile', ''),
                book_data.get('GRL', ''),
                book_data.get('Pages', ''),
                book_data.get('Audiobook Length', ''),
                book_data.get('Video Length', ''),
                book_data.get('Status', 'Active'),
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ]
            
            self.worksheet.append_row(row_data)
            return True
            
        except Exception as e:
            print(f"Error adding book: {e}")
            return False
    
    def bulk_add_books(self, books_data: List[Dict]) -> Dict:
        """Add multiple books to the sheet"""
        if not self.worksheet:
            return {"success": 0, "errors": 0, "duplicates": 0}
        
        results = {"success": 0, "errors": 0, "duplicates": 0}
        
        # Get existing books for duplicate checking
        existing_books = self.get_all_books()
        existing_keys = set()
        for book in existing_books:
            key = f"{book.get('Name', '').lower()}_{book.get('Author', '').lower()}"
            existing_keys.add(key)
        
        # Prepare batch data
        batch_data = []
        
        for book_data in books_data:
            try:
                duplicate_key = f"{book_data.get('Name', '').lower()}_{book_data.get('Author', '').lower()}"
                
                if duplicate_key in existing_keys:
                    results["duplicates"] += 1
                    continue
                
                row_data = [
                    book_data.get('Name', ''),
                    book_data.get('Category', ''),
                    book_data.get('Media', ''),
                    book_data.get('URL', ''),
                    book_data.get('Author', ''),
                    book_data.get('Age', ''),
                    book_data.get('Read time', ''),
                    book_data.get('AR Level', ''),
                    book_data.get('Lexile', ''),
                    book_data.get('GRL', ''),
                    book_data.get('Pages', ''),
                    book_data.get('Audiobook Length', ''),
                    book_data.get('Video Length', ''),
                    book_data.get('Status', 'Active'),
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                ]
                
                batch_data.append(row_data)
                existing_keys.add(duplicate_key)
                
            except Exception as e:
                print(f"Error preparing book data: {e}")
                results["errors"] += 1
        
        # Batch insert
        if batch_data:
            try:
                # Find the next empty row
                next_row = len(self.worksheet.get_all_values()) + 1
                
                # Insert all rows at once
                range_name = f'A{next_row}:R{next_row + len(batch_data) - 1}'
                self.worksheet.update(range_name, batch_data)
                
                results["success"] = len(batch_data)
                
            except Exception as e:
                print(f"Error batch inserting: {e}")
                results["errors"] += len(batch_data)
        
        return results
    
    def update_book(self, book_id: int, updates: Dict) -> bool:
        """Update a specific book by ID"""
        if not self.worksheet:
            return False
            
        try:
            # Find the row with the matching ID
            all_records = self.worksheet.get_all_records()
            
            for i, record in enumerate(all_records):
                if record.get('ID') == book_id:
                    row_num = i + 2  # +2 because sheets are 1-indexed and we have headers
                    
                    # Update specific cells
                    for field, value in updates.items():
                        if field in self.schema:
                            col_index = self.schema.index(field) + 1  # +1 for 1-indexed
                            self.worksheet.update_cell(row_num, col_index, value)
                    
                    # Update modified date
                    modified_col = self.schema.index('Date Modified') + 1
                    self.worksheet.update_cell(row_num, modified_col, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                    
                    return True
            
            return False
            
        except Exception as e:
            print(f"Error updating book: {e}")
            return False
    
    def bulk_update_books(self, filter_criteria: Dict, updates: Dict) -> int:
        """Bulk update books matching criteria"""
        if not self.worksheet:
            return 0
            
        try:
            all_records = self.worksheet.get_all_records()
            updated_count = 0
            
            for i, record in enumerate(all_records):
                # Check if record matches filter criteria
                matches = True
                for field, value in filter_criteria.items():
                    if record.get(field) != value:
                        matches = False
                        break
                
                if matches:
                    row_num = i + 2  # +2 for 1-indexed and headers
                    
                    # Apply updates
                    for field, value in updates.items():
                        if field in self.schema:
                            col_index = self.schema.index(field) + 1
                            self.worksheet.update_cell(row_num, col_index, value)
                    
                    # Update modified date
                    modified_col = self.schema.index('Date Modified') + 1
                    self.worksheet.update_cell(row_num, modified_col, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                    
                    updated_count += 1
            
            return updated_count
            
        except Exception as e:
            print(f"Error bulk updating: {e}")
            return 0
    
    def delete_book(self, book_id: int) -> bool:
        """Delete a book by ID (mark as deleted)"""
        return self.update_book(book_id, {"Status": "Deleted"})
    
    def get_duplicates(self) -> List[Dict]:
        """Find potential duplicates"""
        if not self.worksheet:
            return []
            
        try:
            all_records = self.worksheet.get_all_records()
            duplicate_keys = {}
            duplicates = []
            
            for record in all_records:
                key = record.get('Duplicate Check', '')
                if key in duplicate_keys:
                    duplicates.append({
                        'original': duplicate_keys[key],
                        'duplicate': record
                    })
                else:
                    duplicate_keys[key] = record
            
            return duplicates
            
        except Exception as e:
            print(f"Error finding duplicates: {e}")
            return []
    
    def export_to_csv(self) -> str:
        """Export sheet data to CSV"""
        if not self.worksheet:
            return ""
            
        try:
            all_records = self.worksheet.get_all_records()
            df = pd.DataFrame(all_records)
            
            filename = f"shuspot_books_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            df.to_csv(filename, index=False)
            
            return filename
            
        except Exception as e:
            print(f"Error exporting to CSV: {e}")
            return ""