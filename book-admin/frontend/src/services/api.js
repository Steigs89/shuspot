import axios from 'axios';

const isDev = process.env.NODE_ENV !== 'production';
const API_BASE = isDev ? '/api' : (process.env.REACT_APP_API_URL || '/api');

const api = axios.create({
  baseURL: API_BASE,
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
    console.log(`🔄 Updating individual book ${bookId}:`, bookData);
    
    const formData = new FormData();
    // Only send fields the backend expects
    const fields = ['title','author','genre','book_type','fiction_type','reading_level','cover_image_url','notes'];
    fields.forEach(key => {
      if (key in bookData) {
        formData.append(key, bookData[key] ?? '');
        console.log(`📝 Adding field: ${key} = ${bookData[key]}`);
      }
    });

    const response = await api.put(`/books/${bookId}`, formData, {
      headers: {
        'Content-Type': undefined, // Let axios handle multipart boundary
      },
    });
    
    console.log(`✅ Individual book ${bookId} update response:`, response.data);
    return response.data;
  },

  // Bulk update books
  bulkUpdateBooks: async (bookIds, field, value) => {
    console.log('🔄 Bulk updating books:', { bookIds, field, value });
    
    try {
      // Try the bulk update endpoint first
      const formData = new FormData();
      bookIds.forEach(id => formData.append('book_ids', id));
      formData.append('field', field);
      formData.append('value', value);
      
      console.log('📝 FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }
      
      const response = await api.put('/books/bulk-update', formData, {
        headers: {
          'Content-Type': undefined, // Let axios set the correct multipart boundary
        },
      });
      return response.data;
      
    } catch (error) {
      console.error('❌ Bulk update failed, trying individual updates:', error);
      
      // Fallback: Update each book individually
      if (error.response?.status === 422 || error.response?.status === 500) {
        console.log('🔄 Falling back to individual book updates...');
        
        let successCount = 0;
        const errors = [];
        
        for (const bookId of bookIds) {
          try {
            // Create update data for individual book
            const updateData = { [field]: value };
            await bookAPI.updateBook(bookId, updateData);
            successCount++;
            console.log(`✅ Updated book ${bookId}: ${field} = ${value}`);
          } catch (individualError) {
            console.error(`❌ Failed to update book ${bookId}:`, individualError);
            errors.push(`Book ${bookId}: ${individualError.message}`);
          }
        }
        
        if (successCount > 0) {
          console.log(`✅ Fallback successful: Updated ${successCount}/${bookIds.length} books`);
          return { 
            ok: true, 
            updated: successCount, 
            message: `Updated ${successCount} books using individual updates`,
            fallback: true,
            errors: errors.length > 0 ? errors : undefined
          };
        } else {
          throw new Error(`All individual updates failed: ${errors.join(', ')}`);
        }
      }
      
      // For other errors, re-throw with more context
      throw new Error(`Bulk update failed: ${error.message}`);
    }
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