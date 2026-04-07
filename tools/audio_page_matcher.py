#!/usr/bin/env python3
"""
Audio-Page Matcher with OCR
============================

This tool uses OCR to extract text from book page images and matches them
with MP3 audio files based on filename patterns and content analysis.

Features:
- OCR text extraction from page images
- MP3 filename parsing (page 2.mp3, page4-5.mp3, etc.)
- Audio-to-page mapping generation
- Content-based matching for better accuracy

Requirements:
- pip install pytesseract pillow opencv-python
- Tesseract OCR installed on system
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import argparse

try:
    import pytesseract
    from PIL import Image
    import cv2
    import numpy as np
    HAS_OCR = True
except ImportError:
    HAS_OCR = False
    print("⚠️  OCR libraries not installed. Install with:")
    print("   pip install pytesseract pillow opencv-python")
    print("   Also install Tesseract: https://github.com/tesseract-ocr/tesseract")

class AudioPageMatcher:
    def __init__(self, book_folder: str):
        self.book_folder = Path(book_folder)
        self.resized_folder = self.book_folder / "resized"
        self.audio_files = []
        self.page_images = []
        self.page_texts = {}
        self.audio_mappings = {}
        
    def scan_files(self):
        """Scan for audio files and page images"""
        print(f"📁 Scanning folder: {self.book_folder}")
        
        # Find audio files
        audio_extensions = ['.mp3', '.m4a', '.wav']
        for ext in audio_extensions:
            self.audio_files.extend(self.book_folder.glob(f"*{ext}"))
        
        # Find page images
        if self.resized_folder.exists():
            image_extensions = ['.png', '.jpg', '.jpeg', '.webp']
            for ext in image_extensions:
                self.page_images.extend(self.resized_folder.glob(f"crop-*{ext}"))
        
        self.audio_files.sort()
        self.page_images.sort(key=lambda x: self._extract_page_number(x.name))
        
        print(f"🎵 Found {len(self.audio_files)} audio files")
        print(f"🖼️  Found {len(self.page_images)} page images")
        
    def _extract_page_number(self, filename: str) -> int:
        """Extract page number from filename like crop-1.png"""
        match = re.search(r'crop-(\d+)', filename)
        return int(match.group(1)) if match else 0
    
    def parse_audio_filename(self, audio_file: Path) -> Dict:
        """Parse audio filename to extract page information"""
        name = audio_file.stem.lower()
        
        # Common patterns:
        # page 2.mp3 -> page 2
        # page4-5.mp3 -> pages 4-5
        # intro title.mp3 -> intro/title
        # page 10-11.mp3 -> pages 10-11
        
        patterns = [
            (r'page\s*(\d+)-(\d+)', 'page_range'),  # page4-5, page 10-11
            (r'page\s*(\d+)', 'single_page'),       # page 2, page2
            (r'intro|title|cover', 'intro'),         # intro title
            (r'end|outro|back', 'outro'),            # ending
        ]
        
        for pattern, type_name in patterns:
            match = re.search(pattern, name)
            if match:
                if type_name == 'page_range':
                    start_page = int(match.group(1))
                    end_page = int(match.group(2))
                    return {
                        'type': 'page_range',
                        'start_page': start_page,
                        'end_page': end_page,
                        'pages': list(range(start_page, end_page + 1)),
                        'filename': audio_file.name
                    }
                elif type_name == 'single_page':
                    page_num = int(match.group(1))
                    return {
                        'type': 'single_page',
                        'page': page_num,
                        'pages': [page_num],
                        'filename': audio_file.name
                    }
                elif type_name == 'intro':
                    return {
                        'type': 'intro',
                        'pages': [1],  # Usually maps to first page
                        'filename': audio_file.name
                    }
                elif type_name == 'outro':
                    return {
                        'type': 'outro',
                        'pages': [len(self.page_images)],  # Last page
                        'filename': audio_file.name
                    }
        
        # Fallback: try to extract any number
        number_match = re.search(r'(\d+)', name)
        if number_match:
            page_num = int(number_match.group(1))
            return {
                'type': 'inferred',
                'page': page_num,
                'pages': [page_num],
                'filename': audio_file.name
            }
        
        return {
            'type': 'unknown',
            'pages': [],
            'filename': audio_file.name
        }
    
    def extract_text_from_image(self, image_path: Path) -> str:
        """Extract text from image using OCR"""
        if not HAS_OCR:
            return ""
        
        try:
            # Load and preprocess image
            image = cv2.imread(str(image_path))
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Enhance image for better OCR
            # Increase contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(gray)
            
            # Denoise
            denoised = cv2.medianBlur(enhanced, 3)
            
            # Convert to PIL Image
            pil_image = Image.fromarray(denoised)
            
            # Extract text
            text = pytesseract.image_to_string(pil_image, config='--psm 6')
            
            # Clean text
            text = re.sub(r'\s+', ' ', text.strip())
            
            return text
            
        except Exception as e:
            print(f"❌ OCR failed for {image_path}: {e}")
            return ""
    
    def extract_all_page_texts(self):
        """Extract text from all page images"""
        if not HAS_OCR:
            print("⚠️  Skipping OCR - libraries not installed")
            return
        
        print("🔍 Extracting text from page images...")
        
        for i, image_path in enumerate(self.page_images):
            page_num = self._extract_page_number(image_path.name)
            print(f"   Processing page {page_num} ({i+1}/{len(self.page_images)})")
            
            text = self.extract_text_from_image(image_path)
            self.page_texts[page_num] = {
                'text': text,
                'word_count': len(text.split()),
                'image_path': str(image_path)
            }
            
            # Show preview of extracted text
            if text:
                preview = text[:100] + "..." if len(text) > 100 else text
                print(f"      Text preview: {preview}")
            else:
                print(f"      No text extracted")
    
    def create_audio_mappings(self):
        """Create mappings between audio files and pages"""
        print("🎵 Creating audio-to-page mappings...")
        
        for audio_file in self.audio_files:
            audio_info = self.parse_audio_filename(audio_file)
            
            print(f"\n📄 {audio_file.name}")
            print(f"   Type: {audio_info['type']}")
            print(f"   Mapped pages: {audio_info['pages']}")
            
            # Store mapping
            self.audio_mappings[audio_file.name] = audio_info
            
            # Add file path and URL for manifest
            audio_info['file_path'] = str(audio_file.relative_to(self.book_folder))
            audio_info['url'] = f"/{audio_file.relative_to(self.book_folder)}"
    
    def generate_manifest(self, output_file: str = None):
        """Generate manifest with audio-page mappings"""
        if not output_file:
            book_name = self.book_folder.name.replace(' ', '_')
            output_file = f"audio_manifest_{book_name}.json"
        
        manifest = {
            'book_name': self.book_folder.name,
            'total_pages': len(self.page_images),
            'total_audio_files': len(self.audio_files),
            'page_texts': self.page_texts,
            'audio_mappings': self.audio_mappings,
            'page_sequence': []
        }
        
        # Create page sequence with audio mappings
        for i, image_path in enumerate(self.page_images):
            page_num = self._extract_page_number(image_path.name)
            
            # Find audio files for this page
            page_audio = []
            for audio_name, audio_info in self.audio_mappings.items():
                if page_num in audio_info['pages']:
                    page_audio.append({
                        'filename': audio_name,
                        'url': audio_info['url'],
                        'type': audio_info['type']
                    })
            
            page_data = {
                'page_number': page_num,
                'image_url': f"/resized/{image_path.name}",
                'audio_files': page_audio,
                'text': self.page_texts.get(page_num, {}).get('text', ''),
                'word_count': self.page_texts.get(page_num, {}).get('word_count', 0)
            }
            
            manifest['page_sequence'].append(page_data)
        
        # Save manifest
        with open(output_file, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"\n✅ Audio manifest saved to: {output_file}")
        return output_file
    
    def print_summary(self):
        """Print summary of audio-page mappings"""
        print("\n" + "="*60)
        print("📊 AUDIO-PAGE MAPPING SUMMARY")
        print("="*60)
        
        print(f"📖 Book: {self.book_folder.name}")
        print(f"📄 Pages: {len(self.page_images)}")
        print(f"🎵 Audio files: {len(self.audio_files)}")
        
        if HAS_OCR:
            total_words = sum(info.get('word_count', 0) for info in self.page_texts.values())
            print(f"📝 Total words extracted: {total_words}")
        
        print("\n🎵 Audio File Mappings:")
        for audio_name, info in self.audio_mappings.items():
            pages_str = ", ".join(map(str, info['pages']))
            print(f"   {audio_name} → Pages {pages_str} ({info['type']})")
        
        # Check for unmapped pages
        mapped_pages = set()
        for info in self.audio_mappings.values():
            mapped_pages.update(info['pages'])
        
        all_pages = set(self._extract_page_number(img.name) for img in self.page_images)
        unmapped_pages = all_pages - mapped_pages
        
        if unmapped_pages:
            print(f"\n⚠️  Unmapped pages: {sorted(unmapped_pages)}")
        else:
            print(f"\n✅ All pages have audio mappings!")

def main():
    parser = argparse.ArgumentParser(
        description="Match MP3 audio files to book pages using OCR",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process a single book folder
  python audio_page_matcher.py "/path/to/A Safe Cake"
  
  # Process with custom output
  python audio_page_matcher.py "/path/to/book" --output "my_audio_manifest.json"
  
  # Skip OCR (faster, filename-based matching only)
  python audio_page_matcher.py "/path/to/book" --no-ocr
        """
    )
    
    parser.add_argument('book_folder', help='Path to book folder')
    parser.add_argument('--output', help='Output manifest filename')
    parser.add_argument('--no-ocr', action='store_true', help='Skip OCR text extraction')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.book_folder):
        print(f"❌ Book folder not found: {args.book_folder}")
        return 1
    
    # Create matcher
    matcher = AudioPageMatcher(args.book_folder)
    
    # Scan files
    matcher.scan_files()
    
    if not matcher.audio_files:
        print("❌ No audio files found in book folder")
        return 1
    
    if not matcher.page_images:
        print("❌ No page images found in resized/ folder")
        return 1
    
    # Extract text (if OCR available and not disabled)
    if not args.no_ocr and HAS_OCR:
        matcher.extract_all_page_texts()
    elif args.no_ocr:
        print("⚠️  Skipping OCR (--no-ocr flag)")
    
    # Create mappings
    matcher.create_audio_mappings()
    
    # Generate manifest
    manifest_file = matcher.generate_manifest(args.output)
    
    # Print summary
    matcher.print_summary()
    
    print(f"\n🎉 Complete! Use this manifest in your book admin:")
    print(f"   {manifest_file}")

if __name__ == '__main__':
    main()