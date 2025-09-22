import React, { useState, useCallback } from 'react';
import { Upload, FolderOpen, Cloud, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'react-toastify';

const StreamlinedUploader = ({ onUploadComplete }) => {
  const [uploadMethod, setUploadMethod] = useState('rclone'); // 'rclone', 'zip', 'folder'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  // Rclone + Supabase Upload (Recommended for large folders)
  const handleRcloneUpload = useCallback(async (manifestFile) => {
    if (!manifestFile) return;

    setIsUploading(true);
    setUploadStatus('Processing Rclone manifest...');
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('manifest', manifestFile);

      const response = await fetch('/api/preview-supabase-import', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(50);
      setUploadStatus('Parsing book structure...');

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUploadProgress(80);
      setUploadStatus('Importing books to database...');

      // Import the parsed books
      const importResponse = await fetch('/api/import-parsed-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: result.books }),
      });

      if (!importResponse.ok) {
        throw new Error('Failed to import books to database');
      }

      const importResult = await importResponse.json();
      
      setUploadProgress(100);
      setUploadStatus('Upload complete!');
      
      toast.success(`Successfully uploaded ${importResult.imported_count} books via Rclone!`);
      
      if (onUploadComplete) {
        onUploadComplete(importResult);
      }

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