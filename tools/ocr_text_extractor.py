#!/usr/bin/env python3
"""
OCR Text Extractor for ShuSpot Books
===================================

Extracts text from book page images and creates word-level timing data
for synchronized audio-text highlighting.

Usage:
    python ocr_text_extractor.py "/path/to/book/folder"
"""

import os
import json
import cv2
import numpy as np
from pathlib import Path
import sys
import re
from typing import List, Dict, Tuple

try:
    import pytesseract
    import easyocr
    TESSERACT_AVAILABLE = True
    EASYOCR_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ OCR libraries not available: {e}")
    print("Install with: pip install pytesseract easyocr opencv-python")
    TESSERACT_AVAILABLE = False
    EASYOCR_AVAILABLE = False

class OCRTextExtractor:
    def __init__(self):
        self.reader = None
        if EASYOCR_AVAILABLE:
            try:
                self.reader = easyocr.Reader(['en'])
                print("✅ EasyOCR initialized")
            except Exception as e:
                print(f"❌ EasyOCR initialization failed: {e}")
                self.reader = None

    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for better OCR results"""
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply denoising
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Morphological operations to clean up
        kernel = np.ones((1, 1), np.uint8)
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        return cleaned

    def extract_text_with_positions(self, image_path: str) -> List[Dict]:
        """Extract text with word-level bounding boxes"""
        words = []
        
        try:
            # Preprocess image
            processed_img = self.preprocess_image(image_path)
            
            if self.reader:
                # Use EasyOCR for better accuracy
                results = self.reader.readtext(processed_img)
                
                for (bbox, text, confidence) in results:
                    if confidence > 0.5:  # Filter low-confidence results
                        # Calculate bounding box
                        x_coords = [point[0] for point in bbox]
                        y_coords = [point[1] for point in bbox]
                        x, y = min(x_coords), min(y_coords)
                        width = max(x_coords) - min(x_coords)
                        height = max(y_coords) - min(y_coords)
                        
                        # Split text into individual words
                        text_words = text.strip().split()
                        word_width = width / len(text_words) if text_words else width
                        
                        for i, word in enumerate(text_words):
                            if word.strip():  # Skip empty words
                                words.append({
                                    'text': word.strip(),
                                    'x': x + (i * word_width),
                                    'y': y,
                                    'width': word_width,
                                    'height': height,
                                    'confidence': confidence
                                })
            
            elif TESSERACT_AVAILABLE:
                # Fallback to Tesseract
                data = pytesseract.image_to_data(processed_img, output_type=pytesseract.Output.DICT)
                
                for i in range(len(data['text'])):
                    word = data['text'][i].strip()
                    confidence = int(data['conf'][i])
                    
                    if word and confidence > 30:  # Filter low-confidence results
                        words.append({
                            'text': word,
                            'x': data['left'][i],
                            'y': data['top'][i],
                            'width': data['width'][i],
                            'height': data['height'][i],
                            'confidence': confidence
                        })
            
            else:
                print("❌ No OCR engine available")
                return []
                
        except Exception as e:
            print(f"❌ OCR extraction failed for {image_path}: {e}")
            return []
        
        # Sort words by reading order (top to bottom, left to right)
        words.sort(key=lambda w: (w['y'], w['x']))
        
        print(f"📝 Extracted {len(words)} words from {Path(image_path).name}")
        return words

    def estimate_word_timing(self, words: List[Dict], audio_duration: float) -> List[Dict]:
        """Estimate timing for each word based on audio duration"""
        if not words:
            return []
        
        # Simple timing estimation - distribute words evenly across audio duration
        words_per_second = len(words) / audio_duration
        
        for i, word in enumerate(words):
            start_time = i / words_per_second
            end_time = (i + 1) / words_per_second
            
            word.update({
                'id': f'word-{i}',
                'startTime': start_time,
                'endTime': end_time
            })
        
        return words

    def process_book_page(self, image_path: str, audio_duration: float = None) -> Dict:
        """Process a single book page for text extraction"""
        print(f"🔍 Processing page: {Path(image_path).name}")
        
        # Extract text with positions
        words = self.extract_text_with_positions(image_path)
        
        if not words:
            print(f"⚠️ No text found in {Path(image_path).name}")
            return None
        
        # Add timing if audio duration is provided
        if audio_duration:
            words = self.estimate_word_timing(words, audio_duration)
        
        # Get image dimensions for relative positioning
        img = cv2.imread(image_path)
        if img is not None:
            height, width = img.shape[:2]
            
            # Convert to relative positions (0-1)
            for word in words:
                word['x_rel'] = word['x'] / width
                word['y_rel'] = word['y'] / height
                word['width_rel'] = word['width'] / width
                word['height_rel'] = word['height'] / height
        
        return {
            'page_image': str(image_path),
            'words': words,
            'total_words': len(words),
            'image_width': width if 'width' in locals() else None,
            'image_height': height if 'height' in locals() else None
        }

def process_book_folder(book_path: str):
    """Process all pages in a book folder"""
    book_folder = Path(book_path.strip().strip("'\""))
    
    if not book_folder.exists():
        print(f"❌ Folder not found: {book_path}")
        return
    
    print(f"📚 Processing book: {book_folder.name}")
    print("="*50)
    
    # Initialize OCR extractor
    extractor = OCRTextExtractor()
    
    # Find page images
    resized_folder = book_folder / "resized"
    page_images = []
    if resized_folder.exists():
        for ext in ['.png', '.jpg', '.jpeg']:
            page_images.extend(resized_folder.glob(f"crop-*{ext}"))
    
    if not page_images:
        print("❌ No page images found in resized folder")
        return
    
    # Sort by page number
    def extract_page_number(filename):
        match = re.search(r'crop-(\d+)', filename.name)
        return int(match.group(1)) if match else 0
    
    page_images.sort(key=extract_page_number)
    
    # Find audio files for timing
    audio_files = {}
    for ext in ['.mp3', '.m4a', '.wav']:
        for audio_file in book_folder.glob(f"*{ext}"):
            # Extract page number from audio filename
            page_match = re.search(r'page\s*(\d+)', audio_file.name.lower())
            if page_match:
                page_num = int(page_match.group(1))
                audio_files[page_num] = audio_file
    
    # Process each page
    book_text_data = {}
    
    for img_path in page_images[:5]:  # Process first 5 pages for demo
        page_num = extract_page_number(img_path)
        
        # Get audio duration if available
        audio_duration = None
        if page_num in audio_files:
            # You could use librosa or other audio libraries to get duration
            # For now, estimate based on file size (rough approximation)
            audio_size = audio_files[page_num].stat().st_size
            audio_duration = max(3.0, min(15.0, audio_size / 50000))  # 3-15 seconds
        
        # Extract text
        page_data = extractor.process_book_page(str(img_path), audio_duration)
        
        if page_data:
            book_text_data[page_num] = page_data
    
    # Save results
    output_file = f"ocr_text_{book_folder.name.replace(' ', '_')}.json"
    with open(output_file, 'w') as f:
        json.dump(book_text_data, f, indent=2)
    
    print(f"\n✅ OCR results saved to: {output_file}")
    print(f"📊 Processed {len(book_text_data)} pages")
    
    # Print summary
    total_words = sum(data['total_words'] for data in book_text_data.values())
    print(f"📝 Total words extracted: {total_words}")
    
    return book_text_data

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python ocr_text_extractor.py '/path/to/book/folder'")
        print("\nExample:")
        print("  python ocr_text_extractor.py '/Users/john/Books/Our Sun is A Star'")
        sys.exit(1)
    
    if not TESSERACT_AVAILABLE and not EASYOCR_AVAILABLE:
        print("❌ No OCR libraries available. Install with:")
        print("pip install pytesseract easyocr opencv-python")
        sys.exit(1)
    
    process_book_folder(sys.argv[1])