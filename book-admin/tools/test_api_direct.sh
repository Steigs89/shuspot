#!/bin/bash

# Test the API directly to see what's happening
# Replace YOUR_RENDER_URL with your actual Render API URL

echo "Testing Supabase manifest API directly..."

# You need to replace this with your actual Render API URL
API_URL="https://shuspot.onrender.com"

echo "Step 1: Testing preview-manifest endpoint..."
curl -X POST \
  -F "manifest=@manifest_A_Safe_Cake.json" \
  -F "bucket=books" \
  -F "prefix=" \
  -F "public_base_url=https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books" \
  "$API_URL/api/supabase/preview-manifest" \
  -v

echo -e "\n\nIf you got a token from above, use it in the next step..."
echo "Step 2: Test confirm-import (replace TOKEN_HERE with actual token):"
echo "curl -X POST -d 'token=TOKEN_HERE' '$API_URL/api/supabase/confirm-import'"