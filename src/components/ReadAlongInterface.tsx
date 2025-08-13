import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface ReadAlongInterfaceProps {
  onBack: () => void;
}

interface BookPage {
  id: number;
  leftText?: string;
  rightText?: string;
  leftImage?: string;
  rightImage?: string;
  words: string[];
  audioTimings: number[]; // Timing for each word in milliseconds
}

export default function ReadAlongInterface({ onBack }: ReadAlongInterfaceProps) {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev'>('next');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [avatarAnimating, setAvatarAnimating] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // Mock book data with word-level timing
  const bookSpreads: BookPage[] = [
    {
      id: 1,
      leftText: "Once upon a time, in a magical forest, there lived a little rabbit named Luna.",
      rightImage: "https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      words: ["Once", "upon", "a", "time,", "in", "a", "magical", "forest,", "there", "lived", "a", "little", "rabbit", "named", "Luna."],
      audioTimings: [0, 500, 800, 1200, 1800, 2100, 2400, 3200, 4000, 4500, 5000, 5300, 5800, 6500, 7200]
    },
    {
      id: 2,
      leftText: "Luna loved to explore the enchanted woods and discover new adventures every day.",
      rightImage: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      words: ["Luna", "loved", "to", "explore", "the", "enchanted", "woods", "and", "discover", "new", "adventures", "every", "day."],
      audioTimings: [0, 600, 1000, 1300, 2000, 2300, 3100, 3800, 4100, 4900, 5200, 6200, 6800]
    },
    {
      id: 3,
      leftText: "One sunny morning, she found a sparkling stream that led to a hidden garden.",
      rightImage: "https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      words: ["One", "sunny", "morning,", "she", "found", "a", "sparkling", "stream", "that", "led", "to", "a", "hidden", "garden."],
      audioTimings: [0, 400, 900, 1600, 1900, 2400, 2700, 3500, 4200, 4600, 5000, 5300, 5600, 6400]
    }
  ];

  const totalSpreads = bookSpreads.length;
  const currentSpreadData = bookSpreads[currentSpread];

  // Simulate audio playback with word highlighting
  useEffect(() => {
    if (isPlaying && currentSpreadData) {
      setAvatarAnimating(true);
      let wordIndex = 0;
      const totalDuration = 8000; // 8 seconds per spread

      const playWords = () => {
        if (wordIndex < currentSpreadData.words.length && isPlaying) {
          setCurrentWordIndex(wordIndex);
          setProgress((wordIndex / currentSpreadData.words.length) * 100);

          const nextTiming = currentSpreadData.audioTimings[wordIndex + 1] || totalDuration;
          const currentTiming = currentSpreadData.audioTimings[wordIndex];
          const delay = nextTiming - currentTiming;

          progressRef.current = setTimeout(() => {
            wordIndex++;
            playWords();
          }, delay);
        } else if (wordIndex >= currentSpreadData.words.length && isPlaying) {
          // Auto-advance to next spread
          setTimeout(() => {
            if (currentSpread < totalSpreads - 1) {
              nextSpread();
            } else {
              setIsPlaying(false);
              setAvatarAnimating(false);
            }
          }, 1000);
        }
      };

      playWords();
    } else {
      setAvatarAnimating(false);
      if (progressRef.current) {
        clearTimeout(progressRef.current);
      }
    }

    return () => {
      if (progressRef.current) {
        clearTimeout(progressRef.current);
      }
    };
  }, [isPlaying, currentSpread]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setCurrentWordIndex(0);
    }
  };

  const nextSpread = () => {
    if (currentSpread < totalSpreads - 1) {
      setIsPageTurning(true);
      setTurnDirection('next');
      setTimeout(() => {
        setCurrentSpread(currentSpread + 1);
        setCurrentWordIndex(0);
        setProgress(0);
        setTimeout(() => {
          setIsPageTurning(false);
        }, 400);
      }, 200);
    }
  };

  const prevSpread = () => {
    if (currentSpread > 0) {
      setIsPageTurning(true);
      setTurnDirection('prev');
      setTimeout(() => {
        setCurrentSpread(currentSpread - 1);
        setCurrentWordIndex(0);
        setProgress(0);
        setTimeout(() => {
          setIsPageTurning(false);
        }, 400);
      }, 200);
    }
  };

  const renderHighlightedText = (text: string, words: string[]) => {
    return (
      <div className="text-2xl leading-relaxed font-serif text-gray-800">
        {words.map((word, index) => (
          <span
            key={index}
            className={`transition-all duration-300 ${index === currentWordIndex && isPlaying
              ? 'bg-yellow-300 text-gray-900 px-1 rounded shadow-sm transform scale-105'
              : index < currentWordIndex && isPlaying
                ? 'text-blue-600'
                : 'text-gray-800'
              }`}
          >
            {word}{' '}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onBack}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Main Book Area */}
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="relative max-w-6xl w-full">
          {/* Book Spread */}
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden relative transition-all duration-600 ease-out"
            style={{
              aspectRatio: '16/10',
              transform: isPageTurning ? 'perspective(1000px) rotateY(2deg)' : 'perspective(1000px) rotateY(0deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Paper Texture Overlay */}
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Page Turn Animation Overlay */}
            {isPageTurning && (
              <div
                className={`absolute inset-0 z-10 pointer-events-none transition-all duration-600 ease-out ${turnDirection === 'next'
                  ? 'bg-gradient-to-r from-transparent via-white/20 to-white/40'
                  : 'bg-gradient-to-l from-transparent via-white/20 to-white/40'
                  }`}
                style={{
                  transform: turnDirection === 'next'
                    ? 'translateX(0%) skewX(-15deg)'
                    : 'translateX(0%) skewX(15deg)',
                  animation: turnDirection === 'next'
                    ? 'pageFlipNext 0.6s ease-out'
                    : 'pageFlipPrev 0.6s ease-out'
                }}
              />
            )}

            <div className="flex h-full">
              {/* Left Page */}
              <div
                className={`w-1/2 p-8 lg:p-12 flex flex-col justify-center border-r border-gray-200 transition-all duration-600 ${isPageTurning && turnDirection === 'prev' ? 'transform -translate-x-2' : ''
                  }`}
                style={{
                  backgroundImage: `linear-gradient(45deg, #fefefe 25%, transparent 25%), 
                                   linear-gradient(-45deg, #fefefe 25%, transparent 25%), 
                                   linear-gradient(45deg, transparent 75%, #fefefe 75%), 
                                   linear-gradient(-45deg, transparent 75%, #fefefe 75%)`,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
              >
                <div className="max-w-md mx-auto">
                  {renderHighlightedText(currentSpreadData.leftText || '', currentSpreadData.words)}
                </div>
              </div>

              {/* Right Page */}
              <div
                className={`w-1/2 relative overflow-hidden transition-all duration-600 ${isPageTurning && turnDirection === 'next' ? 'transform translate-x-2' : ''
                  }`}
              >
                <img
                  src={currentSpreadData.rightImage}
                  alt={`Page ${currentSpread + 1} illustration`}
                  className="w-full h-full object-cover transition-transform duration-700"
                  style={{
                    transform: isPageTurning ? 'scale(1.02)' : 'scale(1)'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
              </div>
            </div>

            {/* Page Number */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-lg">
              <span className="text-sm font-medium text-gray-600">
                {currentSpread + 1} / {totalSpreads}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows - Outside the book */}
      <button
        onClick={prevSpread}
        disabled={currentSpread === 0 || isPageTurning}
        className={`absolute left-8 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all z-10 group ${currentSpread === 0 || isPageTurning
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
          }`}
      >
        <ChevronLeft className="w-8 h-8 transition-transform duration-300 group-hover:-translate-x-1" />

        {/* Corner Page Curl Effect */}
        {currentSpread > 0 && !isPageTurning && (
          <div className="absolute -top-3 -left-3 w-8 h-8 bg-white opacity-0 group-hover:opacity-30 transition-opacity duration-300 transform rotate-45 rounded-tl-lg shadow-sm"></div>
        )}
      </button>

      <button
        onClick={nextSpread}
        disabled={currentSpread === totalSpreads - 1 || isPageTurning}
        className={`absolute right-8 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all z-10 group ${currentSpread === totalSpreads - 1 || isPageTurning
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
          }`}
      >
        <ChevronRight className="w-8 h-8 transition-transform duration-300 group-hover:translate-x-1" />

        {/* Corner Page Curl Effect */}
        {currentSpread < totalSpreads - 1 && !isPageTurning && (
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-white opacity-0 group-hover:opacity-30 transition-opacity duration-300 transform rotate-45 rounded-tr-lg shadow-sm"></div>
        )}
      </button>

      {/* Animated Avatar */}
      <div className="absolute bottom-12 left-12">
        <div className={`w-40 h-40 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${avatarAnimating ? 'animate-bounce scale-110' : 'scale-100'
          }`}>
          <img
            src="src/assets/adorable-cartoon-dog-face.png"
            alt="Dog"
            className="w-full h-full object-cover rounded-ful
  l"
          />     </div>
        {avatarAnimating && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
            <Volume2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="bg-white rounded-full shadow-xl px-8 py-4 flex items-center space-x-6">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </button>

          {/* Progress Bar */}
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentSpread / (totalSpreads - 1)) * 100}%` }}
            ></div>
          </div>

          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isMuted
              ? 'bg-red-100 text-red-500 hover:bg-red-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Restart Button */}
        <button
          onClick={() => {
            setCurrentSpread(0);
            setCurrentWordIndex(0);
            setProgress(0);
            setIsPlaying(false);
          }}
          className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Elements for Ambiance */}
      <div className="absolute top-20 right-20 w-4 h-4 bg-yellow-300 rounded-full animate-pulse opacity-60"></div>
      <div className="absolute top-40 left-20 w-3 h-3 bg-pink-300 rounded-full animate-pulse opacity-40 animation-delay-1000"></div>
      <div className="absolute bottom-40 right-40 w-5 h-5 bg-blue-300 rounded-full animate-pulse opacity-50 animation-delay-2000"></div>
    </div>

  );
}