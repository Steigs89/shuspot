#!/bin/bash
# ============================================
# ShuSpot Book Uploader
# Usage: ./upload-book.sh "/path/to/Bk=Book Title"
# ============================================

set -e

SUPABASE_URL="https://xzwdtcczndgglqikmlwj.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6d2R0Y2N6bmRnZ2xxaWttbHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTkyNzUsImV4cCI6MjA2ODg3NTI3NX0.05oCSZ1d3eJHr79B1UvCoQTIL-UBGAKdRBk4CUwe7wE"
BUCKET_BASE="https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$1" ]; then
  echo -e "${RED}Usage: ./upload-book.sh \"/path/to/Bk=Book Title\"${NC}"
  exit 1
fi

BOOK_PATH="$1"

# Extract book title from folder name (strip "Bk=" prefix and page count suffix)
FOLDER_NAME=$(basename "$BOOK_PATH")
TITLE=$(echo "$FOLDER_NAME" | sed 's/^Bk=//' | sed 's/ - [0-9]*pgs$//')
SAFE_TITLE=$(echo "$TITLE" | sed 's/ /%20/g')

echo -e "${BLUE}📚 Uploading: ${TITLE}${NC}"

# Check for required files
if [ ! -d "$BOOK_PATH/resized" ] && [ ! -d "$BOOK_PATH/RESIZED" ]; then
  echo -e "${RED}❌ No resized/ or RESIZED/ folder found in $BOOK_PATH${NC}"
  exit 1
fi

# Detect resized folder name
RESIZED_DIR="resized"
if [ -d "$BOOK_PATH/RESIZED" ]; then
  RESIZED_DIR="RESIZED"
fi

# Count pages
PAGE_COUNT=$(ls "$BOOK_PATH/$RESIZED_DIR"/crop-*.png 2>/dev/null | wc -l | tr -d ' ')
echo -e "${BLUE}📄 Found ${PAGE_COUNT} pages${NC}"

# Parse GPT description if available
AUTHOR=""
DESCRIPTION=""
READING_LEVEL=""
CONTENT_TYPE="book"
FICTION_TYPE="Fiction"
AR_LEVEL=""
LEXILE=""
ISBN=""
GENRE1=""
GENRE2=""

GPT_FILE=$(find "$BOOK_PATH" -name "*GPT_description.txt" -o -name "*description.txt" 2>/dev/null | head -1)
if [ -n "$GPT_FILE" ]; then
  echo -e "${BLUE}📝 Parsing description file...${NC}"
  AUTHOR=$(grep "^Author:" "$GPT_FILE" | sed 's/^Author: *//')
  DESCRIPTION=$(grep "^Description:" "$GPT_FILE" | sed 's/^Description: *//')
  AR_LEVEL=$(grep "^AR Level:" "$GPT_FILE" | sed 's/^AR Level: *//')
  LEXILE=$(grep "^Lexile:" "$GPT_FILE" | sed 's/^Lexile: *//')
  ISBN=$(grep "^ISBN:" "$GPT_FILE" | sed 's/^ISBN: *//')
  FICTION_TYPE=$(grep "^Fiction Type:" "$GPT_FILE" | sed 's/^Fiction Type: *//')
  GENRE1=$(grep "^Genre 1:" "$GPT_FILE" | sed 's/^Genre 1: *//')
  GENRE2=$(grep "^Genre 2:" "$GPT_FILE" | sed 's/^Genre 2: *//')
  READING_LEVEL="$AR_LEVEL"

  # Check if Read-to-Me
  IS_RTM=$(grep "^Read-to-Me?:" "$GPT_FILE" | sed 's/^Read-to-Me?: *//')
  if [ "$IS_RTM" = "yes" ]; then
    CONTENT_TYPE="read-to-me"
  fi

  # Check if Audiobook
  IS_AUDIO=$(grep "^Audiobook?:" "$GPT_FILE" | sed 's/^Audiobook?: *//')
  if [ "$IS_AUDIO" = "yes" ]; then
    CONTENT_TYPE="audiobook"
  fi
fi

# Step 1: Upload to Supabase via rclone
REMOTE_PATH="CROP-ShuSpot/Books/${TITLE}"
if [ "$CONTENT_TYPE" = "read-to-me" ]; then
  REMOTE_PATH="CROP-ShuSpot/ReadToMe/${TITLE}"
elif [ "$CONTENT_TYPE" = "audiobook" ]; then
  REMOTE_PATH="CROP-ShuSpot/Audiobooks/${TITLE}"
fi

echo -e "${BLUE}📤 Uploading to Supabase storage...${NC}"
rclone copy "$BOOK_PATH/" "supa:books/${REMOTE_PATH}/" --progress --exclude ".DS_Store"
echo -e "${GREEN}✅ Upload complete${NC}"

# Step 2: Build pages JSON
ENCODED_PATH=$(echo "$REMOTE_PATH" | sed 's/ /%20/g')
PAGES='['
for i in $(seq 1 $PAGE_COUNT); do
  if [ $i -gt 1 ]; then PAGES+=','; fi
  IMG_URL="${BUCKET_BASE}/${ENCODED_PATH}/resized/crop-${i}.png"

  # Check for matching audio file (for read-to-me)
  AUDIO_PART=""
  if [ "$CONTENT_TYPE" = "read-to-me" ]; then
    if [ -f "$BOOK_PATH/${i}.mp3" ]; then
      AUDIO_URL="${BUCKET_BASE}/${ENCODED_PATH}/${i}.mp3"
      AUDIO_PART=",\"audio_url\":\"${AUDIO_URL}\""
    fi
  fi

  PAGES+="{\"page_number\":${i},\"image_url\":\"${IMG_URL}\"${AUDIO_PART}}"
done
PAGES+=']'

# Detect cover
COVER_EXT="webp"
if [ -f "$BOOK_PATH/cover.jpg" ]; then COVER_EXT="jpg"; fi
if [ -f "$BOOK_PATH/cover.png" ]; then COVER_EXT="png"; fi
COVER_URL="${BUCKET_BASE}/${ENCODED_PATH}/cover.${COVER_EXT}"

# Escape description for JSON
DESCRIPTION_ESC=$(echo "$DESCRIPTION" | sed 's/"/\\"/g' | tr -d '\n')

# Step 3: Insert into Supabase database
echo -e "${BLUE}💾 Creating database entry...${NC}"
RESULT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/books" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"title\": \"${TITLE}\",
    \"author\": \"${AUTHOR}\",
    \"description\": \"${DESCRIPTION_ESC}\",
    \"content_type\": \"${CONTENT_TYPE}\",
    \"reading_level\": \"${READING_LEVEL}\",
    \"categories\": [],
    \"tags\": [],
    \"cover_image_url\": \"${COVER_URL}\",
    \"page_count\": ${PAGE_COUNT},
    \"is_active\": true,
    \"metadata\": {
      \"pages\": ${PAGES},
      \"total_pages\": ${PAGE_COUNT},
      \"fiction_type\": \"${FICTION_TYPE}\",
      \"isbn\": \"${ISBN}\",
      \"ar_level\": \"${AR_LEVEL}\",
      \"lexile\": \"${LEXILE}\",
      \"genre_1\": \"${GENRE1}\",
      \"genre_2\": \"${GENRE2}\",
      \"folder_path\": \"books/${REMOTE_PATH}\"
    }
  }")

# Check result
if echo "$RESULT" | grep -q '"id"'; then
  BOOK_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null)
  echo -e "${GREEN}🎉 Success! Book uploaded and registered.${NC}"
  echo -e "${GREEN}   Title: ${TITLE}${NC}"
  echo -e "${GREEN}   ID: ${BOOK_ID}${NC}"
  echo -e "${GREEN}   Pages: ${PAGE_COUNT}${NC}"
  echo -e "${GREEN}   Type: ${CONTENT_TYPE}${NC}"
  echo -e "${BLUE}🌐 View at: https://shuspot.com${NC}"
else
  echo -e "${RED}❌ Database insert failed:${NC}"
  echo "$RESULT"
fi
