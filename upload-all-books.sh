#!/bin/bash
# ============================================
# ShuSpot Batch Book Uploader
# Usage: ./upload-all-books.sh "/path/to/Books/folder"
# Uploads every Bk= folder inside the given directory
# ============================================

SCRIPT_DIR="$(dirname "$0")"
UPLOAD_SCRIPT="$SCRIPT_DIR/upload-book.sh"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

if [ -z "$1" ]; then
  echo -e "${RED}Usage: ./upload-all-books.sh \"/path/to/Books/folder\"${NC}"
  echo "Uploads every Bk= folder inside the given directory."
  exit 1
fi

PARENT="$1"

if [ ! -d "$PARENT" ]; then
  echo -e "${RED}❌ Directory not found: $PARENT${NC}"
  exit 1
fi

# Count books (skip ones with ✓ prefix — already uploaded)
TOTAL=0
SKIPPED=0
for folder in "$PARENT"/Bk=*; do
  [ -d "$folder" ] || continue
  TOTAL=$((TOTAL + 1))
done

# Also count ✓Bk= folders
for folder in "$PARENT"/✓Bk=*; do
  [ -d "$folder" ] || continue
  SKIPPED=$((SKIPPED + 1))
done

echo -e "${BLUE}📚 Found ${TOTAL} books to upload (${SKIPPED} already marked with ✓)${NC}"
echo ""

SUCCESS=0
FAILED=0
CURRENT=0

for folder in "$PARENT"/Bk=*; do
  [ -d "$folder" ] || continue
  CURRENT=$((CURRENT + 1))
  BOOK_NAME=$(basename "$folder")

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📖 [$CURRENT/$TOTAL] $BOOK_NAME${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if "$UPLOAD_SCRIPT" "$folder"; then
    SUCCESS=$((SUCCESS + 1))
    echo -e "${GREEN}✅ Done${NC}"
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}❌ Failed${NC}"
  fi
  echo ""
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Batch upload complete!${NC}"
echo -e "   ✅ Uploaded: ${SUCCESS}"
echo -e "   ❌ Failed: ${FAILED}"
echo -e "   ⏭️  Skipped (✓): ${SKIPPED}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
