import React, { useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { Upload, Shield, Users, Settings, BookOpen, Plus, FileText, Award } from 'lucide-react';

export default function AdminUpload() {
  const { isAdmin, isSuperAdmin, loading, adminRoles } = useAdmin();
  const [activeTab, setActiveTab] = useState('upload');

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-white/20 rounded"></div>
            <div className="h-24 bg-white/20 rounded"></div>
            <div className="h-24 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { id: 'upload', label: 'Upload Books', icon: Upload },
    { id: 'import', label: 'Import Books', icon: BookOpen },
    { id: 'manage', label: 'Manage Content', icon: Settings },
    ...(isSuperAdmin ? [{ id: 'admins', label: 'Manage Admins', icon: Users }] : [])
  ];

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg mb-6 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">
                {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
              </h2>
              <p className="text-white/80 text-sm">
                Roles: {adminRoles.join(', ')}
              </p>
            </div>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
            {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/20 border-b-2 border-white'
                  : 'hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'upload' && <UploadTab />}
        {activeTab === 'import' && <ImportTab />}
        {activeTab === 'manage' && <ManageTab />}
        {activeTab === 'admins' && isSuperAdmin && <AdminsTab />}
      </div>
    </div>
  );
}

function UploadTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Upload New Content</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <UploadCard
          icon={BookOpen}
          title="Import Books"
          description="Import from Book Admin Tool"
          onClick={() => {/* TODO: Implement book import */}}
        />
        <UploadCard
          icon={FileText}
          title="Create Quiz"
          description="Add comprehension quizzes"
          onClick={() => {/* TODO: Implement quiz creation */}}
        />
        <UploadCard
          icon={Plus}
          title="Add Category"
          description="Create new book categories"
          onClick={() => {/* TODO: Implement category creation */}}
        />
        <UploadCard
          icon={Award}
          title="Create Achievement"
          description="Design new achievements"
          onClick={() => {/* TODO: Implement achievement creation */}}
        />
      </div>
    </div>
  );
}

function ManageTab() {
  const [supabaseStats, setSupabaseStats] = React.useState({ books: 0, loading: true });

  React.useEffect(() => {
    // Load stats from Supabase instead of local database
    const loadSupabaseStats = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const { count, error } = await supabase
          .from('books')
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          setSupabaseStats({ books: count || 0, loading: false });
        } else {
          setSupabaseStats({ books: 0, loading: false });
        }
      } catch (error) {
        console.log('Error loading Supabase stats:', error);
        setSupabaseStats({ books: 0, loading: false });
      }
    };
    
    loadSupabaseStats();
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Manage Existing Content</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ManageCard
          title="Books Library"
          description="Books currently in Supabase database"
          count={supabaseStats.loading ? "Loading..." : `${supabaseStats.books} books`}
          onClick={() => {/* TODO: Navigate to books management */}}
        />
        <ManageCard
          title="Categories"
          description="Organize and manage book categories"
          count="View all"
          onClick={() => {/* TODO: Navigate to categories management */}}
        />
        <ManageCard
          title="User Analytics"
          description="View reading statistics and user engagement"
          count="View stats"
          onClick={() => {/* TODO: Navigate to analytics */}}
        />
        <ManageCard
          title="Content Reports"
          description="Review flagged content and user reports"
          count="View reports"
          onClick={() => {/* TODO: Navigate to reports */}}
        />
      </div>
    </div>
  );
}

function ImportTab() {
  const [availableBooks, setAvailableBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<Record<string, boolean>>({});
  const [importingBooks, setImportingBooks] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkImporting, setBulkImporting] = useState(false);
  const booksPerPage = 10;

  // Fetch available books from book-admin
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { fetchAvailableBooks, getImportStatus } = await import('../api/bookImport');
      
      const books = await fetchAvailableBooks();
      setAvailableBooks(books);
      
      if (books.length === 0) {
        console.log('No books found in local database. This is normal - books are imported directly to Supabase.');
      }
      
      // Check import status for all books
      const bookIds = books.map(book => book.id);
      const status = await getImportStatus(bookIds);
      setImportStatus(status);
      
    } catch (error) {
      console.log('Local database not accessible. Books are imported directly to Supabase.');
      // Don't show alert for connection errors - just log them
    } finally {
      setLoading(false);
    }
  };

  // Load books on component mount
  React.useEffect(() => {
    fetchBooks();
  }, []);

  const handleImportBook = async (bookId: string) => {
    setImportingBooks(prev => new Set([...prev, bookId]));
    
    try {
      const { importBookToMainApp } = await import('../api/bookImport');
      
      const result = await importBookToMainApp(bookId);
      
      if (result.success) {
        // Update import status
        setImportStatus(prev => ({ ...prev, [bookId]: true }));
        const wasImported = importStatus[bookId];
        alert(`Book ${wasImported ? 'updated' : 'imported'} successfully! Refreshing page to load changes...`);
        
        // Refresh the book list to show updated status
        await fetchBooks();
        
        // Reload the page to trigger book loading from Supabase
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert(`${importStatus[bookId] ? 'Update' : 'Import'} failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please try again.');
    } finally {
      setImportingBooks(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookId);
        return newSet;
      });
    }
  };

  const handleBulkImport = async () => {
    // Get all books that haven't been imported yet
    const booksToImport = availableBooks.filter(book => !importStatus[book.id]);
    
    if (booksToImport.length === 0) {
      alert('All books have already been imported!');
      return;
    }

    const confirmed = confirm(`Import ${booksToImport.length} books? This may take a while.`);
    if (!confirmed) return;

    setBulkImporting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const { importBookToMainApp } = await import('../api/bookImport');
      
      for (const book of booksToImport) {
        setImportingBooks(prev => new Set([...prev, book.id]));
        
        try {
          const result = await importBookToMainApp(book.id);
          
          if (result.success) {
            successCount++;
            setImportStatus(prev => ({ ...prev, [book.id]: true }));
          } else {
            failCount++;
            console.error(`Failed to import ${book.title}:`, result.error);
          }
        } catch (error) {
          failCount++;
          console.error(`Failed to import ${book.title}:`, error);
        } finally {
          setImportingBooks(prev => {
            const newSet = new Set(prev);
            newSet.delete(book.id);
            return newSet;
          });
        }
      }

      alert(`Bulk import complete!\n✓ ${successCount} imported\n✗ ${failCount} failed\n\nRefreshing page...`);
      
      // Refresh the book list
      await fetchBooks();
      
      // Reload the page to show new books
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Bulk import failed:', error);
      alert('Bulk import encountered an error. Check console for details.');
    } finally {
      setBulkImporting(false);
    }
  };

  const openBookAdmin = () => {
    window.open('https://shuspot.com/book-admin', '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Import Books from Book Admin</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchBooks}
            disabled={loading}
            className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={openBookAdmin}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Open Book Admin Tool</span>
          </button>
        </div>
      </div>

      <div className="bg-white/10 rounded-lg p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin text-2xl mb-3">🔄</div>
            <p className="text-white/70">Loading books from Book Admin Tool...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                <span>Available Books ({availableBooks.length})</span>
                {Object.values(importStatus).filter(Boolean).length > 0 && (
                  <span className="text-sm text-green-300">
                    • {Object.values(importStatus).filter(Boolean).length} imported
                  </span>
                )}
              </h4>
              
              {availableBooks.length > 0 && availableBooks.some(book => !importStatus[book.id]) && (
                <button
                  onClick={handleBulkImport}
                  disabled={bulkImporting}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {bulkImporting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Importing All...</span>
                    </>
                  ) : (
                    <>
                      <span>📚</span>
                      <span>Import All Books</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {availableBooks
                .slice((currentPage - 1) * booksPerPage, currentPage * booksPerPage)
                .map((book) => {
                const isImported = importStatus[book.id];
                const isImporting = importingBooks.has(book.id);
                
                // Determine content type and icon
                const hasPages = book.pages && book.pages.length > 0;
                const hasAudio = book.audio_files && book.audio_files.length > 0;
                const hasOCR = book.ocr_data && Object.keys(book.ocr_data).length > 0;
                
                let contentType = 'PDF';
                let icon = '📚';
                
                if (hasPages && hasAudio) {
                  contentType = 'Interactive';
                  icon = '🎮';
                } else if (hasAudio && !hasPages) {
                  contentType = 'Audio';
                  icon = '🎵';
                } else if (hasPages) {
                  contentType = 'PDF';
                  icon = '📚';
                }
                
                return (
                  <div key={book.id} className={`bg-white/5 rounded-lg p-4 flex items-center justify-between ${
                    isImported ? 'opacity-60' : ''
                  }`}>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">{icon}</div>
                        <div>
                          <h5 className="font-medium">{book.title}</h5>
                          <div className="text-sm text-white/70 flex items-center space-x-4">
                            <span>{contentType}</span>
                            {book.author && <span>by {book.author}</span>}
                            {book.genre && <span>{book.genre}</span>}
                            {hasPages && <span>{book.pages.length} pages</span>}
                            {hasOCR && <span className="text-green-300">✓ OCR</span>}
                            {hasAudio && <span className="text-blue-300">♪ Audio</span>}
                            {book.reading_level && <span className="text-yellow-300">{book.reading_level}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {isImported ? (
                        <div className="flex items-center space-x-2">
                          <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-lg text-sm font-medium">
                            ✓ Imported
                          </span>
                          <button
                            onClick={() => handleImportBook(book.id)}
                            disabled={isImporting}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 px-4 py-2 rounded-lg font-medium transition-colors"
                            title="Re-import to update book settings"
                          >
                            {isImporting ? 'Updating...' : 'Update'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleImportBook(book.id)}
                          disabled={isImporting}
                          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          {isImporting ? 'Importing...' : 'Import'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {availableBooks.length > booksPerPage && (
              <div className="flex items-center justify-center space-x-2 mt-6 pt-4 border-t border-white/20">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.ceil(availableBooks.length / booksPerPage) }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-white text-purple-600 font-bold'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(availableBooks.length / booksPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(availableBooks.length / booksPerPage)}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
                
                <span className="text-sm text-white/70 ml-4">
                  Page {currentPage} of {Math.ceil(availableBooks.length / booksPerPage)}
                </span>
              </div>
            )}

            {availableBooks.length === 0 && !loading && (
              <div className="text-center py-8 text-white/60">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-2">Local Database Not Connected</p>
                <p className="text-sm mb-4">Books are uploaded directly to Supabase</p>
                <div className="bg-white/5 rounded-lg p-4 text-left max-w-md mx-auto text-sm">
                  <p className="font-medium text-white mb-2">📚 How to Upload Books:</p>
                  <ol className="list-decimal list-inside space-y-2 text-white/70">
                    <li>Organize books in CROP-ShuSpot folder structure</li>
                    <li>Run the upload script:
                      <code className="block bg-white/10 px-2 py-1 rounded mt-1">
                        cd book-admin/tools<br/>
                        ./upload-books.sh
                      </code>
                    </li>
                    <li>Upload the generated manifest file via the web interface</li>
                    <li>Books appear on the main app immediately!</li>
                  </ol>
                  <p className="mt-3 text-green-300 text-xs">
                    ✅ This is the recommended workflow - no local database needed!
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdminsTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Manage Administrators</h3>
      <div className="bg-white/10 rounded-lg p-4">
        <p className="text-white/80 mb-4">
          As a Super Admin, you can grant admin privileges to other users.
        </p>
        <button className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors">
          Add New Admin
        </button>
      </div>
    </div>
  );
}

interface UploadCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}

function UploadCard({ icon: Icon, title, description, onClick }: UploadCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white/10 hover:bg-white/20 p-4 rounded-lg transition-colors text-left group"
    >
      <Icon className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-white/80">{description}</div>
    </button>
  );
}

interface ManageCardProps {
  title: string;
  description: string;
  count: string;
  onClick: () => void;
}

function ManageCard({ title, description, count, onClick }: ManageCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white/10 hover:bg-white/20 p-4 rounded-lg transition-colors text-left"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-semibold">{title}</div>
        <div className="text-xs bg-white/20 px-2 py-1 rounded">{count}</div>
      </div>
      <div className="text-sm text-white/80">{description}</div>
    </button>
  );
}