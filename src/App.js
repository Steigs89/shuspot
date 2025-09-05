import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Search,
  Filter,
  Download,
  Edit,
  Upload as UploadIcon,
  Cloud,
  FileText,
  Database,
  Settings
} from 'lucide-react';

import FileUpload from './components/FileUpload';
import BookGrid from './components/BookGrid';
import GoogleSheetsSetup from './components/GoogleSheetsSetup';
import GoogleSheetsManager from './components/GoogleSheetsManager';
import TxtIngestion from './components/TxtIngestion';
import ShuSpotBookLauncher from './components/ShuSpotBookLauncher';
import { bookAPI } from './services/api';

function App() {
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [showUpload, setShowUpload] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState('local'); // 'local', 'sheets', 'ingestion'
  const [isGoogleSheetsConnected, setIsGoogleSheetsConnected] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [authorFilter, setAuthorFilter] = useState('All');
  const [bookTypeFilter, setBookTypeFilter] = useState('All');

  // Bulk edit state
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkField, setBulkField] = useState('genre');
  const [bulkValue, setBulkValue] = useState('');

  // Book launcher
  const [launchedBook, setLaunchedBook] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadBooks();
    loadStats();
  }, [loadBooks]);

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (genreFilter !== 'All') params.genre = genreFilter;
      if (authorFilter !== 'All') params.author = authorFilter;
      if (bookTypeFilter !== 'All') params.book_type = bookTypeFilter;

      const response = await bookAPI.getBooks(params);
      setBooks(response.books);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('Error loading books');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, genreFilter, authorFilter, bookTypeFilter]);

  const loadStats = async () => {
    try {
      const response = await bookAPI.getStats();
      setStats(response);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleUpload = async (files) => {
    try {
      setIsUploading(true);
      const response = await bookAPI.uploadBooks(files);

      toast.success(`Successfully uploaded ${response.uploaded} books!`);

      if (response.errors > 0) {
        toast.warning(`${response.errors} files had errors. Check console for details.`);
        console.log('Upload errors:', response.error_details);
      }

      // Reload data
      await loadBooks();
      await loadStats();
      setShowUpload(false);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateBook = async (bookId, bookData) => {
    try {
      await bookAPI.updateBook(bookId, bookData);
      toast.success('Book updated successfully');
      await loadBooks();
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Error updating book');
      throw error;
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      await bookAPI.deleteBook(bookId);
      toast.success('Book deleted successfully');
      await loadBooks();
      await loadStats();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Error deleting book');
      throw error;
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedBooks.length === 0) {
      toast.warning('Please select books to update');
      return;
    }

    if (!bulkValue.trim()) {
      toast.warning('Please enter a value');
      return;
    }

    try {
      const bookIds = selectedBooks.map(book => book.id);
      await bookAPI.bulkUpdateBooks(bookIds, bulkField, bulkValue);

      toast.success(`Updated ${selectedBooks.length} books`);
      setShowBulkEdit(false);
      setBulkValue('');
      setSelectedBooks([]);
      await loadBooks();

    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Error updating books');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await bookAPI.exportCSV();

      // Create and download CSV file
      const blob = new Blob([response.csv_data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'books_export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error exporting CSV');
    }
  };

  const handleClearDatabase = async () => {
    if (window.confirm('Are you sure you want to clear the entire database? This action cannot be undone.')) {
      try {
        await bookAPI.clearDatabase();
        toast.success('Database cleared successfully');
        await loadBooks();
        await loadStats();
      } catch (error) {
        console.error('Error clearing database:', error);
        toast.error('Error clearing database');
      }
    }
  };

  const handleLaunchBook = (book) => {
    console.log('Launching book:', book);
    // Check book data
    console.log('Book type:', typeof book);
    console.log('Book page sequence:', book._page_sequence);
    console.log('Book folder path:', book._folder_path);
    console.log('Book total pages:', book._total_pages);
    setLaunchedBook(book);
  };

  // If a book is launched, show the book launcher
  if (launchedBook) {
    return (
      <div className="app">
        <ToastContainer position="top-right" autoClose={3000} />
        <ShuSpotBookLauncher 
          book={launchedBook} 
          onBack={() => setLaunchedBook(null)} 
        />
      </div>
    );
  }

  return (
    <div className="app">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="header">
        <h1>Book Admin Tool</h1>
        <p>Centralized book management with Google Sheets integration</p>

        <div className="stats">
          <div className="stat-item">
            <strong>{stats.total_books || 0}</strong>
            <span>Local Books</span>
          </div>
          <div className="stat-item">
            <strong>{stats.unique_authors || 0}</strong>
            <span>Authors</span>
          </div>
          <div className="stat-item">
            <strong>{stats.unique_genres || 0}</strong>
            <span>Genres</span>
          </div>
          <div className="stat-item">
            <span className={`connection-status ${isGoogleSheetsConnected ? 'connected' : 'disconnected'}`}>
              <Cloud size={16} />
              {isGoogleSheetsConnected ? 'Sheets Connected' : 'Sheets Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'local' ? 'active' : ''}`}
          onClick={() => setActiveTab('local')}
        >
          <Database size={16} />
          Local Database
        </button>
        <button
          className={`nav-tab ${activeTab === 'sheets' ? 'active' : ''}`}
          onClick={() => setActiveTab('sheets')}
        >
          <Cloud size={16} />
          Google Sheets
        </button>
        <button
          className={`nav-tab ${activeTab === 'ingestion' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingestion')}
        >
          <FileText size={16} />
          TXT Ingestion
        </button>
      </div>



      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'local' && (
          <>
            {/* Upload Section */}
            {showUpload && (
              <div className="controls">
                <h3>Upload Books</h3>
                <FileUpload onUpload={handleUpload} isUploading={isUploading} />
              </div>
            )}

            {/* Local Database Controls - only show for local tab */}
            <div className="controls">
              <div className="controls-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search books..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>

                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Genres</option>
                  {stats.genres?.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>

                <select
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Authors</option>
                  {stats.authors?.slice(0, 50).map(author => (
                    <option key={author} value={author}>{author}</option>
                  ))}
                </select>

                <select
                  value={bookTypeFilter}
                  onChange={(e) => setBookTypeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Book Types</option>
                  <option value="Read to Me">Read to Me</option>
                  <option value="Voice Coach">Voice Coach</option>
                  <option value="Books">Books</option>
                  <option value="Audiobooks">Audiobooks</option>
                  <option value="Video Books">Video Books</option>
                </select>

                <button
                  onClick={() => setShowUpload(!showUpload)}
                  className="btn btn-primary"
                >
                  <UploadIcon size={16} style={{ marginRight: '8px' }} />
                  {showUpload ? 'Hide Upload' : 'Upload Books'}
                </button>

                <button
                  onClick={handleExportCSV}
                  className="btn btn-secondary"
                >
                  <Download size={16} style={{ marginRight: '8px' }} />
                  Export CSV
                </button>

                <button
                  onClick={handleClearDatabase}
                  className="btn btn-danger"
                >
                  <Settings size={16} style={{ marginRight: '8px' }} />
                  Clear Database
                </button>
              </div>
            </div>

            {/* Bulk Edit Panel */}
            {selectedBooks.length > 0 && (
              <div className="bulk-edit-panel">
                <h4>Bulk Edit ({selectedBooks.length} books selected)</h4>
                <div className="bulk-edit-controls">
                  <select
                    value={bulkField}
                    onChange={(e) => setBulkField(e.target.value)}
                    className="filter-select"
                  >
                    <option value="genre">Genre</option>
                    <option value="book_type">Book Type</option>
                    <option value="fiction_type">Fiction Type</option>
                    <option value="reading_level">Reading Level</option>
                    <option value="author">Author</option>
                    <option value="cover_image_url">Cover Image URL</option>
                    <option value="notes">Notes</option>
                  </select>

                  {bulkField === 'fiction_type' ? (
                    <select
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">Select Fiction Type...</option>
                      <option value="Fiction">Fiction</option>
                      <option value="Non-Fiction">Non-Fiction</option>
                    </select>
                  ) : bulkField === 'book_type' ? (
                    <select
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">Select Book Type...</option>
                      <option value="Books">Books</option>
                      <option value="Read to Me">Read to Me</option>
                      <option value="Voice Coach">Voice Coach</option>
                      <option value="Audiobooks">Audiobooks</option>
                      <option value="Video Books">Video Books</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={`New ${bulkField} value...`}
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      className="search-input"
                    />
                  )}

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

            {/* Books Grid */}
            <div className="grid-container">
              {loading ? (
                <div className="loading">Loading books...</div>
              ) : (
                <BookGrid
                  books={books}
                  onUpdateBook={handleUpdateBook}
                  onDeleteBook={handleDeleteBook}
                  onBulkUpdate={handleBulkUpdate}
                  selectedBooks={selectedBooks}
                  setSelectedBooks={setSelectedBooks}
                  onLaunchBook={handleLaunchBook}
                />
              )}
            </div>
          </>
        )}

        {activeTab === 'sheets' && (
          <div className="sheets-tab">
            <GoogleSheetsSetup onStatusChange={setIsGoogleSheetsConnected} />
            <GoogleSheetsManager isConnected={isGoogleSheetsConnected} />
          </div>
        )}

        {activeTab === 'ingestion' && (
          <div className="ingestion-tab">
            <TxtIngestion 
              isGoogleSheetsConnected={isGoogleSheetsConnected} 
              onLaunchBook={handleLaunchBook}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;