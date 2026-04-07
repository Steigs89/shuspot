#!/bin/bash

# ShuSpot Book Uploader for Mac/Linux
# ====================================
# 
# This script helps you upload book folders to Supabase using Rclone.
# 
# Usage: 
#   ./upload_books.sh /path/to/your/book/folder
# 
# Requirements:
#   - Rclone installed and in PATH
#   - Supabase remote configured in Rclone

set -e  # Exit on any error

echo ""
echo "========================================"
echo "    ShuSpot Book Uploader"
echo "========================================"
echo ""

# Check if folder path was provided
if [ $# -eq 0 ]; then
    echo "Error: Please provide a folder path."
    echo ""
    echo "Usage: ./upload_books.sh /path/to/your/book/folder"
    echo ""
    exit 1
fi

BOOK_FOLDER="$1"
FOLDER_NAME=$(basename "$BOOK_FOLDER")

# Check if the folder exists
if [ ! -d "$BOOK_FOLDER" ]; then
    echo "Error: Folder does not exist: $BOOK_FOLDER"
    exit 1
fi

echo "Uploading folder: $BOOK_FOLDER"
echo "Remote path will be: $FOLDER_NAME"
echo ""

# Check if Rclone is installed
if ! command -v rclone &> /dev/null; then
    echo "Error: Rclone is not installed or not in PATH."
    echo "Please install Rclone from: https://rclone.org/install/"
    exit 1
fi

echo "✓ Rclone is installed"

# Check if Supabase remote exists
if ! rclone listremotes | grep -q "supa:"; then
    echo "Error: Supabase remote not configured."
    echo "Please configure Rclone with your Supabase credentials first."
    echo ""
    echo "Example:"
    echo "  rclone config create supa s3 \\"
    echo "    provider=Other \\"
    echo "    endpoint=https://xzwdtcczndgglqikmlwj.storage.supabase.co/storage/v1/s3 \\"
    echo "    access_key_id=45ac9af4e1e039c4e79fe332833d31e1 \\"
    echo "    secret_access_key=fae79bf3e12cb133b4ceced13c506f5c205544cad11ea4083e449deac1ca7d54"
    exit 1
fi

echo "✓ Supabase remote is configured"
echo ""

# Upload the folder
echo "Uploading to Supabase..."
echo "This may take a while for large folders..."
echo ""

if rclone sync "$BOOK_FOLDER" "supa:books/$FOLDER_NAME" --progress --transfers=4; then
    echo ""
    echo "✅ Upload completed successfully!"
    echo ""
else
    echo ""
    echo "❌ Upload failed!"
    exit 1
fi

# Generate manifest
echo "Generating manifest file..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MANIFEST_FILE="manifest_${FOLDER_NAME}_${TIMESTAMP}.json"

if rclone lsjson --recursive "supa:books/$FOLDER_NAME" > "$MANIFEST_FILE"; then
    echo "✅ Manifest saved to: $MANIFEST_FILE"
    echo ""
else
    echo "❌ Failed to generate manifest"
    exit 1
fi

echo "========================================"
echo "    Upload Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Open your book admin interface"
echo "2. Go to the 'Local Database' tab"
echo "3. Choose 'Rclone + Supabase' upload method"
echo "4. Upload the manifest file: $MANIFEST_FILE"
echo "5. Your books will be imported automatically!"
echo ""