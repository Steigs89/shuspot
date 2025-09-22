# ShuSpot Book Upload Tools

This folder contains tools to help you upload large book collections to your live server using Rclone + Supabase. These tools are designed to handle folders of any size, including 20GB+ collections.

## 🚀 Quick Start

### For Large Folders (20GB+) - Recommended Method

1. **Install Rclone** (if not already installed):
   - **Windows**: Download from [rclone.org](https://rclone.org/install/)
   - **Mac**: `brew install rclone`
   - **Linux**: `curl https://rclone.org/install.sh | sudo bash`

2. **Configure Supabase Remote** (one-time setup):
   ```bash
   rclone config create supa s3 \
     provider=Other \
     endpoint=https://xzwdtcczndgglqikmlwj.storage.supabase.co/storage/v1/s3 \
     access_key_id=45ac9af4e1e039c4e79fe332833d31e1 \
     secret_access_key=fae79bf3e12cb133b4ceced13c506f5c205544cad11ea4083e449deac1ca7d54 \
     region=us-east-1
   ```

3. **Upload Your Books**:
   - **Windows**: Drag your book folder onto `upload_books.bat`
   - **Mac/Linux**: Run `./upload_books.sh /path/to/your/book/folder`
   - **Advanced**: Use `python rclone_uploader.py /path/to/your/book/folder`

4. **Import to Book Admin**:
   - Open your book admin interface
   - Go to "Local Database" tab
   - Choose "Rclone + Supabase" method
   - Upload the generated `manifest_*.json` file

## 📁 File Structure

```
tools/
├── README.md              # This file
├── rclone_uploader.py     # Advanced Python uploader
├── upload_books.bat       # Windows batch script
├── upload_books.sh        # Mac/Linux shell script
└── requirements.txt       # Python dependencies
```

## 🛠 Tools Overview

### 1. Simple Scripts (Recommended for most users)

#### Windows: `upload_books.bat`
- **Usage**: Drag and drop your book folder onto the file
- **Features**: 
  - Automatic upload to Supabase
  - Generates manifest file
  - Progress indicators
  - Error checking

#### Mac/Linux: `upload_books.sh`
- **Usage**: `./upload_books.sh /path/to/your/book/folder`
- **Features**: Same as Windows version

### 2. Advanced Python Tool: `rclone_uploader.py`

More flexible tool with additional options:

```bash
# Basic upload
python rclone_uploader.py /path/to/books

# Upload to specific remote path
python rclone_uploader.py /path/to/books --remote-path "CROP-ShuSpot/Baking"

# Use custom remote name (default is 'supa')
python rclone_uploader.py /path/to/books --remote "supa"

# Generate manifest only (no upload)
python rclone_uploader.py --manifest-only --remote-path "existing/path"
```

**Options**:
- `--remote-path`: Custom path in Supabase bucket
- `--remote`: Custom Rclone remote name (default: "supa")
- `--bucket`: Custom bucket name (default: "books")
- `--manifest-only`: Generate manifest without uploading
- `--output`: Custom manifest filename

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

## 🔧 Troubleshooting

### Rclone Not Found
```bash
# Install Rclone
curl https://rclone.org/install.sh | sudo bash
```

### Supabase Remote Not Configured
```bash
rclone config create supa s3 \
  provider=Other \
  endpoint=https://xzwdtcczndgglqikmlwj.storage.supabase.co/storage/v1/s3 \
  access_key_id=45ac9af4e1e039c4e79fe332833d31e1 \
  secret_access_key=fae79bf3e12cb133b4ceced13c506f5c205544cad11ea4083e449deac1ca7d54 \
  region=us-east-1
```

### Upload Fails
1. Check internet connection
2. Verify Supabase credentials
3. Ensure bucket exists and is accessible
4. Check folder permissions

### Manifest Generation Fails
1. Verify upload completed successfully
2. Check remote path exists
3. Ensure Rclone has read access to bucket

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

## 🎯 Workflow Summary

```
Local Folder → Rclone Upload → Supabase Storage → Generate Manifest → Import to Book Admin
```

This workflow ensures:
- ✅ Fast uploads for large files
- ✅ Reliable transfer with resume capability
- ✅ Automatic metadata generation
- ✅ Easy integration with book admin
- ✅ Scalable for any collection size