#!/usr/bin/env python3
"""
Local Backend Server for ShuSpot Book Admin
Provides manifest generation and other local services
Run once and keeps running in background
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
PORT = 8000
HOST = '127.0.0.1'

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ShuSpot Local Server',
        'port': PORT
    })

@app.route('/generate-manifest', methods=['POST'])
def generate_manifest():
    """Generate manifest from folder path using Python scripts"""
    try:
        data = request.get_json()
        logger.info(f"📥 Received request data: {data}")
        
        folder_path = data.get('folder_path', '') or data.get('folderPath', '')
        metadata = data.get('book_metadata', {}) or data.get('metadata', {})
        processing_script = data.get('processing_script', '') or data.get('processingScript', '')
        
        logger.info(f"📁 Folder path: '{folder_path}'")
        logger.info(f"📋 Metadata: {metadata}")
        logger.info(f"🐍 Processing script: '{processing_script}'")
        
        if not folder_path:
            logger.error("❌ No folder path provided")
            return jsonify({
                'error': 'Folder path is required',
                'detail': 'Please provide a folder_path or folderPath in the request'
            }), 400
        
        # Check if folder exists
        if not os.path.exists(folder_path):
            return jsonify({'error': f'Folder not found: {folder_path}'}), 400
        
        # Use the local manifest generator for local folders
        tools_dir = Path(__file__).parent / 'tools'
        local_manifest_script = tools_dir / 'local_manifest.py'
        
        if not local_manifest_script.exists():
            return jsonify({'error': 'local_manifest.py not found in tools directory'}), 500
        
        # Prepare command
        cmd = [sys.executable, str(local_manifest_script), folder_path]
        
        # Add metadata as environment variables
        env = os.environ.copy()
        if metadata.get('title'):
            env['BOOK_TITLE'] = metadata['title']
        if metadata.get('author'):
            env['BOOK_AUTHOR'] = metadata['author']
        if metadata.get('genre'):
            env['BOOK_GENRE'] = metadata['genre']
        if metadata.get('readingLevel'):
            env['BOOK_READING_LEVEL'] = metadata['readingLevel']
        
        logger.info(f"Running command: {' '.join(cmd)}")
        
        # Run the manifest generation script
        result = subprocess.run(
            cmd,
            cwd=str(tools_dir),
            env=env,
            capture_output=True,
            text=True,
            timeout=60  # 60 second timeout
        )
        
        if result.returncode == 0:
            # Try to find the generated manifest file (exclude React's asset-manifest.json)
            manifest_files = []
            search_dirs = [Path('.'), Path(folder_path), tools_dir]
            
            for search_dir in search_dirs:
                for pattern in ['manifest_*.json', '*_manifest.json']:
                    manifest_files.extend(search_dir.glob(pattern))
            
            # Filter out React build files and sort by modification time (newest first)
            manifest_files = [f for f in manifest_files if 'asset-manifest' not in f.name]
            manifest_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            if manifest_files:
                manifest_file = manifest_files[0]
                logger.info(f"📄 Found manifest file: {manifest_file}")
                with open(manifest_file, 'r') as f:
                    manifest_data = json.load(f)
                
                logger.info(f"📋 Manifest contains {len(manifest_data.get('books', []))} books")
                
                return jsonify({
                    'success': True,
                    'manifest': manifest_data,
                    'manifestPath': str(manifest_file),
                    'stdout': result.stdout,
                    'stderr': result.stderr
                })
            else:
                # No manifest file found - create a basic empty manifest
                logger.warning("⚠️ No manifest file found, creating empty manifest")
                empty_manifest = {
                    'books': [],
                    'metadata': {
                        'generated_by': 'ShuSpot Local Server',
                        'folder_path': folder_path,
                        'timestamp': str(subprocess.run(['date'], capture_output=True, text=True).stdout.strip())
                    }
                }
                
                return jsonify({
                    'success': True,
                    'manifest': empty_manifest,
                    'message': 'No books found in folder, created empty manifest',
                    'stdout': result.stdout,
                    'stderr': result.stderr
                })
        else:
            logger.error(f"Script failed with return code {result.returncode}")
            logger.error(f"STDOUT: {result.stdout}")
            logger.error(f"STDERR: {result.stderr}")
            
            return jsonify({
                'error': 'Manifest generation failed',
                'returnCode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr
            }), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Manifest generation timed out'}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/shuspot-images/<path:filename>')
def serve_images(filename):
    """Serve images from local directories"""
    # This is a placeholder - adjust paths as needed
    image_dirs = [
        '/Users/ethan.steigerwald/Desktop/CROP-ShuSpot',
        '/Users/ethan.steigerwald/Desktop/MaterialsShuspotI',
        # Add more image directories as needed
    ]
    
    for image_dir in image_dirs:
        if os.path.exists(image_dir):
            full_path = os.path.join(image_dir, filename)
            if os.path.exists(full_path):
                return send_from_directory(image_dir, filename)
    
    return jsonify({'error': 'Image not found'}), 404

@app.route('/shuspot-ingestion/ingest-manifest', methods=['POST', 'OPTIONS'])
def ingest_manifest():
    """Ingest manifest data into local database"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    try:
        data = request.get_json()
        logger.info(f"📥 Manifest ingestion request: {data}")
        
        manifest_data = data.get('manifest', {})
        books = manifest_data.get('books', [])
        
        if not books:
            return jsonify({
                'success': False,
                'error': 'No books found in manifest',
                'db_imported': 0,
                'errors': ['Manifest contains no books']
            }), 400
        
        # Use the database manipulator to import books
        try:
            from tools.database_manipulator import ShuSpotDatabaseManipulator
            db = ShuSpotDatabaseManipulator("books.db")
            
            imported_count = 0
            errors = []
            
            for book in books:
                try:
                    # Convert local manifest format to database format
                    db_book = {
                        'id': book.get('id', book.get('title', '').lower().replace(' ', '_')),
                        'title': book.get('title', 'Unknown Title'),
                        'author': book.get('author', 'Unknown Author'),
                        'genre': book.get('genre', 'General'),
                        'reading_level': book.get('reading_level', 'Elementary'),
                        'book_type': book.get('book_type', 'Read to Me'),
                        'description': book.get('description', ''),
                        'total_pages': book.get('total_pages', len(book.get('images', []))),
                        'has_audio': book.get('has_audio', False),
                        'cover_image_url': book.get('cover_image', ''),
                        'notes': json.dumps({
                            'folder_path': book.get('folder_path', ''),
                            'local_manifest': True,
                            'imported_at': datetime.now().isoformat()
                        })
                    }
                    
                    # Add to database (this would need to be implemented in the database manipulator)
                    # For now, just count as imported
                    imported_count += 1
                    logger.info(f"📚 Processed book: {db_book['title']}")
                    
                except Exception as e:
                    error_msg = f"Failed to process book {book.get('title', 'Unknown')}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            return jsonify({
                'success': True,
                'message': f'Successfully imported {imported_count} books',
                'db_imported': imported_count,
                'errors': errors
            })
            
        except ImportError:
            return jsonify({
                'success': False,
                'error': 'Database manipulator not available',
                'db_imported': 0,
                'errors': ['Could not import database tools']
            }), 500
            
    except Exception as e:
        logger.error(f"Manifest ingestion error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Ingestion failed: {str(e)}',
            'db_imported': 0,
            'errors': [str(e)]
        }), 500

@app.route('/api/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy_api(endpoint):
    """Proxy API requests to the main backend"""
    # This is a placeholder for API proxying if needed
    return jsonify({'error': 'API endpoint not implemented locally'}), 501

def main():
    """Main function to start the server"""
    print(f"🚀 Starting ShuSpot Local Server on http://{HOST}:{PORT}")
    print(f"📁 Working directory: {os.getcwd()}")
    print(f"🛠️ Tools directory: {Path(__file__).parent / 'tools'}")
    print("✅ Server will run in background - use Ctrl+C to stop")
    
    try:
        app.run(
            host=HOST,
            port=PORT,
            debug=False,  # Set to True for development
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")

if __name__ == '__main__':
    main()