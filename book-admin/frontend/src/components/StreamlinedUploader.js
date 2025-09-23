import React, { useState, useCallback } from 'react';
import { Upload, FolderOpen, Cloud, CheckCircle, AlertCircle, Loader, HelpCircle, X } from 'lucide-react';
import { toast } from 'react-toastify';

const StreamlinedUploader = ({ onUploadComplete }) => {
  const [uploadMethod, setUploadMethod] = useState('rclone'); // 'rclone', 'zip', 'folder'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Rclone + Supabase Upload (Recommended for large folders)
  const handleRcloneUpload = useCallback(async (manifestFile) => {
    if (!manifestFile) return;

    setIsUploading(true);
    setUploadStatus('Reading manifest file...');
    setUploadProgress(10);

    try {
      // Read the manifest file content
      const fileContent = await manifestFile.text();
      const manifestData = JSON.parse(fileContent);
      
      console.log('📋 Manifest data type:', typeof manifestData);
      console.log('📋 Is array:', Array.isArray(manifestData));
      console.log('📋 Manifest keys:', Object.keys(manifestData));
      console.log('📋 First few entries:', manifestData.slice ? manifestData.slice(0, 3) : 'Not an array');
      
      setUploadProgress(30);
      setUploadStatus('Processing book structure...');

      // Convert manifest to books format expected by the API
      const books = [];
      const cropFiles = {};
      
      // Handle both array format (original Rclone) and object format (enhanced)
      let entries = manifestData;
      if (!Array.isArray(manifestData)) {
        if (manifestData.books) {
          // Enhanced manifest format - not supported yet, use original
          throw new Error('Enhanced manifest format detected. Please use the original Rclone manifest format.');
        } else {
          throw new Error('Invalid manifest format. Expected an array of file entries.');
        }
      }
      
      // Group files by book folder
      entries.forEach(entry => {
        const path = entry.Path || entry.path;
        if (!path || entry.IsDir) return;
        
        // Look for crop files: folder/resized/crop-N.png
        const cropMatch = path.match(/^(.+)\/resized\/crop-(\d+)\.(png|jpg|jpeg|webp)$/i);
        if (cropMatch) {
          const folder = cropMatch[1];
          const pageNum = parseInt(cropMatch[2]);
          
          if (!cropFiles[folder]) {
            cropFiles[folder] = [];
          }
          
          // Encode each path segment separately to preserve slashes
          const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/');
          
          cropFiles[folder].push({
            page_number: pageNum,
            url: `https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books/${encodedPath}`,
            display_name: `Page ${pageNum}`
          });
        }
      });

      // Create book objects
      Object.keys(cropFiles).forEach(folder => {
        const pages = cropFiles[folder].sort((a, b) => a.page_number - b.page_number);
        const folderParts = folder.split('/');
        const bookName = folderParts[folderParts.length - 1];
        const category = folderParts.length > 1 ? folderParts[folderParts.length - 2] : 'Unknown';
        
        // Extract better metadata from folder structure
        const extractAuthor = (bookTitle) => {
          // Common patterns for extracting authors from titles
          if (bookTitle.includes("'s ")) {
            const parts = bookTitle.split("'s ");
            return parts[0];
          }
          return 'Unknown Author';
        };
        
        const getReadingLevel = (category) => {
          // Map categories to reading levels
          const levelMap = {
            'Baking': 'Elementary',
            'Our Solar System': 'Middle School',
            'Life Cycles': 'Elementary',
            'Fractions': 'Elementary',
            'Light & Sound': 'Middle School',
            'Figurative Language': 'Middle School'
          };
          return levelMap[category] || 'Elementary';
        };
        
        const getFictionType = (category) => {
          // Most educational books are non-fiction
          const fictionCategories = ['Stories', 'Tales', 'Adventures'];
          return fictionCategories.some(cat => category.includes(cat)) ? 'Fiction' : 'Non-Fiction';
        };

        books.push({
          title: bookName,
          author: extractAuthor(bookName),
          genre: category,
          book_type: 'Read to Me',
          reading_level: getReadingLevel(category),
          fiction_type: getFictionType(category),
          _page_sequence: pages,
          _total_pages: pages.length,
          _folder_path: folder,
          cover_image_url: pages[0]?.url
        });
      });

      setUploadProgress(60);
      setUploadStatus('Importing books to database...');

      // Send books to the API
      const response = await fetch('/api/shuspot-ingestion/ingest-manifest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ books }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUploadProgress(100);
      setUploadStatus('Upload complete!');
      
      toast.success(`Successfully uploaded ${result.db_imported || books.length} books via Rclone!`);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
      
      // Force refresh the page to update stats
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Rclone upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      setUploadStatus('Upload failed');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
      }, 2000);
    }
  }, [onUploadComplete]);

  // ZIP Upload (Good for smaller collections)
  const handleZipUpload = useCallback(async (zipFile) => {
    if (!zipFile) return;

    setIsUploading(true);
    setUploadStatus('Uploading ZIP file...');
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', zipFile);

      const response = await fetch('/api/upload-zip', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(70);
      setUploadStatus('Processing ZIP contents...');

      if (!response.ok) {
        throw new Error(`ZIP upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUploadProgress(100);
      setUploadStatus('Upload complete!');
      
      toast.success(`Successfully uploaded ${result.imported_count} books from ZIP!`);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }

    } catch (error) {
      console.error('ZIP upload error:', error);
      toast.error(`ZIP upload failed: ${error.message}`);
      setUploadStatus('Upload failed');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
      }, 2000);
    }
  }, [onUploadComplete]);

  return (
    <div className="streamlined-uploader">
      <div className="upload-header">
        <h3>Upload Books to Live Server</h3>
        <p className="upload-subtitle">
          Choose the best method for your content size and workflow
        </p>
      </div>

      <div className="upload-methods">
        {/* Rclone Method - Recommended for large folders */}
        <div className={`upload-method ${uploadMethod === 'rclone' ? 'active' : ''}`}>
          <div className="method-header" onClick={() => setUploadMethod('rclone')}>
            <div className="method-icon">
              <Cloud size={24} />
            </div>
            <div className="method-info">
              <h4>Rclone + Supabase</h4>
              <p>Best for large folders (20GB+). Upload via Rclone, then import manifest.</p>
              <div className="method-badges">
                <span className="badge recommended">Recommended</span>
                <span className="badge fast">Fastest</span>
              </div>
            </div>
          </div>
          
          {uploadMethod === 'rclone' && (
            <div className="method-content">
              <div className="rclone-instructions">
                <h5>Quick Setup:</h5>
                <ol>
                  <li>Upload your folder to Supabase using Rclone</li>
                  <li>Generate manifest: <code>rclone lsjson --recursive supabase:bucket/path &gt; manifest.json</code></li>
                  <li>Upload the manifest file below</li>
                </ol>
              </div>
              
              <div className="rclone-upload-section">
                <label className={`upload-button primary ${isUploading ? 'disabled' : ''}`}>
                  <Cloud size={20} />
                  {isUploading ? `Processing... ${uploadProgress}%` : 'Upload Rclone Manifest'}
                  <input
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleRcloneUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button 
                  className="help-button"
                  onClick={() => setShowHelp(true)}
                  title="Setup Instructions"
                >
                  <HelpCircle size={18} />
                  <span>Instructions</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ZIP Method - Good for smaller collections */}
        <div className={`upload-method ${uploadMethod === 'zip' ? 'active' : ''}`}>
          <div className="method-header" onClick={() => setUploadMethod('zip')}>
            <div className="method-icon">
              <Upload size={24} />
            </div>
            <div className="method-info">
              <h4>ZIP Upload</h4>
              <p>Upload a ZIP file containing your book folders. Good for smaller collections.</p>
              <div className="method-badges">
                <span className="badge simple">Simple</span>
              </div>
            </div>
          </div>
          
          {uploadMethod === 'zip' && (
            <div className="method-content">
              <div className="zip-instructions">
                <h5>Instructions:</h5>
                <ul>
                  <li>Create a ZIP file with your book folders</li>
                  <li>Each book should have: cover.jpg, description.txt, resized/ folder</li>
                  <li>Maximum recommended size: 5GB</li>
                </ul>
              </div>
              
              <label className={`upload-button secondary ${isUploading ? 'disabled' : ''}`}>
                <Upload size={20} />
                {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload ZIP File'}
                <input
                  type="file"
                  accept=".zip,application/zip"
                  style={{ display: 'none' }}
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleZipUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-header">
            <Loader className="spinning" size={20} />
            <span>{uploadStatus}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="progress-text">{uploadProgress}%</div>
        </div>
      )}

      {/* Database Management */}
      <div className="database-management">
        <h5>🗄️ Database Management:</h5>
        <div className="management-buttons">
          <button 
            className="clear-db-button"
            onClick={async () => {
              if (window.confirm('⚠️ This will delete ALL books from the database. Are you sure?')) {
                try {
                  const response = await fetch('/api/books/clear/all', {
                    method: 'DELETE'
                  });
                  if (response.ok) {
                    toast.success('Database cleared successfully!');
                    if (onUploadComplete) {
                      onUploadComplete({ db_imported: 0 });
                    }
                    // Refresh page to update stats
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  } else {
                    throw new Error('Failed to clear database');
                  }
                } catch (error) {
                  toast.error(`Failed to clear database: ${error.message}`);
                }
              }
            }}
          >
            🗑️ Clear All Books
          </button>
          
          <button 
            className="export-button"
            onClick={async () => {
              try {
                const response = await fetch('/api/export/csv');
                if (response.ok) {
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `books_export_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  toast.success('Books exported successfully!');
                } else {
                  throw new Error('Failed to export books');
                }
              } catch (error) {
                toast.error(`Failed to export books: ${error.message}`);
              }
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h3>🚀 Rclone + Supabase Setup Guide</h3>
              <button className="close-button" onClick={() => setShowHelp(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="help-modal-content">
              <div className="setup-section">
                <h4>Step 1: Install Rclone (One-time setup)</h4>
                <div className="setup-options">
                  <div className="setup-option">
                    <strong>Windows:</strong>
                    <ol>
                      <li>Download from <a href="https://rclone.org/install/" target="_blank" rel="noopener noreferrer">rclone.org</a></li>
                      <li>Extract to <code>C:\rclone\</code></li>
                      <li>Add to system PATH</li>
                    </ol>
                  </div>
                  <div className="setup-option">
                    <strong>Mac:</strong>
                    <code>brew install rclone</code>
                  </div>
                  <div className="setup-option">
                    <strong>Linux:</strong>
                    <code>curl https://rclone.org/install.sh | sudo bash</code>
                  </div>
                </div>
              </div>

              <div className="setup-section">
                <h4>Step 2: Configure Supabase (One-time setup)</h4>
                <div className="code-block">
                  <code>
                    rclone config create supa s3 provider=Other endpoint=https://xzwdtcczndgglqikmlwj.storage.supabase.co/storage/v1/s3 access_key_id=45ac9af4e1e039c4e79fe332833d31e1 secret_access_key=fae79bf3e12cb133b4ceced13c506f5c205544cad11ea4083e449deac1ca7d54 region=us-east-1
                  </code>
                </div>
              </div>

              <div className="setup-section">
                <h4>Step 3: Upload Your Books</h4>
                <div className="method-options">
                  <div className="method-option">
                    <strong>🐍 Python Script (Recommended):</strong>
                    <code>python3 rclone_uploader.py /path/to/your/book/folder</code>
                    <p>Automatically uploads and generates manifest</p>
                  </div>
                  <div className="method-option">
                    <strong>📋 Quick Manifest (Existing books):</strong>
                    <code>python3 quick_manifest.py "CROP-ShuSpot/Baking"</code>
                    <p>Creates manifest for books already in Supabase</p>
                  </div>
                  <div className="method-option">
                    <strong>⚡ Manual Rclone:</strong>
                    <code>rclone sync /local/path supa:books/remote/path</code>
                    <br />
                    <code>rclone lsjson --recursive supa:books/remote/path > manifest.json</code>
                  </div>
                </div>
              </div>

              <div className="setup-section">
                <h4>Step 4: Import Here</h4>
                <ol>
                  <li>Click "Upload Rclone Manifest" above</li>
                  <li>Select your <code>manifest_*.json</code> file</li>
                  <li>Wait for processing</li>
                  <li>Your books will appear in the admin!</li>
                </ol>
              </div>

              <div className="troubleshooting-section">
                <h4>🔧 Troubleshooting</h4>
                <div className="troubleshooting-item">
                  <strong>❌ "rclone: command not found"</strong>
                  <p>Install Rclone using the instructions in Step 1</p>
                </div>
                <div className="troubleshooting-item">
                  <strong>❌ "0 books processed"</strong>
                  <p>Check that your books have the correct structure:</p>
                  <code>Book Name/resized/crop-1.png, crop-2.png, etc.</code>
                </div>
                <div className="troubleshooting-item">
                  <strong>❌ Upload fails</strong>
                  <p>Test connection: <code>rclone ls supa:books --max-items 5</code></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="upload-tips">
        <h5>💡 Pro Tips:</h5>
        <ul>
          <li><strong>Large folders (20GB+):</strong> Use Rclone method for fastest uploads</li>
          <li><strong>Folder structure:</strong> Each book needs cover.jpg, description.txt, and resized/ folder</li>
          <li><strong>File naming:</strong> Use crop-1.png, crop-2.png, etc. in resized/ folder</li>
          <li><strong>Audio files:</strong> Include .mp3 files for read-aloud functionality</li>
        </ul>
      </div>
    </div>
  );
};

export default StreamlinedUploader;