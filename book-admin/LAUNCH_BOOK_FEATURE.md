# Launch Book Feature - Testing Guide

## Overview
The "Launch Book" feature allows you to test your parsed ShuSpot books directly within the book-admin tool using your main app's reading interface components.

## How It Works

### 1. **Parse Your ShuSpot Collection**
- Go to the "TXT Ingestion" tab
- Enter your ShuSpot folder path: `/Users/ethan.steigerwald/Downloads/Materials for Ethan to test and upload to ShuSpot`
- Click "Parse & Preview" to process your books

### 2. **Launch Books for Testing**
After parsing, you'll see sample books with "Launch" buttons:
- **Blue "Launch" button** = ShuSpot image book (supported)
- **Gray "N/A" button** = Other book types (not yet supported)

### 3. **Reading Experience**
When you launch a ShuSpot book, you get:

#### **Book Overview Screen** (like your main app)
- Beautiful cover display with book title overlay
- Table of contents showing page preview
- Book metadata (AR Level, Lexile, Age Range, etc.)
- "Start Reading" button to begin

#### **Image Reader Interface** (adapted from your PDF reader)
- Full-screen book reading experience
- Page navigation with left/right arrows
- Progress bar at bottom
- Navigation auto-hides for immersive reading
- Tap zones for mobile-friendly navigation

## Supported Book Types

### ✅ **Currently Supported**
- **ShuSpot Image Books** with Screenshot files
  - Books with `Screenshot (1).png` = Cover
  - Books with `Screenshot (2).png` = Page 1, etc.
  - Proper page sequence and navigation
  - Cover image detection

### 🚧 **Coming Soon**
- Video Books (.mp4 files)
- Audiobooks (.mp3 files)
- PDF Books
- Read-along with audio sync

## Technical Details

### **Components Created**
1. **`ShuSpotBookLauncher.js`** - Main launcher component
2. **`ShuSpotBookOverview.js`** - Book overview screen (adapted from your BookOverview.tsx)
3. **`ShuSpotImageReader.js`** - Image reading interface (adapted from your PdfViewer.tsx)

### **Integration Points**
- **BookGrid**: Added "Launch" button in Actions column
- **TxtIngestion**: Added "Launch" buttons for sample books
- **App.js**: Handles book launching and navigation

### **Data Structure**
Books with proper ShuSpot parsing include:
```json
{
  "Name": "A Gift for Sophie",
  "_page_sequence": [
    {
      "screenshot_number": 1,
      "file_path": "/path/to/Screenshot (1).png",
      "is_cover": true,
      "page_number": 0,
      "display_name": "Cover/TOC"
    },
    {
      "screenshot_number": 2,
      "file_path": "/path/to/Screenshot (2).png", 
      "is_cover": false,
      "page_number": 1,
      "display_name": "Page 1"
    }
  ],
  "_total_pages": 61,
  "_cover_image_path": "/path/to/Screenshot (1).png"
}
```

## Usage Instructions

### **From Local Database Tab**
1. Go to "Local Database" tab
2. Find a ShuSpot book in the grid
3. Click the blue "Play" button in the Actions column
4. Book launches in full reading interface

### **From TXT Ingestion Tab**
1. Go to "TXT Ingestion" tab
2. Parse your ShuSpot folder
3. Look for sample books with green "ShuSpot" tags
4. Click "Launch" button on any supported book
5. Test the reading experience

## Benefits for Testing

### **Immediate Feedback**
- Test your parsing results instantly
- Verify cover images load correctly
- Check page sequences are in proper order
- Validate metadata extraction

### **User Experience Testing**
- Experience books as end users would
- Test navigation and page turning
- Verify responsive design on different screen sizes
- Check image quality and loading

### **Development Workflow**
- Parse → Preview → Launch → Test → Iterate
- No need to import to main app for testing
- Quick validation of book structure
- Easy debugging of parsing issues

## File Serving Notes

Currently, the launcher uses `file://` URLs to display images directly from your local file system. For production deployment, you'll need to:

1. **Copy images to public directory**:
   ```bash
   cp -r "/path/to/Materials for Ethan/" ./public/shuspot-books/
   ```

2. **Update file paths** to use public URLs:
   ```javascript
   const publicImagePath = originalPath.replace(
     '/Users/ethan.steigerwald/Downloads/Materials for Ethan to test and upload to ShuSpot/',
     '/shuspot-books/'
   );
   ```

3. **Or create an API endpoint** to serve files dynamically.

## Next Steps

1. **Test the current implementation** with your ShuSpot books
2. **Provide feedback** on the reading experience
3. **Identify any parsing issues** with specific books
4. **Request additional features** (audio sync, video support, etc.)

The launcher gives you a complete testing environment for your ShuSpot collection without needing to set up the full main app infrastructure!