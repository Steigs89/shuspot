// Centralized data for filtering system

export const READING_LEVELS = [
  'Pre-K',
  'K1', 
  'K2',
  '1A',
  '1B', 
  '2A',
  '2B',
  '3A', 
  '3B',
  '4A',
  '4B',
  '5A',
  '5B', 
  '6A',
  '6B',
  'AA - A',
  'B - C', 
  'D - E',
  'F - G',
  'H - I', 
  'J - K'
];

export const GENRES = [
  'Adventure',
  'Animals', 
  'Art',
  'Biography',
  'Comedy',
  'Crime',
  'Drama',
  'Education',
  'Fantasy',
  'Fiction',
  'History',
  'Horror',
  'Mystery',
  'Non-fiction',
  'Poetry',
  'Romance',
  'Science Fiction',
  'Sports',
  'Thriller'
];

export const MEDIA_TYPES = [
  'PDF Book',
  'Video Book', 
  'Audio Book',
  'Interactive Book'
];

// Filter interface for books
export interface BookFilters {
  genre: string;
  readingLevel: string;
  mediaType: string;
  searchQuery: string;
}

// Default filter state
export const DEFAULT_FILTERS: BookFilters = {
  genre: 'All',
  readingLevel: 'All', 
  mediaType: 'All',
  searchQuery: ''
};

// Helper function to check if a book matches the filters
export const matchesFilters = (book: any, filters: BookFilters): boolean => {
  // Genre filter
  if (filters.genre !== 'All' && book.genre !== filters.genre) {
    return false;
  }
  
  // Reading level filter  
  if (filters.readingLevel !== 'All' && book.gradeLevel !== filters.readingLevel) {
    return false;
  }
  
  // Media type filter
  if (filters.mediaType !== 'All' && book.mediaType !== filters.mediaType) {
    return false;
  }
  
  // Search query filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    const titleMatch = book.title?.toLowerCase().includes(query);
    const authorMatch = book.author?.toLowerCase().includes(query);
    const genreMatch = book.genre?.toLowerCase().includes(query);
    
    if (!titleMatch && !authorMatch && !genreMatch) {
      return false;
    }
  }
  
  return true;
};

// Helper function to get unique values from book array
export const getUniqueValues = (books: any[], field: string): string[] => {
  const values = books
    .map(book => book[field])
    .filter(value => value && value !== '')
    .filter((value, index, array) => array.indexOf(value) === index);
  
  return values.sort();
};