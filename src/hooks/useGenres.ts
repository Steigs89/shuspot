import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Genre } from '../types/library';
import { GENRES_PER_PAGE } from '../constants/library';

interface UseGenresOptions {
  popular?: boolean;
  limit?: number;
  offset?: number;
}

interface UseGenresReturn {
  genres: Genre[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useGenres(options: UseGenresOptions = {}): UseGenresReturn {
  const { popular = false, limit = GENRES_PER_PAGE } = options;
  
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchGenres = useCallback(async (currentOffset: number, append: boolean = false) => {
    console.log('🎬 useGenres - Starting fetch...');
    setLoading(true);
    setError(null);

    try {
      // Hardcoded genre list (from CategoryDropdown) until database is populated
      const hardcodedGenres = [
        "Animals & Their Habitats",
        "Backyard Animals", 
        "Baby Animals",
        "Sharks, Big Cats, Birds, Snakes, Bugs",
        "Cats, Dogs, Pets, Horses",
        "Dinosaurs, Fish",
        "Plants & Their Environments",
        "Weather, Spring, Winter",
        "Art, Music, Makerspace",
        "Bodies in Motion, Five Senses",
        "Healthy Habits",
        "Addition & Subtraction, Counting",
        "Measuring, Telling Time",
        "Learning to Read",
        "Shapes, Colors, Letters & Numbers",
        "Biography, History",
        "Black History Month, Women's History Month",
        "Native Americans",
        "Our Neighborhood",
        "Jobs Around Town",
        "Economics: Goods & Services",
        "American Symbols",
        "Adventure, Comic Books",
        "Fairy Tales, Princesses",
        "Unicorns, Mythical Creatures",
        "Superheroes",
        "Space",
        "Sports, Soccer",
        "Airplanes",
        "Boats & Ships",
        "Cars & Trucks",
        "Cars, Trucks & Trains",
        "Trains",
        "Bravery, Bullying",
        "Friendship, Kindness",
        "Families",
        "Grief & Loss",
        "Growth Mindset",
        "Identifying Emotions",
        "Mindfulness",
        "Laugh Out Loud"
      ];

      const allGenres: Genre[] = hardcodedGenres.map((name, index) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        isPopular: index < 10, // First 10 are popular
        bookCount: 0
      }));

      console.log('🏷️ useGenres - Using hardcoded genres:', allGenres.length);
      
      // Apply pagination
      const paginatedGenres = allGenres.slice(currentOffset, currentOffset + limit);
      
      console.log('📄 useGenres - Paginated genres:', paginatedGenres.length);
      
      if (append) {
        setGenres(prev => [...prev, ...paginatedGenres]);
      } else {
        setGenres(paginatedGenres);
      }

      setHasMore(currentOffset + limit < allGenres.length);
    } catch (err) {
      console.error('❌ useGenres - Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch genres'));
    } finally {
      setLoading(false);
      console.log('✅ useGenres - Fetch complete');
    }
  }, [limit, popular]);

  useEffect(() => {
    fetchGenres(0, false);
  }, [fetchGenres]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const newOffset = offset + limit;
      setOffset(newOffset);
      fetchGenres(newOffset, true);
    }
  }, [loading, hasMore, offset, limit, fetchGenres]);

  const refresh = useCallback(() => {
    setOffset(0);
    fetchGenres(0, false);
  }, [fetchGenres]);

  return {
    genres,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
}
