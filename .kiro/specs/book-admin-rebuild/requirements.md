# Book Admin Rebuild — Requirements

## Overview
Rebuild the book admin at `shuspot.com/book-admin` to read/write directly from Supabase (not SQLite). Full CRUD editor for all book metadata with book type filtering.

## Data Source
- Supabase `books` table — the same one the main app uses
- All reads and writes go directly to Supabase REST API
- No more local SQLite database

## Features

### Book Type Tabs/Buttons
- Filter buttons above the table: All, Books, Read to Me, Audiobooks, Videos
- Filters by `content_type` field in Supabase

### Book Table
- Columns: Cover, Title, Author, Content Type, Reading Level, AR Level, Lexile, Genre 1, Genre 2, Fiction Type, Pages, Status
- All fields from GPT description visible and editable
- Search bar to filter by title/author
- Sortable columns

### Inline Editing
- Click any field to edit it
- Changes save directly to Supabase on blur/enter
- Visual feedback (green flash) on successful save
- Edit: title, author, description, content_type, reading_level, categories, metadata fields (ar_level, lexile, genre_1, genre_2, fiction_type, isbn)

### Quick Upload (new)
- Paste folder path → uploads via rclone → creates Supabase entry
- At the top of the page

### Book Actions
- Delete book (with confirmation)
- Toggle active/inactive
- View cover image

## Technical
- React frontend at `book-admin/frontend/`
- Talks directly to Supabase REST API (no backend needed for CRUD)
- Backend only needed for Quick Upload (rclone)
- Deploy to `/var/www/book-admin/` on server
