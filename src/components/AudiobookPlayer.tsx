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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600">
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Top Section - Book Info */}
          <div className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left - Book Cover */}
              <div className="flex-shrink-0">
                <div className="w-48 h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-lg overflow-hidden relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <div className="text-4xl mb-2">🐱</div>
                    <div className="text-gray-800 text-sm font-bold text-center leading-tight">
                      THEY ALL SAW A CAT
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center justify-center space-x-1">
                      <span>Audiobook</span>
                      <Volume2 className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Book Details */}
              <div className="flex-1">
                <div className="mb-4">
                  <p className="text-gray-600 text-sm mb-1">
                    <span className="font-medium">By</span> Brendan Wenzel
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Narrated by</span> John Lithgow
                  </p>
                </div>

                <p className="text-gray-700 text-sm leading-relaxed mb-6 max-w-lg">
                  In this celebration of observation, curiosity, and imagination, we see the many lives of one cat, and how perspective shapes what we see.
                </p>

                {/* Age and Duration */}
                <div className="flex space-x-8 mb-6">
                  <div>
                    <div className="text-2xl font-bold text-gray-800">5 - 6</div>
                    <div className="text-sm text-gray-500">Age Range</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800">4m</div>
                    <div className="text-sm text-gray-500">Length</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Player Section */}
          <div className="bg-gray-50 p-6">
            <div className="text-center mb-4">
              <h3 className="font-medium text-gray-800 text-lg">
                They All Saw a Cat
              </h3>
            </div>
            
            {/* Progress Bar */}
            <div className="relative mb-6 max-w-2xl mx-auto">
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300 relative"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center justify-center space-x-6">
              <button className="text-blue-500 hover:text-blue-600 transition-colors">
                <Volume2 className="w-6 h-6" />
              </button>
              
              <button className="text-blue-500 hover:text-blue-600 transition-colors">
                <RotateCcw className="w-6 h-6" />
              </button>

              <button className="text-blue-500 hover:text-blue-600 transition-colors">
                <div className="w-10 h-10 border-2 border-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">15</span>
                </div>
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </button>

              <button className="text-blue-500 hover:text-blue-600 transition-colors">
                <div className="w-10 h-10 border-2 border-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">30</span>
                </div>
              </button>

              <button className="text-blue-500 hover:text-blue-600 transition-colors">
                <SkipForward className="w-6 h-6" />
              </button>

              <button className="text-blue-500 hover:text-blue-600 transition-colors">
                <Volume2 className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* More Like This Section */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-blue-500 border-b-2 border-blue-500 inline-block pb-2">
                MORE LIKE THIS
              </h3>
            </div>

            {/* Horizontal Scrolling Book List */}
            <div className="overflow-x-auto">
              <div className="flex space-x-4 pb-4" style={{ width: 'max-content' }}>
                {[
                  { title: 'Creepy Carrots!', cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=150&h=200&dpr=1' },
                  { title: 'Dragons Love Tacos', cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=150&h=200&dpr=1' },
                  { title: 'Fiesta Fiasco', cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=150&h=200&dpr=1' },
                  { title: 'Three Wise Cats', cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=150&h=200&dpr=1' },
                  { title: 'The Vast Wonder', cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=150&h=200&dpr=1' },
                  { title: 'The Bossy Gallito', cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=150&h=200&dpr=1' },
                  { title: 'Strega Nona', cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=150&h=200&dpr=1' },
                  { title: 'In the Red Canoe', cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=150&h=200&dpr=1' },
                  { title: 'Kitten\'s First', cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=150&h=200&dpr=1' }
                ].map((book, index) => (
                  <div key={index} className="flex-shrink-0 w-24 cursor-pointer group">
                    <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow relative">
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="bg-purple-600 text-white text-xs px-1 py-0.5 rounded font-medium flex items-center justify-center space-x-1">
                          <span className="text-xs">Audiobook</span>
                          <Volume2 className="w-2 h-2" />
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