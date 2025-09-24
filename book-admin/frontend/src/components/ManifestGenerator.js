import React, { useState } from 'react';
import { getApiUrl } from '../utils/api';

const ManifestGenerator = () => {
  const [folderPath, setFolderPath] = useState('');
  const [generationMode, setGenerationMode] = useState('single'); // 'single' or 'multi'
  const [bookMetadata, setBookMetadata] = useState({
    title: '',
    author: '',
    genre: '',
    book_type: 'Read to Me',
    reading_level: 'Elementary',
    description: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedManifest, setGeneratedManifest] = useState(null);
  const [error, setError] = useState('');
  const [processingScript, setProcessingScript] = useState('');

  const handleMetadataChange = (field, value) => {
    setBookMetadata(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateManifest = async () => {
    if (!folderPath.trim()) {
      setError('Please enter a folder path');
      return;
    }

    if (generationMode === 'single' && !bookMetadata.title.trim()) {
      setError('Please enter a book title for single book mode');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedManifest(null);

    try {
      const response = await fetch(`${getApiUrl()}/generate-manifest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_path: folderPath,
          generation_mode: generationMode,
          book_metadata: bookMetadata,
          processing_script: processingScript.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedManifest(data.manifest);
        console.log('✅ Generated manifest:', data.manifest);
      } else {
        setError(data.detail || 'Failed to generate manifest');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      console.error('❌ Manifest generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadManifest = () => {
    if (!generatedManifest) return;

    const blob = new Blob([JSON.stringify(generatedManifest, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifest_${bookMetadata.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uploadManifest = async () => {
    if (!generatedManifest) return;

    try {
      const response = await fetch(`${getApiUrl()}/shuspot-ingestion/ingest-manifest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generatedManifest)
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Manifest uploaded successfully!');
        console.log('✅ Upload result:', data);
      } else {
        alert(`❌ Upload failed: ${data.detail || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`❌ Upload error: ${err.message}`);
      console.error('❌ Upload error:', err);
    }
  };

  return (
    <div className="manifest-generator">
      <div className="generator-header">
        <h2>📁 Generate Manifest from Folder</h2>
        <p>Create a manifest file from a local folder structure</p>
      </div>

      <div className="generator-form">
        {/* Generation Mode Selector */}
        <div className="generation-mode-section">
          <h3>🎯 Generation Mode</h3>
          <div className="mode-options">
            <label className={`mode-option ${generationMode === 'single' ? 'active' : ''}`}>
              <input
                type="radio"
                value="single"
                checked={generationMode === 'single'}
                onChange={(e) => setGenerationMode(e.target.value)}
              />
              <div className="mode-content">
                <span className="mode-title">📖 Single Book/Genre</span>
                <small>Generate manifest for one book or all books of one genre in a folder</small>
              </div>
            </label>
            <label className={`mode-option ${generationMode === 'multi' ? 'active' : ''}`}>
              <input
                type="radio"
                value="multi"
                checked={generationMode === 'multi'}
                onChange={(e) => setGenerationMode(e.target.value)}
              />
              <div className="mode-content">
                <span className="mode-title">📚 Multiple Books</span>
                <small>Generate manifest for entire folder with multiple books/genres</small>
              </div>
            </label>
          </div>
        </div>

        {/* Folder Path */}
        <div className="form-group">
          <label htmlFor="folderPath">
            📂 Folder Path <span className="required">*</span>
          </label>
          <input
            id="folderPath"
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="e.g., /path/to/book/folder or C:\\Books\\MyBook"
            className="form-input"
          />
          <small className="form-help">
            Path to the folder containing book images and audio files
          </small>
        </div>

        {/* Book Metadata */}
        <div className="metadata-section">
          <h3>📖 {generationMode === 'single' ? 'Book Information' : 'Default Book Settings'}</h3>
          {generationMode === 'multi' && (
            <p className="metadata-help">
              These settings will be used as defaults for books that don't have metadata detected from folder structure.
            </p>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">
                Title <span className="required">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={bookMetadata.title}
                onChange={(e) => handleMetadataChange('title', e.target.value)}
                placeholder="Book Title"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="author">Author</label>
              <input
                id="author"
                type="text"
                value={bookMetadata.author}
                onChange={(e) => handleMetadataChange('author', e.target.value)}
                placeholder="Author Name"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="genre">Genre</label>
              <input
                id="genre"
                type="text"
                value={bookMetadata.genre}
                onChange={(e) => handleMetadataChange('genre', e.target.value)}
                placeholder="e.g., Science, Adventure, Educational"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bookType">Book Type</label>
              <select
                id="bookType"
                value={bookMetadata.book_type}
                onChange={(e) => handleMetadataChange('book_type', e.target.value)}
                className="form-select"
              >
                <option value="Read to Me">Read to Me</option>
                <option value="Read Myself">Read Myself</option>
                <option value="Interactive">Interactive</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="readingLevel">Reading Level</label>
              <select
                id="readingLevel"
                value={bookMetadata.reading_level}
                onChange={(e) => handleMetadataChange('reading_level', e.target.value)}
                className="form-select"
              >
                <option value="Preschool">Preschool</option>
                <option value="Elementary">Elementary</option>
                <option value="Middle School">Middle School</option>
                <option value="High School">High School</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={bookMetadata.description}
              onChange={(e) => handleMetadataChange('description', e.target.value)}
              placeholder="Brief description of the book..."
              className="form-textarea"
              rows="3"
            />
          </div>
        </div>

        {/* Python Script for Metadata Processing */}
        <div className="script-section">
          <h3>🐍 Metadata Processing Script (Optional)</h3>
          <p className="script-help">
            Add a Python script to process description.txt files and extract custom metadata like author, age range, etc.
          </p>
          <textarea
            value={processingScript}
            onChange={(e) => setProcessingScript(e.target.value)}
            placeholder={`# Example: Extract metadata from description.txt
def process_metadata(description_text, folder_name):
    """
    Process description.txt content to extract metadata
    
    Args:
        description_text: Content of description.txt file
        folder_name: Name of the book folder
        
    Returns:
        dict with extracted metadata
    """
    metadata = {}
    
    # Extract author from "By: Author Name"
    if "By:" in description_text:
        author_line = [line for line in description_text.split('\\n') if 'By:' in line][0]
        metadata['author'] = author_line.replace('By:', '').strip()
    
    # Extract age range from "8-12Age Range"
    import re
    age_match = re.search(r'(\\d+-\\d+)Age Range', description_text)
    if age_match:
        metadata['age_range'] = age_match.group(1)
        # Convert age range to reading level
        age_start = int(age_match.group(1).split('-')[0])
        if age_start <= 6:
            metadata['reading_level'] = 'Preschool'
        elif age_start <= 10:
            metadata['reading_level'] = 'Elementary'
        else:
            metadata['reading_level'] = 'Middle School'
    
    # Extract genre from keywords
    if any(word in description_text.upper() for word in ['ASTRONOMY', 'PLANETS', 'SPACE']):
        metadata['genre'] = 'Science'
    elif any(word in description_text.upper() for word in ['MATH', 'NUMBERS']):
        metadata['genre'] = 'Mathematics'
    
    return metadata`}
            className="script-textarea"
            rows={15}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* Generate Button */}
        <div className="form-actions">
          <button
            onClick={generateManifest}
            disabled={isGenerating}
            className="btn btn-primary"
          >
            {isGenerating ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              <>
                🚀 Generate Manifest
              </>
            )}
          </button>
        </div>

        {/* Generated Manifest Display */}
        {generatedManifest && (
          <div className="manifest-result">
            <h3>✅ Manifest Generated Successfully!</h3>
            
            <div className="manifest-summary">
              <p>
                📚 <strong>{generatedManifest.books?.length || 0}</strong> book(s) found
              </p>
              {generatedManifest.books?.[0] && (
                <div className="book-summary">
                  <p>📖 <strong>Title:</strong> {generatedManifest.books[0].title}</p>
                  <p>📄 <strong>Pages:</strong> {generatedManifest.books[0].page_sequence?.length || 0}</p>
                  <p>🎵 <strong>Audio Files:</strong> {generatedManifest.books[0].audio_files?.length || 0}</p>
                </div>
              )}
            </div>

            <div className="manifest-actions">
              <button
                onClick={downloadManifest}
                className="btn btn-secondary"
              >
                💾 Download Manifest
              </button>
              <button
                onClick={uploadManifest}
                className="btn btn-success"
              >
                📤 Upload to Database
              </button>
            </div>

            {/* Manifest Preview */}
            <details className="manifest-preview">
              <summary>🔍 Preview Manifest JSON</summary>
              <pre className="manifest-json">
                {JSON.stringify(generatedManifest, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      <style jsx>{`
        .manifest-generator {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .generator-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .generator-header h2 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .generator-header p {
          color: #7f8c8d;
        }

        .generator-form {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #2c3e50;
        }

        .required {
          color: #e74c3c;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #ecf0f1;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.3s ease;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #3498db;
        }

        .form-help {
          display: block;
          margin-top: 5px;
          color: #7f8c8d;
          font-size: 12px;
        }

        .metadata-section {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #ecf0f1;
        }

        .metadata-section h3 {
          color: #2c3e50;
          margin-bottom: 20px;
        }

        .metadata-help {
          color: #7f8c8d;
          font-size: 14px;
          margin-bottom: 20px;
          font-style: italic;
        }

        .generation-mode-section {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .generation-mode-section h3 {
          margin: 0 0 16px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #2c3e50;
        }

        .mode-options {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .mode-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
          min-width: 250px;
        }

        .mode-option:hover {
          border-color: #3498db;
          background: #f0f9ff;
        }

        .mode-option.active {
          border-color: #3498db;
          background: #eff6ff;
        }

        .mode-option input[type="radio"] {
          margin: 4px 0 0 0;
        }

        .mode-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mode-title {
          font-weight: 600;
          color: #2c3e50;
          font-size: 14px;
        }

        .mode-content small {
          color: #7f8c8d;
          font-size: 12px;
          line-height: 1.4;
        }

        .script-section {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .script-section h3 {
          margin: 0 0 10px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #2c3e50;
        }

        .script-help {
          color: #7f8c8d;
          font-size: 14px;
          margin-bottom: 15px;
          line-height: 1.4;
        }

        .script-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #ecf0f1;
          border-radius: 8px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          line-height: 1.4;
          background: #2c3e50;
          color: #ecf0f1;
          resize: vertical;
          min-height: 200px;
        }

        .script-textarea:focus {
          outline: none;
          border-color: #3498db;
        }

        .script-textarea::placeholder {
          color: #95a5a6;
        }

        .error-message {
          background: #fee;
          color: #c0392b;
          padding: 12px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #e74c3c;
        }

        .form-actions {
          margin-top: 30px;
          text-align: center;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 0 10px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3498db;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2980b9;
        }

        .btn-secondary {
          background: #95a5a6;
          color: white;
        }

        .btn-secondary:hover {
          background: #7f8c8d;
        }

        .btn-success {
          background: #27ae60;
          color: white;
        }

        .btn-success:hover {
          background: #229954;
        }

        .spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 1s ease-in-out infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .manifest-result {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #27ae60;
        }

        .manifest-result h3 {
          color: #27ae60;
          margin-bottom: 15px;
        }

        .manifest-summary {
          margin-bottom: 20px;
        }

        .book-summary {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-top: 10px;
        }

        .book-summary p {
          margin: 5px 0;
        }

        .manifest-actions {
          margin: 20px 0;
        }

        .manifest-preview {
          margin-top: 20px;
        }

        .manifest-preview summary {
          cursor: pointer;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .manifest-json {
          background: #2c3e50;
          color: #ecf0f1;
          padding: 15px;
          border-radius: 8px;
          overflow-x: auto;
          font-size: 12px;
          max-height: 400px;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .manifest-generator {
            padding: 10px;
          }
          
          .generator-form {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default ManifestGenerator;