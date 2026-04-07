#!/usr/bin/env python3
"""
Universal URL fixer for books uploaded to genre folders
"""
import sys
from advanced_db_manipulator import AdvancedDatabaseManipulator

def fix_folder_urls(folder_name, db_path="books.db"):
    """
    Fix URLs for books that were uploaded to a specific folder
    
    Args:
        folder_name: Name of the folder (e.g., 'Baking', 'Science', 'Math')
        db_path: Path to the database
    """
    print(f"🔧 Fixing URLs for books uploaded to '{folder_name}' folder")
    print("=" * 60)
    
    db = AdvancedDatabaseManipulator(db_path)
    
    # Get all books
    books = db.list_books()
    
    if not books:
        print("❌ No books found in database")
        return
    
    print(f"📚 Found {len(books)} books to check")
    
    updated_count = 0
    
    for book in books:
        book_id = book[0]
        book_title = book[1]
        
        # Get book details
        book_details = db.get_book_details(book_id)
        if not book_details:
            continue
        
        # Check if URLs need fixing (don't have the folder prefix)
        cover_url = book_details.get('cover_image_url', '')
        needs_fixing = False
        
        if cover_url:
            # Check if URL is missing the folder prefix
            if f'/books/{folder_name}/' not in cover_url and '/books/' in cover_url:
                needs_fixing = True
        
        if needs_fixing:
            print(f"\n📖 Fixing URLs for: {book_title} (ID: {book_id})")
            
            # Use the batch URL update to fix all URLs for this book
            # This will update cover, pages, and audio URLs
            old_pattern = r"/books/([^/]+)/"  # Match /books/anything/
            new_pattern = f"/books/{folder_name}/\\1/"  # Replace with /books/FolderName/anything/
            
            success = db.update_url_structure(book_id, old_pattern, new_pattern)
            if success:
                updated_count += 1
                print(f"✅ Fixed URLs for: {book_title}")
            else:
                print(f"⚠️ No changes needed for: {book_title}")
        else:
            print(f"ℹ️ URLs already correct for: {book_title}")
    
    print(f"\n📊 Summary:")
    print(f"   📚 Total books checked: {len(books)}")
    print(f"   ✅ Books updated: {updated_count}")
    print(f"   ℹ️ Books already correct: {len(books) - updated_count}")
    
    if updated_count > 0:
        print(f"\n🎉 Fixed URLs for {updated_count} books!")
        print("   Your books should now load correctly in the reader.")
    else:
        print("\n✅ All URLs were already correct!")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 fix_folder_urls.py <folder_name>")
        print("\nExamples:")
        print("  python3 fix_folder_urls.py Baking")
        print("  python3 fix_folder_urls.py Science")
        print("  python3 fix_folder_urls.py Math")
        sys.exit(1)
    
    folder_name = sys.argv[1]
    fix_folder_urls(folder_name)

if __name__ == '__main__':
    main()