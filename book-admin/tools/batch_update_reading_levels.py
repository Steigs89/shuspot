#!/usr/bin/env python3
"""
Batch update all reading levels using the existing database manipulator
"""
import sqlite3
import json

def batch_update_reading_levels(db_path="books.db", new_level="G2"):
    """
    Directly update all reading levels in the database
    """
    print(f"🔄 Batch updating all reading levels to '{new_level}'")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get count before update
    cursor.execute('SELECT COUNT(*) FROM books')
    total_books = cursor.fetchone()[0]
    
    if total_books == 0:
        print("❌ No books found in database")
        conn.close()
        return
    
    print(f"📚 Found {total_books} books to update")
    
    # Update all reading levels
    cursor.execute('''
        UPDATE books 
        SET reading_level = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE 1=1
    ''', (new_level,))
    
    updated_count = cursor.rowcount
    conn.commit()
    
    # Verify the update
    cursor.execute('SELECT title, reading_level FROM books LIMIT 5')
    sample_books = cursor.fetchall()
    
    conn.close()
    
    print(f"✅ Successfully updated {updated_count} books")
    print(f"\n🔍 Sample verification:")
    for title, level in sample_books:
        print(f"   📖 {title}: {level}")
    
    return updated_count

if __name__ == '__main__':
    # Run the batch update
    batch_update_reading_levels("books.db", "G2")