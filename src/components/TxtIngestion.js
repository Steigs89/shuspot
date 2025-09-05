import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { 
  FolderOpen, 
  Upload, 
  Database, 
  Cloud, 
  BarChart3,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Image,
  Music,
  Video,
  Play
} from 'lucide-react';
import ScriptEditorSection from './ScriptEditorSection.tsx';
import { getApiUrl } from '../utils/api';

const TxtIngestion = ({ isGoogleSheetsConnected, onLaunchBook }) => {
  const [folderPath, setFolderPath] = useState('/Users/ethan.steigerwald/Downloads/MaterialsShuspotI');
  const [isLoading, setIsLoading] = useState(false);
  const [folderStats, setFolderStats] = useState(null);
  const [parseResults, setParseResults] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const checkFolderStats = async () => {
    if (!folderPath.trim()) {
      toast.error('Please enter a folder path');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/shuspot-ingestion/get-folder-stats?folder_path=${encodeURIComponent(folderPath)}`);
      const data = await response.json();

      if (response.ok) {
        setFolderStats(data);
        toast.success(`Found ${data.estimated_books} books in ${data.sections.length} sections`);
      } else {
        toast.error(data.detail || 'Failed to check folder');
        setFolderStats(null);
      }
    } catch (error) {
      console.error('Error checking folder:', error);
      toast.error('Failed to check folder stats');
      setFolderStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const parseFolder = async () => {
    if (!folderPath.trim()) {
      toast.error('Please enter a folder path');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('folder_path', folderPath);

      const response = await fetch(`${getApiUrl()}/shuspot-ingestion/parse-folder`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setParseResults(data);
        toast.success(`Successfully parsed ${data.total_books} books!`);
      } else {
        toast.error(data.detail || 'Failed to parse folder');
      }
    } catch (error) {
      console.error('Error parsing folder:', error);
      toast.error('Failed to parse folder');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadToSheets = async () => {
    if (!isGoogleSheetsConnected) {
      toast.error('Please connect to Google Sheets first');
      return;
    }

    if (!folderPath.trim()) {
      toast.error('Please enter a folder path');
      return;
    }

    const confirmed = window.confirm(
      'This will parse your ShuSpot folder structure and upload all books to Google Sheets. Continue?'
    );
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('folder_path', folderPath);

      const response = await fetch(`${getApiUrl()}/shuspot-ingestion/parse-and-upload-to-sheets`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Successfully uploaded ${data.upload_results.success} books to Google Sheets!`);
        if (data.upload_results.duplicates > 0) {
          toast.info(`Skipped ${data.upload_results.duplicates} duplicates`);
        }
        setParseResults(data);
      } else {
        toast.error(data.detail || 'Failed to upload to Google Sheets');
      }
    } catch (error) {
      console.error('Error uploading to sheets:', error);
      toast.error('Failed to upload to Google Sheets');
    } finally {
      setIsLoading(false);
    }
  };

  const importToLocalDB = async () => {
    if (!folderPath.trim()) {
      toast.error('Please enter a folder path');
      return;
    }

    const confirmed = window.confirm(
      'This will parse your ShuSpot folder structure and import all books to the local database. Continue?'
    );
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('folder_path', folderPath);

      const response = await fetch(`${getApiUrl()}/shuspot-ingestion/parse-and-import-to-db`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Successfully imported ${data.imported_count} books to local database!`);
        if (data.errors.length > 0) {
          console.log('Import errors:', data.errors);
          toast.warning(`${data.errors.length} books had import errors (check console)`);
        }
        setParseResults(data);
      } else {
        toast.error(data.detail || 'Failed to import to local database');
      }
    } catch (error) {
      console.error('Error importing to local DB:', error);
      toast.error('Failed to import to local database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="shuspot-ingestion">
      <div className="ingestion-header">
        <FolderOpen size={24} />
        <h3>ShuSpot Folder Structure Ingestion</h3>
      </div>

      <div className="ingestion-description">
        <p>
          Parse your organized ShuSpot folder structure and automatically extract book metadata, 
          cover images, and educational data (AR Level, Lexile, etc.) from your existing collection.
        </p>
      </div>

      {/* Folder Path Input */}
      <div className="folder-input-section">
        <div className="form-group">
          <label>ShuSpot Materials Folder Path:</label>
          <div className="path-input-wrapper">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="/path/to/your/shuspot/materials"
              className="path-input"
            />
            <button
              onClick={checkFolderStats}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              <BarChart3 size={16} />
              Check Folder
            </button>
          </div>
          <small className="help-text">
            Enter the path to your "MaterialsShuspotI" folder (renamed ShuSpot materials folder)
          </small>
        </div>
      </div>

      {/* Folder Stats */}
      {folderStats && (
        <div className="folder-stats">
          <h4>Folder Analysis</h4>
          <div className="stats-summary">
            <div className="stat-item">
              <strong>{folderStats.estimated_books}</strong>
              <span>Total Books</span>
            </div>
            <div className="stat-item">
              <strong>{folderStats.sections.length}</strong>
              <span>Sections</span>
            </div>
          </div>

          <div className="sections-breakdown">
            <h5>Sections Found:</h5>
            {folderStats.sections.map((section, index) => (
              <div key={index} className="section-item">
                <div className="section-info">
                  <span className="section-name">{section.name}</span>
                  <span className="section-count">{section.book_count} books</span>
                </div>
                <div className="section-icon">
                  {section.name.includes('Video') && <Video size={16} />}
                  {section.name.includes('Audio') && <Music size={16} />}
                  {section.name.includes('Read to Me') && <FileText size={16} />}
                  {section.name.includes('Books') && <Image size={16} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={parseFolder}
          disabled={isLoading}
          className="btn btn-outline"
        >
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          {isLoading ? 'Parsing...' : 'Parse & Preview'}
        </button>

        <button
          onClick={uploadToSheets}
          disabled={isLoading || !isGoogleSheetsConnected}
          className="btn btn-primary"
        >
          <Cloud size={16} style={{ marginRight: '8px' }} />
          {isLoading ? 'Uploading...' : 'Parse & Upload to Sheets'}
        </button>

        <button
          onClick={importToLocalDB}
          disabled={isLoading}
          className="btn btn-success"
        >
          <Database size={16} style={{ marginRight: '8px' }} />
          {isLoading ? 'Importing...' : 'Parse & Import to Local DB'}
        </button>
      </div>

      {/* Parse Results */}
      {parseResults && (
        <div className="parse-results">
          <h4>Parsing Results</h4>
          
          {parseResults.stats && (
            <div className="results-stats">
              <div className="stat-item">
                <strong>{parseResults.stats.total_books}</strong>
                <span>Books Parsed</span>
              </div>
              <div className="stat-item">
                <strong>{parseResults.stats.with_cover_images}</strong>
                <span>With Cover Images</span>
              </div>
              <div className="stat-item">
                <strong>{parseResults.stats.with_ar_level}</strong>
                <span>With AR Level</span>
              </div>
              <div className="stat-item">
                <strong>{parseResults.stats.with_lexile}</strong>
                <span>With Lexile</span>
              </div>
            </div>
          )}

          {parseResults.parsing_stats && (
            <div className="media-breakdown">
              <h5>By Media Type:</h5>
              {Object.entries(parseResults.parsing_stats.by_media_type).map(([type, count]) => (
                <div key={type} className="media-item">
                  <span className="media-type">{type}</span>
                  <span className="media-count">{count}</span>
                </div>
              ))}
            </div>
          )}

          {parseResults.sample_books && (
            <div className="sample-books">
              <h5>Sample Books:</h5>
              {parseResults.sample_books.slice(0, 5).map((book, index) => {
                const isShuSpotBook = book._page_sequence && book._page_sequence.length > 0;
                
                return (
                  <div key={index} className="book-sample">
                    <div className="book-content">
                      <div className="book-info">
                        <strong>{book.Name || 'Unknown Title'}</strong>
                        <span>by {book.Author || 'Unknown Author'}</span>
                      </div>
                      <div className="book-metadata">
                        <span className="metadata-tag">{book.Media}</span>
                        <span className="metadata-tag">{book.Category}</span>
                        {book['AR Level'] && <span className="metadata-tag">AR: {book['AR Level']}</span>}
                        {book.Lexile && <span className="metadata-tag">Lexile: {book.Lexile}</span>}
                        {book.Age && <span className="metadata-tag">Ages: {book.Age}</span>}
                        {isShuSpotBook && (
                          <span className="metadata-tag shuspot-tag">
                            <Image size={12} style={{ marginRight: '4px' }} />
                            {book._total_pages} pages
                          </span>
                        )}
                      </div>
                    </div>
                    {onLaunchBook && (
                      <div className="book-actions">
                        <button
                          onClick={() => onLaunchBook(book)}
                          disabled={!isShuSpotBook}
                          className={`btn-launch ${isShuSpotBook ? 'enabled' : 'disabled'}`}
                          title={isShuSpotBook ? "Launch book in reader" : "Only ShuSpot image books supported"}
                        >
                          <Play size={14} />
                          {isShuSpotBook ? 'Launch' : 'N/A'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {parseResults.upload_results && (
            <div className="upload-summary">
              <div className="upload-stat success">
                <CheckCircle size={16} />
                <span>{parseResults.upload_results.success} uploaded successfully</span>
              </div>
              {parseResults.upload_results.duplicates > 0 && (
                <div className="upload-stat warning">
                  <AlertTriangle size={16} />
                  <span>{parseResults.upload_results.duplicates} duplicates skipped</span>
                </div>
              )}
              {parseResults.upload_results.errors > 0 && (
                <div className="upload-stat error">
                  <AlertTriangle size={16} />
                  <span>{parseResults.upload_results.errors} errors occurred</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="ingestion-instructions">
        <h4>How Your Folder Structure Works:</h4>
        <div className="structure-example">
          <pre>{`MaterialsShuspotI/
├── Read to Me Stories/
│   ├── Art/
│   │   ├── A Gift for Sophie/
│   │   │   ├── description.txt (metadata)
│   │   │   ├── cover.jpg
│   │   │   ├── Screenshot (1).png
│   │   │   └── page2.mp3
│   └── Baby Animals/
├── Video Books/
│   ├── A Boy Like You/
│   │   ├── A Boy Like You.mp4
│   │   └── A Boy Like You.rtf
├── Audiobooks/
├── Books/
└── Videos/`}</pre>
        </div>

        <div className="extraction-info">
          <h5>What Gets Extracted:</h5>
          <ul>
            <li><strong>Metadata:</strong> Title, Author, AR Level, Lexile, Age Range</li>
            <li><strong>Cover Images:</strong> Automatically detected and linked</li>
            <li><strong>Page Counts:</strong> From Screenshot files and metadata</li>
            <li><strong>Media Types:</strong> Read to Me, Video Books, Audiobooks, etc.</li>
            <li><strong>Categories:</strong> Art, Baby Animals, Big Cats, etc.</li>
            <li><strong>Epic URLs:</strong> Links to original Epic Books content</li>
          </ul>
        </div>
      </div>

      <ScriptEditorSection />

      <style jsx>{`
        .shuspot-ingestion {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .ingestion-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .path-input-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .path-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          font-family: monospace;
        }

        .folder-stats {
          background: white;
          padding: 16px;
          border-radius: 6px;
          margin: 16px 0;
          border: 1px solid #dee2e6;
        }

        .stats-summary {
          display: flex;
          gap: 20px;
          margin: 16px 0;
        }

        .stat-item {
          text-align: center;
        }

        .stat-item strong {
          display: block;
          font-size: 24px;
          color: #007bff;
        }

        .stat-item span {
          font-size: 12px;
          color: #6c757d;
        }

        .section-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 4px;
          margin: 4px 0;
        }

        .section-info {
          display: flex;
          justify-content: space-between;
          flex: 1;
        }

        .section-name {
          font-weight: 500;
        }

        .section-count {
          color: #6c757d;
          font-size: 14px;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin: 20px 0;
          flex-wrap: wrap;
        }

        .btn {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-success {
          background-color: #28a745;
          color: white;
        }

        .btn-outline {
          background-color: white;
          color: #007bff;
          border: 1px solid #007bff;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .parse-results {
          background: white;
          padding: 16px;
          border-radius: 6px;
          margin: 16px 0;
          border: 1px solid #dee2e6;
        }

        .results-stats {
          display: flex;
          gap: 20px;
          margin: 16px 0;
          flex-wrap: wrap;
        }

        .media-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 8px;
          background: #f8f9fa;
          border-radius: 3px;
          margin: 2px 0;
        }

        .book-sample {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          margin: 8px 0;
        }

        .book-content {
          flex: 1;
        }

        .book-info strong {
          display: block;
          margin-bottom: 4px;
        }

        .book-info span {
          color: #6c757d;
          font-size: 14px;
        }

        .book-metadata {
          margin-top: 8px;
        }

        .metadata-tag {
          display: inline-block;
          background-color: #e9ecef;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          margin-right: 4px;
          margin-bottom: 4px;
        }

        .metadata-tag.shuspot-tag {
          background-color: #d4edda;
          color: #155724;
          display: inline-flex;
          align-items: center;
        }

        .book-actions {
          margin-left: 12px;
        }

        .btn-launch {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-launch.enabled {
          background-color: #007bff;
          color: white;
        }

        .btn-launch.enabled:hover {
          background-color: #0056b3;
        }

        .btn-launch.disabled {
          background-color: #e9ecef;
          color: #6c757d;
          cursor: not-allowed;
        }

        .upload-summary {
          margin-top: 16px;
        }

        .upload-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 4px 0;
          padding: 4px 0;
        }

        .upload-stat.success {
          color: #28a745;
        }

        .upload-stat.warning {
          color: #ffc107;
        }

        .upload-stat.error {
          color: #dc3545;
        }

        .structure-example {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 4px;
          margin: 12px 0;
          overflow-x: auto;
        }

        .structure-example pre {
          margin: 0;
          font-size: 12px;
          line-height: 1.4;
        }

        .extraction-info ul {
          margin: 12px 0;
          padding-left: 20px;
        }

        .extraction-info li {
          margin: 4px 0;
          line-height: 1.4;
        }

        .help-text {
          color: #6c757d;
          font-size: 12px;
          margin-top: 4px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default TxtIngestion;