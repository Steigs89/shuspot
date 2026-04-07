#!/usr/bin/env python3
"""
Quick test script - Run this to get started with database manipulation
"""
import os
import sys

def main():
    print("🚀 ShuSpot Database Quick Test")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("manifest_Our_Solar_System_ready.json"):
        print("❌ Please run this script from the book-admin/tools directory")
        print("   Current directory:", os.getcwd())
        return
    
    print("✅ Found manifest file")
    
    # Import and test basic functionality
    try:
        from database_manipulator import DatabaseManipulator
        from advanced_db_manipulator import AdvancedDatabaseManipulator
        
        print("✅ Database modules imported successfully")
        
        # Create test database
        db = DatabaseManipulator("quick_test.db")
        print("✅ Test database created")
        
        # Import manifest
        print("\n📁 Importing manifest...")
        success = db.import_manifest("manifest_Our_Solar_System_ready.json")
        
        if success:
            print("✅ Manifest imported successfully")
            
            # List books
            print("\n📚 Books in database:")
            books = db.list_books()
            
            if books:
                book_id = books[0][0]
                print(f"\n📖 Testing with book ID: {book_id}")
                
                # Show original details
                print("\n🔍 Original book details:")
                db.get_book_details(book_id)
                
                # Test URL modification
                print(f"\n🔄 Testing URL modification...")
                adv_db = AdvancedDatabaseManipulator("quick_test.db")
                
                # Example: Change "CROP-ShuSpot" to "ShuSpot-Books"
                old_pattern = r"CROP-ShuSpot"
                new_pattern = "ShuSpot-Books"
                
                print(f"   Changing: {old_pattern} → {new_pattern}")
                adv_db.update_url_structure(book_id, old_pattern, new_pattern)
                
                # Show modified details
                print(f"\n📋 Modified book details:")
                db.get_book_details(book_id)
                
                # Validate URLs
                print(f"\n🔍 Validating URLs...")
                adv_db.validate_urls(book_id)
                
                # Export result
                print(f"\n💾 Exporting result...")
                db.export_to_manifest("quick_test_result.json", [book_id])
                
                print("\n" + "=" * 50)
                print("✅ QUICK TEST COMPLETED SUCCESSFULLY!")
                print("=" * 50)
                print("📄 Files created:")
                print("   - quick_test.db (test database)")
                print("   - quick_test_result.json (exported result)")
                print("\n🔧 Next steps:")
                print("   1. Check the exported JSON to see the changes")
                print("   2. Run 'python test_database_operations.py' for comprehensive tests")
                print("   3. Read DATABASE_MANIPULATION_GUIDE.md for detailed usage")
                
            else:
                print("❌ No books found after import")
        else:
            print("❌ Failed to import manifest")
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Make sure all required files are present")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()