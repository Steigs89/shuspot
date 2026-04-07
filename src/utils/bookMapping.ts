/**
 * Utility functions for mapping Supabase book data to UI format
 */

export interface SupabaseBook {
  // Core identification
  id: string;
  title: string;
  title_chinese?: string;
  author?: string;
  illustrator?: string;
  
  // Reading levels
  reading_level: string; // Legacy field
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
  content_type: string;
  reading_level_present: boolean;
  has_read_to_me: boolean;
  has_audiobook: boolean;
  has_book_b: boolean;
  
  // Technical fields
  content_url: string;
  cover_image_url?: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Flexible metadata
  metadata: {
    section?: string;
    genre?: string;
    pages?: Array<{
      page_number: number;
      image_url?: string;
      url?: string;
      audio_url?: string;
    }>;
    audio_files?: string[];
    original_id?: string;
    import_source?: string;
  };
  
  // Read to Me audio data (stored in notes field)
  notes?: {
    audio_files?: {
      [key: string]: string; // e.g., "page_1": "https://cdn.../1.mp3"
    };
    page_sequence?: string[]; // Ordered array of page image URLs
  };
}

export interface UIBook {
  // Core identification
  id: string;
  title: string;
  title_chinese?: string;
  author?: string;
  illustrator?: string;
  
  // Reading levels
  readingLevel: string; // Legacy field
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
  totalPages: number;
  pages?: Array<{
    page_number: number;
    image_url: string; // Keep snake_case for reader compatibility
    audio_url?: string;
  }>;
  audioFiles?: string[];
  
  // Audio configuration
  hasAudio?: boolean;
  audioType?: 'global' | 'per-page'; // 'global' for audiobooks, 'per-page' for read-to-me
  
  // UI-specific fields
  readingTime?: number;
  rating?: number;
  category: string;
  progress?: number;
  isNew?: boolean;
  
  // Flexible metadata
  metadata?: any;
}

/**
 * Constructs the cover.webp URL from content_url
 */
function getCoverWebpUrl(contentUrl: string): string | null {
  if (!contentUrl) return null;
  
  // If content_url already points to cover.webp, use it
  if (contentUrl.includes('cover.webp')) {
    return contentUrl;
  }
  
  // Otherwise, construct cover.webp URL from the base path
  const lastSlashIndex = contentUrl.lastIndexOf('/');
  if (lastSlashIndex === -1) return null;
  
  const basePath = contentUrl.substring(0, lastSlashIndex);
  return `${basePath}/cover.webp`;
}

/**
 * Maps a Supabase book object to the UI book format
 */
export function mapSupabaseBookToUI(book: SupabaseBook): UIBook {
  // PRIORITY ORDER for cover image:
  // 1. cover_image_url (dedicated cover field from Supabase)
  // 2. thumbnail_url (fallback)
  // 3. cover.webp (constructed from content_url)
  // 4. content_url
  // 5. First page image
  let cover = '';
  
  // Use cover_image_url as primary source (dedicated cover field)
  if (book.cover_image_url) {
    cover = book.cover_image_url;
  } else if (book.thumbnail_url) {
    // Use thumbnail_url as secondary source
    cover = book.thumbnail_url;
  } else {
    // Try cover.webp as fallback
    const coverWebp = getCoverWebpUrl(book.content_url);
    if (coverWebp) {
      cover = coverWebp;
    } else if (book.content_url) {
      cover = book.content_url;
    }
  }
  
  // Fallback to first page if no cover found
  if (!cover && book.metadata?.pages && book.metadata.pages.length > 0) {
    const firstPage = book.metadata.pages[0];
    cover = firstPage.image_url || firstPage.url || '';
  }

  // Extract genre from metadata (fallback to genre_primary)
  const category = book.metadata?.genre || book.genre_primary || 'General';

  // Parse notes field for Read to Me books
  const notesAudioFiles = book.notes?.audio_files || {};
  const notesPageSequence = book.notes?.page_sequence || [];
  
  // Build pages array with audio URLs for Read to Me books
  let pages: Array<{
    page_number: number;
    image_url: string;
    audio_url?: string;
  }> = [];
  
  // Check if this is a Read to Me book with per-page audio
  const isReadToMeBook = book.content_type === 'read-to-me' && 
                         Object.keys(notesAudioFiles).length > 0 &&
                         notesPageSequence.length > 0;
  
  if (isReadToMeBook) {
    // Build pages from notes.page_sequence with audio URLs from notes.audio_files
    pages = notesPageSequence.map((imageUrl: string, index: number) => ({
      page_number: index + 1,
      image_url: imageUrl,
      audio_url: notesAudioFiles[`page_${index + 1}`]
    }));
  } else {
    // Use existing metadata.pages structure for regular books
    pages = book.metadata?.pages?.map(page => ({
      page_number: page.page_number,
      image_url: page.image_url || page.url || '', // Keep snake_case for compatibility
      audio_url: page.audio_url
    })) || [];
  }

  // Extract audio files from metadata (for legacy audiobooks)
  const audioFiles = book.metadata?.audio_files || [];
  
  // Determine audio configuration
  const hasPerPageAudio = pages.some(p => !!p.audio_url);
  const hasGlobalAudio = book.content_type === 'audiobook' || audioFiles.length > 0;
  const hasAudio = hasPerPageAudio || hasGlobalAudio;
  const audioType = hasPerPageAudio ? 'per-page' : 
                   hasGlobalAudio ? 'global' : 
                   undefined;

  // Determine if book is new (created within last 7 days)
  const isNew = isNewBook(book.created_at);

  return {
    // Core identification
    id: book.id,
    title: book.title || 'Untitled',
    title_chinese: book.title_chinese,
    author: book.author,
    illustrator: book.illustrator,
    
    // Reading levels
    readingLevel: book.reading_level || 'Elementary',
    gr_level: book.gr_level,
    ar_level: book.ar_level,
    lexile_level: book.lexile_level,
    ort_level: book.ort_level,
    raz_level: book.raz_level,
    
    // Classification
    genre_primary: book.genre_primary,
    genre_secondary: book.genre_secondary,
    genre_tertiary: book.genre_tertiary,
    fiction_type: book.fiction_type,
    
    // Publication info
    publisher: book.publisher,
    isbn: book.isbn,
    publication_year: book.publication_year,
    age_range: book.age_range,
    
    // Descriptions
    description: book.description,
    description_chinese: book.description_chinese,
    
    // Content flags
    contentType: book.content_type,
    reading_level_present: book.reading_level_present ?? true,
    has_read_to_me: book.has_read_to_me ?? false,
    has_audiobook: book.has_audiobook ?? false,
    has_book_b: book.has_book_b ?? false,
    
    // Technical fields
    cover,
    contentUrl: book.content_url,
    thumbnail_url: book.thumbnail_url || undefined,
    is_active: book.is_active,
    created_at: book.created_at,
    updated_at: book.updated_at,
    
    // Content structure
    totalPages: pages.length,
    pages,
    audioFiles,
    
    // Audio configuration
    hasAudio,
    audioType,
    
    // UI-specific fields
    category,
    isNew,
    progress: 0, // TODO: Get from user progress tracking
    
    // Flexible metadata
    metadata: book.metadata
  };
}

/**
 * Maps an array of Supabase books to UI format
 */
export function mapSupabaseBooksToUI(books: SupabaseBook[]): UIBook[] {
  return books.map(mapSupabaseBookToUI);
}

/**
 * Checks if a book was created within the last 7 days
 */
function isNewBook(createdAt: string): boolean {
  try {
    const created = new Date(createdAt);
    const now = new Date();
    const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  } catch {
    return false;
  }
}

/**
 * Safely extracts a value from metadata
 */
export function getMetadataValue<T>(
  metadata: any,
  key: string,
  defaultValue: T
): T {
  try {
    if (!metadata || typeof metadata !== 'object') {
      return defaultValue;
    }
    return metadata[key] !== undefined ? metadata[key] : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Validates that a book has the minimum required fields
 */
export function isValidBook(book: any): book is SupabaseBook {
  return (
    book &&
    typeof book === 'object' &&
    typeof book.id === 'string' &&
    typeof book.title === 'string' &&
    typeof book.content_url === 'string'
  );
}
