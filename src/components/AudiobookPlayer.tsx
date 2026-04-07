import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Heart, X, Volume2, RotateCcw, SkipForward, Play, Pause } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AudiobookPlayerProps {
  book: {
    id: string;
    title: string;
    author: string;
    illustrator?: string;
    cover: string;
    readingLevel: string;
    audioFiles?: string[];
    contentUrl?: string;
    description?: string;
    description_chinese?: string;
    genre1?: string;
    genre2?: string;
    genre3?: string;
    genre_primary?: string;
    genre_secondary?: string;
    genre_tertiary?: string;
    fiction_type?: string;
    publisher?: string;
    year?: string;
    publication_year?: number;
    isbn?: string;
    age_range?: string;
    gr_level?: string;
    ar_level?: string;
    lexile_level?: string;
    ort_level?: string;
    raz_level?: string;
  };
  onBack: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  onProgressUpdate?: (bookId: string, pagesRead: number, timeSpent?: number) => void;
}

export default function AudiobookPlayer({ book, onBack, isFavorited = false, onToggleFavorite, onProgressUpdate }: AudiobookPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'MISS NELSON' | 'MORE LIKE THIS'>('MISS NELSON');
  const [hasTrackedCompletion, setHasTrackedCompletion] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showCarouselArrows, setShowCarouselArrows] = useState(false);
  const [similarBooks, setSimilarBooks] = useState<any[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(true);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch similar audiobooks from Supabase
  useEffect(() => {
    const fetchSimilarAudiobooks = async () => {
      try {
        setIsLoadingSimilar(true);
        
        // Build query to find similar audiobooks
        let query = supabase
          .from('books')
          .select('*')
          .eq('audiobook', true)
          .neq('id', book.id)
          .limit(12);

        // Try to match by genre first
        const primaryGenre = book.genre_primary || book.genre1;
        if (primaryGenre) {
          query = query.or(`genre_primary.eq.${primaryGenre},genre1.eq.${primaryGenre},genre_secondary.eq.${primaryGenre},genre2.eq.${primaryGenre}`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching similar audiobooks:', error);
          // Fallback: fetch any audiobooks
          const { data: fallbackData } = await supabase
            .from('books')
            .select('*')
            .eq('audiobook', true)
            .neq('id', book.id)
            .limit(12);
          
          setSimilarBooks(fallbackData || []);
        } else {
          setSimilarBooks(data || []);
        }
      } catch (err) {
        console.error('Error in fetchSimilarAudiobooks:', err);
        setSimilarBooks([]);
      } finally {
        setIsLoadingSimilar(false);
      }
    };

    fetchSimilarAudiobooks();
  }, [book.id, book.genre_primary, book.genre1]);

  // Get audio URL from book data
  const audioUrl = book.audioFiles?.[0] || book.contentUrl || '';

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(Math.floor(audio.duration));
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(Math.floor(audio.currentTime));
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 30);
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!audioRef.current) return;
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (volume > 0) {
      audioRef.current.volume = 0;
      setVolume(0);
    } else {
      audioRef.current.volume = 1;
      setVolume(1);
    }
  };

  // Track progress when audiobook reaches completion
  useEffect(() => {
    if (!hasTrackedCompletion && onProgressUpdate) {
      const progressPercent = (currentTime / duration) * 100;
      
      // Track completion when audiobook reaches 90% or more
      if (progressPercent >= 90) {
        setHasTrackedCompletion(true);
        onProgressUpdate(book.id, 1, Math.round(duration / 60)); // 1 "page" for audiobook completion, duration in minutes
        console.log('Audiobook completion tracked:', book.title);
        
        // Show completion message
        setTimeout(() => {
          alert(`🎉 Congratulations! You've listened to "${book.title}"! Great job!`);
        }, 1000);
      }
    }
  }, [currentTime, duration, hasTrackedCompletion, onProgressUpdate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / duration) * 100;

  const booksPerPage = 6;
  const totalBooks = similarBooks;

  const handleCarouselNext = () => {
    setCarouselIndex(prev => Math.min(prev + booksPerPage, totalBooks.length - booksPerPage));
  };

  const handleCarouselPrev = () => {
    setCarouselIndex(prev => Math.max(prev - booksPerPage, 0));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <button className="text-white hover:text-blue-200 transition-colors">
              <div className="w-6 h-6 flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full mx-0.5"></div>
                <div className="w-1 h-1 bg-white rounded-full mx-0.5"></div>
                <div className="w-1 h-1 bg-white rounded-full mx-0.5"></div>
              </div>
            </button>
            <button 
              onClick={onToggleFavorite}
              className={`transition-colors ${isFavorited ? 'text-red-400' : 'text-white hover:text-red-400'}`}
            >
              <Heart className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>

          <h1 className="text-xl font-superclarendon-bold text-center flex-1">
            {book.title}
          </h1>

          <button 
            onClick={onBack}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="px-6 py-8">
        {/* Top Section - Book Info */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left - Book Cover */}
            <div className="flex-shrink-0">
              <div className="w-64 h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-lg overflow-hidden relative">
                <img 
                  src={book.cover} 
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-purple-600 text-white text-sm px-3 py-2 rounded-full font-medium flex items-center justify-center space-x-2">
                    <span>Audiobook</span>
                    <Volume2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Book Details */}
            <div className="flex-1 text-gray-800">
              {/* Top Row: Author/Publisher Info and Reading Levels */}
              <div className="flex justify-between items-start mb-4">
                {/* Left: Author/Publisher Info */}
                <div className="flex-1">
                  <p className="text-gray-600 text-base mb-2">
                    <span className="font-medium">By</span> {book.author}
                  </p>
                  {book.illustrator && (
                    <p className="text-gray-600 text-sm mb-2">
                      <span className="font-medium">Illustrated by</span> {book.illustrator}
                    </p>
                  )}
                  {(book.publisher || book.publication_year || book.year) && (
                    <p className="text-gray-500 text-sm">
                      {book.publisher}{(book.publication_year || book.year) && ` • ${book.publication_year || book.year}`}
                    </p>
                  )}
                </div>

                {/* Right: Reading Levels */}
                {(book.gr_level || book.ar_level) && (
                  <div className="bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 ml-6 min-w-[280px]">
                    <div className="flex items-center gap-6">
                      <h4 className="text-sm font-semibold text-gray-700 whitespace-nowrap">Reading Levels</h4>
                      <div className="flex items-center gap-4 text-sm">
                        {book.gr_level && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Guided Reading:</span>
                            <span className="font-semibold text-gray-800">{book.gr_level}</span>
                          </div>
                        )}
                        {book.ar_level && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">AR Level:</span>
                            <span className="font-semibold text-gray-800">{book.ar_level}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <p className="text-gray-700 text-base leading-relaxed">
                  {book.description || 'An exciting audiobook adventure awaits! Listen and enjoy this wonderful story.'}
                </p>
              </div>

              {/* Genres and Fiction Type */}
              {(book.genre1 || book.genre2 || book.genre3 || book.genre_primary || book.genre_secondary || book.genre_tertiary || book.fiction_type) && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {(book.genre_primary || book.genre1) && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {book.genre_primary || book.genre1}
                      </span>
                    )}
                    {(book.genre_secondary || book.genre2) && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {book.genre_secondary || book.genre2}
                      </span>
                    )}
                    {(book.genre_tertiary || book.genre3) && (
                      <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                        {book.genre_tertiary || book.genre3}
                      </span>
                    )}
                    {book.fiction_type && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {book.fiction_type}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Grade Level and Duration */}
              <div className="flex gap-8">
                {/* Primary Reading Level */}
                {book.readingLevel && (
                  <div>
                    <div className="text-3xl font-bold text-gray-800">{book.readingLevel}</div>
                    <div className="text-base text-gray-600">Grade Level</div>
                  </div>
                )}
                
                {/* Duration */}
                {duration > 0 && (
                  <div>
                    <div className="text-3xl font-bold text-gray-800">{Math.floor(duration / 60)}m</div>
                    <div className="text-base text-gray-600">Length</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Audio Player Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center mb-6">
            <h3 className="font-medium text-gray-800 text-xl">
              {book.title}
            </h3>
          </div>
          
          {/* Progress Bar */}
          <div className="relative mb-8">
            <div className="w-full bg-gray-300 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300 relative"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 rounded-full shadow-lg border-2 border-white"></div>
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-3">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center justify-center space-x-8">
            {/* Volume Control (Left) */}
            <div className="relative">
              <button 
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
                className="text-blue-500 hover:text-blue-600 transition-colors"
              >
                <Volume2 className="w-7 h-7" />
              </button>
              
              {/* Volume Slider */}
              {showVolumeSlider && (
                <div 
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-lg shadow-xl p-3"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="text-center text-xs text-gray-600 mt-1">{Math.round(volume * 100)}%</div>
                </div>
              )}
            </div>
            
            {/* Restart */}
            <button 
              onClick={restart}
              className="text-blue-500 hover:text-blue-600 transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-7 h-7" />
            </button>

            {/* Skip Backward 15s */}
            <button 
              onClick={skipBackward}
              className="text-blue-500 hover:text-blue-600 transition-colors"
              title="Skip backward 15 seconds"
            >
              <div className="w-12 h-12 border-2 border-blue-500 rounded-full flex items-center justify-center relative">
                <span className="text-sm font-bold">15</span>
                <div className="absolute -left-1 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-20 h-20 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors shadow-xl"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" />
              )}
            </button>

            {/* Skip Forward 30s */}
            <button 
              onClick={skipForward}
              className="text-blue-500 hover:text-blue-600 transition-colors"
              title="Skip forward 30 seconds"
            >
              <div className="w-12 h-12 border-2 border-blue-500 rounded-full flex items-center justify-center relative">
                <span className="text-sm font-bold">30</span>
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Next (placeholder for future multi-chapter support) */}
            <button 
              className="text-gray-400 cursor-not-allowed transition-colors"
              title="Next chapter (coming soon)"
              disabled
            >
              <SkipForward className="w-7 h-7" />
            </button>

            {/* Volume Control (Right) */}
            <div className="relative">
              <button 
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
                className="text-blue-500 hover:text-blue-600 transition-colors"
              >
                <Volume2 className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>

        {/* More Like This Section - Full Width with Carousel */}
        <div className="w-full">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-800 border-b-2 border-blue-500 inline-block pb-3">
              MORE LIKE THIS
            </h3>
          </div>

          {/* Carousel Container with Hover Arrows */}
          <div 
            className="relative max-w-6xl mx-auto"
            onMouseEnter={() => setShowCarouselArrows(true)}
            onMouseLeave={() => setShowCarouselArrows(false)}
          >
            {/* Left Arrow */}
            {showCarouselArrows && carouselIndex > 0 && (
              <button
                onClick={handleCarouselPrev}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
            )}

            {/* Right Arrow */}
            {showCarouselArrows && carouselIndex < totalBooks.length - booksPerPage && (
              <button
                onClick={handleCarouselNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Books Grid */}
            <div className="overflow-hidden px-8">
              <div 
                className="flex space-x-6 transition-transform duration-300 ease-in-out"
                style={{ 
                  transform: `translateX(-${carouselIndex * (144 + 24)}px)` // 144px book width + 24px gap
                }}
              >
                {totalBooks.map((book, index) => (
                  <div key={index} className="flex-shrink-0 w-36 cursor-pointer group">
                    <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow relative">
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center justify-center space-x-1">
                          <span>Audiobook</span>
                          <Volume2 className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}