#!/usr/bin/env python3
"""
Comprehensive test script for database operations
Tests various scenarios for URL restructuring and data manipulation
"""
import os
import sys
from advanced_db_manipulator import AdvancedDatabaseManipulator

def test_scenario_1_url_restructuring():
    """Test URL restructuring scenarios"""
    print("\n" + "="*60)
    print("🧪 TEST SCENARIO 1: URL Restructuring")
    print("="*60)
    
    db = AdvancedDatabaseManipulator("test_books.db")
    
    # Import the manifest first
    manifest_path = "manifest_Our_Solar_System_ready.json"
    if os.path.exists(manifest_path):
        print("📁 Importing manifest...")
        db.import_manifest(manifest_path)
        
        # Get the first book
        books = db.list_books(limit=1)
        if books:
            book_id = books[0][0]
            
            print(f"\n🔍 Original URLs for book ID {book_id}:")
            db.get_book_details(book_id)
            
            # Test 1: Change folder structure
            print(f"\n🔄 Test 1: Changing folder structure...")
            old_pattern = r"CROP-ShuSpot/Our%20Solar%20System"
            new_pattern = "ShuSpot-Books/Solar-System"
            db.update_url_structure(book_id, old_pattern, new_pattern)
            
            # Test 2: Fix URL encoding
            print(f"\n🔄 Test 2: Fixing URL encoding...")
            db.fix_common_url_issues(book_id)
            
            # Test 3: Validate URLs
            print(f"\n🔍 Test 3: Validating URLs...")
            db.validate_urls(book_id)
            
            print(f"\n📋 Final URLs after changes:")
            db.get_book_details(book_id)
        else:
            print("❌ No books found to test")
    else:
        print(f"❌ Manifest file not found: {manifest_path}")

def test_scenario_2_page_manipulation():
    """Test page reordering and manipulation"""
    print("\n" + "="*60)
    print("🧪 TEST SCENARIO 2: Page Manipulation")
    print("="*60)
    
    db = AdvancedDatabaseManipulator("test_books.db")
    
    books = db.list_books(limit=1)
    if books:
        book_id = books[0][0]
        
        print(f"\n📖 Testing page manipulation for book ID {book_id}")
        
        # Get current page structure
        book = db.get_book_details(book_id)
        if book and book['page_sequence']:
            original_pages = len(book['page_sequence'])
            print(f"📄 Original page count: {original_pages}")
            
            # Test 1: Reorder first 5 pages (reverse order)
            if original_pages >= 5:
                print(f"\n🔄 Test 1: Reordering first 5 pages...")
                new_order = [5, 4, 3, 2, 1] + list(range(6, original_pages + 1))
                db.reorder_pages(book_id, new_order)
            
            # Test 2: Add a missing page
            print(f"\n➕ Test 2: Adding a missing page...")
            new_page_url = "https://example.com/books/test-page-99.png"
            db.add_missing_pages(book_id, {99: new_page_url})
            
            print(f"\n📋 Final page structure:")
            db.get_book_details(book_id)
        else:
            print("❌ No pages found to manipulate")
    else:
        print("❌ No books found to test")

def test_scenario_3_batch_operations():
    """Test batch operations on multiple books"""
    print("\n" + "="*60)
    print("🧪 TEST SCENARIO 3: Batch Operations")
    print("="*60)
    
    db = AdvancedDatabaseManipulator("test_books.db")
    
    # Create some test books first
    print("📚 Creating test books...")
    test_manifests = []
    
    # Create a simple test manifest
    test_book = {
        "books": [{
            "id": 999,
            "title": "Test Book for Batch Operations",
            "author": "Test Author",
            "genre": "Test Genre",
            "book_type": "Read to Me",
            "reading_level": "Elementary",
            "description": "A test book for batch operations",
            "cover_image_url": "https://old-domain.com/books/test/cover.png",
            "page_sequence": [
                {"page_number": 1, "image_url": "https://old-domain.com/books/test/page-1.png"},
                {"page_number": 2, "image_url": "https://old-domain.com/books/test/page-2.png"}
            ],
            "audio_files": [
                {"page_number": 1, "audio_url": "https://old-domain.com/books/test/audio-1.mp3"}
            ]
        }]
    }
    
    # Save and import test manifest
    import json
    with open("test_batch_manifest.json", "w") as f:
        json.dump(test_book, f, indent=2)
    
    db.import_manifest("test_batch_manifest.json")
    
    # Test batch URL updates
    print(f"\n🔄 Testing batch URL updates...")
    old_pattern = r"old-domain\.com"
    new_pattern = "new-domain.com"
    db.batch_update_urls(old_pattern, new_pattern)
    
    # Show results
    print(f"\n📋 Results after batch update:")
    db.list_books()
    
    # Clean up
    try:
        os.remove("test_batch_manifest.json")
    except:
        pass

def test_scenario_4_folder_structure_changes():
    """Test different folder structure scenarios"""
    print("\n" + "="*60)
    print("🧪 TEST SCENARIO 4: Folder Structure Changes")
    print("="*60)
    
    db = AdvancedDatabaseManipulator("test_books.db")
    
    books = db.list_books(limit=1)
    if books:
        book_id = books[0][0]
        
        print(f"📁 Testing folder structure changes for book ID {book_id}")
        
        # Common folder structure changes
        folder_mappings = {
            "Our%20Solar%20System": "Solar_System",
            "Our%20Sun%20is%20A%20Star": "Sun_Star_Book",
            "resized": "optimized",
            "crop-": "page-"
        }
        
        print(f"\n🔄 Applying folder structure changes...")
        for old_folder, new_folder in folder_mappings.items():
            print(f"   {old_folder} → {new_folder}")
        
        db.change_folder_structure(book_id, folder_mappings)
        
        print(f"\n📋 Results after folder structure changes:")
        db.get_book_details(book_id)
    else:
        print("❌ No books found to test")

def main():
    print("🚀 ShuSpot Advanced Database Operations Test Suite")
    print("This script tests various database manipulation scenarios")
    
    # Check if we're in the right directory
    if not os.path.exists("manifest_Our_Solar_System_ready.json"):
        print("⚠️ Warning: manifest_Our_Solar_System_ready.json not found")
        print("Make sure you're running this from the book-admin/tools directory")
    
    try:
        # Run all test scenarios
        test_scenario_1_url_restructuring()
        test_scenario_2_page_manipulation()
        test_scenario_3_batch_operations()
        test_scenario_4_folder_structure_changes()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED")
        print("="*60)
        print("📄 Check 'test_books.db' for the test database")
        print("🔍 Use the database_manipulator.py script to explore results")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()