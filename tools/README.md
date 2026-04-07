# ShuSpot Book Upload Tools

This folder contains tools to help you upload large book collections to your live server using Rclone + Supabase. These tools are designed to handle folders of any size, including 20GB+ collections.

## 🚀 Quick Start Guide

### Step 1: Install Rclone (One-time setup)

**Windows:**
1. Download Rclone from [rclone.org](https://rclone.org/install/)
2. Extract to a folder like `C:\rclone\`
3. Add `C:\rclone\` to your system PATH

**Mac:**
```bash
brew install rclone
```

**Linux:**
```bash
curl https://rclone.org/install.sh | sudo bash
```

### Step 2: Configure Supabase (One-time setup)

Copy and paste this command exactly:

```bash
rclone config create supa s3 \
  provider=Other \
  endpoint=https://xzwdtcczndgglqikmlwj.storage.supabase.co/storage/v1/s3 \
  access_key_id=45ac9af4e1e039c4e79fe332833d31e1 \
  secret_access_key=fae79bf3e12cb133b4ceced13c506f5c205544cad11ea4083e449deac1ca7d54 \
  region=us-east-1
```

### Step 3: Upload Your Books

Choose the method that works best for you:

**🎯 Method 1: Simple Python Script (Recommended)**
```bash
python rclone_uploader.py /path/to/your/book/folder
```

**🎯 Method 2: Quick Manifest for Existing Books**
```bash
python quick_manifest.py "CROP-ShuSpot/Baking"
```

**🎯 Method 3: Batch Files**
- **Windows**: Drag your book folder onto `upload_books.bat`
- **Mac/Linux**: Run `./upload_books.sh /path/to/your/book/folder`

### Step 4: Import to Book Admin

1. Open your book admin interface
2. Go to "Local Database" tab  
3. Choose "Rclone + Supabase" method
4. Upload the generated `manifest_*.json` file
5. Click "Process Manifest" - your books will appear!

## 📁 File Structure

```
tools/
├── README.md              # This file
├── rclone_uploader.py     # Advanced Python uploader
├── upload_books.bat       # Windows batch script
├── upload_books.sh        # Mac/Linux shell script
└── requirements.txt       # Python dependencies
```

## 🐍 Python Scripts - Detailed Guide

### Script 1: `rclone_uploader.py` - Full Upload & Manifest

**What it does:** Uploads new book folders to Supabase and creates manifest files.

**Basic Usage:**
```bash
python rclone_uploader.py /path/to/your/book/folder
```

**Sample Run:**
```bash
$ python rclone_uploader.py "/Users/john/Books/My New Book"

🚀 Starting Rclone upload workflow
==================================================
✅ Rclone is installed
✅ Supabase remote 'supa' is configured
📤 Uploading /Users/john/Books/My New Book to supa:books/My New Book
This may take a while for large folders...
✅ Upload completed successfully!
📋 Generating manifest for supa:books/My New Book
✅ Manifest saved to: manifest_20250923_143022.json
📊 Found 47 files

🎉 Upload workflow completed successfully!
==================================================
Next steps:
1. Open your book admin interface
2. Go to the 'Local Database' tab
3. Choose 'Rclone + Supabase' upload method
4. Upload the manifest file: manifest_20250923_143022.json
5. Your books will be imported automatically!
```

**Advanced Options:**
```bash
# Upload to specific category folder
python rclone_uploader.py /path/to/books --remote-path "CROP-ShuSpot/Baking"

# Just generate manifest (no upload)
python rclone_uploader.py --manifest-only --remote-path "CROP-ShuSpot/Baking"

# Custom output filename
python rclone_uploader.py /path/to/books --output "my_books_manifest.json"
```

### Script 2: `quick_manifest.py` - Manifest for Existing Books

**What it does:** Creates manifest files for books already uploaded to Supabase (no upload needed).

**Basic Usage:**
```bash
python quick_manifest.py "CROP-ShuSpot/Baking"
```

**Sample Run:**
```bash
$ python quick_manifest.py "CROP-ShuSpot/Baking"

Creating manifest for: supa:books/CROP-ShuSpot/Baking
Output file: manifest_Baking.json
✅ Created manifest with 1,247 files
📁 Saved to: manifest_Baking.json

🎉 Manifest created successfully!
Next steps:
1. Open your book admin interface
2. Go to 'Local Database' tab
3. Choose 'Rclone + Supabase' method
4. Upload: manifest_Baking.json
```

**For Single Book:**
```bash
$ python quick_manifest.py "CROP-ShuSpot/Baking" "A Safe Cake"

Creating manifest for: supa:books/CROP-ShuSpot/Baking/A Safe Cake
Output file: manifest_A_Safe_Cake.json
✅ Created manifest with 23 files
📁 Saved to: manifest_A_Safe_Cake.json
```

### Script 3: `test_manifest_processing.py` - Debug Tool

**What it does:** Tests how your manifest will be processed by the book admin (useful for debugging).

**Usage:**
```bash
python test_manifest_processing.py
```

### Script 4: `audio_page_matcher.py` - OCR + Audio Integration

**What it does:** Uses OCR to extract text from page images and matches MP3 files to pages based on filenames and content.

**Requirements:**
```bash
pip install pytesseract pillow opencv-python
# Also install Tesseract OCR: https://github.com/tesseract-ocr/tesseract
```

**Usage:**
```bash
python audio_page_matcher.py "/path/to/book/folder"
```

**Sample Run:**
```bash
$ python audio_page_matcher.py "/Users/john/Books/A Safe Cake"

📁 Scanning folder: /Users/john/Books/A Safe Cake
🎵 Found 12 audio files
🖼️  Found 23 page images
🔍 Extracting text from page images...
   Processing page 1 (1/23)
      Text preview: A Safe Cake by Maria Rodriguez. Today we're going to learn...
   Processing page 2 (2/23)
      Text preview: First, we need to gather our ingredients. We will need...

🎵 Creating audio-to-page mappings...

📄 intro title.mp3
   Type: intro
   Mapped pages: [1]

📄 page 2.mp3
   Type: single_page
   Mapped pages: [2]

📄 page4-5.mp3
   Type: page_range
   Mapped pages: [4, 5]

✅ Audio manifest saved to: audio_manifest_A_Safe_Cake.json
```

### Script 5: `quick_audio_test.py` - Simple Audio Testing (No OCR)

**What it does:** Tests audio-page matching based on filename patterns only (no OCR installation required).

**Usage:**
```bash
python quick_audio_test.py "/path/to/book/folder"
```

**Sample Run:**
```bash
$ python quick_audio_test.py "/Users/john/Books/A Safe Cake"

📁 Testing: A Safe Cake
==================================================
🎵 Audio files found: 12
   - intro title.mp3
   - page 2.mp3
   - page 4-5.mp3
   - page 6.mp3
   - page 8-9.mp3

🖼️  Page images found: 23
   - crop-1.png (page 1)
   - crop-2.png (page 2)
   - crop-3.png (page 3)
   - crop-4.png (page 4)
   - crop-5.png (page 5)
   ... and 18 more

🔗 Audio-Page Mappings:
   intro title.mp3 → Pages 1 (intro)
   page 2.mp3 → Pages 2 (single_page)
   page 4-5.mp3 → Pages 4, 5 (page_range)
   page 6.mp3 → Pages 6 (single_page)
   page 8-9.mp3 → Pages 8, 9 (page_range)

📊 Coverage Analysis:
   Total pages: 23
   Mapped pages: 12
   Coverage: 52.2%
   ⚠️  Unmapped pages: [3, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

✅ Test results saved to: audio_test_A_Safe_Cake.json
```

**Sample Run:**
```bash
$ python test_manifest_processing.py

📋 Processing manifest: manifest_A_Safe_Cake.json
📊 Total entries: 23
📁 Valid file paths: 23
Sample paths:
  - CROP-ShuSpot/Baking/A Safe Cake/resized/crop-1.png
  - CROP-ShuSpot/Baking/A Safe Cake/resized/crop-2.png
  - CROP-ShuSpot/Baking/A Safe Cake/resized/crop-3.png
✅ Found crop file: CROP-ShuSpot/Baking/A Safe Cake/resized/crop-1.png -> folder: 'CROP-ShuSpot/Baking/A Safe Cake', page: 1
✅ Found crop file: CROP-ShuSpot/Baking/A Safe Cake/resized/crop-2.png -> folder: 'CROP-ShuSpot/Baking/A Safe Cake', page: 2

📚 Book folders found: 1
📖 Book: 'A Safe Cake' - 20 pages

🎉 Total books created: 1

📋 Sample book:
  Name: A Safe Cake
  Category: Baking
  Pages: 20
  First page URL: https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books/CROP-ShuSpot/Baking/A%20Safe%20Cake/resized/crop-1.png
```

## 🎯 When to Use Each Script

| Script | Use Case | Example |
|--------|----------|---------|
| `rclone_uploader.py` | Upload new books from your computer | Adding a new book collection |
| `quick_manifest.py` | Create manifest for books already in Supabase | Import existing uploaded books |
| `test_manifest_processing.py` | Debug why books aren't showing up | Troubleshoot manifest issues |
| `audio_page_matcher.py` | Match MP3s to pages with OCR | Books with audio files |
| `quick_audio_test.py` | Test audio matching without OCR | Quick audio analysis |

## 🎵 Audio Integration Workflow

### Understanding Audio File Patterns

Your MP3 files should follow these naming patterns:

| Filename Pattern | Maps To | Example |
|------------------|---------|---------|
| `page 2.mp3` | Single page | Page 2 |
| `page4-5.mp3` | Page range | Pages 4 and 5 |
| `page 10-11.mp3` | Page range | Pages 10 and 11 |
| `intro title.mp3` | First page | Page 1 (intro) |
| `outro.mp3` | Last page | Final page |

### Step-by-Step Audio Integration

1. **Test Your Audio Files:**
   ```bash
   python quick_audio_test.py "/path/to/your/book"
   ```
   This shows you which pages have audio and which don't.

2. **Extract Text with OCR (Optional but Recommended):**
   ```bash
   # Install OCR libraries first
   pip install pytesseract pillow opencv-python
   
   # Run full analysis
   python audio_page_matcher.py "/path/to/your/book"
   ```

3. **Upload Audio-Enhanced Manifest:**
   - Use the generated `audio_manifest_*.json` file
   - Upload via "Rclone + Supabase" method in book admin
   - Books will have audio playback functionality

### Audio File Structure

Your book folder should look like this:
```
A Safe Cake/
├── cover.jpg
├── description.txt
├── intro title.mp3          # Intro audio
├── page 2.mp3               # Page 2 audio
├── page 4-5.mp3             # Pages 4-5 audio
├── page 6.mp3               # Page 6 audio
├── resized/
│   ├── crop-1.png           # Page 1 image
│   ├── crop-2.png           # Page 2 image
│   ├── crop-3.png           # Page 3 image
│   └── ...
```

## 🛠 Simple Batch Scripts (Alternative)

### Windows: `upload_books.bat`
- **Usage**: Drag and drop your book folder onto the file
- **Features**: Automatic upload + manifest generation

### Mac/Linux: `upload_books.sh`
- **Usage**: `./upload_books.sh /path/to/your/book/folder`
- **Features**: Same as Windows version

## 📋 Book Folder Structure

Your book folders should follow this structure:

```
My Book/
├── cover.jpg              # Book cover image
├── description.txt        # Book description
├── resized/              # Page images folder
│   ├── crop-1.png        # Page 1
│   ├── crop-2.png        # Page 2
│   └── ...
├── page1.mp3             # Audio files (optional)
├── page2.mp3
└── ...
```

## ⚡ Performance Tips

### For Large Collections (20GB+):
- Use the Rclone method (fastest)
- Upload during off-peak hours
- Ensure stable internet connection
- Consider splitting very large collections

### For Smaller Collections (<5GB):
- ZIP method in the web interface works well
- Faster for small numbers of books

## 🔧 Easy Rclone Setup & Troubleshooting

### First Time Setup (Copy & Paste These Commands)

**Step 1: Test if Rclone is installed**
```bash
rclone version
```
If this fails, install Rclone first (see installation section above).

**Step 2: Configure Supabase (copy this exactly)**
```bash
rclone config create supa s3 provider=Other endpoint=https://xzwdtcczndgglqikmlwj.storage.supabase.co/storage/v1/s3 access_key_id=45ac9af4e1e039c4e79fe332833d31e1 secret_access_key=fae79bf3e12cb133b4ceced13c506f5c205544cad11ea4083e449deac1ca7d54 region=us-east-1
```

**Step 3: Test the connection**
```bash
rclone ls supa:books --max-items 5
```
You should see some files listed. If not, check the troubleshooting section below.

### Common Issues & Solutions

**❌ "rclone: command not found"**
- **Windows**: Download from [rclone.org](https://rclone.org/install/) and add to PATH
- **Mac**: `brew install rclone`
- **Linux**: `curl https://rclone.org/install.sh | sudo bash`

**❌ "Failed to create file system for 'supa:books'"**
- Run the config command again (Step 2 above)
- Make sure you copied the entire command exactly

**❌ "Upload fails or times out"**
1. Check your internet connection
2. Try uploading a smaller test folder first
3. Use `--transfers=2` flag for slower connections

**❌ "Manifest shows 0 books"**
1. Run `python test_manifest_processing.py` to debug
2. Check that your book folders have the correct structure:
   ```
   Book Name/
   ├── resized/
   │   ├── crop-1.png
   │   ├── crop-2.png
   │   └── ...
   ```

**❌ "Books don't appear in admin after uploading manifest"**
1. Check the browser console for errors
2. Verify the manifest file isn't empty
3. Make sure you selected "Rclone + Supabase" method (not ZIP upload)

## 🔐 Security Notes

- Keep your Supabase credentials secure
- Use environment variables for credentials in production
- Regularly rotate access keys
- Monitor bucket access logs

## 📞 Support

If you encounter issues:

1. Check the error messages carefully
2. Verify your Rclone configuration: `rclone config show`
3. Test basic Rclone functionality: `rclone ls supa:books`
4. Check Supabase dashboard for upload status

## 📊 Local Database Import Instructions

After running any of the Python scripts, you'll have a `manifest_*.json` file. Here's exactly how to import it:

### Step-by-Step Import Process

1. **Open your Book Admin interface** in your web browser
2. **Click the "Local Database" tab** (not "Streamlined Uploader")
3. **Select "Rclone + Supabase" method** from the dropdown
4. **Click "Choose File"** and select your `manifest_*.json` file
5. **Click "Process Manifest"** 
6. **Wait for processing** - you'll see a progress indicator
7. **Success!** Your books will appear in the book grid below

### What Happens During Import

The system will:
- ✅ Parse your manifest file
- ✅ Extract book information from file paths
- ✅ Create book entries with proper categories
- ✅ Generate page sequences from crop files
- ✅ Set up cover images automatically
- ✅ Add books to your local database

### Expected Results

After a successful import, you should see:
- Books appear in the main book grid
- Proper categories (based on folder structure)
- Cover images displayed
- Page counts shown
- Books ready for editing/management

### If Import Shows "0 Books Processed"

Run the debug script to see what's wrong:
```bash
python test_manifest_processing.py
```

This will show you exactly how your manifest will be processed and help identify any issues.

## 🎯 Complete Workflow Summary

```
Local Folder → Python Script → Supabase Upload → Generate Manifest → Import to Book Admin → Books Ready!
```

**Benefits of this workflow:**
- ✅ Handles any folder size (tested with 20GB+ collections)
- ✅ Fast, reliable uploads with resume capability  
- ✅ Automatic metadata extraction from folder structure
- ✅ Easy bulk management in the admin interface
- ✅ No file size limits or timeout issues