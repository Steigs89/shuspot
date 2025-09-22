#!/usr/bin/env python3
"""
Quick Manifest Generator
========================

Creates a targeted manifest for specific book folders instead of 
processing the entire 43k+ file Supabase bucket.

Usage:
    python quick_manifest.py CROP-ShuSpot/Baking
    python quick_manifest.py CROP-ShuSpot/Baking "A Safe Cake"
"""

import sys
import json
import subprocess
from pathlib import Path

def create_targeted_manifest(base_path, book_folder=None):
    """Create manifest for specific path with full paths"""
    
    if book_folder:
        full_path = f"supa:books/{base_path}/{book_folder}"
        output_name = f"manifest_{book_folder.replace(' ', '_')}.json"
        prefix_path = f"{base_path}/{book_folder}"
    else:
        full_path = f"supa:books/{base_path}"
        output_name = f"manifest_{Path(base_path).name}.json"
        prefix_path = base_path
    
    print(f"Creating manifest for: {full_path}")
    print(f"Output file: {output_name}")
    
    try:
        # Use rclone lsjson with specific path
        cmd = ['rclone', 'lsjson', '--recursive', full_path]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        manifest_data = json.loads(result.stdout)
        
        # Fix the paths to include the full path from bucket root
        for entry in manifest_data:
            if 'Path' in entry:
                # Convert relative path to full path
                entry['Path'] = f"{prefix_path}/{entry['Path']}"
        
        with open(output_name, 'w') as f:
            json.dump(manifest_data, f, indent=2)
        
        print(f"✅ Created manifest with {len(manifest_data)} files")
        print(f"📁 Saved to: {output_name}")
        
        return output_name
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Rclone error: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON error: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python quick_manifest.py <base_path> [book_folder]")
        print("Examples:")
        print("  python quick_manifest.py CROP-ShuSpot/Baking")
        print("  python quick_manifest.py CROP-ShuSpot/Baking 'A Safe Cake'")
        sys.exit(1)
    
    base_path = sys.argv[1]
    book_folder = sys.argv[2] if len(sys.argv) > 2 else None
    
    manifest_file = create_targeted_manifest(base_path, book_folder)
    
    if manifest_file:
        print("\n🎉 Manifest created successfully!")
        print("Next steps:")
        print("1. Open your book admin interface")
        print("2. Go to 'Local Database' tab")
        print("3. Choose 'Rclone + Supabase' method")
        print(f"4. Upload: {manifest_file}")
    else:
        print("❌ Failed to create manifest")
        sys.exit(1)

if __name__ == '__main__':
    main()