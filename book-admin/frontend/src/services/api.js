import axios from 'axios';

const isDev = process.env.NODE_ENV !== 'production';
const API_BASE = isDev ? '/api' : (process.env.REACT_APP_API_URL || '/api');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 second timeout for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

export const bookAPI = {
  // Upload multiple books
  uploadBooks: async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await api.post('/upload-books', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get all books with filtering
  getBooks: async (params = {}) => {
    const response = await api.get('/books', { params });
    return response.data;
  },

  // Update single book
  updateBook: async (bookId, bookData) => {
    const formData = new FormData();
    // Only send fields the backend expects
    const fields = ['title','author','genre','book_type','fiction_type','reading_level','cover_image_url','notes'];
    fields.forEach(key => {
      if (key in bookData) formData.append(key, bookData[key] ?? '');
    });

    const response = await api.put(`/books/${bookId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Bulk update books - using individual updates as workaround for routing issue
  bulkUpdateBooks: async (bookIds, field, value) => {
    const results = [];
    const errors = [];
    
    // Update each book individually since bulk endpoint has routing conflicts
    for (const bookId of bookIds) {
      try {
        const updateData = { [field]: value };
        const result = await bookAPI.updateBook(bookId, updateData);
        results.push(result);
      } catch (error) {
        console.error(`Failed to update book ${bookId}:`, error);
        errors.push({ bookId, error: error.message });
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} books: ${errors.map(e => e.error).join(', ')}`);
    }
    
    return { updated_count: results.length, results };
  },

  // Delete book
  deleteBook: async (bookId) => {
    const response = await api.delete(`/books/${bookId}`);
    return response.data;
  },

  // Clear all books from database
  clearDatabase: async () => {
    const response = await api.delete('/books/clear/all');
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },

  // Export to CSV
  exportCSV: async () => {
    const response = await api.get('/export/csv');
    return response.data;
  },
};

export default api;