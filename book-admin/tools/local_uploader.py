#!/usr/bin/env python3
"""
Local Uploader: Parse a ShuSpot folder on your computer and push metadata to the live API.

Features:
- Parses local folder using ShuSpotFolderParser (no need to zip or upload 23GB).
- Optionally uploads cover images to Supabase Storage and inserts public URLs.
- Sends manifest to cloud API in chunks to avoid size limits.

Usage examples:
  python local_uploader.py --folder "/path/to/CROP-ShuSpot" \
    --api-base "https://shuspot-admin-panel.vercel.app/api" \
    --to-db --to-sheets \
    --supabase-url "$SUPABASE_URL" --supabase-key "$SUPABASE_SERVICE_KEY" --bucket books

If you omit Supabase credentials, covers won't be uploaded and cover_image_url will use local paths.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional

ROOT = Path(__file__).resolve().parents[1] / "api"
sys.path.insert(0, str(ROOT))

from shuspot_folder_parser import ShuSpotFolderParser  # noqa: E402

try:
    import requests  # type: ignore
except Exception:
    print("Missing dependency: requests. Install with: pip install -r tools/requirements.txt")
    sys.exit(1)


def ensure_supabase_client(url: Optional[str], key: Optional[str]):
    if not url or not key:
        return None
    try:
        from supabase import create_client  # type: ignore
        return create_client(url, key)
    except Exception as e:
        print(f"Warning: Supabase client not available ({e}). Skipping uploads.")
        return None


def upload_cover_if_possible(client, bucket: str, local_path: str, dest_prefix: str = "covers") -> Optional[str]:
    try:
        file_path = Path(local_path)
        if not file_path.exists():
            return None
        # Create a safe storage path
        name = file_path.name
        # Prefix with hashable folder name for uniqueness
        folder_hash = abs(hash(str(file_path.parent))) % (10**10)
        storage_path = f"{dest_prefix}/{folder_hash}/{name}"

        # Upload (skip if exists)
        data = file_path.read_bytes()
        storage = client.storage.from_(bucket)
        try:
            storage.upload(storage_path, data)
        except Exception:
            # Might already exist; continue
            pass
        public = storage.get_public_url(storage_path)
        return public
    except Exception as e:
        print(f"Cover upload failed for {local_path}: {e}")
        return None


def chunked(iterable, size):
    for i in range(0, len(iterable), size):
        yield iterable[i:i+size]


def main():
    parser = argparse.ArgumentParser(description="Local ShuSpot uploader")
    parser.add_argument("--folder", required=True, help="Path to local ShuSpot root folder")
    parser.add_argument("--api-base", default="http://localhost:8000", help="API base URL (no trailing slash)")
    parser.add_argument("--to-db", action="store_true", help="Import into cloud DB")
    parser.add_argument("--to-sheets", action="store_true", help="Upload to Google Sheets (requires server to be configured)")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"), help="Supabase URL")
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY"), help="Supabase service or anon key")
    parser.add_argument("--bucket", default=os.getenv("SUPABASE_BUCKET", "books"), help="Supabase Storage bucket name")
    parser.add_argument("--batch-size", type=int, default=300, help="Books per manifest POST")

    args = parser.parse_args()

    root = Path(args.folder).expanduser()
    if not root.exists():
        print(f"Folder not found: {root}")
        sys.exit(1)

    print(f"Parsing local folder: {root}")
    parser_obj = ShuSpotFolderParser(str(root))
    books = parser_obj.parse_all_books()
    stats = parser_obj.get_summary_stats()
    print(f"Found {stats.get('total_books', len(books))} books. Preparing manifest…")

    # Optional Supabase client
    supabase_client = ensure_supabase_client(args.supabase_url, args.supabase_key)
    uploaded = 0

    # Prepare books with optional cover uploads
    prepared: List[Dict] = []
    for b in books:
        b2 = dict(b)
        # Upload cover if possible
        cover_local = b.get('_cover_image_path')
        if cover_local and supabase_client:
            url = upload_cover_if_possible(supabase_client, args.bucket, cover_local, dest_prefix="covers")
            if url:
                b2['cover_image_url'] = url
        prepared.append(b2)

    # Send manifest in chunks
    endpoint = args.api_base.rstrip('/') + "/shuspot-ingestion/ingest-manifest"
    total = len(prepared)
    errors: List[str] = []
    for chunk in chunked(prepared, args.batch_size):
        payload = {
            "books": chunk,
            "import_to_db": bool(args.to_db),
            "import_to_sheets": bool(args.to_sheets),
        }
        try:
            resp = requests.post(endpoint, json=payload, timeout=120)
            if resp.status_code >= 400:
                print(f"Batch failed: {resp.status_code} {resp.text[:200]}")
                errors.append(f"HTTP {resp.status_code}: {resp.text}")
            else:
                data = resp.json()
                uploaded += data.get("db_imported", 0)
                print(f"Uploaded batch: +{data.get('db_imported', 0)} (errors: {len(data.get('errors', []))})")
        except Exception as e:
            print(f"Batch error: {e}")
            errors.append(str(e))

    print("Done.")
    print(json.dumps({
        "total_books": total,
        "db_imported": uploaded,
        "errors": len(errors)
    }, indent=2))


if __name__ == "__main__":
    main()
