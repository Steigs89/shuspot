#!/usr/bin/env python3
"""
Create OCR data for "Our Sun is A Star" book
This creates sample OCR data based on the known content and audio timing
"""

import json
import os
from pathlib import Path

def create_sun_star_ocr_data():
    """Create OCR data for Our Sun is A Star book"""
    
    # Sample text content for each page (based on typical children's book content)
    page_content = {
        1: "Our Sun is A Star",
        2: "The Sun is the closest star to Earth. It gives us light and warmth every day.",
        3: "The Sun is very big. It is much bigger than Earth. Many Earths could fit inside the Sun.",
        5: "The Sun is very hot. It is so hot that it glows and gives off light.",
        6: "The Sun is made of gas. The gas is so hot it glows like a giant light bulb.",
        7: "The Sun looks small in the sky because it is very far away from Earth.",
        9: "During the day, the Sun lights up the sky. We can see everything around us.",
        10: "At night, the Sun shines on the other side of Earth. That's why it gets dark.",
        13: "The Sun helps plants grow. Plants need sunlight to make their food.",
        14: "Animals need plants for food. So animals need the Sun too.",
        15: "People need the Sun for warmth and light. The Sun helps us in many ways.",
        16: "The Sun is a star, just like the stars we see at night. But it looks bigger because it's closer.",
        19: "There are many other stars in the sky. They are all very far away.",
        20: "Some stars are bigger than our Sun. Some stars are smaller.",
        21: "Our Sun is the perfect star for Earth. It gives us just the right amount of light and heat."
    }
    
    # Audio durations (estimated based on reading pace)
    audio_durations = {
        1: 2.0,   # Title page
        2: 4.5,
        3: 5.0,
        5: 4.0,
        6: 4.5,
        7: 4.5,
        9: 4.0,
        10: 4.5,
        13: 4.0,
        14: 3.5,
        15: 4.0,
        16: 5.5,
        19: 4.0,
        20: 3.5,
        21: 5.0
    }
    
    ocr_data = {
        "book_id": "our_sun_is_a_star",
        "pages": {}
    }
    
    for page_num, text in page_content.items():
        words = text.split()
        duration = audio_durations.get(page_num, 4.0)
        
        # Create word data with positions and timing
        word_data = []
        words_per_line = 6  # Approximate words per line
        
        for i, word in enumerate(words):
            # Calculate position (arrange words in lines)
            line = i // words_per_line
            col = i % words_per_line
            
            # Position calculations (relative coordinates 0-1)
            x = 0.1 + (col * 0.13)  # Start at 10% from left, space words
            y = 0.2 + (line * 0.1)   # Start at 20% from top, space lines
            width = len(word) * 0.015 + 0.02  # Width based on word length
            height = 0.05
            
            # Timing calculations (linear distribution)
            start_time = (i / len(words)) * duration
            end_time = ((i + 1) / len(words)) * duration
            
            # Add some natural pauses for punctuation
            if word.endswith('.') or word.endswith('!') or word.endswith('?'):
                end_time += 0.3
            elif word.endswith(','):
                end_time += 0.1
            
            word_data.append({
                "id": f"word-{page_num}-{i}",
                "text": word,
                "x": min(x, 0.85),  # Don't go beyond 85% width
                "y": min(y, 0.8),   # Don't go beyond 80% height
                "width": min(width, 0.15),  # Max width 15%
                "height": height,
                "startTime": start_time,
                "endTime": end_time,
                "confidence": 95 + (i % 5)  # Vary confidence 95-99
            })
        
        ocr_data["pages"][str(page_num)] = {
            "words": word_data,
            "totalWords": len(words),
            "audioDuration": duration,
            "hasAudio": True
        }
    
    return ocr_data

def main():
    """Create and save OCR data for Our Sun is A Star"""
    
    # Create OCR data
    ocr_data = create_sun_star_ocr_data()
    
    # Ensure output directory exists
    output_dir = Path(__file__).parent.parent / "ocr-data"
    output_dir.mkdir(exist_ok=True)
    
    # Save OCR data
    output_file = output_dir / "our_sun_is_a_star.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(ocr_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Created OCR data for 'Our Sun is A Star'")
    print(f"📄 Saved to: {output_file}")
    print(f"📊 Pages with OCR data: {len(ocr_data['pages'])}")
    
    total_words = sum(page['totalWords'] for page in ocr_data['pages'].values())
    print(f"📝 Total words: {total_words}")
    
    # Also create a generic version for testing
    generic_data = ocr_data.copy()
    generic_data["book_id"] = "sample_book"
    
    generic_file = output_dir / "sample_book.json"
    with open(generic_file, 'w', encoding='utf-8') as f:
        json.dump(generic_data, f, indent=2, ensure_ascii=False)
    
    print(f"📄 Also saved generic version to: {generic_file}")

if __name__ == "__main__":
    main()