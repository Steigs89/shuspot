#!/usr/bin/env python3
"""
Database migration script to add fiction_type column to existing books table
"""

import sqlite3
import os

def add_fiction_type_column():
    """Add fiction_type column to books table"""
    db_path = "./books.db"
    
    if not os.path.exists(db_path):
        print("Database file not found. No migration needed.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(books)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'fiction_type' in columns:
            print("fiction_type column already exists. No migration needed.")
            conn.close()
            return
        
        # Add the column
        cursor.execute("ALTER TABLE books ADD COLUMN fiction_type VARCHAR DEFAULT 'Fiction'")
        
        # Update existing books to have Fiction as default
        cursor.execute("UPDATE books SET fiction_type = 'Fiction' WHERE fiction_type IS NULL")
        
        conn.commit()
        print("Successfully added fiction_type column to books table")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(books)")
        columns = [column[1] for column in cursor.fetchall()]
        print(f"Current columns: {columns}")
        
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_fiction_type_column()
