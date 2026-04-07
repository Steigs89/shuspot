// Reading History API - Record and retrieve reading activity

import { supabase } from '../lib/supabase';

/**
 * Reading activity data for recording
 */
export interface ReadingActivity {
  userId: string;
  bookId: string;
  bookTitle: string;
  bookType: 'book' | 'audiobook' | 'read-to-me' | 'video';
  readingLevel?: number; // AR reading level
  pagesRead?: number; // For books and read-to-me
  minutesListened?: number; // For audiobooks
  genre?: string; // Primary genre
  timestamp?: string; // Optional - defaults to now
}

/**
 * Reading history entry from database
 */
export interface ReadingHistoryEntry {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  bookType: 'book' | 'audiobook' | 'read-to-me' | 'video';
  readingLevel?: number;
  pagesRead: number;
  minutesListened: number;
  genre?: string;
  timestamp: string;
  createdAt: string;
  coverUrl?: string; // Book cover URL from storage
  progressPercentage?: number; // Progress percentage at time of activity (0-100)
  currentPage?: number; // Current page at time of activity
  totalPages?: number; // Total pages of the book
}

/**
 * Time period for filtering history
 */
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all';

/**
 * Summary statistics for a time period
 */
export interface ReadingStats {
  books: {
    totalPages: number;
    avgReadingLevel: number;
    uniqueBooksRead: number; // Count of unique books read
  };
  audiobooks: {
    totalMinutes: number;
    avgReadingLevel: number;
    uniqueAudiobooksListened: number; // Count of unique audiobooks listened to
  };
  readToMe: {
    totalPages: number;
    avgReadingLevel: number;
    uniqueBooksRead: number; // Count of unique read-to-me books
  };
  videos: {
    totalVideosWatched: number; // Count of unique videos watched
    totalMinutesWatched: number; // Total minutes of video watched
  };
  voiceCoach: {
    sessionsCompleted: number; // Count of voice coach sessions
    totalMinutes: number; // Total minutes practiced
    avgScore: number; // Average score across sessions
  };
}

/**
 * Record a reading activity
 * 
 * @param activity - Reading activity data
 * @returns Success status and created entry ID
 */
export async function recordReadingActivity(
  activity: ReadingActivity
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log('📝 Recording reading activity:', activity);

    // Validate required fields
    if (!activity.userId || !activity.bookId || !activity.bookTitle || !activity.bookType) {
      const error = 'Missing required fields: userId, bookId, bookTitle, and bookType are required';
      console.error('❌ Validation error:', error);
      throw new Error(error);
    }

    // Validate book type
    const validBookTypes = ['book', 'audiobook', 'read-to-me', 'video'];
    if (!validBookTypes.includes(activity.bookType)) {
      const error = `Invalid book type: ${activity.bookType}. Must be one of: ${validBookTypes.join(', ')}`;
      console.error('❌ Validation error:', error);
      throw new Error(error);
    }

    // Prepare data for insertion
    const historyData = {
      user_id: activity.userId,
      book_id: activity.bookId,
      book_title: activity.bookTitle,
      book_type: activity.bookType,
      reading_level: activity.readingLevel || null,
      pages_read: activity.pagesRead || 0,
      minutes_listened: activity.minutesListened || 0,
      genre: activity.genre || null,
      timestamp: activity.timestamp || new Date().toISOString()
    };

    console.log('📤 Inserting into database:', historyData);

    // Insert into database
    const { data, error } = await supabase
      .from('reading_history')
      .insert([historyData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ Reading activity recorded successfully:', data.id);

    return {
      success: true,
      id: data.id
    };

  } catch (error) {
    console.error('❌ Error recording reading activity:', error);
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Record multiple reading activities in batch
 * 
 * @param activities - Array of reading activities
 * @returns Success status with counts
 */
export async function batchRecordReadingActivities(
  activities: ReadingActivity[]
): Promise<{ success: boolean; recorded: number; failed: number; error?: string }> {
  try {
    console.log(`📝 Recording ${activities.length} reading activities in batch`);

    if (activities.length === 0) {
      return { success: true, recorded: 0, failed: 0 };
    }

    // Prepare all data for insertion
    const historyData = activities.map(activity => ({
      user_id: activity.userId,
      book_id: activity.bookId,
      book_title: activity.bookTitle,
      book_type: activity.bookType,
      reading_level: activity.readingLevel || null,
      pages_read: activity.pagesRead || 0,
      minutes_listened: activity.minutesListened || 0,
      genre: activity.genre || null,
      timestamp: activity.timestamp || new Date().toISOString()
    }));

    // Insert all at once
    const { data, error } = await supabase
      .from('reading_history')
      .insert(historyData)
      .select();

    if (error) {
      throw error;
    }

    console.log(`✅ Batch recorded ${data.length} activities successfully`);

    return {
      success: true,
      recorded: data.length,
      failed: 0
    };

  } catch (error) {
    console.error('❌ Error batch recording activities:', error);
    return {
      success: false,
      recorded: 0,
      failed: activities.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get date range for a time period
 * 
 * @param period - Time period
 * @param date - Reference date (defaults to now)
 * @returns Start and end dates
 */
export function getDateRange(period: TimePeriod, date: Date = new Date()): { start: Date; end: Date } {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  let start = new Date(date);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'daily':
      // Already set to start of day
      break;

    case 'weekly':
      // Go back to start of week (Sunday)
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      break;

    case 'monthly':
      // Go back to start of month
      start.setDate(1);
      break;

    case 'all':
      // Set to a very early date
      start = new Date('2020-01-01');
      break;
  }

  return { start, end };
}

/**
 * Get reading history for a user and time period
 * 
 * @param userId - User ID
 * @param period - Time period filter
 * @param date - Reference date (defaults to now)
 * @param bookType - Optional filter by book type
 * @returns Array of history entries
 */
export async function getReadingHistory(
  userId: string,
  period: TimePeriod = 'all',
  date: Date = new Date(),
  bookType?: 'book' | 'audiobook' | 'read-to-me' | 'video'
): Promise<{ success: boolean; data?: ReadingHistoryEntry[]; error?: string }> {
  try {
    console.log('📚 Fetching reading history:', { userId, period, date, bookType });

    const { start, end } = getDateRange(period, date);

    // Query reading_history without joining books table
    let query = supabase
      .from('reading_history')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp', { ascending: false });

    // Add book type filter if specified
    if (bookType) {
      query = query.eq('book_type', bookType);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    console.log(`✅ Fetched ${data.length} history entries`);

    // Fetch progress data for all unique book IDs
    const bookIds = [...new Set(data.map(entry => entry.book_id))];
    
    // Fetch book covers from books table (optional - may not exist for all books)
    let booksData: any[] = [];
    if (bookIds.length > 0) {
      const { data: fetchedBooks, error: booksError } = await supabase
        .from('books')
        .select('id, thumbnail_url, content_url')
        .in('id', bookIds);
      
      if (!booksError && fetchedBooks) {
        booksData = fetchedBooks;
      }
    }

    // Create a map of book_id to book data for quick lookup
    const booksMap = new Map(
      booksData.map(b => [b.id, b])
    );

    // Fetch progress data
    const { data: progressData, error: progressError } = await supabase
      .from('user_reading_progress')
      .select('book_id, progress_percentage, current_page, total_pages')
      .eq('user_id', userId)
      .in('book_id', bookIds);

    if (progressError) {
      console.warn('⚠️ Could not fetch progress data:', progressError);
    }

    // Create a map of book_id to progress data for quick lookup
    const progressMap = new Map(
      (progressData || []).map(p => [p.book_id, p])
    );

    // Transform to match interface
    const entries: ReadingHistoryEntry[] = data.map(entry => {
      const progress = progressMap.get(entry.book_id);
      const bookData = booksMap.get(entry.book_id);
      
      return {
        id: entry.id,
        userId: entry.user_id,
        bookId: entry.book_id,
        bookTitle: entry.book_title,
        bookType: entry.book_type,
        readingLevel: entry.reading_level,
        pagesRead: entry.pages_read,
        minutesListened: entry.minutes_listened,
        genre: entry.genre,
        timestamp: entry.timestamp,
        createdAt: entry.created_at,
        // Use thumbnail_url if available, otherwise fall back to content_url
        coverUrl: bookData?.thumbnail_url || bookData?.content_url || '',
        // Add progress data from user_reading_progress
        progressPercentage: progress?.progress_percentage || undefined,
        currentPage: progress?.current_page || undefined,
        totalPages: progress?.total_pages || undefined
      };
    });

    return {
      success: true,
      data: entries
    };

  } catch (error) {
    console.error('❌ Error fetching reading history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get summary statistics for a user and time period
 * Uses database function for efficient calculation
 * 
 * @param userId - User ID
 * @param period - Time period filter
 * @param date - Reference date (defaults to now)
 * @returns Summary statistics
 */
export async function getReadingStats(
  userId: string,
  period: TimePeriod = 'all',
  date: Date = new Date()
): Promise<{ success: boolean; data?: ReadingStats; error?: string }> {
  try {
    console.log('📊 Calculating reading stats:', { userId, period, date });

    const { start, end } = getDateRange(period, date);

    console.log('📅 Date range:', { start: start.toISOString(), end: end.toISOString() });

    // Call database function to calculate statistics efficiently
    const { data, error } = await supabase.rpc('get_reading_stats', {
      p_user_id: userId,
      p_start_date: start.toISOString(),
      p_end_date: end.toISOString()
    });

    if (error) {
      console.error('❌ Database function error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('📊 Raw stats from database:', data);

    // Transform database result to match ReadingStats interface
    const stats: ReadingStats = {
      books: {
        totalPages: data?.books?.totalPages || 0,
        avgReadingLevel: data?.books?.avgReadingLevel || 0,
        uniqueBooksRead: data?.books?.uniqueBooksRead || 0
      },
      audiobooks: {
        totalMinutes: data?.audiobooks?.totalMinutes || 0,
        avgReadingLevel: data?.audiobooks?.avgReadingLevel || 0,
        uniqueAudiobooksListened: data?.audiobooks?.uniqueAudiobooksListened || 0
      },
      readToMe: {
        totalPages: data?.readToMe?.totalPages || 0,
        avgReadingLevel: data?.readToMe?.avgReadingLevel || 0,
        uniqueBooksRead: data?.readToMe?.uniqueBooksRead || 0
      },
      videos: {
        totalVideosWatched: data?.videos?.totalVideosWatched || 0,
        totalMinutesWatched: data?.videos?.totalMinutesWatched || 0
      },
      voiceCoach: {
        sessionsCompleted: data?.voiceCoach?.sessionsCompleted || 0,
        totalMinutes: data?.voiceCoach?.totalMinutes || 0,
        avgScore: data?.voiceCoach?.avgScore || 0
      }
    };

    console.log('✅ Stats calculated:', stats);

    return {
      success: true,
      data: stats
    };

  } catch (error) {
    console.error('❌ Error calculating reading stats:', error);
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a reading history entry
 * 
 * @param entryId - History entry ID
 * @param userId - User ID (for verification)
 * @returns Success status
 */
export async function deleteReadingHistoryEntry(
  entryId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Deleting reading history entry:', entryId);

    const { error } = await supabase
      .from('reading_history')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId); // Ensure user can only delete their own entries

    if (error) {
      throw error;
    }

    console.log('✅ History entry deleted successfully');

    return { success: true };

  } catch (error) {
    console.error('❌ Error deleting history entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clear all reading history for a user
 * 
 * @param userId - User ID
 * @returns Success status with count of deleted entries
 */
export async function clearReadingHistory(
  userId: string
): Promise<{ success: boolean; deleted?: number; error?: string }> {
  try {
    console.log('🗑️ Clearing all reading history for user:', userId);

    // First count how many entries will be deleted
    const { count } = await supabase
      .from('reading_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Delete all entries
    const { error } = await supabase
      .from('reading_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    console.log(`✅ Cleared ${count || 0} history entries`);

    return {
      success: true,
      deleted: count || 0
    };

  } catch (error) {
    console.error('❌ Error clearing reading history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
