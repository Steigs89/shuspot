# Example Folder Structure for Book Admin Tool

This shows how to organize your books with automatic metadata detection:

## Folder Structure Examples:

```
uploads/
├── Grade-2-Read-to-Me/
│   ├── metadata.json          # Optional: Override auto-detection
│   ├── The Magic Forest.pdf
│   ├── The Magic Forest.jpg   # Auto-detected cover image
│   └── Ocean Adventures.pdf
│
├── Voice-Coach-Level-D/
│   ├── pronunciation-practice.pdf
│   ├── pronunciation-practice_cover.png
│   └── speaking-exercises.docx
│
├── Audiobooks-Grade-3/
│   ├── Harry Potter.mp3
│   ├── Harry Potter.jpg
│   └── Charlotte's Web.m4a
│
└── Video-Books-Kindergarten/
    ├── Learning Colors.mp4
    ├── Learning Colors.png
    └── Animal Sounds.avi
```

## Automatic Detection Rules:

### Book Type Detection:
- **Read to Me**: Folders/files with "read-to-me", "readtome", "narrated"
- **Voice Coach**: Folders/files with "voice-coach", "pronunciation", "speaking"
- **Audiobooks**: Audio files (.mp3, .m4a, .wav) or "audiobook" in name
- **Video Books**: Video files (.mp4, .mov, .avi) or "video-book" in name
- **Books**: Default for text files

### Reading Level Detection:
- **Grade X**: "grade-2", "grade 3", "2nd-grade"
- **Level X**: "level-a", "level D", "d-level"
- **Pre-K**: "pre-k", "prekindergarten", "kindergarten"

### Cover Image Detection:
- Same name as book: "Book Title.pdf" → "Book Title.jpg"
- With suffix: "Book Title.pdf" → "Book Title_cover.png"
- Generic: "cover.jpg", "thumbnail.png"
- In covers/ subfolder

## metadata.json Format:

```json
{
  "title": "Custom Title",
  "author": "Custom Author", 
  "genre": "Fantasy",
  "book_type": "Read to Me",
  "reading_level": "Grade 2",
  "cover_image_url": "./custom-cover.jpg",
  "subject": "Custom description"
}
```

This metadata.json will override auto-detection for all books in that folder.