import React, { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward, Volume2, Heart, RotateCcw, Settings } from 'lucide-react';
import PageReadingInterface from './PageReadingInterface';

interface ReadingInterfaceProps {
  onBack: () => void;
}

export default function ReadingInterface({ onBack }: ReadingInterfaceProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(16);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showPageReading, setShowPageReading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Mock book pages data
  const bookPages = [
    {
      id: 1,
      content: `"New York City!" exclaimed the other ducks. "You're too small. It's too far. You can't go there."`,
      image: "https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
    },
    {
      id: 2,
      content: `But the little duck was determined. He packed his tiny suitcase and set off on his big adventure to the city that never sleeps.`,
      image: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
    },
    {
      id: 3,
      content: `The journey was long and tiring. The little duck flew over mountains, rivers, and forests, always keeping his dream of New York City in his heart.`,
      image: "https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
    },
    {
      id: 4,
      content: `Finally, he saw the magnificent skyline of New York City rising before him. The tall buildings sparkled in the sunlight like jewels.`,
      image: "https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
    },
    {
      id: 5,
      content: `In Central Park, he met other ducks who welcomed him warmly. "Welcome to New York!" they quacked happily.`,
      image: "https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
    }
  ];

  const totalPages = bookPages.length;
  const currentPageData = bookPages[currentPage - 1];

  const nextPage = () => {
    if (currentPage < totalPages) {
      setIsTransitioning(true);
      setTimeout(() => {
      setCurrentPage(currentPage + 1);
        setTimeout(() => setIsTransitioning(false), 300);
      }, 150);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setIsTransitioning(true);
      setTimeout(() => {
      setCurrentPage(currentPage - 1);
        setTimeout(() => setIsTransitioning(false), 300);
      }, 150);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showPageReading) {
    return (
      <div className={`transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <PageReadingInterface onBack={() => setShowPageReading(false)} />
      </div>
    );
  }

  return (
    <div className={`transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
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

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Main Reading Area */}
          <div className="relative">
            {/* Book Page */}
            <div className={`relative bg-gradient-to-br from-orange-200 via-yellow-200 to-red-300 rounded-2xl overflow-hidden shadow-2xl min-h-[600px] mb-8 transition-all duration-500 ${
              isTransitioning ? 'transform scale-95 opacity-80' : 'transform scale-100 opacity-100'
            }`}>
              {/* Page Content */}
              <div className="relative h-full">
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-90"
                  style={{ 
                    backgroundImage: `url(${currentPageData.image})`,
                    backgroundBlendMode: 'multiply'
                  }}
                ></div>
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-300/60 via-yellow-300/40 to-red-400/60"></div>
                
                {/* Text Content */}
                <div className="relative z-10 p-12 h-full flex items-center">
                  <div className="max-w-md ml-auto mr-16">
                    <p className="text-2xl font-bold text-gray-900 leading-relaxed drop-shadow-sm">
                      {currentPageData.content}
                    </p>
                  </div>
                </div>

                {/* Audio Play Button Overlay */}
                <div className="absolute top-8 left-8">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-12 h-12 bg-black bg-opacity-60 rounded-full flex items-center justify-center text-white hover:bg-opacity-80 hover:scale-110 transition-all duration-300"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </button>
                    <button 
                      onClick={() => setShowPageReading(true)}
                      className="w-12 h-12 bg-black bg-opacity-60 rounded-full flex items-center justify-center text-white hover:bg-opacity-80 hover:scale-110 transition-all duration-300"
                      title="Read Pages"
                    >
                      <span className="text-sm font-bold">📖</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation Arrows */}
              <button 
                onClick={prevPage}
                disabled={currentPage === 1 || isTransitioning}
                className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group ${
                  currentPage === 1 || isTransitioning
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100 hover:scale-110 shadow-lg'
                }`}
              >
                <ChevronLeft className="w-6 h-6 transition-transform duration-300 group-hover:-translate-x-0.5" />
              </button>

              <button 
                onClick={nextPage}
                disabled={currentPage === totalPages || isTransitioning}
                className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group ${
                  currentPage === totalPages || isTransitioning
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100 hover:scale-110 shadow-lg'
                }`}
              >
                <ChevronRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                {/* Left Controls */}
                <div className="flex items-center space-x-4">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 bg-blue-500 hover:bg-blue-600 hover:scale-110 rounded-full flex items-center justify-center text-white transition-all duration-300"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Center - Progress and Title */}
                <div className="flex-1 mx-8">
                  <div className="text-center mb-2">
                    <h3 className="text-lg font-semibold text-blue-600">
                      01. A Duck In New York City - Connie Kaldor
                    </h3>
                  </div>
                  <div className="relative">
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${(progress / 177) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>00:16</span>
                    <span>2:57</span>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setIsFavorited(!isFavorited)}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorited 
                        ? 'bg-red-50 text-red-500' 
                        : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Arrows - Outside the book */}
            <button 
              onClick={prevPage}
              disabled={currentPage === 1 || isTransitioning}
              className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group z-10 ${
                currentPage === 1 || isTransitioning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-white bg-opacity-90 text-gray-700 hover:bg-opacity-100 hover:scale-110 shadow-xl border border-gray-200'
              }`}
            >
              <ChevronLeft className="w-7 h-7 transition-transform duration-300 group-hover:-translate-x-1" />
            </button>

            <button 
              onClick={nextPage}
              disabled={currentPage === totalPages || isTransitioning}
              className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group z-10 ${
                currentPage === totalPages || isTransitioning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-white bg-opacity-90 text-gray-700 hover:bg-opacity-100 hover:scale-110 shadow-xl border border-gray-200'
              }`}
            >
              <ChevronRight className="w-7 h-7 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
