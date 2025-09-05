import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  RefreshCw, 
  Download, 
  Search, 
  AlertTriangle, 
  Edit, 
  Trash2
} from 'lucide-react';
import { getApiUrl } from '../utils/api';

const GoogleSheetsManager = ({ isConnected }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [bulkUpdateField, setBulkUpdateField] = useState('Status');
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');

  // Helper function to get field value (handles both clean and dash-prefixed field names)
  const getFieldValue = (book, fieldName) => {
    return book[fieldName] || book[`-${fieldName}`] || '';
  };

  // Helper function to clean up text values (remove extra prefixes and clean up)
  const cleanValue = (value) => {
    if (!value) return '';
    
    // Remove common prefixes
    let cleaned = value.toString()
      .replace(/^Author:\s*/i, '')
      .replace(/^By:\s*/i, '')
      .replace(/^Ages:\s*/i, '')
      .replace(/^Read time:\s*/i, '')
      .replace(/^AR LEVEL:\s*/i, '')
      .replace(/^LEXILE©:\s*/i, '')
      .replace(/^Level:\s*/i, '')
      .replace(/^Pages:\s*/i, '')
      .replace(/^Illustrator:\s*/i, ', Illustrator: ')
      .trim();
    
    return cleaned;
  };

  useEffect(() => {
    if (isConnected) {
      loadGoogleSheetsBooks();
    }
  }, [isConnected, loadGoogleSheetsBooks]);

  const loadGoogleSheetsBooks = useCallback(async () => {
    if (!isConnected) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/google-sheets/books?limit=1000`);
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        setBooks(data.books);
      }
    } catch (error) {
      console.error('Error loading books:', error);
      setError('Failed to load books from Google Sheets');
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  const syncFromDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/google-sheets/sync-from-db', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Synced ${data.results.success} books to Google Sheets`);
        if (data.results.duplicates > 0) {
          toast.info(`Skipped ${data.results.duplicates} duplicates`);
        }
        await loadGoogleSheetsBooks();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync from database');
    } finally {
      setLoading(false);
    }
  };

  const findDuplicates = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/google-sheets/duplicates');
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
      } else {
        setDuplicates(data.duplicates);
        setShowDuplicates(true);
        toast.info(`Found ${data.count} potential duplicates`);
      }
    } catch (error) {
      console.error('Error finding duplicates:', error);
      toast.error('Failed to find duplicates');
    } finally {
      setLoading(false);
    }
  };

  const updateBook = async (bookId, updates) => {
    try {
      const response = await fetch(`http://localhost:8000/google-sheets/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Book updated in Google Sheets');
        await loadGoogleSheetsBooks();
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update book');
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedBooks.length === 0) {
      toast.warning('Please select books to update');
      return;
    }

    if (!bulkUpdateValue.trim()) {
      toast.warning('Please enter a value');
      return;
    }

    try {
      const updates = { [bulkUpdateField]: bulkUpdateValue };
      
      // Update each selected book
      for (const book of selectedBooks) {
        await updateBook(book.ID, updates);
      }
      
      toast.success(`Updated ${selectedBooks.length} books`);
      setSelectedBooks([]);
      setBulkUpdateValue('');
      
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to bulk update books');
    }
  };

  const filteredBooks = books.filter(book => {
    const name = getFieldValue(book, 'Name');
    const author = cleanValue(getFieldValue(book, 'Author'));
    const category = cleanValue(getFieldValue(book, 'Category'));
    
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           author.toLowerCase().includes(searchTerm.toLowerCase()) ||
           category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!isConnected) {
    return (
      <div className="sheets-manager-disconnected">
        <p>Please connect to Google Sheets first to manage your centralized book database.</p>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .books-table-container {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .books-table {
          display: table;
          min-width: 1800px;
          width: 100%;
          border-collapse: collapse;
        }
        
        .table-header, .table-row {
          display: table-row;
        }
        
        .header-cell, .table-cell {
          display: table-cell;
          padding: 6px 4px;
          border: 1px solid #ddd;
          vertical-align: top;
          font-size: 11px;
          white-space: nowrap;
        }
        
        .header-cell {
          background-color: #f8f9fa;
          font-weight: bold;
          text-align: center;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        /* Column-specific widths */
        .checkbox-cell { width: 40px; text-align: center; }
        .name-cell { width: 180px; white-space: normal; word-wrap: break-word; }
        .category-cell { width: 90px; }
        .media-cell { width: 80px; }
        .url-cell { width: 50px; text-align: center; }
        .author-cell { width: 140px; white-space: normal; }
        .age-cell { width: 60px; text-align: center; }
        .time-cell { width: 80px; text-align: center; }
        .ar-cell { width: 70px; text-align: center; background-color: #fff3cd; font-weight: bold; }
        .lexile-cell { width: 80px; text-align: center; background-color: #d1ecf1; font-weight: bold; }
        .grl-cell { width: 60px; text-align: center; background-color: #d4edda; font-weight: bold; }
        .pages-cell { width: 70px; text-align: center; }
        .audio-cell { width: 90px; text-align: center; }
        .video-cell { width: 90px; text-align: center; }
        .status-cell { width: 80px; text-align: center; }
        .date-cell { width: 90px; font-size: 10px; }
        .notes-cell { width: 120px; white-space: normal; }
        .actions-cell { width: 90px; text-align: center; }
        
        .url-link {
          color: #007bff;
          text-decoration: none;
          font-size: 10px;
          padding: 2px 4px;
          border: 1px solid #007bff;
          border-radius: 3px;
        }
        
        .url-link:hover {
          background-color: #007bff;
          color: white;
        }
        
        .status-badge {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: bold;
        }
        
        .status-badge.active {
          background-color: #d4edda;
          color: #155724;
        }
        
        .btn-sm {
          padding: 2px 4px;
          margin: 0 1px;
          font-size: 9px;
          border: none;
          border-radius: 2px;
          cursor: pointer;
        }
        
        .btn-outline {
          background-color: #f8f9fa;
          color: #6c757d;
        }
        
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        
        .table-row:hover {
          background-color: #f8f9fa;
        }
      `}</style>
      <div className="google-sheets-manager">
      <div className="manager-header">
        <h3>Google Sheets Book Manager</h3>
        <p>Manage your centralized book database</p>
      </div>

      {/* Controls */}
      <div className="manager-controls">
        <div className="search-section">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search books in Google Sheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="action-buttons">
          <button
            onClick={loadGoogleSheetsBooks}
            disabled={loading}
            className="btn btn-secondary"
          >
            <RefreshCw size={16} style={{ marginRight: '8px' }} />
            Refresh
          </button>

          <button
            onClick={syncFromDatabase}
            disabled={loading}
            className="btn btn-primary"
          >
            <RefreshCw size={16} style={{ marginRight: '8px' }} />
            Sync from Database
          </button>

          <button
            onClick={findDuplicates}
            disabled={loading}
            className="btn btn-warning"
          >
            <AlertTriangle size={16} style={{ marginRight: '8px' }} />
            Find Duplicates
          </button>
        </div>
      </div>

      {/* Bulk Update Panel */}
      {selectedBooks.length > 0 && (
        <div className="bulk-update-panel">
          <h4>Bulk Update ({selectedBooks.length} books selected)</h4>
          <div className="bulk-controls">
            <select
              value={bulkUpdateField}
              onChange={(e) => setBulkUpdateField(e.target.value)}
              className="form-select"
            >
              <option value="Status">Status</option>
              <option value="Category">Category</option>
              <option value="Media">Media</option>
              <option value="Author">Author</option>
              <option value="Age">Age</option>
              <option value="Read time">Read time</option>
              <option value="AR Level">AR Level</option>
              <option value="Lexile">Lexile</option>
              <option value="GRL">GRL</option>
              <option value="Pages">Pages</option>
              <option value="Audiobook Length">Audiobook Length</option>
              <option value="Video Length">Video Length</option>
              <option value="Notes">Notes</option>
            </select>

            <input
              type="text"
              placeholder={`New ${bulkUpdateField} value...`}
              value={bulkUpdateValue}
              onChange={(e) => setBulkUpdateValue(e.target.value)}
              className="form-input"
            />

            <button
              onClick={handleBulkUpdate}
              className="btn btn-success"
            >
              <Edit size={16} style={{ marginRight: '8px' }} />
              Update Selected
            </button>

            <button
              onClick={() => setSelectedBooks([])}
              className="btn btn-secondary"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Books Table */}
      <div className="books-table-container">
        {loading ? (
          <div className="loading">Loading books from Google Sheets...</div>
        ) : (
          <div className="books-table">
            <div className="table-header">
              <div className="header-cell checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedBooks.length === filteredBooks.length && filteredBooks.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBooks(filteredBooks);
                    } else {
                      setSelectedBooks([]);
                    }
                  }}
                />
              </div>
              <div className="header-cell name-cell">Name</div>
              <div className="header-cell category-cell">Category</div>
              <div className="header-cell media-cell">Media</div>
              <div className="header-cell url-cell">URL</div>
              <div className="header-cell author-cell">Author</div>
              <div className="header-cell age-cell">Age</div>
              <div className="header-cell time-cell">Read Time</div>
              <div className="header-cell ar-cell">AR Level</div>
              <div className="header-cell lexile-cell">Lexile</div>
              <div className="header-cell grl-cell">GRL</div>
              <div className="header-cell pages-cell">Pages</div>
              <div className="header-cell audio-cell">Audio Length</div>
              <div className="header-cell video-cell">Video Length</div>
              <div className="header-cell status-cell">Status</div>
              <div className="header-cell date-cell">Added</div>
              <div className="header-cell date-cell">Modified</div>
              <div className="header-cell notes-cell">Notes</div>
              <div className="header-cell actions-cell">Actions</div>
            </div>

            {filteredBooks.map((book, index) => (
              <div key={index} className="table-row">
                <div className="table-cell checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedBooks.some(selected => getFieldValue(selected, 'Name') === getFieldValue(book, 'Name'))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBooks([...selectedBooks, book]);
                      } else {
                        setSelectedBooks(selectedBooks.filter(selected => getFieldValue(selected, 'Name') !== getFieldValue(book, 'Name')));
                      }
                    }}
                  />
                </div>
                <div className="table-cell name-cell">
                  <strong>{getFieldValue(book, 'Name') || 'Untitled'}</strong>
                </div>
                <div className="table-cell category-cell">{cleanValue(getFieldValue(book, 'Category'))}</div>
                <div className="table-cell media-cell">{cleanValue(getFieldValue(book, 'Media'))}</div>
                <div className="table-cell url-cell">
                  {getFieldValue(book, 'URL') && (
                    <a href={getFieldValue(book, 'URL')} target="_blank" rel="noopener noreferrer" className="url-link">
                      Link
                    </a>
                  )}
                </div>
                <div className="table-cell author-cell">{cleanValue(getFieldValue(book, 'Author'))}</div>
                <div className="table-cell age-cell">{cleanValue(getFieldValue(book, 'Age'))}</div>
                <div className="table-cell time-cell">{cleanValue(getFieldValue(book, 'Read time'))}</div>
                <div className="table-cell ar-cell">{cleanValue(getFieldValue(book, 'AR Level'))}</div>
                <div className="table-cell lexile-cell">{cleanValue(getFieldValue(book, 'Lexile'))}</div>
                <div className="table-cell grl-cell">{cleanValue(getFieldValue(book, 'GRL'))}</div>
                <div className="table-cell pages-cell">{cleanValue(getFieldValue(book, 'Pages'))}</div>
                <div className="table-cell audio-cell">{cleanValue(getFieldValue(book, 'Audiobook Length'))}</div>
                <div className="table-cell video-cell">{cleanValue(getFieldValue(book, 'Video Length'))}</div>
                <div className="table-cell status-cell">
                  <span className={`status-badge ${(getFieldValue(book, 'Status') || 'Active').toLowerCase()}`}>
                    {getFieldValue(book, 'Status') || 'Active'}
                  </span>
                </div>
                <div className="table-cell date-cell">{cleanValue(getFieldValue(book, 'Date Added'))}</div>
                <div className="table-cell date-cell">{cleanValue(getFieldValue(book, 'Date Modified'))}</div>
                <div className="table-cell notes-cell">{cleanValue(getFieldValue(book, 'Notes'))}</div>
                <div className="table-cell actions-cell">
                  <button
                    onClick={() => updateBook(index + 1, { Status: getFieldValue(book, 'Status') === 'Active' ? 'Inactive' : 'Active' })}
                    className="btn btn-sm btn-outline"
                    title="Toggle Status"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => updateBook(index + 1, { Status: 'Deleted' })}
                    className="btn btn-sm btn-danger"
                    title="Mark as Deleted"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duplicates Modal */}
      {showDuplicates && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Potential Duplicates ({duplicates.length})</h3>
              <button
                onClick={() => setShowDuplicates(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {duplicates.length === 0 ? (
                <p>No duplicates found!</p>
              ) : (
                <div className="duplicates-list">
                  {duplicates.map((duplicate, index) => (
                    <div key={index} className="duplicate-pair">
                      <div className="duplicate-item">
                        <h4>Original</h4>
                        <p><strong>Title:</strong> {duplicate.original.Title}</p>
                        <p><strong>Author:</strong> {duplicate.original.Author}</p>
                        <p><strong>ID:</strong> {duplicate.original.ID}</p>
                      </div>
                      <div className="duplicate-item">
                        <h4>Duplicate</h4>
                        <p><strong>Title:</strong> {duplicate.duplicate.Title}</p>
                        <p><strong>Author:</strong> {duplicate.duplicate.Author}</p>
                        <p><strong>ID:</strong> {duplicate.duplicate.ID}</p>
                        <button
                          onClick={() => updateBook(duplicate.duplicate.ID, { Status: 'Deleted' })}
                          className="btn btn-danger btn-sm"
                        >
                          Mark as Deleted
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="manager-stats">
        <p>Showing {filteredBooks.length} of {books.length} books</p>
      </div>
    </div>
    </>
  );
};

export default GoogleSheetsManager;