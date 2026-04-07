import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, BookOpen, PlayCircle, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { useBooks } from '../hooks/useBooks';
import ContinueReadingSection from './ContinueReadingSection';
import { OptimizedImg } from '../hooks/useOptimizedImage';

interface ReadToMeDashboardProps {
  onBack: () => void;
  onBookSelect: (bookId: string) => void;
}

export default function ReadToMeDashboard({ onBack, onBookSelect }: ReadToMeDashboardProps) {
  const [selectedLevel, setSelectedLevel] = useState<string | undefined>(undefined);
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>(undefined);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { books, loading, error, hasMore, loadMore, refresh } = useBooks({
    section: 'read-to-me',
    readingLevel: selectedLevel,
    genre: selectedGenre,
    limit: 50
  });

  const readingLevels = ['Elementary', 'Middle School', 'High School'];
  
  // Get unique genres from books
  const genres = Array.from(new Set(books.map(book => book.category).filter(Boolean)));

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current || loading || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMore();
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loading, hasMore, loadMore]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">BACK</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8" ref={scrollContainerRef}>
        {/* Continue Reading Section */}
        <ContinueReadingSection
          bookType="read-to-me"
          onBookClick={(bookId, currentPage) => {
            console.log('📖 Continue reading:', bookId, 'at page:', currentPage);
            onBookSelect(bookId);
          }}
        />

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Reading Level Filter */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-yellow-800 font-medium">Reading Level</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedLevel(undefined)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !selectedLevel
                    ? 'bg-brand-pink text-white shadow-lg'
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                }`}
              >
                All Levels
              </button>
              {readingLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedLevel === level
                      ? 'bg-brand-pink text-white shadow-lg'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Genre Filter */}
          {genres.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-yellow-800 font-medium">Genre</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGenre(undefined)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    !selectedGenre
                      ? 'bg-brand-pink text-white shadow-lg'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                  }`}
                >
                  All Genres
                </button>
                {genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedGenre === genre
                        ? 'bg-brand-pink text-white shadow-lg'
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-brand-pink animate-spin mb-4" />
            <p className="text-gray-600">Loading books...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-gray-900 font-medium mb-2">Failed to load books</p>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={refresh}
              className="px-6 py-2 bg-brand-pink text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-900 font-medium mb-2">No books found</p>
            <p className="text-gray-600">Try adjusting your filters or check back later for new books.</p>
          </div>
        )}

        {/* Books Grid */}
        {!loading && !error && books.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {books.map((book) => (
            <div 
              key={book.id} 
              className="group cursor-pointer"
              onClick={() => onBookSelect(book.id)}
            >
              <div className="relative">
                <div className="w-full aspect-[3/4] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <OptimizedImg
                    src={book.cover}
                    alt={book.title}
                    size="medium"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Read to Me Badge */}
                  <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                    <Volume2 className="w-3 h-3" />
                    <span>Read to Me</span>
                  </div>
                  {book.isNew && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      New
                    </div>
                  )}
                </div>
                
                {book.progress && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-2 rounded-b-lg">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{book.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-brand-pink to-pink-700 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${book.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-3 space-y-1">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-brand-pink transition-colors">
                  {book.title}
                </h3>
                <p className="text-xs text-gray-500">{book.author}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="text-xs text-gray-600">{book.readingLevel}</span>
                </div>
                <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {book.category}
                </span>
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Loading More Indicator */}
        {loading && books.length > 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-brand-pink animate-spin" />
          </div>
        )}

        {/* Reading Tips */}
        <div className="mt-12 bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Read to Me Tips</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-800">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-yellow rounded-full mt-2 flex-shrink-0"></div>
              <p>Follow along with the highlighted text as the story is read</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-yellow rounded-full mt-2 flex-shrink-0"></div>
              <p>Use the pause button if you need more time to look at pictures</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-yellow rounded-full mt-2 flex-shrink-0"></div>
              <p>Turn pages manually or let the story advance automatically</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-yellow rounded-full mt-2 flex-shrink-0"></div>
              <p>Enjoy the beautiful illustrations and engaging narration</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}