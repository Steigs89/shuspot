import { useState, useEffect } from 'react';
import { BookOpen, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/LanguageContext';
import { ProgressBarInline } from './ProgressBar';
import EpicNavigationWrapper from './EpicNavigationWrapper';
import type { Book } from '../hooks/useBooks';
import '../styles/EpicNavigation.css';

export interface ContinueReadingSectionProps {
  bookType?: 'all' | 'read-to-me' | 'voice-coach' | 'books' | 'videos' | 'audiobooks';
  onBookClick: (bookId: string, currentPage?: number) => void;
  className?: string;
}

interface BookWithProgress extends Book {
  currentPage: number;
  progressPercentage: number;
  lastReadAt: string;
  timeSpentMinutes: number;
}

/**
 * Continue Reading Section Component
 * 
 * Displays books that are in progress (0% < progress < 100%)
 * Features:
 * - Horizontal scrollable carousel
 * - Progress bars on each book
 * - Last read timestamp
 * - Navigation arrows
 * - Auto-hides when no books in progress
 */
export default function ContinueReadingSection({
  bookType = 'all',
  onBookClick,
  className = ''
}: ContinueReadingSectionProps) {
  const { t } = useTranslation();
  const [booksInProgress, setBooksInProgress] = useState<BookWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch books with progress from Supabase
   */
  useEffect(() => {
    async function fetchBooksInProgress() {
      try {
        setLoading(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('📚 ContinueReading - No user logged in');
          setLoading(false);
          return;
        }

        console.log('📚 ContinueReading - Fetching progress for user:', user.id);

        // Fetch progress records (in progress only: not completed, progress > 0)
        const { data: progressData, error: progressError } = await supabase
          .from('user_reading_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .gt('progress_percentage', 0)
          .order('last_read_at', { ascending: false })
          .limit(20);

        if (progressError) {
          console.error('❌ ContinueReading - Error fetching progress:', progressError);
          setLoading(false);
          return;
        }

        if (!progressData || progressData.length === 0) {
          console.log('📚 ContinueReading - No books in progress');
          setBooksInProgress([]);
          setLoading(false);
          return;
        }

        console.log(`📚 ContinueReading - Found ${progressData.length} books in progress`);

        // Fetch book details for each progress record
        const bookIds = progressData.map(p => p.book_id);
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('*')
          .in('id', bookIds)
          .eq('is_active', true);

        if (booksError) {
          console.error('❌ ContinueReading - Error fetching books:', booksError);
          setLoading(false);
          return;
        }

        if (!booksData) {
          setBooksInProgress([]);
          setLoading(false);
          return;
        }

        // Map books with progress data
        const { mapSupabaseBooksToUI } = await import('../utils/bookMapping');
        const mappedBooks = mapSupabaseBooksToUI(booksData);

        // Combine book data with progress
        const booksWithProgress: BookWithProgress[] = progressData
          .map(progress => {
            const book = mappedBooks.find(b => b.id === progress.book_id);
            if (!book) return null;

            // Filter by book type if specified
            if (bookType !== 'all') {
              const bookSection = book.metadata?.section;
              
              // Map bookType prop to section values
              const sectionMap: Record<string, string> = {
                'read-to-me': 'read-to-me',
                'voice-coach': 'voice-coach',
                'books': 'books',
                'videos': 'videos',
                'audiobooks': 'audiobooks'
              };
              
              const expectedSection = sectionMap[bookType];
              if (expectedSection && bookSection !== expectedSection) {
                return null;
              }
            }
            
            // Filter out old placeholder/uploaded books (books without proper metadata)
            if (!book.metadata?.section || book.metadata?.import_source === 'uploaded') {
              console.log('📚 ContinueReading - Filtering out uploaded/placeholder book:', book.title);
              return null;
            }

            return {
              ...book,
              currentPage: progress.current_page,
              progressPercentage: parseFloat(progress.progress_percentage.toString()),
              lastReadAt: progress.last_read_at,
              timeSpentMinutes: progress.time_spent_minutes
            };
          })
          .filter((book): book is BookWithProgress => book !== null);

        console.log(`✅ ContinueReading - Loaded ${booksWithProgress.length} books with progress`);
        setBooksInProgress(booksWithProgress);
        setLoading(false);

      } catch (error) {
        console.error('❌ ContinueReading - Error:', error);
        setLoading(false);
      }
    }

    fetchBooksInProgress();
  }, [bookType]);

  /**
   * Format last read time
   */
  const formatLastRead = (timestamp: string): string => {
    const now = new Date();
    const lastRead = new Date(timestamp);
    const diffMs = now.getTime() - lastRead.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}${t('continue.reading.ago.minutes')}`;
    if (diffHours < 24) return `${diffHours}${t('continue.reading.ago.hours')}`;
    if (diffDays === 1) return t('continue.reading.yesterday');
    if (diffDays < 7) return `${diffDays}${t('continue.reading.ago.days')}`;
    return lastRead.toLocaleDateString();
  };

  // Don't render if no books in progress
  if (!loading && booksInProgress.length === 0) {
    return null;
  }

  return (
    <div className={`mb-12 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6" style={{ color: '#e2d051' }} />
          <h2 className="font-superclarendon-bold font-bold text-black" style={{ fontSize: '1.3rem' }}>{t('continue.reading.title')}</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {booksInProgress.length} {booksInProgress.length === 1 ? t('continue.reading.book') : t('continue.reading.books')}
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      )}

      {/* Books Carousel with Epic Navigation */}
      {!loading && (
        <EpicNavigationWrapper
          scrollContainerId="continue-reading-carousel"
          arrowSize="medium"
          arrowColor="#8b5cf6"
          className="continue-reading-epic-nav"
        >
          <div
            id="continue-reading-carousel"
            className="flex space-x-4 md:space-x-6 overflow-x-auto pb-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {booksInProgress.map((book) => (
              <div
                key={book.id}
                onClick={() => onBookClick(book.id, book.currentPage)}
                className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52 cursor-pointer group"
              >
                {/* Book Cover */}
                <div className="relative mb-3">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                  </div>

                  {/* Progress Badge */}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
                    <span className="text-xs font-semibold text-purple-600">
                      {book.progressPercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Book Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-600">{book.author}</p>

                  {/* Progress Bar */}
                  <ProgressBarInline progress={book.progressPercentage} size="small" />

                  {/* Last Read Info */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatLastRead(book.lastReadAt)}</span>
                    </div>
                    {book.timeSpentMinutes > 0 && (
                      <span>{book.timeSpentMinutes} {t('continue.reading.min.read')}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </EpicNavigationWrapper>
      )}

      {/* Custom scrollbar hide styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
