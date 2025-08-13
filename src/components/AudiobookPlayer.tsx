import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Heart, X, Volume2, RotateCcw, SkipForward, Play, Pause } from 'lucide-react';

interface AudiobookPlayerProps {
  onBack: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  onProgressUpdate?: (bookId: string, pagesRead: number, timeSpent?: number) => void;
}

export default function AudiobookPlayer({ onBack, isFavorited = false, onToggleFavorite, onProgressUpdate }: AudiobookPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(25); // 0:25 as shown in image
  const [duration, setDuration] = useState(571); // 9:31 total duration
  const [activeTab, setActiveTab] = useState<'MISS NELSON' | 'MORE LIKE THIS'>('MISS NELSON');
  const [hasTrackedCompletion, setHasTrackedCompletion] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showCarouselArrows, setShowCarouselArrows] = useState(false);

  // Mock data for Miss Nelson series
  const missNelsonBooks = [
    {
      id: '1',
      title: 'Miss Nelson is Missing',
      cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=200&h=300&dpr=1',
      status: 'available'
    },
    {
      id: '2',
      title: 'Miss Nelson is Back',
      cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=200&h=300&dpr=1',
      status: 'available'
    },
    {
      id: '3',
      title: 'Miss Nelson Has a Field Day',
      cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=200&h=300&dpr=1',
      status: 'now-playing'
    }
  ];

  const moreLikeThisBooks = [
    {
      id: '4',
      title: 'Frog and Toad Adventures',
      cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=200&h=300&dpr=1'
    },
    {
      id: '5',
      title: 'Arthur\'s Adventures',
      cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=200&h=300&dpr=1'
    },
    {
      id: '6',
      title: 'Curious George Stories',
      cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=200&h=300&dpr=1'
    }
  ];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Track progress when audiobook reaches completion
  useEffect(() => {
    if (!hasTrackedCompletion && onProgressUpdate) {
      const progressPercent = (currentTime / duration) * 100;
      
      // Track completion when audiobook reaches 90% or more
      if (progressPercent >= 90) {
        setHasTrackedCompletion(true);
        onProgressUpdate('miss-nelson-field-day', 1, Math.round(duration / 60)); // 1 "page" for audiobook completion, duration in minutes
        console.log('Audiobook completion tracked: Miss Nelson Has a Field Day');
        
        // Show completion message
        setTimeout(() => {
          alert(`🎉 Congratulations! You've listened to "Miss Nelson Has a Field Day"! Great job!`);
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
  const totalBooks = [
    { title: 'Creepy Carrots!', cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'Dragons Love Tacos', cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'Fiesta Fiasco', cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'Three Wise Cats', cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'The Vast Wonder', cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'The Bossy Gallito', cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'Strega Nona', cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'In the Red Canoe', cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'Kitten\'s First', cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'More Adventures', cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'Story Time', cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' },
    { title: 'Fun Tales', cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=200&h=280&dpr=1' }
  ];

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
            They All Saw a Cat
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
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  <div className="text-6xl mb-4">🐱</div>
                  <div className="text-gray-800 text-lg font-bold text-center leading-tight">
                    THEY ALL SAW A CAT
                  </div>
                </div>
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
              <div className="mb-6">
                <p className="text-gray-600 text-base mb-2">
                  <span className="font-medium">By</span> Brendan Wenzel
                </p>
                <p className="text-gray-600 text-base">
                  <span className="font-medium">Narrated by</span> John Lithgow
                </p>
              </div>

              <p className="text-gray-700 text-base leading-relaxed mb-8 max-w-2xl">
                In this celebration of observation, curiosity, and imagination, we see the many lives of one cat, and how perspective shapes what we see.
              </p>

              {/* Age and Duration */}
              <div className="flex space-x-12 mb-8">
                <div>
                  <div className="text-3xl font-bold text-gray-800">5 - 6</div>
                  <div className="text-base text-gray-600">Age Range</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-800">4m</div>
                  <div className="text-base text-gray-600">Length</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Player Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center mb-6">
            <h3 className="font-medium text-gray-800 text-xl">
              They All Saw a Cat
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
            <button className="text-blue-500 hover:text-blue-600 transition-colors">
              <Volume2 className="w-7 h-7" />
            </button>
            
            <button className="text-blue-500 hover:text-blue-600 transition-colors">
              <RotateCcw className="w-7 h-7" />
            </button>

            <button className="text-blue-500 hover:text-blue-600 transition-colors">
              <div className="w-12 h-12 border-2 border-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">15</span>
              </div>
            </button>

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

            <button className="text-blue-500 hover:text-blue-600 transition-colors">
              <div className="w-12 h-12 border-2 border-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">30</span>
              </div>
            </button>

            <button className="text-blue-500 hover:text-blue-600 transition-colors">
              <SkipForward className="w-7 h-7" />
            </button>

            <button className="text-blue-500 hover:text-blue-600 transition-colors">
              <Volume2 className="w-7 h-7" />
            </button>
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