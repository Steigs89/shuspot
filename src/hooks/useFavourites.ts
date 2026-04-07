import { useState, useEffect, useCallback } from 'react';
import { 
  getFavourites,
  addFavourite,
  removeFavourite,
  toggleFavourite,
  isFavourite,
  getFavouriteCount,
  FavouriteEntry
} from '../api/favourites';

/**
 * Options for configuring the favourites hook
 */
export interface UseFavouritesOptions {
  userId: string | null;
  autoFetch?: boolean; // Whether to fetch automatically on mount (default: true)
}

/**
 * Return type for the useFavourites hook
 */
export interface UseFavouritesReturn {
  favourites: FavouriteEntry[];
  count: number;
  loading: boolean;
  error: string | null;
  addToFavourites: (bookId: string) => Promise<boolean>;
  removeFromFavourites: (bookId: string) => Promise<boolean>;
  toggleFavouriteStatus: (bookId: string) => Promise<boolean>;
  checkIsFavourite: (bookId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing user's favourite books
 * 
 * Features:
 * - Fetches user's favourite books with full details
 * - Provides functions to add/remove favourites
 * - Supports toggling favourite status
 * - Tracks favourite count
 * - Provides refetch function for manual updates
 * 
 * @param options - Configuration options or userId string
 * @returns Favourites data and control functions
 */
export function useFavourites(
  options: UseFavouritesOptions | string | null
): UseFavouritesReturn {
  // Handle legacy usage: useFavourites(userId)
  const normalizedOptions: UseFavouritesOptions = typeof options === 'string' || options === null
    ? { userId: options, autoFetch: true }
    : { autoFetch: true, ...options };

  const { userId, autoFetch = true } = normalizedOptions;

  // State
  const [favourites, setFavourites] = useState<FavouriteEntry[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch favourites from database
   */
  const fetchFavourites = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setFavourites([]);
      setCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('⭐ useFavourites - Fetching favourites for user:', userId);

      const result = await getFavourites(userId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch favourites');
      }

      setFavourites(result.data || []);
      setCount(result.data?.length || 0);

      console.log('✅ useFavourites - Favourites fetched successfully:', {
        count: result.data?.length || 0
      });

    } catch (err) {
      console.error('❌ useFavourites - Error fetching favourites:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch favourites');
      setFavourites([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Add a book to favourites
   */
  const addToFavourites = useCallback(async (bookId: string): Promise<boolean> => {
    if (!userId) {
      console.error('❌ Cannot add favourite: No user ID');
      return false;
    }

    try {
      const result = await addFavourite(userId, bookId);
      
      if (result.success) {
        // Refetch to update the list
        await fetchFavourites();
        return true;
      } else {
        setError(result.error || 'Failed to add favourite');
        return false;
      }
    } catch (err) {
      console.error('❌ Error adding favourite:', err);
      setError(err instanceof Error ? err.message : 'Failed to add favourite');
      return false;
    }
  }, [userId, fetchFavourites]);

  /**
   * Remove a book from favourites
   */
  const removeFromFavourites = useCallback(async (bookId: string): Promise<boolean> => {
    if (!userId) {
      console.error('❌ Cannot remove favourite: No user ID');
      return false;
    }

    try {
      const result = await removeFavourite(userId, bookId);
      
      if (result.success) {
        // Refetch to update the list
        await fetchFavourites();
        return true;
      } else {
        setError(result.error || 'Failed to remove favourite');
        return false;
      }
    } catch (err) {
      console.error('❌ Error removing favourite:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove favourite');
      return false;
    }
  }, [userId, fetchFavourites]);

  /**
   * Toggle favourite status for a book
   */
  const toggleFavouriteStatus = useCallback(async (bookId: string): Promise<boolean> => {
    if (!userId) {
      console.error('❌ Cannot toggle favourite: No user ID');
      return false;
    }

    try {
      const result = await toggleFavourite(userId, bookId);
      
      if (result.success) {
        // Refetch to update the list
        await fetchFavourites();
        return result.isFavourite || false;
      } else {
        setError(result.error || 'Failed to toggle favourite');
        return false;
      }
    } catch (err) {
      console.error('❌ Error toggling favourite:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle favourite');
      return false;
    }
  }, [userId, fetchFavourites]);

  /**
   * Check if a book is favourited
   */
  const checkIsFavourite = useCallback(async (bookId: string): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    try {
      const result = await isFavourite(userId, bookId);
      return result.isFavourite || false;
    } catch (err) {
      console.error('❌ Error checking favourite status:', err);
      return false;
    }
  }, [userId]);

  /**
   * Refetch favourites manually
   */
  const refetch = useCallback(async () => {
    await fetchFavourites();
  }, [fetchFavourites]);

  // Fetch favourites when userId changes
  useEffect(() => {
    if (autoFetch) {
      fetchFavourites();
    }
  }, [fetchFavourites, autoFetch]);

  return {
    favourites,
    count,
    loading,
    error,
    addToFavourites,
    removeFromFavourites,
    toggleFavouriteStatus,
    checkIsFavourite,
    refetch
  };
}
