import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useParentalControlsContext } from '../contexts/ParentalControlsContext';

/**
 * Options for filtering and paginating books from Supabase
 * 
 * Standard content_type values used throughout the system:
 * - 'audiobook': Audio-only book listening experience (use this for audiobooks, not 'audio')
 * - 'read-to-me': Narrated books with synchronized text highlighting
 * - 'video': Video book content
 * - 'book': Traditional reading books
 * - 'pdf': PDF documents
 * - 'interactive': Interactive book experiences
 * 
 * Note: The genre filter is automatically bypassed for audiobooks to show all audiobooks
 * regardless of genre selection.
 */
export interface UseBooksOptions {
  /** Filter by book section ('read-to-me' or 'all') */
  section?: 'read-to-me' | 'all' | null;
  
  /** 
   * Filter by content type. Use 'audiobook' (not 'audio') for audiobook content.
   * Can be a single type or an array of types.
   */
  contentType?: 'audiobook' | 'read-to-me' | 'video' | 'book' | 'pdf' | 'interactive' | Array<'audiobook' | 'read-to-me' | 'video' | 'book' | 'pdf' | 'interactive'>;
  
  /** Filter by reading level (e.g., 'K', '1', '2', '3', '4', '5') */
  readingLevel?: string;
  
  /** Filter by genre (automatically bypassed for audiobooks) */
  genre?: string;
  
  /** Maximum number of books to return per query (default: 50) */
  limit?: number;
  
  /** Offset for pagination (default: 0) */
  offset?: number;
}

export interface Book {
  // Core identification
  id: string;
  title: string;
  title_chinese?: string;
  author?: string;
  illustrator?: string;
  
  // Reading levels
  readingLevel: string; // Legacy field, kept for compatibility
  gr_level?: string;
  ar_level?: string;
  lexile_level?: string;
  ort_level?: string;
  raz_level?: string;
  
  // Classification
  genre_primary?: string;
  genre_secondary?: string;
  genre_tertiary?: string;
  fiction_type?: string;
  
  // Publication info
  publisher?: string;
  isbn?: string;
  publication_year?: number;
  age_range?: string;
  
  // Descriptions
  description?: string;
  description_chinese?: string;
  
  // Content flags
  contentType: string;
  reading_level_present: boolean;
  has_read_to_me: boolean;
  has_audiobook: boolean;
  has_book_b: boolean;
  
  // Technical fields
  cover: string;
  contentUrl: string;
  thumbnail_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Content structure
  pages?: Array<{
    page_number: number;
    image_url: string; // Keep snake_case for reader compatibility
    audio_url?: string;
  }>;
  audioFiles?: string[];
  
  // UI-specific fields (not in database)
  readingTime?: number;
  rating?: number;
  category: string;
  progress?: number;
  isNew?: boolean;
  
  // Flexible metadata
  metadata?: any;
}

export interface UseBooksReturn {
  books: Book[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface CacheEntry {
  data: Book[];
  timestamp: number;
  hasMore: boolean;
}

interface CacheKeyOptions extends UseBooksOptions {
  parentalControlsHash?: string;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(options: CacheKeyOptions): string {
  return JSON.stringify(options);
}

function getCachedData(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return entry;
}

function setCachedData(key: string, data: Book[], hasMore: boolean): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    hasMore
  });
}

export function useBooks(options: UseBooksOptions = {}): UseBooksReturn {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(options.offset || 0);
  
  // Get parental controls context
  const { controls: parentalControls } = useParentalControlsContext();
  
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchBooks = useCallback(async (offset: number = 0, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const limit = options.limit || 50;
      
      // Create a hash of parental controls for cache key
      const parentalControlsHash = parentalControls ? JSON.stringify({
        blocked_genres: parentalControls.blocked_genres,
        blocked_media_types: parentalControls.blocked_media_types,
        restricted_grade_levels: parentalControls.restricted_grade_levels
      }) : undefined;
      
      const cacheKey = getCacheKey({ ...options, offset, limit, parentalControlsHash });

      console.log('📚 useBooks - Fetching books with options:', options);
      console.log('🔒 useBooks - Parental controls:', parentalControls);

      // Check cache
      const cached = getCachedData(cacheKey);
      if (cached && !append) {
        console.log('📦 useBooks - Using cached data:', cached.data.length, 'books');
        setBooks(cached.data);
        setHasMore(cached.hasMore);
        setLoading(false);
        return;
      }

      // Build query
      let query = supabase
        .from('books')
        .select('*')
        .eq('is_active', true);
      
      console.log('🔍 useBooks - Building query for section:', options.section);

      // Apply filters
      if (options.section && options.section !== 'all') {
        // Filter by content_type for read-to-me section
        if (options.section === 'read-to-me') {
          query = query.eq('content_type', 'read-to-me');
        } else {
          query = query.eq('metadata->>section', options.section);
        }
      } else if (options.section === 'all') {
        // For "All Books" section, don't filter by section field
        // Exclude audiobooks and read-to-me books so they only appear in their dedicated sections
        query = query.not('content_type', 'in', '(audiobook,read-to-me)');
      }

      if (options.contentType) {
        if (Array.isArray(options.contentType)) {
          query = query.in('content_type', options.contentType);
        } else {
          query = query.eq('content_type', options.contentType);
        }
      }

      if (options.readingLevel) {
        query = query.eq('reading_level', options.readingLevel);
      }

      // Genre Filter Bypass for Audiobooks
      // Audiobooks should always be shown regardless of genre selection.
      // This ensures users can access all audiobook content without genre restrictions.
      // Only apply genre filter if contentType is NOT 'audiobook'
      if (options.genre && options.contentType !== 'audiobook') {
        query = query.eq('metadata->>genre', options.genre);
      }

      // Apply parental control filters
      if (parentalControls) {
        // Filter by restricted grade levels
        if (parentalControls.restricted_grade_levels && parentalControls.restricted_grade_levels.length > 0) {
          query = query.not('reading_level', 'in', `(${parentalControls.restricted_grade_levels.join(',')})`);
          console.log('🔒 useBooks - Filtering out grade levels:', parentalControls.restricted_grade_levels);
        }

        // Filter by blocked media types
        if (parentalControls.blocked_media_types && parentalControls.blocked_media_types.length > 0) {
          query = query.not('content_type', 'in', `(${parentalControls.blocked_media_types.join(',')})`);
          console.log('🔒 useBooks - Filtering out media types:', parentalControls.blocked_media_types);
        }

        // Filter by blocked genres (optimized for JSONB column)
        if (parentalControls.blocked_genres && parentalControls.blocked_genres.length > 0) {
          // Use OR condition to exclude any of the blocked genres
          // For JSONB fields, we need to use individual not conditions
          parentalControls.blocked_genres.forEach(genre => {
            query = query.not('metadata->>genre', 'eq', genre);
          });
          console.log('🔒 useBooks - Filtering out genres:', parentalControls.blocked_genres);
        }
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error: queryError } = await query;

      console.log('📊 useBooks - Query result:', data?.length || 0, 'books found');
      if (data && data.length > 0) {
        console.log('📖 useBooks - First book:', data[0]);
        console.log('📖 useBooks - First book section:', data[0].metadata?.section);
        console.log('📖 useBooks - First book reading_level:', data[0].reading_level);
      } else {
        console.log('⚠️ useBooks - No books found. Checking all books without section filter...');
        // Debug: fetch all books to see what's in the database
        const { data: allBooks } = await supabase
          .from('books')
          .select('id, title, reading_level, metadata')
          .eq('is_active', true)
          .limit(5);
        console.log('📚 useBooks - All books in database:', allBooks);
      }

      if (queryError) {
        console.error('❌ useBooks - Query error:', queryError);
        throw new Error(`Failed to fetch books: ${queryError.message}`);
      }

      if (!data) {
        console.log('⚠️ useBooks - No data returned');
        setBooks([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Map Supabase data to UI format
      const { mapSupabaseBooksToUI } = await import('../utils/bookMapping');
      const mappedBooks: Book[] = mapSupabaseBooksToUI(data);

      console.log('✅ useBooks - Mapped books:', mappedBooks.length);

      const newHasMore = data.length === limit;
      
      if (append) {
        setBooks(prev => [...prev, ...mappedBooks]);
      } else {
        setBooks(mappedBooks);
        setCachedData(cacheKey, mappedBooks, newHasMore);
      }
      
      setHasMore(newHasMore);
      setLoading(false);

    } catch (err) {
      console.error('Error fetching books:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, [options, parentalControls]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const newOffset = currentOffset + (options.limit || 50);
    setCurrentOffset(newOffset);
    await fetchBooks(newOffset, true);
  }, [hasMore, loading, currentOffset, options.limit, fetchBooks]);

  const refresh = useCallback(async () => {
    setCurrentOffset(0);
    await fetchBooks(0, false);
  }, [fetchBooks]);

  useEffect(() => {
    setCurrentOffset(0);
    fetchBooks(0, false);
  }, [
    options.section,
    options.contentType,
    options.readingLevel,
    options.genre,
    options.limit,
    parentalControls
  ]);

  return {
    books,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
}
