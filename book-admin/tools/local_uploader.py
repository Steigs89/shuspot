#!/usr/bin/env python3
"""
Local Uploader: Parse a ShuSpot folder on your computer and push metadata to the live API.

Features:
- Parses local folder using ShuSpotFolderParser (no need to zip or upload 23GB).
- Optionally uploads cover images to Supabase Storage and inserts public URLs.
- Sends manifest to cloud API in chunks to avoid size limits.
- Supports parallel uploads with asyncio for faster processing.
- Displays timing information and progress during upload.

Usage examples:
  python local_uploader.py --folder "/path/to/CROP-ShuSpot" \
    --api-base "https://shuspot-admin-panel.vercel.app/api" \
    --to-db --to-sheets \
    --parallel --concurrency 5 \
    --supabase-url "$SUPABASE_URL" --supabase-key "$SUPABASE_SERVICE_KEY" --bucket books

If you omit Supabase credentials, covers won't be uploaded and cover_image_url will use local paths.
"""

import argparse
import asyncio
import json
import os
import random
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Any, Tuple, Set

API_DIR = Path(__file__).resolve().parents[1] / "api"
BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
for p in (API_DIR, BACKEND_DIR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from shuspot_folder_parser import ShuSpotFolderParser  # noqa: E402
except Exception:
    try:
        from backend.shuspot_folder_parser import ShuSpotFolderParser  # type: ignore # noqa: E402
    except Exception as e:
        print(f"Failed to import ShuSpotFolderParser: {e}")
        print("Ensure shuspot_folder_parser.py exists in book-admin/api or book-admin/backend.")
        sys.exit(1)

try:
    import requests  # type: ignore
except Exception:
    print("Missing dependency: requests. Install with: pip install -r tools/requirements.txt")
    sys.exit(1)

# Try to import required libraries for parallel mode
try:
    import aiohttp
    HAVE_AIOHTTP = True
except ImportError:
    HAVE_AIOHTTP = False

# Try to import tqdm for progress bars, but don't require it
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    # Create a simple text-based progress bar as fallback
    class SimpleTqdm:
        def __init__(self, iterable=None, desc=None, total=None, unit=None, **kwargs):
            self.iterable = iterable
            self.desc = desc or ""
            self.total = total or len(iterable) if hasattr(iterable, "__len__") else None
            self.unit = unit or "it"
            self.count = 0
            self.last_print = 0
            
        def __iter__(self):
            self.count = 0
            self.last_print = 0
            print(f"{self.desc}: 0/{self.total} {self.unit}s (0%)")
            for item in self.iterable:
                yield item
                self.count += 1
                # Only update every 5% or at least every 10 items to avoid console spam
                if (self.total and (self.count / self.total * 100 >= self.last_print + 5)) or (self.count % 10 == 0):
                    percentage = (self.count / self.total * 100) if self.total else 0
                    self.last_print = int(percentage / 5) * 5  # Round to nearest 5%
                    print(f"{self.desc}: {self.count}/{self.total} {self.unit}s ({percentage:.1f}%)")
            print(f"{self.desc}: {self.count}/{self.total} {self.unit}s (100%) COMPLETE")
            return self
            
        def update(self, n=1):
            self.count += n
            if self.total and (self.count / self.total * 100 >= self.last_print + 5):
                percentage = (self.count / self.total * 100) if self.total else 0
                self.last_print = int(percentage / 5) * 5
                print(f"{self.desc}: {self.count}/{self.total} {self.unit}s ({percentage:.1f}%)")
    
    tqdm = SimpleTqdm


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
    """Split an iterable into chunks of the specified size."""
    for i in range(0, len(iterable), size):
        yield iterable[i:i+size]


def format_time(seconds):
    """Format seconds into a human-readable time string."""
    if seconds < 60:
        return f"{seconds:.2f} seconds"
    elif seconds < 3600:
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        return f"{int(minutes)} minutes {int(remaining_seconds)} seconds"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        remaining_seconds = seconds % 60
        return f"{int(hours)} hours {int(minutes)} minutes {int(remaining_seconds)} seconds"


async def upload_batch_async(
    session, 
    batch_id: int,
    chunk: List[Dict], 
    endpoint: str, 
    params: Dict, 
    pbar,
    to_db: bool, 
    to_sheets: bool, 
    timeout: int = 180,
    max_retries: int = 3
) -> Tuple[int, List[str], float]:
    """Upload a single batch asynchronously with retries."""
    batch_start_time = time.time()
    payload = {
        "books": chunk,
        "import_to_db": bool(to_db),
        "import_to_sheets": bool(to_sheets),
    }
    
    errors = []
    uploaded = 0
    retries = 0
    
    while retries <= max_retries:
        try:
            size_bytes = len(json.dumps(payload).encode('utf-8'))
            
            async with session.post(
                endpoint, 
                json=payload, 
                params=params, 
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as resp:
                batch_end_time = time.time()
                batch_duration = batch_end_time - batch_start_time
                
                if resp.status >= 400:
                    # Try to surface JSON error payload if available
                    try:
                        data = await resp.json()
                        preview = json.dumps(data)[:500]
                        error_msg = f"HTTP {resp.status}: {preview}"
                        errors.append(error_msg)
                    except Exception:
                        text = await resp.text()
                        error_msg = f"HTTP {resp.status}: {text[:200]}"
                        errors.append(error_msg)
                        
                    if retries < max_retries:
                        retries += 1
                        # Exponential backoff with jitter
                        wait_time = (2 ** retries) + (0.1 * random.random())
                        await asyncio.sleep(wait_time)
                        continue
                else:
                    data = await resp.json()
                    uploaded = data.get("db_imported", 0)
                    errors.extend(data.get("errors", []))
                    
                pbar.update(1)
                break
                
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            batch_end_time = time.time()
            batch_duration = batch_end_time - batch_start_time
            error_msg = f"Network error: {str(e)}"
            errors.append(error_msg)
            
            if retries < max_retries:
                retries += 1
                # Exponential backoff with jitter
                wait_time = (2 ** retries) + (0.1 * random.random())
                await asyncio.sleep(wait_time)
                continue
            else:
                pbar.update(1)
                break
        except Exception as e:
            batch_end_time = time.time()
            batch_duration = batch_end_time - batch_start_time
            error_msg = f"Unexpected error: {str(e)}"
            errors.append(error_msg)
            pbar.update(1)
            break
    
    return uploaded, errors, batch_duration


async def upload_all_batches_async(
    chunks: List[List[Dict]], 
    endpoint: str, 
    params: Dict, 
    to_db: bool, 
    to_sheets: bool, 
    concurrency: int = 5,
    timeout: int = 180,
    max_retries: int = 3
) -> Tuple[int, List[str], List[float]]:
    """Upload all batches in parallel with a concurrency limit."""
    total_uploaded = 0
    all_errors = []
    batch_times = []
    
    # Create a progress bar for the batches
    desc = "[Parallel Mode] Uploading batches"
    total_batches = len(chunks)
    
    # Main progress bar for batches
    batch_pbar = tqdm(total=total_batches, desc=desc, unit="batch")
    
    # Create a second progress bar for overall book progress
    total_books = sum(len(chunk) for chunk in chunks)
    book_pbar = tqdm(total=total_books, desc="100%", unit="books")
    
    # Track completed books for the overall progress bar
    completed_books = 0
    
    async with aiohttp.ClientSession() as session:
        # Create a semaphore to limit concurrency
        sem = asyncio.Semaphore(concurrency)
        
        async def bounded_upload(batch_id, chunk):
            async with sem:  # This limits concurrency
                return await upload_batch_async(
                    session, batch_id, chunk, endpoint, params, 
                    batch_pbar, to_db, to_sheets, timeout, max_retries
                )
        
        # Create tasks for all batches
        tasks = [
            asyncio.create_task(bounded_upload(i, chunk))
            for i, chunk in enumerate(chunks)
        ]
        
        # Process completed tasks as they finish
        for task in asyncio.as_completed(tasks):
            uploaded, errors, batch_time = await task
            total_uploaded += uploaded
            all_errors.extend(errors)
            batch_times.append(batch_time)
            
            # Update the book progress bar
            book_size = uploaded if uploaded > 0 else 0  # Fallback if we can't determine uploaded count
            book_pbar.update(book_size)
            completed_books += book_size
    
    # Close progress bars
    batch_pbar.close()
    book_pbar.close()
    
    return total_uploaded, all_errors, batch_times


def upload_sequential(
    chunks: List[List[Dict]], 
    endpoint: str, 
    params: Dict, 
    to_db: bool, 
    to_sheets: bool,
    timeout: int = 180
) -> Tuple[int, List[str], List[float]]:
    """Upload all batches sequentially."""
    total_uploaded = 0
    all_errors = []
    batch_times = []
    
    # Create a progress bar for the batches
    desc = "[Sequential Mode] Uploading batches"
    total_batches = len(chunks)
    
    batch_iter = tqdm(enumerate(chunks), desc=desc, total=total_batches, unit="batch") if HAS_TQDM else enumerate(chunks)
    
    if not HAS_TQDM:
        print(f"[Sequential Mode] Starting upload of {sum(len(chunk) for chunk in chunks)} books ({total_batches} batches)...")
    
    for i, chunk in batch_iter:
        batch_start_time = time.time()
        payload = {
            "books": chunk,
            "import_to_db": bool(to_db),
            "import_to_sheets": bool(to_sheets),
        }
        try:
            # Log payload size estimate
            size_bytes = len(json.dumps(payload).encode('utf-8'))
            if not HAS_TQDM:  # Only print if we don't have progress bars
                print(f"Posting batch {i+1}/{total_batches} of {len(chunk)} books (~{size_bytes/1024:.1f} KB)")
            
            resp = requests.post(endpoint, json=payload, params=params, timeout=timeout)
            batch_end_time = time.time()
            batch_duration = batch_end_time - batch_start_time
            batch_times.append(batch_duration)
            
            if resp.status_code >= 400:
                # Try to surface JSON error payload if available
                try:
                    data = resp.json()
                    preview = json.dumps(data)[:500]
                    error_msg = f"HTTP {resp.status_code}: {preview}"
                    print(f"Batch {i+1} failed ({format_time(batch_duration)}): {error_msg}")
                    all_errors.append(error_msg)
                except Exception:
                    error_msg = f"HTTP {resp.status_code}: {resp.text[:200]}"
                    print(f"Batch {i+1} failed ({format_time(batch_duration)}): {error_msg}")
                    all_errors.append(error_msg)
            else:
                data = resp.json()
                batch_uploaded = data.get("db_imported", 0)
                total_uploaded += batch_uploaded
                if not HAS_TQDM:  # Only print if we don't have progress bars
                    print(f"Uploaded batch {i+1} ({format_time(batch_duration)}): +{batch_uploaded} books (errors: {len(data.get('errors', []))})")
                elif data.get('errors', []):
                    print(f"Batch {i+1} completed with {len(data.get('errors', []))} errors")
                
                # Add any errors from the response
                all_errors.extend([str(e) for e in data.get("errors", [])])
                
        except Exception as e:
            batch_end_time = time.time()
            batch_duration = batch_end_time - batch_start_time
            error_msg = f"Error: {str(e)}"
            print(f"Batch {i+1} error ({format_time(batch_duration)}): {error_msg}")
            all_errors.append(error_msg)
            batch_times.append(batch_duration)
    
    return total_uploaded, all_errors, batch_times


def save_progress(processed_folders: Set[str], output_file: str):
    """Save the set of processed folders to a JSON file."""
    with open(output_file, 'w') as f:
        json.dump({"processed_folders": list(processed_folders)}, f)


def load_progress(input_file: str) -> Set[str]:
    """Load the set of processed folders from a JSON file."""
    if not os.path.exists(input_file):
        return set()
    
    try:
        with open(input_file, 'r') as f:
            data = json.load(f)
            return set(data.get("processed_folders", []))
    except Exception as e:
        print(f"Error loading progress file: {e}")
        return set()


def main():
    parser = argparse.ArgumentParser(description="Local ShuSpot uploader")
    parser.add_argument("--folder", required=True, help="Path to local ShuSpot root folder")
    parser.add_argument("--api-base", default="http://localhost:8000", help="API base URL (no trailing slash)")
    parser.add_argument("--to-db", action="store_true", help="Import into cloud DB")
    parser.add_argument("--to-sheets", action="store_true", help="Upload to Google Sheets (requires server to be configured)")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"), help="Supabase URL")
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY"), help="Supabase service or anon key")
    parser.add_argument("--bucket", default=os.getenv("SUPABASE_BUCKET", "books"), help="Supabase Storage bucket name")
    parser.add_argument("--batch-size", type=int, default=25, help="Books per manifest POST")
    parser.add_argument("--no-lean", action="store_true", help="Send full data (includes heavy fields like _files and _page_sequence)")
    parser.add_argument("--unsafe", action="store_true", help="Disable safe mode on server (returns 500s instead of JSON errors)")
    parser.add_argument("--dry-run", action="store_true", help="Send dry_run=true to server to validate manifest without DB writes")
    parser.add_argument("--parallel", action="store_true", help="Use parallel uploads with asyncio")
    parser.add_argument("--concurrency", type=int, default=5, help="Number of concurrent uploads (only with --parallel)")
    parser.add_argument("--timeout", type=int, default=180, help="Timeout in seconds for API requests")
    parser.add_argument("--resume-from", type=str, help="Resume from the progress saved in this file")
    parser.add_argument("--save-progress", type=str, help="Save progress to this file to allow resuming later")
    parser.add_argument("--retries", type=int, default=3, help="Number of retries for failed requests")

    args = parser.parse_args()
    
    # Check if we should use parallel mode
    use_parallel = args.parallel
    if use_parallel and not (HAVE_AIOHTTP and HAS_TQDM):
        print("Parallel mode requires aiohttp and tqdm. Falling back to sequential mode.")
        print("To enable parallel uploads, install: pip install aiohttp tqdm")
        use_parallel = False
    
    # Start timing the entire process
    start_time = time.time()

    root = Path(args.folder).expanduser()
    if not root.exists():
        print(f"Folder not found: {root}")
        sys.exit(1)

    # Load progress if resuming
    processed_folders = set()
    if args.resume_from:
        processed_folders = load_progress(args.resume_from)
        print(f"Resuming upload, skipping {len(processed_folders)} already processed folders.")

    print(f"Parsing local folder: {root}")
    parser_obj = ShuSpotFolderParser(str(root))
    books = parser_obj.parse_all_books()
    stats = parser_obj.get_summary_stats()
    print(f"Found {stats.get('total_books', len(books))} books. Preparing manifest…")

    # Optional Supabase client
    supabase_client = ensure_supabase_client(args.supabase_url, args.supabase_key)
    
    # Prepare books with optional cover uploads (lean by default to keep payloads small)
    prepared: List[Dict] = []
    
    # Use tqdm if available
    book_iter = tqdm(books, desc="[Parallel Mode] Preparing books for upload" if use_parallel else "Preparing books", unit="book") if HAS_TQDM else books
    
    for b in book_iter:
        # Skip already processed folders if resuming
        folder_path = b.get('_folder_path', '')
        if folder_path in processed_folders:
            continue
            
        if args.no_lean:
            b2 = dict(b)
        else:
            # Keep only essential fields
            keep_keys = {
                'Name','Author','Category','Media','URL','Age','Read time','AR Level','Lexile','GRL','Pages','Status','Notes','description'
            }
            b2 = {k: v for k, v in b.items() if k in keep_keys}
            # Preserve minimal private fields the backend leverages
            b2['_folder_path'] = folder_path
            b2['_cover_image_path'] = b.get('_cover_image_path', '')
            b2['_total_pages'] = b.get('_total_pages', 0)
            # Trim very long Notes
            if isinstance(b2.get('Notes'), str) and len(b2['Notes']) > 2000:
                b2['Notes'] = b2['Notes'][:2000] + '...'
        # Upload cover if possible
        cover_local = b.get('_cover_image_path')
        if cover_local and supabase_client:
            url = upload_cover_if_possible(supabase_client, args.bucket, cover_local, dest_prefix="covers")
            if url:
                b2['cover_image_url'] = url
        prepared.append(b2)

    # Create chunks for batch uploading
    chunks = list(chunked(prepared, args.batch_size))
    total_books = len(prepared)
    total_batches = len(chunks)
    
    # Send manifest in chunks
    endpoint = args.api_base.rstrip('/') + "/shuspot-ingestion/ingest-manifest"
    
    # Use safe mode by default so server returns structured JSON even on errors
    params = None if args.unsafe else {"safe": "true"}
    if args.dry_run:
        params = params or {}
        params["dry_run"] = "true"
    
    # Upload using either parallel or sequential mode
    if use_parallel:
        print(f"[Parallel Mode] Starting upload of {total_books} books ({total_batches} batches) with {args.concurrency} workers...")
        # Need to run the async code using asyncio.run
        import random  # For jitter in retries
        
        # Run the async upload function
        loop = asyncio.get_event_loop()
        uploaded, errors, batch_times = loop.run_until_complete(
            upload_all_batches_async(
                chunks, endpoint, params, args.to_db, args.to_sheets,
                concurrency=args.concurrency, timeout=args.timeout, max_retries=args.retries
            )
        )
    else:
        uploaded, errors, batch_times = upload_sequential(
            chunks, endpoint, params, args.to_db, args.to_sheets, timeout=args.timeout
        )
    
    # Track processed folders for resuming if needed
    if args.save_progress:
        for book in books:
            folder_path = book.get('_folder_path', '')
            if folder_path:
                processed_folders.add(folder_path)
        save_progress(processed_folders, args.save_progress)
    
    # Calculate total elapsed time
    end_time = time.time()
    elapsed_time = end_time - start_time
    
    # Calculate average batch time
    avg_batch_time = sum(batch_times) / len(batch_times) if batch_times else 0
    
    # Calculate books per second
    books_per_second = total_books / elapsed_time if elapsed_time > 0 and total_books > 0 else 0
    
    print(f"Upload completed in {format_time(elapsed_time)}.")
    
    # Print summary
    summary = {
        "total_books": total_books,
        "db_imported": uploaded,
        "errors": len(errors),
        "elapsed_time": format_time(elapsed_time),
        "books_per_second": f"{books_per_second:.2f} books/second" if books_per_second > 0 else "N/A (no books uploaded)",
        "mode": f"parallel ({args.concurrency} workers)" if use_parallel else "sequential"
    }
    
    # If there are errors, include them in the summary
    if errors:
        summary["error_details"] = errors[:10]  # Show first 10 errors
        if len(errors) > 10:
            summary["error_details"].append(f"... and {len(errors) - 10} more errors")
    
    print("\nSummary:")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()


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


def format_time(seconds):
    """Format seconds into a human-readable time string."""
    if seconds < 60:
        return f"{seconds:.2f} seconds"
    elif seconds < 3600:
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        return f"{int(minutes)} minutes {int(remaining_seconds)} seconds"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        remaining_seconds = seconds % 60
        return f"{int(hours)} hours {int(minutes)} minutes {int(remaining_seconds)} seconds"


def main():
    parser = argparse.ArgumentParser(description="Local ShuSpot uploader")
    parser.add_argument("--folder", required=True, help="Path to local ShuSpot root folder")
    parser.add_argument("--api-base", default="http://localhost:8000", help="API base URL (no trailing slash)")
    parser.add_argument("--to-db", action="store_true", help="Import into cloud DB")
    parser.add_argument("--to-sheets", action="store_true", help="Upload to Google Sheets (requires server to be configured)")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"), help="Supabase URL")
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY"), help="Supabase service or anon key")
    parser.add_argument("--bucket", default=os.getenv("SUPABASE_BUCKET", "books"), help="Supabase Storage bucket name")
    parser.add_argument("--batch-size", type=int, default=25, help="Books per manifest POST")
    parser.add_argument("--no-lean", action="store_true", help="Send full data (includes heavy fields like _files and _page_sequence)")
    parser.add_argument("--unsafe", action="store_true", help="Disable safe mode on server (returns 500s instead of JSON errors)")
    parser.add_argument("--dry-run", action="store_true", help="Send dry_run=true to server to validate manifest without DB writes")

    args = parser.parse_args()

    # Start timing the entire process
    start_time = time.time()

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

    # Prepare books with optional cover uploads (lean by default to keep payloads small)
    prepared: List[Dict] = []
    
    # Use tqdm if available
    book_iter = tqdm(books, desc="Preparing books", unit="book") if HAS_TQDM else books
    
    for b in book_iter:
        if args.no_lean:
            b2 = dict(b)
        else:
            # Keep only essential fields
            keep_keys = {
                'Name','Author','Category','Media','URL','Age','Read time','AR Level','Lexile','GRL','Pages','Status','Notes','description'
            }
            b2 = {k: v for k, v in b.items() if k in keep_keys}
            # Preserve minimal private fields the backend leverages
            b2['_folder_path'] = b.get('_folder_path', '')
            b2['_cover_image_path'] = b.get('_cover_image_path', '')
            b2['_total_pages'] = b.get('_total_pages', 0)
            # Trim very long Notes
            if isinstance(b2.get('Notes'), str) and len(b2['Notes']) > 2000:
                b2['Notes'] = b2['Notes'][:2000] + '...'
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
    batch_times = []
    
    # Calculate number of batches for progress display
    chunks = list(chunked(prepared, args.batch_size))
    total_batches = len(chunks)
    
    print(f"Starting upload of {total} books ({total_batches} batches)...")
    
    # Use tqdm if available for batch progress
    batch_iter = tqdm(chunks, desc="Uploading batches", unit="batch") if HAS_TQDM else chunks
    
    for i, chunk in enumerate(batch_iter):
        batch_start_time = time.time()
        payload = {
            "books": chunk,
            "import_to_db": bool(args.to_db),
            "import_to_sheets": bool(args.to_sheets),
        }
        try:
            # Log payload size estimate
            size_bytes = len(json.dumps(payload).encode('utf-8'))
            if not HAS_TQDM:  # Only print if we don't have progress bars
                print(f"Posting batch {i+1}/{total_batches} of {len(chunk)} books (~{size_bytes/1024:.1f} KB)")
            
            # Use safe mode by default so server returns structured JSON even on errors
            params = None if args.unsafe else {"safe": "true"}
            if args.dry_run:
                params = params or {}
                params["dry_run"] = "true"
            
            resp = requests.post(endpoint, json=payload, params=params, timeout=180)
            batch_end_time = time.time()
            batch_duration = batch_end_time - batch_start_time
            batch_times.append(batch_duration)
            
            if resp.status_code >= 400:
                # Try to surface JSON error payload if available
                try:
                    data = resp.json()
                    preview = json.dumps(data)[:500]
                    print(f"Batch {i+1} failed ({format_time(batch_duration)}): {resp.status_code} {preview}")
                    errors.append(f"HTTP {resp.status_code}: {preview}")
                except Exception:
                    print(f"Batch {i+1} failed ({format_time(batch_duration)}): {resp.status_code} {resp.text[:200]}")
                    errors.append(f"HTTP {resp.status_code}: {resp.text}")
            else:
                data = resp.json()
                uploaded += data.get("db_imported", 0)
                if not HAS_TQDM:  # Only print if we don't have progress bars
                    print(f"Uploaded batch {i+1} ({format_time(batch_duration)}): +{data.get('db_imported', 0)} books (errors: {len(data.get('errors', []))})")
                elif data.get('errors', []):
                    print(f"Batch {i+1} completed with {len(data.get('errors', []))} errors")
                
        except Exception as e:
            batch_end_time = time.time()
            batch_duration = batch_end_time - batch_start_time
            print(f"Batch {i+1} error ({format_time(batch_duration)}): {e}")
            errors.append(str(e))

    # Calculate total elapsed time
    end_time = time.time()
    elapsed_time = end_time - start_time
    
    # Calculate average batch time
    avg_batch_time = sum(batch_times) / len(batch_times) if batch_times else 0
    
    # Calculate books per second
    books_per_second = total / elapsed_time if elapsed_time > 0 and total > 0 else 0
    
    print(f"Upload completed in {format_time(elapsed_time)}.")
    
    # Print summary
    summary = {
        "total_books": total,
        "db_imported": uploaded,
        "errors": len(errors),
        "elapsed_time": format_time(elapsed_time),
        "books_per_second": f"{books_per_second:.2f} books/second" if books_per_second > 0 else "N/A (no books uploaded)",
        "avg_batch_time": format_time(avg_batch_time) if avg_batch_time > 0 else "N/A"
    }
    
    # If there are errors, include them in the summary
    if errors:
        summary["error_details"] = errors[:10]  # Show first 10 errors
        if len(errors) > 10:
            summary["error_details"].append(f"... and {len(errors) - 10} more errors")
    
    print("\nSummary:")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
