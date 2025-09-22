#!/usr/bin/env python3
"""
Create Category Manifests
=========================

Creates separate manifest files for each book category in your Supabase bucket.
This is much faster than processing the entire 43k+ file collection at once.

Usage:
    python create_category_manifests.py
"""

import json
import subprocess
import os
from pathlib import Path

def get_categories():
    """Get list of categories from Supabase"""
    try:
        cmd = ['rclone', 'lsd', 'supa:books/CROP-ShuSpot/']
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        categories = []
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                # Extract folder name from rclone lsd output
                parts = line.split()
                if len(parts) >= 4:
                    folder_name = ' '.join(parts[4:])  # Join all parts after date/time
                    categories.append(folder_name)
        
        return categories
    except subprocess.CalledProcessError as e:
        print(f"❌ Error getting categories: {e}")
        return []

def create_category_manifest(category):
    """Create manifest for a specific category"""
    safe_name = category.replace(' ', '_').replace('/', '_')
    output_file = f"manifest_{safe_name}.json"
    
    print(f"📋 Creating manifest for: {category}")
    
    try:
        cmd = ['rclone', 'lsjson', '--recursive', f'supa:books/CROP-ShuSpot/{category}']
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        manifest_data = json.loads(result.stdout)
        
        with open(output_file, 'w') as f:
            json.dump(manifest_data, f, indent=2)
        
        print(f"   ✅ {len(manifest_data)} files → {output_file}")
        return output_file, len(manifest_data)
        
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Error: {e}")
        return None, 0
    except json.JSONDecodeError as e:
        print(f"   ❌ JSON Error: {e}")
        return None, 0

def main():
    print("🚀 Creating category manifests...")
    print("=" * 50)
    
    # Get all categories
    categories = get_categories()
    if not categories:
        print("❌ No categories found")
        return
    
    print(f"Found {len(categories)} categories:")
    for cat in categories:
        print(f"  - {cat}")
    print()
    
    # Create manifests for each category
    total_files = 0
    created_manifests = []
    
    for category in categories:
        manifest_file, file_count = create_category_manifest(category)
        if manifest_file:
            created_manifests.append(manifest_file)
            total_files += file_count
    
    print()
    print("🎉 Category manifests created!")
    print("=" * 50)
    print(f"📊 Total files processed: {total_files:,}")
    print(f"📁 Manifests created: {len(created_manifests)}")
    print()
    print("Created files:")
    for manifest in created_manifests:
        size = os.path.getsize(manifest)
        print(f"  - {manifest} ({size:,} bytes)")
    
    print()
    print("🔥 Pro tip: Upload these smaller manifests one at a time")
    print("   instead of the massive 43k+ file manifest!")

if __name__ == '__main__':
    main()