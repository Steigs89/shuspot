import { useState, useEffect, useCallback } from 'react';
import { 
  getReadingHistory, 
  getReadingStats, 
  TimePeriod, 
  ReadingHistoryEntry,
  ReadingStats 
} from '../api/readingHistory';

/**
 * Options for configuring the reading history hook
 */
export interface UseReadingHistoryOptions {
  userId: string | null;
  timePeriod?: TimePeriod;
  currentDate?: Date;
  bookType?: 'book' | 'audiobook' | 'read-to-me' | 'video';
  autoFetch?: boolean; // Whether to fetch automatically on mount (default: true)
}

/**
 * Return type for the useReadingHistory hook
 */
export interface UseReadingHistoryReturn {
  history: ReadingHistoryEntry[];
  stats: ReadingStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setTimePeriod: (period: TimePeriod) => void;
  setCurrentDate: (date: Date) => void;
  setBookType: (type?: 'book' | 'audiobook' | 'read-to-me' | 'video') => void;
  timePeriod: TimePeriod;
  currentDate: Date;
  bookType?: 'book' | 'audiobook' | 'read-to-me' | 'video';
}

/**
 * Custom hook for fetching and managing user's reading history
 * 
 * Features:
 * - Fetches reading history with time period filtering
 * - Calculates summary statistics by book type
 * - Supports date navigation for historical data
 * - Supports media type filtering
 * - Provides refetch function for manual updates
 * 
 * @param options - Configuration options
 * @returns Reading history data, stats, and control functions
 */
export function useReadingHistory(
  options: UseReadingHistoryOptions | string | null
): UseReadingHistoryReturn {
  // Handle legacy usage: useReadingHistory(userId)
  const normalizedOptions: UseReadingHistoryOptions = typeof options === 'string' || options === null
    ? { userId: options, timePeriod: 'all', autoFetch: true }
    : {
        timePeriod: 'all',
        currentDate: new Date(),
        autoFetch: true,
        ...options
      };

  const { 
    userId, 
    timePeriod: initialTimePeriod = 'all',
    currentDate: initialCurrentDate = new Date(),
    bookType: initialBookType,
    autoFetch = true
  } = normalizedOptions;

  // State
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialTimePeriod);
  const [currentDate, setCurrentDate] = useState<Date>(initialCurrentDate);
  const [bookType, setBookType] = useState<'book' | 'audiobook' | 'read-to-me' | 'video' | undefined>(initialBookType);

  /**
   * Fetch reading history and stats
   */
  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setHistory([]);
      setStats(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📚 useReadingHistory - Fetching data:', {
        userId,
        timePeriod,
        currentDate,
        bookType
      });

      // Fetch history
      const historyResult = await getReadingHistory(
        userId,
        timePeriod,
        currentDate,
        bookType
      );

      if (!historyResult.success) {
        throw new Error(historyResult.error || 'Failed to fetch reading history');
      }

      setHistory(historyResult.data || []);

      // Fetch stats
      const statsResult = await getReadingStats(
        userId,
        timePeriod,
        currentDate
      );

      if (!statsResult.success) {
        throw new Error(statsResult.error || 'Failed to fetch reading stats');
      }

      setStats(statsResult.data || null);

      console.log('✅ useReadingHistory - Data fetched successfully:', {
        historyCount: historyResult.data?.length || 0,
        stats: statsResult.data
      });

    } catch (err) {
      console.error('❌ useReadingHistory - Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reading history');
      setHistory([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [userId, timePeriod, currentDate, bookType]);

  /**
   * Refetch data manually
   */
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  return {
    history,
    stats,
    loading,
    error,
    refetch,
    setTimePeriod,
    setCurrentDate,
    setBookType,
    timePeriod,
    currentDate,
    bookType
  };
}
