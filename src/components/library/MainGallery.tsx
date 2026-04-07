import { useRef, useEffect } from 'react';
import { Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { useBooks } from '../../hooks/useBooks';
import { useTranslation } from '../../contexts/LanguageContext';
import { BOOKS_PER_PAGE } from '../../constants/library';
import { OptimizedImg } from '../../hooks/useOptimizedImage';

interface MainGalleryProps {
  grade: string;
  mediaType: string;
  genre: string;
  onBookClick: (bookId: string) => void;
  onGenreClick?: (genreId: string) => void;
}

export default function MainGallery({
  grade,
  mediaType,
  genre,
  onBookClick,
  onGenreClick
}: MainGalleryProps) {
  const { t, translateReadingLevel } = useTranslation();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Map media type to section
  const getSection = (type: string): 'read-to-me' | 'all' | null => {
    if (type === 'read-to-me') return 'read-to-me';
    return 'all';
  };

  // Fetch books with current filters
  const { books, loading, error, hasMore, loadMore, refresh } = useBooks({
    section: getSection(mediaType),
    readingLevel: grade,
    genre: genre !== 'All' ? genre : undefined,
    limit: BOOKS_PER_PAGE
  });

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreTriggerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observerRef.current.observe(loadMoreTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMore]);

  // Loading state (initial load)
  if (loading && books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: '#d8609c' }} />
        <p className="text-gray-600">{t('library.loading.books')}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-900 font-medium mb-2">{t('library.failed.load.books')}</p>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={refresh}
          className="px-6 py-2 text-white rounded-lg transition-colors"
          style={{ backgroundColor: '#d8609c' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c54d89'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d8609c'}
        >
          {t('common.try.again')}
        </button>
      </div>
    );
  }

  // Empty state
  if (!loading && books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BookOpen className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-900 font-medium mb-2">{t('library.no.books.found')}</p>
        <p className="text-gray-600 text-center max-w-md">
          {t('library.adjust.filters')}
          {genre !== 'All' && (
            <button
              onClick={() => onGenreClick?.('All')}
              className="block mt-2 hover:underline"
              style={{ color: '#d8609c' }}
            >
              {t('library.view.all.genres')}
            </button>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {books.map((book) => (
          <div
            key={book.id}
            className="group cursor-pointer"
            style={{ position: 'relative', zIndex: 1 }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.zIndex = '20'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.zIndex = '1'}
            onClick={() => onBookClick(book.id)}
          >
            <div className="relative">
              {/* Book Cover */}
              <div className="w-full aspect-[3/4] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-200 group-hover:scale-110">
                <OptimizedImg
                  src={book.cover}
                  alt={book.title}
                  size="medium"
                  className="w-full h-full object-cover"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                
                {/* New Badge */}
                {book.isNew && (
                  <div className="absolute top-2 right-2 text-gray-900 text-xs px-2 py-1 rounded-full font-bold shadow-lg" style={{ backgroundColor: '#e2d051' }}>
                    {t('common.new')}
                  </div>
                )}
                
                {/* Progress Bar */}
                {book.progress && book.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>{t('reading.progress')}</span>
                      <span>{book.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ width: `${book.progress}%`, backgroundColor: '#d8609c' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Book Info */}
            <div className="mt-3 space-y-1">
              <h3 className="font-bold text-sm leading-tight line-clamp-2 transition-colors" style={{ color: '#a1ced3' }}>
                {book.title}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-1">
                {t('book.by')} {book.author || t('book.unknown.author')}
              </p>
              
              {/* Metadata */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{book.readingLevel ? translateReadingLevel(book.readingLevel) : ''}</span>
                {book.category && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {book.category}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading More Indicator */}
      {loading && books.length > 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#d8609c' }} />
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      {hasMore && !loading && (
        <div
          ref={loadMoreTriggerRef}
          className="h-20 flex items-center justify-center"
        >
          <span className="text-sm text-gray-400">{t('library.scroll.more')}</span>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && books.length > 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          {t('library.end.of.list')}
        </div>
      )}
    </div>
  );
}
