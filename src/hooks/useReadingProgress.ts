import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { queueProgressUpdate } from '../utils/offlineProgressQueue';

/**
 * Options for configuring the reading progress hook
 */
export interface UseReadingProgressOptions {
  bookId: string;
  bookType: 'supabase' | 'uploaded' | 'video' | 'audio';
  totalPages?: number; // For image-based books (Supabase and uploaded)
  totalDuration?: number; // For video/audio in seconds
  userId?: string; // Optional - will use current auth user if not provided
}

/**
 * Reading progress data structure
 */
export interface ReadingProgress {
  bookId: string;
  userId: string;
  currentPage: number;
  totalPages: number;
  progressPercentage: number;
  lastReadAt: string;
  timeSpentMinutes: number;
  isCompleted: boolean;
  completedAt?: string;
}

/**
 * Return type for the useReadingProgress hook
 */
export interface UseReadingProgressReturn {
  progress: ReadingProgress | null;
  updateProgress: (page: number) => Promise<void>;
  markComplete: () => Promise<void>;
  resetProgress: () => Promise<void>;
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook for managing reading progress across all book types
 * 
 * Features:
 * - Fetches initial progress from Supabase on mount
 * - Debounces progress updates (5 seconds) to reduce API calls
 * - Saves to Supabase with offline support via IndexedDB
 * - Handles completion tracking and statistics updates
 * 
 * @param options - Configuration options for the hook
 * @returns Reading progress state and update functions
 */
export function useReadingProgress(
  options: UseReadingProgressOptions
): UseReadingProgressReturn {
  const { bookId, bookType, totalPages, totalDuration, userId: providedUserId } = options;

  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs for debouncing
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<number | null>(null);

  /**
   * Get the current authenticated user ID
   */
  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    if (providedUserId) return providedUserId;

    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }, [providedUserId]);

  /**
   * Fetch initial progress from Supabase
   */
  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.log('📚 useReadingProgress - No user logged in, skipping fetch');
        setLoading(false);
        return;
      }

      console.log('📚 useReadingProgress - Fetching progress for:', {
        bookId,
        userId: currentUserId,
        bookType
      });

      const { data, error: fetchError } = await supabase
        .from('user_reading_progress')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('book_id', bookId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        console.log('✅ useReadingProgress - Progress found:', data);
        setProgress({
          bookId: data.book_id,
          userId: data.user_id,
          currentPage: data.current_page,
          totalPages: data.total_pages,
          progressPercentage: parseFloat(data.progress_percentage.toString()),
          lastReadAt: data.last_read_at,
          timeSpentMinutes: data.time_spent_minutes,
          isCompleted: data.is_completed,
          completedAt: data.completed_at || undefined
        });
      } else {
        console.log('📝 useReadingProgress - No progress found, starting fresh');
        // Initialize with zero progress
        const initialProgress: ReadingProgress = {
          bookId,
          userId: currentUserId,
          currentPage: 0,
          totalPages: totalPages || totalDuration || 0,
          progressPercentage: 0,
          lastReadAt: new Date().toISOString(),
          timeSpentMinutes: 0,
          isCompleted: false
        };
        setProgress(initialProgress);
      }

      setLoading(false);
    } catch (err) {
      console.error('❌ useReadingProgress - Error fetching progress:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch progress'));
      setLoading(false);
    }
  }, [bookId, bookType, totalPages, totalDuration, getCurrentUserId]);

  /**
   * Save progress to Supabase
   */
  const saveProgressToSupabase = useCallback(async (
    currentPage: number,
    forceComplete: boolean = false
  ): Promise<void> => {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.warn('⚠️ useReadingProgress - Cannot save progress: No user logged in');
        return;
      }

      const total = totalPages || totalDuration || 0;
      if (total === 0) {
        console.warn('⚠️ useReadingProgress - Cannot calculate progress: totalPages/totalDuration is 0');
        return;
      }

      const percentage = Math.min(100, Math.max(0, (currentPage / total) * 100));
      const isComplete = forceComplete || percentage >= 100;

      console.log('💾 useReadingProgress - Saving progress:', {
        bookId,
        currentPage,
        total,
        percentage: percentage.toFixed(2),
        isComplete
      });

      const progressData = {
        user_id: currentUserId,
        book_id: bookId,
        current_page: currentPage,
        total_pages: total,
        progress_percentage: parseFloat(percentage.toFixed(2)),
        is_completed: isComplete,
        last_read_at: new Date().toISOString(),
        completed_at: isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { data, error: saveError } = await supabase
        .from('user_reading_progress')
        .upsert(progressData, {
          onConflict: 'user_id,book_id'
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      console.log('✅ useReadingProgress - Progress saved successfully');

      // Update local state
      if (data) {
        setProgress({
          bookId: data.book_id,
          userId: data.user_id,
          currentPage: data.current_page,
          totalPages: data.total_pages,
          progressPercentage: parseFloat(data.progress_percentage.toString()),
          lastReadAt: data.last_read_at,
          timeSpentMinutes: data.time_spent_minutes,
          isCompleted: data.is_completed,
          completedAt: data.completed_at || undefined
        });
      }

      // Trigger UserStatsContext refresh on completion
      if (isComplete) {
        console.log('🎉 useReadingProgress - Book completed!');
        // Note: The component using this hook should call refreshStats from UserStatsContext
        // We'll emit a custom event that the context can listen to
        window.dispatchEvent(new CustomEvent('bookCompleted', { 
          detail: { bookId, userId: currentUserId } 
        }));
      }

    } catch (err) {
      console.error('❌ useReadingProgress - Error saving progress:', err);
      
      // Save to IndexedDB queue for offline sync
      const currentUserId = await getCurrentUserId();
      if (currentUserId) {
        const total = totalPages || totalDuration || 0;
        const percentage = Math.min(100, Math.max(0, (currentPage / total) * 100));
        const isComplete = forceComplete || percentage >= 100;
        
        try {
          await queueProgressUpdate({
            bookId,
            userId: currentUserId,
            currentPage,
            totalPages: total,
            progressPercentage: parseFloat(percentage.toFixed(2)),
            isCompleted: isComplete,
            timestamp: new Date().toISOString()
          });
          console.log('📦 useReadingProgress - Progress queued for offline sync');
        } catch (queueError) {
          console.error('❌ useReadingProgress - Failed to queue progress:', queueError);
        }
      }
      
      throw err;
    }
  }, [bookId, totalPages, totalDuration, getCurrentUserId]);

  /**
   * Update progress with debouncing (5 seconds)
   */
  const updateProgress = useCallback(async (page: number): Promise<void> => {
    // Store the pending update
    pendingUpdateRef.current = page;

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Update local state immediately for responsive UI
    if (progress) {
      const total = totalPages || totalDuration || 0;
      const percentage = total > 0 ? Math.min(100, Math.max(0, (page / total) * 100)) : 0;
      
      setProgress({
        ...progress,
        currentPage: page,
        progressPercentage: parseFloat(percentage.toFixed(2)),
        lastReadAt: new Date().toISOString()
      });
    }

    // Debounce the save operation (5 seconds)
    updateTimeoutRef.current = setTimeout(async () => {
      if (pendingUpdateRef.current !== null) {
        try {
          await saveProgressToSupabase(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to update progress'));
        }
      }
    }, 5000);
  }, [progress, totalPages, totalDuration, saveProgressToSupabase]);

  /**
   * Mark book as complete (100% progress)
   */
  const markComplete = useCallback(async (): Promise<void> => {
    try {
      const total = totalPages || totalDuration || 0;
      await saveProgressToSupabase(total, true);
      console.log('✅ useReadingProgress - Book marked as complete');
    } catch (err) {
      console.error('❌ useReadingProgress - Error marking complete:', err);
      setError(err instanceof Error ? err : new Error('Failed to mark book as complete'));
      throw err;
    }
  }, [totalPages, totalDuration, saveProgressToSupabase]);

  /**
   * Reset progress to 0%
   */
  const resetProgress = useCallback(async (): Promise<void> => {
    try {
      await saveProgressToSupabase(0, false);
      console.log('✅ useReadingProgress - Progress reset');
    } catch (err) {
      console.error('❌ useReadingProgress - Error resetting progress:', err);
      setError(err instanceof Error ? err : new Error('Failed to reset progress'));
      throw err;
    }
  }, [saveProgressToSupabase]);

  // Fetch initial progress on mount
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Save any pending updates when component unmounts
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      // Save immediately on unmount if there's a pending update
      if (pendingUpdateRef.current !== null) {
        saveProgressToSupabase(pendingUpdateRef.current).catch(console.error);
      }
    };
  }, [saveProgressToSupabase]);

  return {
    progress,
    updateProgress,
    markComplete,
    resetProgress,
    loading,
    error
  };
}
