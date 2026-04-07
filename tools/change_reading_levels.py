#!/usr/bin/env python3
"""
Change all reading levels to "G2" in the local database
"""
import os
import sys
from database_manipulator import DatabaseManipulator

def change_all_reading_levels_to_g2(db_path="books.db"):
    """
    Change all books' reading levels to "G2"
    
    Args:
        db_path: Path to the database file
    """
    print("🔄 Changing all reading levels to 'G2'")
    print("=" * 50)
    
    # Initialize database manipulator
    db = DatabaseManipulator(db_path)
    
    # Get all books
    print("📚 Getting all books from database...")
    books = db.list_books()
    
    if not books:
        print("❌ No books found in database")
        return False
    
    print(f"📖 Found {len(books)} books to update")
    print("-" * 50)
    
    updated_count = 0
    failed_count = 0
    
    # Update each book's reading level
    for book in books:
        book_id = book[0]
        book_title = book[1]
        
        try:
            # Get current book details to show before/after
            book_details = db.get_book_details(book_id)
            current_level = book_details.get('reading_level', 'Unknown') if book_details else 'Unknown'
            
            # Update the reading level
            success = db.update_book_field(book_id, 'reading_level', 'G2')
            
            if success:
                print(f"✅ Updated '{book_title}' (ID: {book_id})")
                print(f"   {current_level} → G2")
                updated_count += 1
            else:
                print(f"❌ Failed to update '{book_title}' (ID: {book_id})")
                failed_count += 1
                
        except Exception as e:
            print(f"❌ Error updating '{book_title}' (ID: {book_id}): {e}")
            failed_count += 1
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 UPDATE SUMMARY")
    print("=" * 50)
    print(f"✅ Successfully updated: {updated_count} books")
    print(f"❌ Failed to update: {failed_count} books")
    print(f"📚 Total books processed: {len(books)}")
    
    if updated_count > 0:
        print(f"\n🎉 All reading levels have been changed to 'G2'!")
        
        # Show a few examples
        print(f"\n🔍 Verification - showing first 3 updated books:")
        verification_books = db.list_books(limit=3)
        for book in verification_books:
            book_id = book[0]
            book_details = db.get_book_details(book_id)
            if book_details:
                print(f"   📖 {book_details['title']}: {book_details['reading_level']}")
    
    return updated_count > 0

def main():
    """Main function with command line options"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Change all reading levels to G2')
    parser.add_argument('--db', default='books.db', help='Database file path (default: books.db)')
    parser.add_argument('--confirm', action='store_true', help='Skip confirmation prompt')
    
    args = parser.parse_args()
    
    # Check if database exists
    if not os.path.exists(args.db):
        print(f"❌ Database file not found: {args.db}")
        print("   Make sure you're in the right directory or specify the correct path")
        return
    
    print(f"🗄️ Using database: {args.db}")
    
    # Confirmation prompt (unless --confirm is used)
    if not args.confirm:
        print("\n⚠️  WARNING: This will change ALL reading levels to 'G2'")
        print("   This action cannot be easily undone!")
        
        confirm = input("\nDo you want to continue? [y/N]: ")
        if confirm.lower() != 'y':
            print("❌ Operation cancelled")
            return
    
    # Backup suggestion
    backup_name = f"{args.db}.backup"
    if not os.path.exists(backup_name):
        print(f"\n💡 Tip: Consider backing up your database first:")
        print(f"   cp {args.db} {backup_name}")
        
        if not args.confirm:
            backup = input("Create backup now? [Y/n]: ")
            if backup.lower() != 'n':
                try:
                    import shutil
                    shutil.copy2(args.db, backup_name)
                    print(f"✅ Backup created: {backup_name}")
                except Exception as e:
                    print(f"❌ Backup failed: {e}")
                    return
    
    # Execute the change
    success = change_all_reading_levels_to_g2(args.db)
    
    if success:
        print(f"\n🎯 SUCCESS: All reading levels changed to 'G2'")
        print(f"📄 Database: {args.db}")
        if os.path.exists(backup_name):
            print(f"💾 Backup: {backup_name}")
    else:
        print(f"\n❌ FAILED: No changes were made")

if __name__ == '__main__':
    main()