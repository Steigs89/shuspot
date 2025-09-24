#!/usr/bin/env python3
"""
Test script for importing and manipulating the Our Solar System manifest
"""
import os
import sys
from database_manipulator import DatabaseManipulator

def main():
    print("🚀 ShuSpot Database Test Script")
    print("=" * 50)
    
    # Initialize database
    db = DatabaseManipulator("test_books.db")  # Use a test database
    
    # Path to your manifest
    manifest_path = "manifest_Our_Solar_System_ready.json"
    
    if not os.path.exists(manifest_path):
        print(f"❌ Manifest file not found: {manifest_path}")
        print("Make sure you're running this from the book-admin/tools directory")
        return
    
    print(f"📁 Found manifest: {manifest_path}")
    
    # Show current database state
    print("\n1️⃣ Current database state:")
    db.list_books()
    
    # Import the manifest
    print(f"\n2️⃣ Importing manifest...")
    success = db.import_manifest(manifest_path)
    
    if success:
        print("\n3️⃣ Database after import:")
        books = db.list_books()
        
        if books:
            book_id = books[0][0]  # Get the first book's ID
            
            # Show details of the imported book
            print(f"\n4️⃣ Book details (ID: {book_id}):")
            db.get_book_details(book_id)
            
            # Test some modifications
            print("\n5️⃣ Testing modifications...")
            
            # Update the description
            new_description = "Updated: Learn about our Sun and how it compares to other stars in the universe. This is a test update!"
            db.update_book_field(book_id, 'description', new_description)
            
            # Update the genre
            db.update_book_field(book_id, 'genre', 'Solar System - Updated')
            
            # Show updated details
            print(f"\n6️⃣ After modifications:")
            db.get_book_details(book_id)
            
            # Test search
            print("\n7️⃣ Testing search:")
            db.search_books("Sun")
            db.search_books("Solar")
            
            # Export to a new manifest
            print("\n8️⃣ Exporting to new manifest:")
            db.export_to_manifest("test_export.json", [book_id])
            
            print("\n✅ Test completed successfully!")
            print(f"📄 Check 'test_export.json' to see the exported data")
            print(f"🗄️ Test database saved as 'test_books.db'")
        else:
            print("❌ No books found after import")
    else:
        print("❌ Import failed")

if __name__ == '__main__':
    main()