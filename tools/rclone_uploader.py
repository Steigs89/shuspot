#!/usr/bin/env python3
"""
Rclone Uploader for ShuSpot Books
=================================

This script helps you upload large book folders to Supabase using Rclone
and generates the manifest file needed for the book admin interface.

Requirements:
- Rclone installed and configured with Supabase
- Python 3.6+

Usage:
    python rclone_uploader.py /path/to/books/folder

The script will:
1. Upload the folder to Supabase using Rclone
2. Generate a manifest.json file
3. Provide instructions for importing to the book admin
"""

import os
import sys
import json
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

class RcloneUploader:
    def __init__(self, supabase_remote="supa", bucket="books"):
        self.supabase_remote = supabase_remote
        self.bucket = bucket
        self.base_path = f"{supabase_remote}:{bucket}"
        
    def check_rclone(self):
        """Check if Rclone is installed and configured"""
        try:
            result = subprocess.run(['rclone', 'version'], 
                                  capture_output=True, text=True, check=True)
            print("✅ Rclone is installed")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Rclone not found. Please install Rclone first:")
            print("   https://rclone.org/install/")
            return False
    
    def check_remote(self):
        """Check if Supabase remote is configured"""
        try:
            result = subprocess.run(['rclone', 'listremotes'], 
                                  capture_output=True, text=True, check=True)
            remotes = result.stdout.strip().split('\n')
            remote_names = [r.rstrip(':') for r in remotes if r.strip()]
            
            if self.supabase_remote in remote_names:
                print(f"✅ Supabase remote '{self.supabase_remote}' is configured")
                return True
            else:
                print(f"❌ Supabase remote '{self.supabase_remote}' not found")
                print("Available remotes:", ', '.join(remote_names))
                print("\nTo configure Supabase remote:")
                print(f"   rclone config create {self.supabase_remote} s3 \\")
                print("     provider=Other \\")
                print("     endpoint=https://xzwdtcczndgglqikmlwj.storage.supabase.co/storage/v1/s3 \\")
                print("     access_key_id=45ac9af4e1e039c4e79fe332833d31e1 \\")
                print("     secret_access_key=fae79bf3e12cb133b4ceced13c506f5c205544cad11ea4083e449deac1ca7d54")
                return False
        except subprocess.CalledProcessError:
            print("❌ Failed to check Rclone remotes")
            return False
    
    def upload_folder(self, local_path, remote_path=None):
        """Upload folder to Supabase using Rclone"""
        local_path = Path(local_path)
        if not local_path.exists():
            print(f"❌ Local path does not exist: {local_path}")
            return False
        
        if remote_path is None:
            remote_path = local_path.name
        
        full_remote_path = f"{self.base_path}/{remote_path}"
        
        print(f"📤 Uploading {local_path} to {full_remote_path}")
        print("This may take a while for large folders...")
        
        try:
            # Use rclone sync for efficient uploads
            cmd = [
                'rclone', 'sync', 
                str(local_path), 
                full_remote_path,
                '--progress',
                '--transfers=4',
                '--checkers=8',
                '--stats=30s'
            ]
            
            result = subprocess.run(cmd, check=True)
            print("✅ Upload completed successfully!")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Upload failed: {e}")
            return False
    
    def generate_manifest(self, remote_path=None, output_file=None):
        """Generate manifest file using rclone lsjson"""
        if remote_path is None:
            remote_path = ""
        
        full_remote_path = f"{self.base_path}/{remote_path}" if remote_path else self.base_path
        
        print(f"📋 Generating manifest for {full_remote_path}")
        
        try:
            cmd = ['rclone', 'lsjson', '--recursive', full_remote_path]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            manifest_data = json.loads(result.stdout)
            
            # Fix paths to include the remote_path prefix
            if remote_path:
                print(f"🔧 Fixing paths to include '{remote_path}/' prefix...")
                for entry in manifest_data:
                    if 'Path' in entry:
                        # Ensure the path includes the remote_path
                        if not entry['Path'].startswith(f"{remote_path}/"):
                            entry['Path'] = f"{remote_path}/{entry['Path']}"
                        print(f"   📁 Fixed path: {entry['Path']}")
            
            if output_file is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                folder_name = remote_path.replace('/', '_') if remote_path else "manifest"
                output_file = f"manifest_{folder_name}_{timestamp}.json"
            
            with open(output_file, 'w') as f:
                json.dump(manifest_data, f, indent=2)
            
            print(f"✅ Manifest saved to: {output_file}")
            print(f"📊 Found {len(manifest_data)} files")
            
            return output_file
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to generate manifest: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse manifest JSON: {e}")
            return None
    
    def upload_and_manifest(self, local_path, remote_path=None):
        """Complete workflow: upload folder and generate manifest"""
        print("🚀 Starting Rclone upload workflow")
        print("=" * 50)
        
        # Check prerequisites
        if not self.check_rclone():
            return False
        
        if not self.check_remote():
            return False
        
        # Upload folder
        if not self.upload_folder(local_path, remote_path):
            return False
        
        # Generate manifest
        manifest_file = self.generate_manifest(remote_path or Path(local_path).name)
        if not manifest_file:
            return False
        
        print("\n🎉 Upload workflow completed successfully!")
        print("=" * 50)
        print("Next steps:")
        print(f"1. Open your book admin interface")
        print(f"2. Go to the 'Local Database' tab")
        print(f"3. Choose 'Rclone + Supabase' upload method")
        print(f"4. Upload the manifest file: {manifest_file}")
        print(f"5. Your books will be imported automatically!")
        
        return True

def main():
    parser = argparse.ArgumentParser(
        description="Upload book folders to Supabase using Rclone",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Upload a single book folder
  python rclone_uploader.py /path/to/my-book-folder
  
  # Upload with custom remote path
  python rclone_uploader.py /path/to/books --remote-path "CROP-ShuSpot/Baking"
  
  # Use custom Supabase remote name
  python rclone_uploader.py /path/to/books --remote "my-supabase"
  
  # Just generate manifest (no upload)
  python rclone_uploader.py --manifest-only --remote-path "existing/path"
        """
    )
    
    parser.add_argument('local_path', nargs='?', 
                       help='Local folder path to upload')
    parser.add_argument('--remote-path', 
                       help='Remote path in Supabase (default: folder name)')
    parser.add_argument('--remote', default='supa',
                       help='Rclone remote name (default: supa)')
    parser.add_argument('--bucket', default='books',
                       help='Supabase bucket name (default: books)')
    parser.add_argument('--manifest-only', action='store_true',
                       help='Only generate manifest, skip upload')
    parser.add_argument('--output', 
                       help='Output manifest file name')
    
    args = parser.parse_args()
    
    if not args.manifest_only and not args.local_path:
        parser.error("local_path is required unless using --manifest-only")
    
    uploader = RcloneUploader(args.remote, args.bucket)
    
    if args.manifest_only:
        # Just generate manifest
        manifest_file = uploader.generate_manifest(args.remote_path, args.output)
        if manifest_file:
            print(f"\n✅ Manifest generated: {manifest_file}")
        else:
            sys.exit(1)
    else:
        # Full upload workflow
        success = uploader.upload_and_manifest(args.local_path, args.remote_path)
        if not success:
            sys.exit(1)

if __name__ == '__main__':
    main()