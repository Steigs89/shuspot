import React, { useState, useEffect, useCallback } from 'react';
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
import axios from 'axios';

import FileUpload from './components/FileUpload';
import BookGrid from './components/BookGrid';
import GoogleSheetsSetup from './components/GoogleSheetsSetup';
import GoogleSheetsManager from './components/GoogleSheetsManager';
import TxtIngestion from './components/TxtIngestion';
import ShuSpotBookLauncher from './components/ShuSpotBookLauncher';
import StreamlinedUploader from './components/StreamlinedUploader';
import { bookAPI } from './services/api';
import ZipPreviewModal from './components/ZipPreviewModal';
import './styles/StreamlinedUploader.css';

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

  // ZIP upload progress
  const [zipUploading, setZipUploading] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  // Preview ZIP state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Supabase import state
  const [supaBucket, setSupaBucket] = useState('');
  const [supaPrefix, setSupaPrefix] = useState('');
  const [supaBaseUrl, setSupaBaseUrl] = useState('');
  const [supaBusy, setSupaBusy] = useState(false);

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

  // Load data on component mount
  useEffect(() => {
    loadBooks();
    loadStats();
  }, [loadBooks]);

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

  const handleSyncFromSheets = async () => {
    try {
      const res = await fetch('/api/google-sheets/sync-to-db', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Sync failed');
      toast.success(json.message || 'Synced from Sheets');
      await loadBooks();
      await loadStats();
    } catch (e) {
      console.error('Sync from Sheets error:', e);
      toast.error(`Sync failed: ${e.message}`);
    }
  };

  // Fast path: upload a ShuSpot ZIP (folder) -> parse -> import to DB
  const handleQuickZipUpload = async (file) => {
    try {
      setZipUploading(true);
      setZipProgress(0);
      const form = new FormData();
      form.append('zip_file', file);

  const res = await axios.post('/api/shuspot-ingestion/upload-zip-and-import', form, {
        // Do NOT set Content-Type manually; let the browser add the boundary
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setZipProgress(pct);
          }
        }
      });

  const json = res.data;
  const imported = json.imported ?? 0;
  const updated = json.updated ?? 0;
  toast.success(json.message || `ZIP processed: ${imported} imported, ${updated} updated`);
  // After upload completes, the server parses/imports which can take time; then refresh
  await loadBooks();
  await loadStats();
    } catch (e) {
      console.error('Quick ZIP upload error:', e);
      // Fallback to chunked upload if 413
      if (e?.response?.status === 413) {
        try {
          const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
          const CONCURRENCY = 4;
          const startForm = new FormData();
          startForm.append('filename', file.name);
          startForm.append('size', String(file.size));
          const startRes = await axios.post('/api/shuspot-ingestion/chunked/start', startForm);
          const { upload_id } = startRes.data;
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          let completed = 0;
          const uploadChunk = async (i) => {
            const chunk = file.slice(i * CHUNK_SIZE, Math.min(file.size, (i + 1) * CHUNK_SIZE));
            const partForm = new FormData();
            partForm.append('upload_id', upload_id);
            partForm.append('chunk_index', String(i));
            partForm.append('total_chunks', String(totalChunks));
            partForm.append('chunk', new File([chunk], `${file.name}.part`));
            await axios.post('/api/shuspot-ingestion/chunked/upload', partForm);
            completed += 1;
            setZipProgress(Math.round((completed / totalChunks) * 100));
          };
          const queue = Array.from({ length: totalChunks }, (_, i) => i);
          const workers = Array.from({ length: Math.min(CONCURRENCY, totalChunks) }, async () => {
            while (queue.length) {
              const idx = queue.shift();
              if (idx !== undefined) await uploadChunk(idx);
            }
          });
          await Promise.all(workers);
          const finishForm = new FormData();
          finishForm.append('upload_id', upload_id);
          finishForm.append('mode', 'import_async');
          const finRes = await axios.post('/api/shuspot-ingestion/chunked/finish', finishForm);
          const { job_id } = finRes.data;
          toast.info('Import started in background');
          const poll = async () => {
            try {
              const st = await axios.get('/api/shuspot-ingestion/import-status', { params: { job_id } });
              if (st.data.status === 'completed') {
                toast.success(st.data.message || 'Import complete');
                await loadBooks();
                await loadStats();
              } else if (st.data.status === 'failed') {
                toast.error(st.data.error || 'Import failed');
              } else {
                setTimeout(poll, 1500);
              }
            } catch (se) {
              console.warn('Polling error', se);
              setTimeout(poll, 2500);
            }
          };
          setTimeout(poll, 1000);
        } catch (ce) {
          console.error('Chunked import failed:', ce);
          const msg2 = ce?.response?.data?.detail || ce.message || 'Chunked upload failed';
          toast.error(`Upload failed: ${msg2}`);
        }
      } else {
        const msg = e?.response?.data?.detail || e.message || 'Upload failed';
        toast.error(`Upload failed: ${msg}`);
      }
    } finally {
      setZipUploading(false);
      setTimeout(() => setZipProgress(0), 800);
    }
  };

  const handleImportJson = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/books/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Import failed');
      toast.success(json.message || 'Imported JSON');
      await loadBooks();
      await loadStats();
    } catch (e) {
      console.error('Import JSON error:', e);
      toast.error(`Import failed: ${e.message}`);
    }
  };

  const handleImportCsv = async (file) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/books/import-csv', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Import failed');
      toast.success(json.message || 'Imported CSV');
      await loadBooks();
      await loadStats();
    } catch (e) {
      console.error('Import CSV error:', e);
      toast.error(`Import failed: ${e.message}`);
    }
  };

  // Preview ZIP -> show modal -> confirm import
  const handlePreviewZip = async (file) => {
    try {
      setPreviewLoading(true);
      const form = new FormData();
      form.append('zip_file', file);
      const res = await axios.post('/api/shuspot-ingestion/upload-zip-preview', form, {
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setZipProgress(pct);
          }
        }
      });
      setPreviewData(res.data);
      setPreviewOpen(true);
    } catch (e) {
      console.error('ZIP preview error:', e);
      if (e?.response?.status === 413) {
        // Fallback to chunked preview
        try {
          const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
          const CONCURRENCY = 4;
          const startForm = new FormData();
          startForm.append('filename', file.name);
          startForm.append('size', String(file.size));
          const startRes = await axios.post('/api/shuspot-ingestion/chunked/start', startForm);
          const { upload_id } = startRes.data;
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          let completed = 0;
          const uploadChunk = async (i) => {
            const chunk = file.slice(i * CHUNK_SIZE, Math.min(file.size, (i + 1) * CHUNK_SIZE));
            const partForm = new FormData();
            partForm.append('upload_id', upload_id);
            partForm.append('chunk_index', String(i));
            partForm.append('total_chunks', String(totalChunks));
            partForm.append('chunk', new File([chunk], `${file.name}.part`));
            await axios.post('/api/shuspot-ingestion/chunked/upload', partForm);
            completed += 1;
            setZipProgress(Math.round((completed / totalChunks) * 100));
          };
          const queue = Array.from({ length: totalChunks }, (_, i) => i);
          const workers = Array.from({ length: Math.min(CONCURRENCY, totalChunks) }, async () => {
            while (queue.length) {
              const idx = queue.shift();
              if (idx !== undefined) await uploadChunk(idx);
            }
          });
          await Promise.all(workers);
          const finishForm = new FormData();
          finishForm.append('upload_id', upload_id);
          finishForm.append('mode', 'preview');
          const finRes = await axios.post('/api/shuspot-ingestion/chunked/finish', finishForm);
          setPreviewData(finRes.data);
          setPreviewOpen(true);
        } catch (ce) {
          console.error('Chunked preview failed:', ce);
          const msg2 = ce?.response?.data?.detail || ce.message || 'Preview failed';
          toast.error(`Preview failed: ${msg2}`);
        }
      } else {
        const msg = e?.response?.data?.detail || e.message || 'Preview failed';
        toast.error(`Preview failed: ${msg}`);
      }
    } finally {
      setPreviewLoading(false);
      setTimeout(() => setZipProgress(0), 800);
    }
  };

  const handleConfirmImport = async (token) => {
    try {
      setPreviewOpen(false);
      const form = new FormData();
      form.append('token', token);
      const res = await axios.post('/api/shuspot-ingestion/confirm-import-async', form);
      const { job_id } = res.data;
      toast.info('Import started in background');
      const poll = async () => {
        try {
          const st = await axios.get('/api/shuspot-ingestion/import-status', { params: { job_id } });
          if (st.data.status === 'completed') {
            toast.success(st.data.message || 'Import complete');
            await loadBooks();
            await loadStats();
          } else if (st.data.status === 'failed') {
            toast.error(st.data.error || 'Import failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (se) {
          console.warn('Polling error', se);
          setTimeout(poll, 2500);
        }
      };
      setTimeout(poll, 1000);
    } catch (e) {
      console.error('Confirm import error:', e);
      const msg = e?.response?.data?.detail || e.message || 'Import failed';
      toast.error(`Import failed: ${msg}`);
    }
  };

  const handleReplaceJson = async (file) => {
    try {
      if (!window.confirm('This will wipe all existing books and replace with the uploaded JSON. Continue?')) return;
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/books/replace-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Replace failed');
      toast.success(json.message || 'Replaced from JSON');
      await loadBooks();
      await loadStats();
    } catch (e) {
      console.error('Replace JSON error:', e);
      toast.error(`Replace failed: ${e.message}`);
    }
  };

  const handleReplaceCsv = async (file) => {
    try {
      if (!window.confirm('This will wipe all existing books and replace with the uploaded CSV. Continue?')) return;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/books/replace-csv', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Replace failed');
      toast.success(json.message || 'Replaced from CSV');
      await loadBooks();
      await loadStats();
    } catch (e) {
      console.error('Replace CSV error:', e);
      toast.error(`Replace failed: ${e.message}`);
    }
  };

  // Supabase: preview manifest
  const handleSupabasePreview = async (manifestFile) => {
    try {
      if (!supaBucket) {
        toast.warning('Enter bucket');
        return;
      }
      setSupaBusy(true);
      const form = new FormData();
      form.append('bucket', supaBucket);
      form.append('prefix', supaPrefix || '');
      if (supaBaseUrl) form.append('public_base_url', supaBaseUrl);
      form.append('manifest', manifestFile);
      const res = await axios.post('/api/supabase/preview-manifest', form);
      setPreviewData(res.data);
      setPreviewOpen(true);
    } catch (e) {
      console.error('Supabase preview error:', e);
      const msg = e?.response?.data?.detail || e.message || 'Preview failed';
      toast.error(msg);
    } finally {
      setSupaBusy(false);
    }
  };

  // Supabase: confirm import
  const handleSupabaseConfirm = async (token) => {
    try {
      setPreviewOpen(false);
      const form = new FormData();
      form.append('token', token);
      const res = await axios.post('/api/supabase/confirm-import', form);
      toast.success(res.data.message || 'Imported from Supabase');
      await loadBooks();
      await loadStats();
    } catch (e) {
      console.error('Supabase confirm error:', e);
      const msg = e?.response?.data?.detail || e.message || 'Import failed';
      toast.error(msg);
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

            {/* Streamlined Upload System */}
            <StreamlinedUploader 
              onUploadComplete={(result) => {
                // Refresh the books list after successful upload
                loadBooks();
                toast.success(`Successfully processed ${result.imported_count || result.books?.length || 0} books!`);
              }}
            />

            {/* Search and Filter Controls */}
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

                {/* Essential Actions Only */}
                <button
                  onClick={handleExportCSV}
                  className="btn btn-secondary"
                >
                  <Download size={16} style={{ marginRight: '8px' }} />
                  Export CSV
                </button>

                <button
                  onClick={handleSyncFromSheets}
                  className="btn btn-primary"
                >
                  <Cloud size={16} style={{ marginRight: '8px' }} />
                  Sync from Sheets
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
      <ZipPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={previewData}
        onConfirm={(token) => {
          // If data is from Supabase preview, detect by presence of page URL field in sample
          const isSupa = !!(previewData && previewData.sample_books && previewData.sample_books[0]?._page_sequence?.[0]?.url);
          if (isSupa) handleSupabaseConfirm(token);
          else handleConfirmImport(token);
        }}
      />
    </div>
  );
}

export default App;