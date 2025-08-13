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
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-blue-50 to-teal-100">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
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
            Miss Nelson Has a Field Day
          </h1>

          <button 
            onClick={onBack}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Book Cover and Info */}
          <div className="text-center">
            {/* Main Book Cover */}
            <div className="relative inline-block mb-6">
              <div className="w-64 h-80 bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500 rounded-2xl shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  <div className="text-6xl mb-4">🏫📚</div>
                  <div className="text-white text-lg font-superclarendon-bold leading-tight text-center">
                    MISS NELSON HAS A FIELD DAY
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-teal-600 text-white text-sm px-3 py-1 rounded-full font-medium flex items-center space-x-1">
                  <span>Audiobook</span>
                  <Volume2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Book Info */}
            <div className="space-y-2 mb-6">
              <p className="text-gray-600 text-sm">
                <span className="font-medium">By:</span> Harry Allard
              </p>
              <p className="text-gray-600 text-sm">
                <span className="font-medium">Narrated by:</span> Diana Canova
              </p>
              <p className="text-gray-700 text-sm leading-relaxed max-w-md mx-auto mt-4">
                The notorious Miss Swamp reappears at the Horace B. Smedley School, this time to shape up the football team and help them win one game.
              </p>
            </div>

            {/* Age and Duration Info */}
            <div className="flex justify-center space-x-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">5 - 7</div>
                <div className="text-sm text-gray-500">Age Range</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">10m</div>
                <div className="text-sm text-gray-500">Length</div>
              </div>
            </div>

            {/* Audio Progress */}
            <div className="mb-6">
              <div className="text-center mb-2">
                <h3 className="font-superclarendon-black text-gray-800">
                  Miss Nelson Has a Field Day
                </h3>
              </div>
              
              {/* Progress Bar */}
              <div className="relative mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-1">
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
                  <div className="w-8 h-8 border-2 border-blue-500 rounded-full flex items-center justify-center">
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
                  <div className="w-8 h-8 border-2 border-blue-500 rounded-full flex items-center justify-center">
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

              {/* Bottom Control Labels */}
              <div className="flex items-center justify-center space-x-12 mt-3">
                <div className="text-center">
                  <div className="text-blue-500 text-xs font-medium">Text listen</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-500 text-xs font-medium">Read</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Related Books */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('MISS NELSON')}
                className={`px-6 py-3 font-superclarendon-black transition-colors ${
                  activeTab === 'MISS NELSON'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                MISS NELSON
              </button>
              <button
                onClick={() => setActiveTab('MORE LIKE THIS')}
                className={`px-6 py-3 font-superclarendon-black transition-colors ${
                  activeTab === 'MORE LIKE THIS'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                MORE LIKE THIS
              </button>
            </div>

            {/* Book Grid */}
            <div className="grid grid-cols-3 gap-4">
              {(activeTab === 'MISS NELSON' ? missNelsonBooks : moreLikeThisBooks).map((book) => (
                <div key={book.id} className="relative group cursor-pointer">
                  <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                    {book.status === 'now-playing' && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        NOW PLAYING
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                      <span>Audiobook</span>
                      <Volume2 className="w-3 h-3" />
                    </div>
                  </div>
                  <h4 className="text-sm font-superclarendon-black text-gray-800 mt-2 text-center leading-tight">
                    {book.title}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}