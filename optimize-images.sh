#!/bin/bash

# Image optimization script for Shuspot
# This will compress large images to improve load times

echo "🖼️  Starting image optimization..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Installing ImageMagick..."
    brew install imagemagick 2>/dev/null || echo "Please install ImageMagick manually"
    exit 1
fi

# Backup original images
echo "📦 Creating backup..."
mkdir -p src/assets/originals
cp src/assets/kldo_4atl_220426.jpg src/assets/originals/ 2>/dev/null
cp src/assets/adorable-cartoon-dog-face.png src/assets/originals/ 2>/dev/null

# Optimize the huge 6MB background image
echo "🔧 Compressing kldo_4atl_220426.jpg (6MB -> ~500KB)..."
if [ -f "src/assets/kldo_4atl_220426.jpg" ]; then
    convert src/assets/kldo_4atl_220426.jpg \
        -quality 75 \
        -resize 1920x1080\> \
        -strip \
        src/assets/kldo_4atl_220426.jpg
    echo "✅ Compressed kldo_4atl_220426.jpg"
fi

# Optimize the 1MB dog face
echo "🔧 Compressing adorable-cartoon-dog-face.png (1MB -> ~300KB)..."
if [ -f "src/assets/adorable-cartoon-dog-face.png" ]; then
    convert src/assets/adorable-cartoon-dog-face.png \
        -quality 85 \
        -resize 800x800\> \
        -strip \
        src/assets/adorable-cartoon-dog-face.png
    echo "✅ Compressed adorable-cartoon-dog-face.png"
fi

# Optimize other large images
echo "🔧 Optimizing other large images..."
for img in src/assets/*.jpg; do
    if [ -f "$img" ]; then
        size=$(du -k "$img" | cut -f1)
        if [ $size -gt 300 ]; then
            echo "  Compressing $(basename $img)..."
            convert "$img" -quality 80 -strip "$img"
        fi
    fi
done

for img in src/assets/*.png; do
    if [ -f "$img" ]; then
        size=$(du -k "$img" | cut -f1)
        if [ $size -gt 200 ]; then
            echo "  Compressing $(basename $img)..."
            convert "$img" -quality 85 -strip "$img"
        fi
    fi
done

echo ""
echo "✅ Image optimization complete!"
echo ""
echo "Before and after sizes:"
du -sh src/assets/originals/* 2>/dev/null
echo "---"
du -sh src/assets/kldo_4atl_220426.jpg src/assets/adorable-cartoon-dog-face.png 2>/dev/null
echo ""
echo "Next steps:"
echo "1. npm run build"
echo "2. Upload to server"
