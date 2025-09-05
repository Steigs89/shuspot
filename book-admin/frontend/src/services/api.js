import axios from 'axios';

const api = axios.create({
  baseURL: '/',  // This will use the proxy configuration from package.json
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
    Object.keys(bookData).forEach(key => {
      formData.append(key, bookData[key] || '');
    });
    
    const response = await api.put(`/books/${bookId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Bulk update books
  bulkUpdateBooks: async (bookIds, field, value) => {
    const formData = new FormData();
    bookIds.forEach(id => formData.append('book_ids', id));
    formData.append('field', field);
    formData.append('value', value);
    
    const response = await api.put('/books/bulk-update', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
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