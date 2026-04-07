// Book Import API - Connect book-admin to main app

import { supabase } from '../lib/supabase';

// Types for book-admin data
interface BookAdminBook {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  reading_level?: string;
  book_type?: string;
  pages?: Array<{
    page_number: number;
    image_url: string;
    audio_url?: string;
    text?: string;
  }>;
  audio_files?: string[];
  cover_image?: string;
  ocr_data?: any;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

// Types for main app (Supabase)
interface MainAppBook {
  id?: string;
  title: string;
  author?: string;
  reading_level?: string;
  content_type: 'pdf' | 'video' | 'audio' | 'interactive';
  content_url: string;
  thumbnail_url?: string;
  description?: string;
  metadata: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FileTransferResult {
  images: string[];
  audio: string[];
  cover: string;
}

/**
 * Transfer files from book-admin to Supabase storage
 */
export async function transferFilesToSupabase(
  bookId: string,
  files: { images: string[]; audio: string[]; cover: string }
): Promise<FileTransferResult> {
  const result: FileTransferResult = {
    images: [],
    audio: [],
    cover: ''
  };

  try {
    // Transfer cover image
    if (files.cover) {
      try {
        const coverUrl = await transferSingleFile(files.cover, bookId, 'cover');
        result.cover = coverUrl;
      } catch (error) {
        console.error('Failed to transfer cover image:', error);
      }
    }

    // Transfer images
    for (let i = 0; i < files.images.length; i++) {
      try {
        const imageUrl = await transferSingleFile(files.images[i], bookId, `page-${i + 1}`);
        result.images.push(imageUrl);
      } catch (error) {
        console.error(`Failed to transfer image ${i}:`, error);
        result.images.push(files.images[i]); // Keep original URL on failure
      }
    }

    // Transfer audio files
    for (let i = 0; i < files.audio.length; i++) {
      try {
        const audioUrl = await transferSingleFile(files.audio[i], bookId, `audio-${i + 1}`);
        result.audio.push(audioUrl);
      } catch (error) {
        console.error(`Failed to transfer audio ${i}:`, error);
        result.audio.push(files.audio[i]); // Keep original URL on failure
      }
    }

    return result;
  } catch (error) {
    console.error('Error in transferFilesToSupabase:', error);
    throw error;
  }
}

/**
 * Transfer a single file from book-admin to Supabase storage
 */
async function transferSingleFile(
  fileUrl: string,
  bookId: string,
  fileName: string
): Promise<string> {
  try {
    // Convert book-admin URL to full URL if needed
    const fullUrl = fileUrl.startsWith('http') 
      ? fileUrl 
      : `https://shuspot.com/book-admin/${fileUrl}`;

    // Download file from book-admin
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    // Determine file extension
    const ext = getFileExtension(fileUrl) || getExtensionFromMimeType(blob.type);
    const storagePath = `books/${bookId}/${fileName}${ext}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('books')
      .upload(storagePath, blob, {
        contentType: blob.type,
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('books')
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (error) {
    console.error(`Error transferring file ${fileUrl}:`, error);
    throw error;
  }
}

/**
 * Get file extension from URL
 */
function getFileExtension(url: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? `.${match[1]}` : '';
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
  };
  return mimeMap[mimeType] || '';
}

/**
 * Fetch available books from book-admin tool
 */
export async function fetchAvailableBooks(): Promise<BookAdminBook[]> {
  try {
    const response = await fetch('https://shuspot.com/book-admin/api/books', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Book-admin API not found. Make sure the book-admin backend is running.');
        return [];
      }
      throw new Error(`Failed to fetch books: ${response.statusText}`);
    }
    
    const data = await response.json();
    // Backend returns {books: [], total: N, skip: N, limit: N}
    return data.books || [];
  } catch (error) {
    console.error('Error fetching books from book-admin:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

/**
 * Get import status for books
 */
export async function getImportStatus(bookIds: string[]): Promise<Record<string, boolean>> {
  try {
    const { data: importedBooks, error } = await supabase
      .from('books')
      .select('metadata')
      .in('metadata->>original_id', bookIds);
    
    if (error) {
      throw new Error(`Error checking import status: ${error.message}`);
    }
    
    const status: Record<string, boolean> = {};
    bookIds.forEach(id => {
      status[id] = importedBooks?.some(book => book.metadata?.original_id === id) || false;
    });
    
    return status;
  } catch (error) {
    console.error('Error getting import status:', error);
    return {};
  }
}

/**
 * Map book type to section
 */
function mapBookTypeToSection(bookType?: string): string {
  if (!bookType) return 'general';
  
  const type = bookType.toLowerCase();
  
  // Map to main app sections
  if (type.includes('read to me') || type.includes('readtome')) {
    return 'read-to-me';
  } else if (type.includes('read along') || type.includes('readalong')) {
    return 'read-along';
  } else if (type.includes('i can read') || type.includes('icanread')) {
    return 'i-can-read';
  }
  
  // Default to general if no match
  return 'general';
}

/**
 * Transform book-admin book data to main app format
 */
function transformBookData(adminBook: BookAdminBook, newFileUrls: FileTransferResult): Omit<MainAppBook, 'id' | 'created_at' | 'updated_at'> {
  // Determine content type based on available data
  let contentType: 'pdf' | 'video' | 'audio' | 'interactive' = 'pdf';
  
  if (adminBook.pages && adminBook.pages.length > 0) {
    contentType = (adminBook.audio_files && adminBook.audio_files.length > 0) ? 'interactive' : 'pdf';
  } else if (adminBook.audio_files && adminBook.audio_files.length > 0) {
    contentType = 'audio';
  }
  
  // Update page URLs with new Supabase URLs
  const updatedPages = adminBook.pages?.map((page, index) => ({
    ...page,
    image_url: newFileUrls.images[index] || page.image_url,
    audio_url: page.audio_url && newFileUrls.audio[index] ? newFileUrls.audio[index] : page.audio_url
  })) || [];
  
  // Map book type to section
  const section = mapBookTypeToSection(adminBook.book_type);
  
  return {
    title: adminBook.title,
    author: adminBook.author || 'Unknown',
    reading_level: adminBook.reading_level || 'Elementary',
    content_type: contentType,
    content_url: newFileUrls.images[0] || '',
    thumbnail_url: newFileUrls.cover || newFileUrls.images[0] || undefined,
    description: `Imported from book-admin: ${adminBook.title}`,
    metadata: {
      original_id: adminBook.id,
      genre: adminBook.genre || 'General',  // Store genre in metadata
      section: section,  // Add section for routing
      pages: updatedPages,
      audio_files: newFileUrls.audio,
      ocr_data: adminBook.ocr_data || {},
      import_source: 'book-admin',
      imported_at: new Date().toISOString(),
      ...adminBook.metadata
    },
    is_active: true
  };
}

/**
 * Import a book from book-admin to main app
 */
export async function importBookToMainApp(bookId: string): Promise<{ success: boolean; bookId?: string; error?: string }> {
  try {
    console.log('Starting import for book:', bookId);
    
    // 1. Fetch book data from book-admin
    const bookResponse = await fetch(`https://shuspot.com/book-admin/api/books/${bookId}`);
    if (!bookResponse.ok) {
      throw new Error(`Failed to fetch book ${bookId}: ${bookResponse.statusText}`);
    }
    
    const adminBook: BookAdminBook = await bookResponse.json();
    console.log('Fetched book data:', adminBook);
    
    // 2. Check if book already exists in main app
    const { data: existingBooks, error: checkError } = await supabase
      .from('books')
      .select('id')
      .eq('metadata->>original_id', bookId)
      .limit(1);
    
    if (checkError) {
      throw new Error(`Error checking existing books: ${checkError.message}`);
    }
    
    const existingBookId = existingBooks && existingBooks.length > 0 ? existingBooks[0].id : null;
    const isUpdate = existingBookId !== null;
    
    console.log(isUpdate ? `Updating existing book ${existingBookId}` : 'Creating new book');
    
    // 3. Fetch file URLs from book-admin
    const filesResponse = await fetch(`https://shuspot.com/book-admin/api/books/${bookId}/files`);
    if (!filesResponse.ok) {
      throw new Error(`Failed to fetch files for book ${bookId}: ${filesResponse.statusText}`);
    }
    
    const files = await filesResponse.json();
    console.log('Fetched file URLs:', files);
    
    // 4. Check if files are already in Supabase storage (skip transfer if they are)
    console.log('Checking file URLs...');
    const filesAlreadyInSupabase = files.cover?.includes('supabase.co/storage') || 
                                    files.images?.[0]?.includes('supabase.co/storage');
    
    let newFileUrls: FileTransferResult;
    if (filesAlreadyInSupabase) {
      console.log('Files already in Supabase storage, using direct URLs');
      // Use the URLs directly without transferring
      newFileUrls = {
        cover: files.cover || '',
        images: files.images || [],
        audio: files.audio || []
      };
    } else {
      console.log('Transferring files to Supabase...');
      newFileUrls = await transferFilesToSupabase(bookId, files);
    }
    console.log('Files ready:', newFileUrls);
    
    // 5. Transform data for main app
    const transformedBook = transformBookData(adminBook, newFileUrls);
    console.log('Transformed book data:', transformedBook);
    
    // 6. Insert or update in main app database
    let resultBook;
    if (isUpdate && existingBookId) {
      // Update existing book
      const { data: updatedBook, error: updateError } = await supabase
        .from('books')
        .update({
          ...transformedBook,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBookId)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Error updating book: ${updateError.message}`);
      }
      
      resultBook = updatedBook;
      console.log('Book updated successfully:', updatedBook);
    } else {
      // Insert new book
      const { data: insertedBook, error: insertError } = await supabase
        .from('books')
        .insert([transformedBook])
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Error inserting book: ${insertError.message}`);
      }
      
      resultBook = insertedBook;
      console.log('Book imported successfully:', insertedBook);
    }
    
    return {
      success: true,
      bookId: resultBook.id
    };
    
  } catch (error) {
    console.error('Error importing book:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batch import multiple books
 */
export async function batchImportBooks(bookIds: string[]): Promise<{
  successful: string[];
  failed: Array<{ id: string; error: string }>;
}> {
  const successful: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  
  for (const bookId of bookIds) {
    try {
      const result = await importBookToMainApp(bookId);
      if (result.success) {
        successful.push(bookId);
      } else {
        failed.push({ id: bookId, error: result.error || 'Unknown error' });
      }
    } catch (error) {
      failed.push({ 
        id: bookId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  return { successful, failed };
}
