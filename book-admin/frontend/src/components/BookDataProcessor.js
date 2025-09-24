import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  Code, 
  Play, 
  Eye, 
  RefreshCw, 
  Database,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader,
  BarChart3
} from 'lucide-react';

const BookDataProcessor = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState('sqlite'); // 'json' or 'sqlite'
  const [pythonScript, setPythonScript] = useState(`# Book Data Processor
# Modify how books are read and organized

def process_books(books):
    """
    Transform book data structure
    
    Args:
        books: List of book objects from database
        
    Returns:
        List of modified book objects
    """
    processed_books = []
    
    for book in books:
        # Example transformations:
        
        # 1. Change ALL reading levels to "G2"
        book['reading_level'] = 'G2'
        
        # 2. Extract author from title
        if "'s " in book.get('title', ''):
            author = book['title'].split("'s ")[0]
            book['author'] = author
        
        # 3. Set reading level based on category (comment out to use G2 for all)
        # category = book.get('genre', '').lower()
        # if any(word in category for word in ['solar', 'system', 'science']):
        #     book['reading_level'] = 'Middle School'
        # elif any(word in category for word in ['baking', 'cycles']):
        #     book['reading_level'] = 'Elementary'
        # else:
        #     book['reading_level'] = 'Elementary'
        
        # 3. Set fiction type
        if any(word in category for word in ['story', 'tale', 'adventure']):
            book['fiction_type'] = 'Fiction'
        else:
            book['fiction_type'] = 'Non-Fiction'
        
        # 4. Clean up titles
        title = book.get('title', '')
        # Remove common prefixes/suffixes
        title = title.replace('A Shipmate\\'s Guide to ', '')
        book['title'] = title.strip()
        
        processed_books.append(book)
    
    return processed_books

# Execute the transformation
result = process_books(books_data)
`);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Load current books from database
  const loadBooks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/books?source=${dataSource}`);
      if (response.ok) {
        const data = await response.json();
        const booksList = data.books || data; // Handle both formats
        setBooks(booksList);
        toast.success(`Loaded ${booksList.length} books from ${dataSource.toUpperCase()} database`);
      } else {
        throw new Error('Failed to load books');
      }
    } catch (error) {
      toast.error(`Failed to load books: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Preview script changes without applying them
  const previewScript = async () => {
    if (!pythonScript.trim()) {
      toast.error('Please enter a Python script');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/shuspot-ingestion/preview-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: pythonScript,
          books: books
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewData(result.processed_books || []);
        setShowPreview(true);
        toast.success(`Preview generated for ${result.processed_books?.length || 0} books`);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Preview failed');
      }
    } catch (error) {
      toast.error(`Preview failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Execute script and apply changes to database
  const executeScript = async () => {
    if (!pythonScript.trim()) {
      toast.error('Please enter a Python script');
      return;
    }

    const confirmed = window.confirm(
      `This will modify all books in the ${dataSource.toUpperCase()} database. Are you sure you want to proceed?`
    );
    
    if (!confirmed) return;

    setExecuting(true);
    try {
      let response;
      
      if (dataSource === 'sqlite') {
        // First get the processed books from preview
        const previewResponse = await fetch('/api/shuspot-ingestion/preview-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: pythonScript,
            books: books
          })
        });
        
        if (!previewResponse.ok) {
          throw new Error('Failed to process script');
        }
        
        const previewResult = await previewResponse.json();
        
        // Apply to SQLite database
        response = await fetch('/api/apply-script-to-sqlite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: pythonScript,
            processed_books: previewResult.processed_books || []
          })
        });
      } else {
        // Original JSON database execution
        response = await fetch('/api/shuspot-ingestion/execute-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: pythonScript,
            books: books
          })
        });
      }

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully processed ${result.updated_count || result.processed_books?.length || 0} books in ${dataSource.toUpperCase()} database`);
        // Reload books to show changes
        await loadBooks();
        setShowPreview(false);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Execution failed');
      }
    } catch (error) {
      toast.error(`Execution failed: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  // Load books on component mount
  useEffect(() => {
    loadBooks();
  }, []);

  return (
    <div className="book-data-processor">
      <div className="processor-header">
        <h2>📝 Book Data Processor</h2>
        <p>Modify how uploaded books are read and organized using Python scripts</p>
      </div>

      {/* Data Source Selector */}
      <div className="data-source-selector">
        <h3>📊 Data Source</h3>
        <div className="source-options">
          <label className={`source-option ${dataSource === 'sqlite' ? 'active' : ''}`}>
            <input
              type="radio"
              value="sqlite"
              checked={dataSource === 'sqlite'}
              onChange={(e) => setDataSource(e.target.value)}
            />
            <Database size={16} />
            <span>SQLite Database (books.db)</span>
            <small>Your local database with imported manifests</small>
          </label>
          <label className={`source-option ${dataSource === 'json' ? 'active' : ''}`}>
            <input
              type="radio"
              value="json"
              checked={dataSource === 'json'}
              onChange={(e) => setDataSource(e.target.value)}
            />
            <FileText size={16} />
            <span>JSON Database (books.json)</span>
            <small>Temporary uploaded books</small>
          </label>
        </div>
        
        {/* Quick Action Scripts */}
        <div className="quick-actions">
          <h4>⚡ Quick Actions</h4>
          <div className="quick-action-buttons">
            <button 
              onClick={() => setPythonScript(`# Set all reading levels to G2
for book in books_data:
    book['reading_level'] = 'G2'
result = books_data`)}
              className="quick-action-btn"
            >
              📚 Set All to G2
            </button>
            
            <button 
              onClick={() => setPythonScript(`# Set reading levels by category
for book in books_data:
    category = book.get('genre', '').lower()
    if 'solar' in category or 'science' in category:
        book['reading_level'] = 'Middle School'
    else:
        book['reading_level'] = 'Elementary'
result = books_data`)}
              className="quick-action-btn"
            >
              🔬 Science = Middle School
            </button>
            
            <button 
              onClick={() => setPythonScript(`# Extract authors from titles
for book in books_data:
    title = book.get('title', '')
    if "'s " in title:
        author = title.split("'s ")[0]
        book['author'] = author
result = books_data`)}
              className="quick-action-btn"
            >
              👤 Extract Authors
            </button>
            
            <button 
              onClick={() => setPythonScript(`# Clean up titles
for book in books_data:
    title = book.get('title', '')
    # Remove common prefixes
    title = title.replace('A Shipmate\\'s Guide to ', '')
    title = title.replace('The ', '')
    book['title'] = title.strip()
result = books_data`)}
              className="quick-action-btn"
            >
              🧹 Clean Titles
            </button>
          </div>
        </div>
      </div>

      {/* Current Books Status */}
      <div className="books-status">
        <div className="status-card">
          <Database size={24} />
          <div className="status-info">
            <h3>{books.length}</h3>
            <p>Books Loaded</p>
          </div>
          <button 
            onClick={loadBooks} 
            disabled={loading}
            className="refresh-btn"
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Python Script Editor */}
      <div className="script-editor-section">
        <div className="editor-header">
          <h3>🐍 Python Script Editor</h3>
          <div className="editor-actions">
            <button 
              onClick={previewScript}
              disabled={loading || !books.length}
              className="btn btn-secondary"
            >
              <Eye size={16} />
              Preview Changes
            </button>
            <button 
              onClick={executeScript}
              disabled={executing || !books.length}
              className="btn btn-primary"
            >
              {executing ? <Loader size={16} className="spinning" /> : <Play size={16} />}
              Execute Script
            </button>
          </div>
        </div>

        <div className="script-editor">
          <textarea
            value={pythonScript}
            onChange={(e) => setPythonScript(e.target.value)}
            placeholder="Enter your Python script here..."
            className="python-editor"
            rows={20}
          />
        </div>
      </div>

      {/* Preview Results */}
      {showPreview && previewData.length > 0 && (
        <div className="preview-section">
          <div className="preview-header">
            <h3>👀 Preview Results</h3>
            <p>Changes that will be applied (not yet saved)</p>
          </div>
          
          <div className="preview-grid">
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Genre</th>
                    <th>Reading Level</th>
                    <th>Fiction Type</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((book, index) => (
                    <tr key={index}>
                      <td>{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.genre}</td>
                      <td>{book.reading_level}</td>
                      <td>{book.fiction_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <p className="preview-note">
                  Showing first 10 of {previewData.length} books
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          <button 
            onClick={() => setPythonScript(`# Extract authors from titles
for book in books_data:
    title = book.get('title', '')
    if "'s " in title:
        book['author'] = title.split("'s ")[0]
result = books_data`)}
            className="btn btn-outline"
          >
            <FileText size={16} />
            Extract Authors
          </button>
          
          <button 
            onClick={() => setPythonScript(`# Set reading levels by category
for book in books_data:
    category = book.get('genre', '').lower()
    if 'solar' in category or 'science' in category:
        book['reading_level'] = 'Middle School'
    else:
        book['reading_level'] = 'Elementary'
result = books_data`)}
            className="btn btn-outline"
          >
            <BarChart3 size={16} />
            Set Reading Levels
          </button>
          
          <button 
            onClick={() => setPythonScript(`# Clean up titles
for book in books_data:
    title = book.get('title', '')
    # Remove common prefixes
    title = title.replace('A Shipmate\\'s Guide to ', '')
    title = title.replace('Our ', '')
    book['title'] = title.strip()
result = books_data`)}
            className="btn btn-outline"
          >
            <RefreshCw size={16} />
            Clean Titles
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="help-section">
        <h3>💡 How to Use</h3>
        <ol>
          <li><strong>Upload books</strong> using the streamlined uploader</li>
          <li><strong>Load books</strong> to see current data structure</li>
          <li><strong>Edit Python script</strong> to transform the data</li>
          <li><strong>Preview changes</strong> to see what will happen</li>
          <li><strong>Execute script</strong> to apply changes to database</li>
          <li><strong>Iterate</strong> until perfect, then clear for next batch</li>
        </ol>
      </div>
    </div>
  );
};

export default BookDataProcessor;