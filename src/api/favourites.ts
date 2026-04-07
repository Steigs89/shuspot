// Favourites API - Add, remove, and retrieve user's favourite books

import { supabase } from '../lib/supabase';

/**
 * Favourite book entry from database
 */
export interface FavouriteEntry {
  id: string;
  userId: string;
  bookId: string;
  title: string;
  author?: string;
  readingLevel?: string;
  contentType?: string;
  thumbnailUrl?: string;
  description?: string;
  addedAt: string;
}

/**
 * Add a book to user's favourites
 * 
 * @param userId - User ID
 * @param bookId - Book ID to add to favourites
 * @returns Success status and created entry ID
 */
export async function addFavourite(
  userId: string,
  bookId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log('⭐ Adding book to favourites:', { userId, bookId });

    // Validate required fields
    if (!userId || !bookId) {
      throw new Error('Missing required fields: userId and bookId are required');
    }

    // Insert into database
    const { data, error } = await supabase
      .from('user_favourites')
      .insert([{
        user_id: userId,
        book_id: bookId
      }])
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate entry error
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Book is already in favourites'
        };
      }
      throw error;
    }

    console.log('✅ Book added to favourites successfully:', data.id);

    return {
      success: true,
      id: data.id
    };

  } catch (error) {
    console.error('❌ Error adding book to favourites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Remove a book from user's favourites
 * 
 * @param userId - User ID
 * @param bookId - Book ID to remove from favourites
 * @returns Success status
 */
export async function removeFavourite(
  userId: string,
  bookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Removing book from favourites:', { userId, bookId });

    // Validate required fields
    if (!userId || !bookId) {
      throw new Error('Missing required fields: userId and bookId are required');
    }

    const { error } = await supabase
      .from('user_favourites')
      .delete()
      .eq('user_id', userId)
      .eq('book_id', bookId);

    if (error) {
      throw error;
    }

    console.log('✅ Book removed from favourites successfully');

    return { success: true };

  } catch (error) {
    console.error('❌ Error removing book from favourites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if a book is in user's favourites
 * 
 * @param userId - User ID
 * @param bookId - Book ID to check
 * @returns Whether the book is favourited
 */
export async function isFavourite(
  userId: string,
  bookId: string
): Promise<{ success: boolean; isFavourite?: boolean; error?: string }> {
  try {
    console.log('🔍 Checking if book is favourited:', { userId, bookId });

    // Validate required fields
    if (!userId || !bookId) {
      throw new Error('Missing required fields: userId and bookId are required');
    }

    const { data, error } = await supabase
      .from('user_favourites')
      .select('id')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const isFav = data !== null;
    console.log(`✅ Book is ${isFav ? '' : 'not '}favourited`);

    return {
      success: true,
      isFavourite: isFav
    };

  } catch (error) {
    console.error('❌ Error checking favourite status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Toggle a book's favourite status
 * 
 * @param userId - User ID
 * @param bookId - Book ID to toggle
 * @returns Success status and new favourite state
 */
export async function toggleFavourite(
  userId: string,
  bookId: string
): Promise<{ success: boolean; isFavourite?: boolean; error?: string }> {
  try {
    console.log('🔄 Toggling favourite status:', { userId, bookId });

    // Check current status
    const checkResult = await isFavourite(userId, bookId);
    
    if (!checkResult.success) {
      throw new Error(checkResult.error || 'Failed to check favourite status');
    }

    // Toggle based on current status
    if (checkResult.isFavourite) {
      const removeResult = await removeFavourite(userId, bookId);
      if (!removeResult.success) {
        throw new Error(removeResult.error || 'Failed to remove favourite');
      }
      return {
        success: true,
        isFavourite: false
      };
    } else {
      const addResult = await addFavourite(userId, bookId);
      if (!addResult.success) {
        throw new Error(addResult.error || 'Failed to add favourite');
      }
      return {
        success: true,
        isFavourite: true
      };
    }

  } catch (error) {
    console.error('❌ Error toggling favourite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all favourites for a user
 * Uses database function for efficient retrieval with book details
 * 
 * @param userId - User ID
 * @returns Array of favourite entries with book details
 */
export async function getFavourites(
  userId: string
): Promise<{ success: boolean; data?: FavouriteEntry[]; error?: string }> {
  try {
    console.log('📚 Fetching favourites for user:', userId);

    // Validate required field
    if (!userId) {
      throw new Error('Missing required field: userId is required');
    }

    // Call database function to get favourites with book details
    const { data, error } = await supabase.rpc('get_user_favourites', {
      p_user_id: userId
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Fetched ${data.length} favourites`);

    // Transform to match interface
    const favourites: FavouriteEntry[] = data.map((entry: any) => ({
      id: entry.favourite_id,
      userId: userId,
      bookId: entry.book_id,
      title: entry.title,
      author: entry.author,
      readingLevel: entry.reading_level,
      contentType: entry.content_type,
      thumbnailUrl: entry.thumbnail_url,
      description: entry.description,
      addedAt: entry.added_at
    }));

    return {
      success: true,
      data: favourites
    };

  } catch (error) {
    console.error('❌ Error fetching favourites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get favourite count for a user
 * 
 * @param userId - User ID
 * @returns Count of favourited books
 */
export async function getFavouriteCount(
  userId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    console.log('🔢 Getting favourite count for user:', userId);

    // Validate required field
    if (!userId) {
      throw new Error('Missing required field: userId is required');
    }

    const { count, error } = await supabase
      .from('user_favourites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    console.log(`✅ User has ${count || 0} favourites`);

    return {
      success: true,
      count: count || 0
    };

  } catch (error) {
    console.error('❌ Error getting favourite count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clear all favourites for a user
 * 
 * @param userId - User ID
 * @returns Success status with count of deleted entries
 */
export async function clearFavourites(
  userId: string
): Promise<{ success: boolean; deleted?: number; error?: string }> {
  try {
    console.log('🗑️ Clearing all favourites for user:', userId);

    // Validate required field
    if (!userId) {
      throw new Error('Missing required field: userId is required');
    }

    // First count how many entries will be deleted
    const { count } = await supabase
      .from('user_favourites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Delete all entries
    const { error } = await supabase
      .from('user_favourites')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    console.log(`✅ Cleared ${count || 0} favourites`);

    return {
      success: true,
      deleted: count || 0
    };

  } catch (error) {
    console.error('❌ Error clearing favourites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get favourite status for multiple books at once
 * Useful for displaying favourite icons in book lists
 * 
 * @param userId - User ID
 * @param bookIds - Array of book IDs to check
 * @returns Map of book IDs to favourite status
 */
export async function getFavouriteStatusBatch(
  userId: string,
  bookIds: string[]
): Promise<{ success: boolean; data?: Map<string, boolean>; error?: string }> {
  try {
    console.log('🔍 Checking favourite status for multiple books:', { userId, count: bookIds.length });

    // Validate required fields
    if (!userId || !bookIds || bookIds.length === 0) {
      return {
        success: true,
        data: new Map()
      };
    }

    const { data, error } = await supabase
      .from('user_favourites')
      .select('book_id')
      .eq('user_id', userId)
      .in('book_id', bookIds);

    if (error) {
      throw error;
    }

    // Create a map of book_id -> true for favourited books
    const favouriteMap = new Map<string, boolean>();
    
    // Initialize all books as not favourited
    bookIds.forEach(id => favouriteMap.set(id, false));
    
    // Mark favourited books as true
    data.forEach(entry => favouriteMap.set(entry.book_id, true));

    console.log(`✅ Checked ${bookIds.length} books, ${data.length} are favourited`);

    return {
      success: true,
      data: favouriteMap
    };

  } catch (error) {
    console.error('❌ Error checking batch favourite status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
