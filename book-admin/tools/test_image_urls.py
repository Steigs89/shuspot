#!/usr/bin/env python3
"""
Test image URL patterns for A Safe Cake book
"""
import requests
import urllib.parse

def test_url_patterns():
    book_title = "A Safe Cake"
    base_url = "https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books"
    
    # Test pages 1-6 (failing) and 7-10 (working)
    test_pages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    
    patterns = [
        f"{base_url}/{urllib.parse.quote(book_title)}/resized/crop-{{page}}.png",
        f"{base_url}/{urllib.parse.quote(book_title)}/crop-{{page}}.png",
        f"{base_url}/{urllib.parse.quote(book_title)}/resized/crop-{{page:02d}}.png",
        f"{base_url}/{urllib.parse.quote(book_title)}/resized/page-{{page}}.png",
        f"{base_url}/Baking/{urllib.parse.quote(book_title)}/resized/crop-{{page}}.png",
    ]
    
    print(f"🧪 Testing URL patterns for '{book_title}'")
    print("=" * 60)
    
    for page in test_pages:
        print(f"\n📄 Testing page {page}:")
        
        for i, pattern in enumerate(patterns, 1):
            url = pattern.format(page=page)
            try:
                response = requests.head(url, timeout=5)
                status = "✅ EXISTS" if response.status_code == 200 else f"❌ {response.status_code}"
                print(f"  Pattern {i}: {status}")
                print(f"    URL: {url}")
                
                if response.status_code == 200:
                    break  # Found working URL, move to next page
                    
            except Exception as e:
                print(f"  Pattern {i}: ❌ ERROR - {e}")
                print(f"    URL: {url}")

if __name__ == '__main__':
    test_url_patterns()