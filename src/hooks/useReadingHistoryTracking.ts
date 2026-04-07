import { useEffect, useRef, useCallback } from 'react';
import { recordReadingActivity, ReadingActivity } from '../api/readingHistory';

/**
 * Options for configuring reading history tracking
 */
export interface UseReadingHistoryTrackingOptions {
  bookId: string;
  bookTitle: string;
  bookType: 'book' | 'audiobook' | 'read-to-me';
  userId: string;
  readingLevel?: number;
  genre?: string;
  enabled?: boolean; // Allow disabling tracking
}

/**
 * Return type for the useReadingHistoryTracking hook
 */
export interface UseReadingHistoryTrackingReturn {
  trackPageRead: (pageNumber: number) => void;
  trackTimeListened: (minutes: number) => void;
  flushTracking: () => Promise<void>;
}

/**
 * Custom hook for tracking reading activity in book readers
 * 
 * Features:
 * - Tracks pages read for books and read-to-me books
 * - Tracks time listened for audiobooks
 * - Batches updates to reduce API calls
 * - Auto-flushes on unmount
 * 
 * @param options - Configuration options
 * @returns Tracking functions
 */
export function useReadingHistoryTracking(
  options: UseReadingHistoryTrackingOptions
): UseReadingHistoryTrackingReturn {
  const {
    bookId,
    bookTitle,
    bookType,
    userId,
    readingLevel,
    genre,
    enabled = true
  } = options;

  // Track accumulated data
  const pagesReadRef = useRef<Set<number>>(new Set());
  const minutesListenedRef = useRef<number>(0);
  const lastFlushRef = useRef<Date>(new Date());
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Flush accumulated tracking data to the API
   */
  const flushTracking = useCallback(async (): Promise<void> => {
    if (!enabled || !userId) {
      console.log(`⏭️ Skipping flush - enabled: ${enabled}, userId: ${userId ? 'present' : 'missing'}`);
      return;
    }

    const pagesRead = pagesReadRef.current.size;
    const minutesListened = minutesListenedRef.current;

    // Only record if there's actual activity
    if (pagesRead === 0 && minutesListened === 0) {
      return;
    }

    console.log('📊 Flushing reading history:', {
      bookId,
      bookTitle,
      pagesRead,
      minutesListened
    });

    const activity: ReadingActivity = {
      userId,
      bookId,
      bookTitle,
      bookType,
      readingLevel,
      genre,
      pagesRead: bookType !== 'audiobook' ? pagesRead : undefined,
      minutesListened: bookType === 'audiobook' ? minutesListened : undefined,
      timestamp: new Date().toISOString()
    };

    const result = await recordReadingActivity(activity);

    if (result.success) {
      console.log('✅ Reading history recorded successfully');
      // Reset counters after successful flush
      pagesReadRef.current.clear();
      minutesListenedRef.current = 0;
      lastFlushRef.current = new Date();
    } else {
      console.error('❌ Failed to record reading history:', result.error);
    }
  }, [enabled, bookId, bookTitle, bookType, userId, readingLevel, genre]);

  /**
   * Track a page being read
   */
  const trackPageRead = useCallback((pageNumber: number): void => {
    if (!enabled || !userId) {
      console.log(`⏭️ Skipping page tracking - enabled: ${enabled}, userId: ${userId ? 'present' : 'missing'}`);
      return;
    }
    if (bookType === 'audiobook') {
      console.warn('⚠️ trackPageRead called on audiobook - use trackTimeListened instead');
      return;
    }

    pagesReadRef.current.add(pageNumber);
    console.log(`📖 Page ${pageNumber} tracked for book "${bookTitle}" (total unique pages: ${pagesReadRef.current.size})`);
  }, [enabled, bookType, userId, bookTitle]);

  /**
   * Track time listened (for audiobooks)
   */
  const trackTimeListened = useCallback((minutes: number): void => {
    if (!enabled) return;
    if (bookType !== 'audiobook') {
      console.warn('⚠️ trackTimeListened called on non-audiobook - use trackPageRead instead');
      return;
    }

    minutesListenedRef.current += minutes;
    console.log(`🎧 ${minutes} minutes tracked (total: ${minutesListenedRef.current})`);
  }, [enabled, bookType]);

  /**
   * Set up periodic flushing (every 2 minutes for more responsive history updates)
   */
  useEffect(() => {
    if (!enabled) return;

    flushIntervalRef.current = setInterval(() => {
      const timeSinceLastFlush = Date.now() - lastFlushRef.current.getTime();
      const twoMinutes = 2 * 60 * 1000; // Changed from 5 to 2 minutes

      // Only flush if there's been activity and it's been at least 2 minutes
      if (timeSinceLastFlush >= twoMinutes) {
        flushTracking();
      }
    }, 30 * 1000); // Check every 30 seconds (more frequent checks)

    return () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
    };
  }, [enabled, flushTracking]);

  /**
   * Flush on unmount
   */
  useEffect(() => {
    return () => {
      // Flush immediately on unmount
      flushTracking();
    };
  }, [flushTracking]);

  /**
   * Flush when page visibility changes (user switches tabs or minimizes window)
   * This ensures data is saved when user navigates away
   */
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away from the tab - flush immediately
        console.log('📊 Page hidden - flushing reading history');
        flushTracking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, flushTracking]);

  return {
    trackPageRead,
    trackTimeListened,
    flushTracking
  };
}
