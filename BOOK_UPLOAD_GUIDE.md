# ShuSpot Book Upload Guide

## Two Ways to Upload

### Method 1: ZIP Upload (Easiest — No Setup)
1. Go to `shuspot.com/book-admin`
2. Click "Books (Supabase)" tab
3. ZIP up your book folder(s) on your computer
4. Drop the ZIP in the upload area
5. Wait — books appear on the live site automatically

Supports single books, multiple books, or entire genre folders. Max ~2GB per ZIP.

### Method 2: Terminal Scripts (Faster for bulk)
Put `upload-book.sh` and `upload-all-books.sh` on your Desktop.

**Single book:**
```bash
~/Desktop/upload-book.sh "/path/to/Bk=Book Title"
```

**All books in a folder:**
```bash
~/Desktop/upload-all-books.sh "/path/to/Books"
```

Skips folders with ✓ prefix (already uploaded). Shows progress and summary.

**One-time setup** (if rclone not installed):
```bash
brew install rclone
rclone config create supa s3 provider=Other \
  endpoint=https://xzwdtcczndgglqikmlwj.storage.supabase.co/storage/v1/s3 \
  access_key_id=45ac9af4e1e039c4e79fe332833d31e1 \
  secret_access_key=fae79bf3e12cb133b4ceced13c506f5c205544cad11ea4083e449deac1ca7d54 \
  region=us-east-1
```

---

## Content Types (Auto-Detected from GPT Description)

| GPT Field | Content Type | Storage Path | What it does |
|-----------|-------------|--------------|-------------|
| `Read-to-Me?: yes` | read-to-me | CROP-ShuSpot/ReadToMe/ | Page-flip reader with autoplay audio |
| `Audiobook?: yes` | audiobook | CROP-ShuSpot/Audiobooks/ | Audio player |
| Neither (default) | book | CROP-ShuSpot/Books/ | Page-flip reader, no audio |

---

## Book Folder Structure

### Regular Book
```
Bk=Book Title/
├── cover.webp
├── Book Title GPT_description.txt
└── resized/
    ├── crop-1.png
    ├── crop-2.png
    └── ...
```

### Read to Me Book (with audio)
```
Bk=Book Title/
├── cover.webp
├── Book Title GPT_description.txt
├── 1.mp3          ← audio for page 1
├── 4.mp3          ← audio for page 4
└── resized/
    ├── crop-1.png
    ├── crop-2.png
    └── ...
```

Audio files are numbered to match page numbers. Pages without a matching MP3 are silent.

### GPT Description File
```
Title: A Smile
Author: Raoul Follereau
AR Level: 3.4
Lexile: AD590L
Genre 1: Kindness
Genre 2: Identifying Emotions
Fiction Type: fiction
ISBN: 9781772782271
Description: A gentle picture book about how a smile can brighten the world.
Read-to-Me?: no
Audiobook?: no
```

---

## Editing Books
- Go to `shuspot.com/book-admin`
- Click "Books (Supabase)" tab
- Filter by type: All, Books, Read to Me, Audiobooks, Videos
- Search by title or author
- Click any field to edit — saves directly to Supabase
- Toggle active/inactive with the eye icon
- Delete with the trash icon

---

## Rules
- **No special characters** in folder names (`!`, `?`, `&`, `#`, `✓`)
- Folder names start with `Bk=`
- Page images: `crop-1.png`, `crop-2.png`, etc. in `resized/` folder (lowercase)
- Cover: `cover.webp`, `cover.jpg`, or `cover.png`
- Audio (Read to Me): numbered MP3s matching page numbers (`1.mp3`, `4.mp3`)

---

## Client Kit
Give your client `ShuSpot-Upload-Kit.zip` (on your Desktop). Contains:
- `upload-book.sh` — single book upload
- `upload-all-books.sh` — batch upload entire folder
- `README.txt` — setup and usage instructions
