import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Users, BookOpen, Star, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_image_url: string;
  reading_level: string;
  estimated_reading_time: number;
  rating_average: number;
  rating_count: number;
  categories: string[];
  content_type: string;
  is_featured: boolean;
  is_new: boolean;
}

interface Recommendation {
  book: Book;
  type: 'personalized' | 'trending' | 'similar' | 'editorial';
  reason: string;
  confidence: number;
}

interface RecommendationEngineProps {
  userId?: string;
  limit?: number;
  onBookSelect?: (book: Book) => void;
}

export default function RecommendationEngine({ 
  userId, 
  limit = 12, 
  onBookSelect 
}: RecommendationEngineProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'personalized' | 'trending' | 'new'>('all');

  useEffect(() => {
    generateRecommendations();
  }, [userId]);

  const generateRecommendations = async () => {
    try {
      setIsLoading(true);
      const recs: Recommendation[] = [];

      // Get user's reading history and preferences if logged in
      let userPreferences: any = null;
      let readingHistory: any[] = [];
      
      if (userId) {
        // Get user's reading preferences
        const { data: preferences } = await supabase
          .from('user_reading_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        userPreferences = preferences;

        // Get user's reading history
        const { data: history } = await supabase
          .from('user_book_progress')
          .select(`
            book_id,
            status,
            rating,
            books (
              categories,
              reading_level,
              content_type,
              author
            )
          `)
          .eq('user_id', userId)
          .in('status', ['completed', 'in_progress']);

        readingHistory = history || [];
      }

      // 1. Personalized Recommendations (if user is logged in)
      if (userId && userPreferences) {
        const personalizedBooks = await getPersonalizedRecommendations(userPreferences, readingHistory);
        recs.push(...personalizedBooks);
      }

      // 2. Trending Books
      const trendingBooks = await getTrendingRecommendations();
      recs.push(...trendingBooks);

      // 3. Editorial Picks (Featured Books)
      const editorialBooks = await getEditorialRecommendations();
      recs.push(...editorialBooks);

      // 4. New Releases
      const newBooks = await getNewReleases();
      recs.push(...newBooks);

      // 5. Similar Books (based on reading history)
      if (readingHistory.length > 0) {
        const similarBooks = await getSimilarRecommendations(readingHistory);
        recs.push(...similarBooks);
      }

      // Remove duplicates and limit results
      const uniqueRecs = recs.filter((rec, index, self) => 
        index === self.findIndex(r => r.book.id === rec.book.id)
      ).slice(0, limit);

      setRecommendations(uniqueRecs);

      // Save recommendations to database for analytics
      if (userId && uniqueRecs.length > 0) {
        await saveRecommendations(userId, uniqueRecs);
      }

    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPersonalizedRecommendations = async (preferences: any, history: any[]): Promise<Recommendation[]> => {
    const { data: books } = await supabase
      .from('books')
      .select('*')
      .eq('is_active', true)
      .overlaps('categories', preferences.preferred_categories || [])
      .in('reading_level', preferences.preferred_reading_levels || [])
      .order('rating_average', { ascending: false })
      .limit(4);

    return (books || []).map(book => ({
      book,
      type: 'personalized' as const,
      reason: 'Based on your reading preferences',
      confidence: 85
    }));
  };

  const getTrendingRecommendations = async (): Promise<Recommendation[]> => {
    const { data: books } = await supabase
      .from('books')
      .select('*')
      .eq('is_active', true)
      .order('popularity_score', { ascending: false })
      .limit(4);

    return (books || []).map(book => ({
      book,
      type: 'trending' as const,
      reason: 'Popular with other readers',
      confidence: 75
    }));
  };

  const getEditorialRecommendations = async (): Promise<Recommendation[]> => {
    const { data: books } = await supabase
      .from('books')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(3);

    return (books || []).map(book => ({
      book,
      type: 'editorial' as const,
      reason: 'Staff pick',
      confidence: 90
    }));
  };

  const getNewReleases = async (): Promise<Recommendation[]> => {
    const { data: books } = await supabase
      .from('books')
      .select('*')
      .eq('is_active', true)
      .eq('is_new', true)
      .order('created_at', { ascending: false })
      .limit(3);

    return (books || []).map(book => ({
      book,
      type: 'editorial' as const,
      reason: 'New release',
      confidence: 70
    }));
  };

  const getSimilarRecommendations = async (history: any[]): Promise<Recommendation[]> => {
    // Get categories from user's reading history
    const readCategories = history.flatMap(h => h.books?.categories || []);
    const uniqueCategories = [...new Set(readCategories)];

    if (uniqueCategories.length === 0) return [];

    const { data: books } = await supabase
      .from('books')
      .select('*')
      .eq('is_active', true)
      .overlaps('categories', uniqueCategories)
      .not('id', 'in', `(${history.map(h => h.book_id).join(',')})`)
      .order('rating_average', { ascending: false })
      .limit(3);

    return (books || []).map(book => ({
      book,
      type: 'similar' as const,
      reason: 'Similar to books you\'ve read',
      confidence: 80
    }));
  };

  const saveRecommendations = async (userId: string, recommendations: Recommendation[]) => {
    try {
      const recsToSave = recommendations.map(rec => ({
        user_id: userId,
        book_id: rec.book.id,
        recommendation_type: rec.type,
        confidence_score: rec.confidence,
        reason: rec.reason
      }));

      await supabase
        .from('book_recommendations')
        .upsert(recsToSave, { onConflict: 'user_id,book_id,recommendation_type' });
    } catch (error) {
      console.error('Error saving recommendations:', error);
    }
  };

  const getFilteredRecommendations = () => {
    switch (activeTab) {
      case 'personalized':
        return recommendations.filter(r => r.type === 'personalized');
      case 'trending':
        return recommendations.filter(r => r.type === 'trending');
      case 'new':
        return recommendations.filter(r => r.reason.includes('New'));
      default:
        return recommendations;
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'personalized': return <Sparkles className="w-4 h-4" />;
      case 'trending': return <TrendingUp className="w-4 h-4" />;
      case 'new': return <Star className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex space-x-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredRecommendations = getFilteredRecommendations();

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'all', label: 'All' },
          { key: 'personalized', label: 'For You' },
          { key: 'trending', label: 'Trending' },
          { key: 'new', label: 'New' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {getTabIcon(tab.key)}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Recommendations Grid */}
      {filteredRecommendations.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredRecommendations.map((rec, index) => (
            <div
              key={`${rec.book.id}-${index}`}
              className="group cursor-pointer"
              onClick={() => onBookSelect?.(rec.book)}
            >
              <div className="relative">
                {/* Book Cover */}
                <div className="aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <img
                    src={rec.book.cover_image_url || 'https://via.placeholder.com/300x400'}
                    alt={rec.book.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Recommendation Badge */}
                  <div className="absolute top-2 left-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rec.type === 'personalized' ? 'bg-purple-500 text-white' :
                      rec.type === 'trending' ? 'bg-orange-500 text-white' :
                      rec.type === 'editorial' ? 'bg-blue-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {rec.type === 'personalized' ? '✨ For You' :
                       rec.type === 'trending' ? '🔥 Trending' :
                       rec.type === 'editorial' ? '⭐ Featured' :
                       '📚 Similar'}
                    </div>
                  </div>

                  {/* Book Info Overlay */}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                    <div>
                      <h3 className="text-white font-bold text-sm leading-tight mb-1">
                        {rec.book.title}
                      </h3>
                      <p className="text-white/80 text-xs mb-2">
                        by {rec.book.author}
                      </p>
                      <p className="text-white/70 text-xs">
                        {rec.reason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-white text-xs">
                          {rec.book.rating_average.toFixed(1)}
                        </span>
                      </div>
                      
                      {rec.book.estimated_reading_time && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-white/70" />
                          <span className="text-white/70 text-xs">
                            {rec.book.estimated_reading_time}min
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Book Title */}
                <div className="mt-3">
                  <h3 className="font-medium text-gray-800 text-sm leading-tight line-clamp-2">
                    {rec.book.title}
                  </h3>
                  <p className="text-gray-600 text-xs mt-1">
                    {rec.book.author}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No recommendations found</h3>
          <p className="text-gray-600">
            {activeTab === 'personalized' 
              ? 'Start reading some books to get personalized recommendations!'
              : 'Check back later for new recommendations.'}
          </p>
        </div>
      )}
    </div>
  );
}