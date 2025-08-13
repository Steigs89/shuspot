import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, Volume2 } from 'lucide-react';

interface DigitalBookInterfaceProps {
  onBack: () => void;
}

interface BookSpread {
  id: number;
  leftPage: {
    text: string;
    image?: string;
  };
  rightPage: {
    text: string;
    image?: string;
  };
  spreadNumber: number;
}

export default function DigitalBookInterface({ onBack }: DigitalBookInterfaceProps) {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev'>('next');
  const [isLoading, setIsLoading] = useState(false);

  // Mock book data - replace with actual book content
  const bookSpreads: BookSpread[] = [
    {
      id: 1,
      leftPage: {
        text: "It was Christmas Eve, and the snow outside was beginning to fall. In the house at the end of the street, Marie and her brother, Fritz, were getting ready for a party.",
        image: undefined
      },
      rightPage: {
        text: "The room had been decorated, and in the corner stood a wonderful Christmas tree, covered in twinkling lights, tiny sugared almonds and, at the very top, a beautiful pink sugarplum fairy.",
        image: "https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
      },
      spreadNumber: 1
    },
    {
      id: 2,
      leftPage: {
        text: "Soon the guests began to arrive. There were children everywhere, laughing and playing games. Marie's godfather, Herr Drosselmeyer, arrived with a large bag full of wonderful presents.",
        image: undefined
      },
      rightPage: {
        text: "He was a mysterious man who made magical toys and clocks. The children gathered around him excitedly as he began to hand out his special gifts.",
        image: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
      },
      spreadNumber: 2
    },
    {
      id: 3,
      leftPage: {
        text: "When it was Marie's turn, Herr Drosselmeyer reached into his bag and pulled out a beautiful wooden nutcracker. It was painted like a soldier with a bright red uniform and a kind face.",
        image: undefined
      },
      rightPage: {
        text: "\"This is no ordinary nutcracker,\" he whispered to Marie. \"Take very good care of him.\" Marie hugged the nutcracker close to her heart, feeling that there was something very special about this gift.",
        image: "https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
      },
      spreadNumber: 3
    },
    {
      id: 4,
      leftPage: {
        text: "Fritz, feeling jealous of his sister's beautiful gift, grabbed the nutcracker from Marie's hands. \"Let me see it!\" he shouted. In the struggle, the nutcracker fell to the floor.",
        image: undefined
      },
      rightPage: {
        text: "Marie gasped as she saw that the nutcracker's jaw had broken. Tears filled her eyes as she gently picked up her wounded soldier. \"Don't worry,\" she whispered, \"I'll take care of you.\"",
        image: "https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
      },
      spreadNumber: 4
    },
    {
      id: 5,
      leftPage: {
        text: "That night, after all the guests had gone home, Marie crept downstairs to check on her nutcracker. The house was quiet and dark, with only the moonlight streaming through the windows.",
        image: undefined
      },
      rightPage: {
        text: "As the clock struck midnight, something magical began to happen. The Christmas tree started to grow taller and taller, and Marie felt herself becoming smaller and smaller.",
        image: "https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
      },
      spreadNumber: 5
    },
    {
      id: 6,
      leftPage: {
        text: "Suddenly, the nutcracker came to life! He stood up, straightened his uniform, and bowed politely to Marie. \"Thank you for taking care of me,\" he said in a gentle voice.",
        image: undefined
      },
      rightPage: {
        text: "\"I am the Nutcracker Prince, and I have been waiting for someone with a kind heart like yours to break the spell that was cast upon me.\" Marie could hardly believe her eyes!",
        image: "https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1"
      },
      spreadNumber: 6
    }
  ];

  const totalSpreads = bookSpreads.length;
  const currentSpreadData = bookSpreads[currentSpread];
  const totalPages = totalSpreads * 2;
  const currentPageNumber = (currentSpread * 2) + 2; // Starting from page 2 (after cover)

  // Preload adjacent images for smooth transitions
  useEffect(() => {
    const preloadImages = () => {
      const imagesToPreload = [];
      
      // Current spread
      if (currentSpreadData.rightPage.image) {
        imagesToPreload.push(currentSpreadData.rightPage.image);
      }
      
      // Next spread
      if (currentSpread < totalSpreads - 1) {
        const nextSpread = bookSpreads[currentSpread + 1];
        if (nextSpread.rightPage.image) {
          imagesToPreload.push(nextSpread.rightPage.image);
        }
      }
      
      // Previous spread
      if (currentSpread > 0) {
        const prevSpread = bookSpreads[currentSpread - 1];
        if (prevSpread.rightPage.image) {
          imagesToPreload.push(prevSpread.rightPage.image);
        }
      }

      imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    };

    preloadImages();
  }, [currentSpread]);

  const handlePageTurn = async (direction: 'next' | 'prev') => {
    if (isPageTurning || isLoading) return;
    
    if (direction === 'next' && currentSpread < totalSpreads - 1) {
      setIsPageTurning(true);
      setTurnDirection('next');
      setIsLoading(true);
      
      // Simulate page turn sound effect (you can add actual audio here)
      console.log('🔊 Page turn sound effect');
      
      setTimeout(() => {
        setCurrentSpread(currentSpread + 1);
        setTimeout(() => {
          setIsPageTurning(false);
          setIsLoading(false);
        }, 400);
      }, 300);
    } else if (direction === 'prev' && currentSpread > 0) {
      setIsPageTurning(true);
      setTurnDirection('prev');
      setIsLoading(true);
      
      // Simulate page turn sound effect
      console.log('🔊 Page turn sound effect');
      
      setTimeout(() => {
        setCurrentSpread(currentSpread - 1);
        setTimeout(() => {
          setIsPageTurning(false);
          setIsLoading(false);
        }, 400);
      }, 300);
    }
  };

  const increaseFontSize = () => {
    if (fontSize < 24) {
      setFontSize(fontSize + 2);
    }
  };

  const decreaseFontSize = () => {
    if (fontSize > 12) {
      setFontSize(fontSize - 2);
    }
  };

  const resetToFirstPage = () => {
    if (!isPageTurning && !isLoading) {
      setCurrentSpread(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-pink-50 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 z-20">
        <button 
          onClick={onBack}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-200"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Main Book Container */}
      <div className="flex items-center justify-center min-h-screen p-4 md:p-8">
        <div className="relative max-w-7xl w-full">
          {/* Book Spread Container */}
          <div 
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-700 ease-out border border-gray-200"
            style={{ 
              aspectRatio: '16/10',
              minHeight: '600px',
              transform: isPageTurning 
                ? `perspective(1200px) rotateY(${turnDirection === 'next' ? '2deg' : '-2deg'})` 
                : 'perspective(1200px) rotateY(0deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Paper Texture Overlay */}
            <div 
              className="absolute inset-0 opacity-3 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Page Turn Animation Overlay */}
            {isPageTurning && (
              <div 
                className={`absolute inset-0 z-10 pointer-events-none transition-all duration-600 ease-out ${
                  turnDirection === 'next' 
                    ? 'bg-gradient-to-r from-transparent via-white/30 to-white/60' 
                    : 'bg-gradient-to-l from-transparent via-white/30 to-white/60'
                }`}
                style={{
                  transform: turnDirection === 'next' 
                    ? 'translateX(0%) skewX(-10deg)' 
                    : 'translateX(0%) skewX(10deg)',
                  animation: turnDirection === 'next' 
                    ? 'pageFlipNext 0.7s ease-out' 
                    : 'pageFlipPrev 0.7s ease-out'
                }}
              />
            )}

            {/* Book Spine */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-300 transform -translate-x-1/2 z-5"></div>

            <div className="flex h-full">
              {/* Left Page */}
              <div 
                className={`w-1/2 p-6 md:p-12 flex flex-col justify-center border-r border-gray-200 transition-all duration-600 ${
                  isPageTurning && turnDirection === 'prev' ? 'transform -translate-x-2 rotate-y-3' : ''
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
                  {currentSpreadData.leftPage.image && (
                    <div className="mb-6">
                      <img
                        src={currentSpreadData.leftPage.image}
                        alt="Left page illustration"
                        className="w-full h-48 object-cover rounded-lg shadow-sm"
                      />
                    </div>
                  )}
                  <p 
                    className="text-gray-800 leading-relaxed font-serif transition-all duration-300"
                    style={{ 
                      fontSize: `${fontSize}px`, 
                      lineHeight: '1.8',
                      textAlign: 'justify'
                    }}
                  >
                    {currentSpreadData.leftPage.text}
                  </p>
                </div>
              </div>

              {/* Right Page */}
              <div 
                className={`w-1/2 relative overflow-hidden transition-all duration-600 ${
                  isPageTurning && turnDirection === 'next' ? 'transform translate-x-2 rotate-y-3' : ''
                }`}
              >
                {currentSpreadData.rightPage.image ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 relative">
                      <img
                        src={currentSpreadData.rightPage.image}
                        alt="Right page illustration"
                        className="w-full h-full object-cover transition-transform duration-700"
                        style={{
                          transform: isPageTurning ? 'scale(1.02)' : 'scale(1)'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                    </div>
                    <div className="p-6 md:p-12 bg-white">
                      <p 
                        className="text-gray-800 leading-relaxed font-serif transition-all duration-300"
                        style={{ 
                          fontSize: `${fontSize}px`, 
                          lineHeight: '1.8',
                          textAlign: 'justify'
                        }}
                      >
                        {currentSpreadData.rightPage.text}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full p-6 md:p-12 flex flex-col justify-center">
                    <div className="max-w-md mx-auto">
                      <p 
                        className="text-gray-800 leading-relaxed font-serif transition-all duration-300"
                        style={{ 
                          fontSize: `${fontSize}px`, 
                          lineHeight: '1.8',
                          textAlign: 'justify'
                        }}
                      >
                        {currentSpreadData.rightPage.text}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Arrows with Enhanced Hover Effects */}
            <button 
              onClick={() => handlePageTurn('prev')}
              disabled={currentSpread === 0 || isPageTurning || isLoading}
              className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 z-10 group ${
                currentSpread === 0 || isPageTurning || isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-white bg-opacity-90 text-gray-700 hover:bg-opacity-100 shadow-lg hover:shadow-xl hover:scale-110 border border-gray-200'
              }`}
            >
              <ChevronLeft className="w-7 h-7 transition-transform duration-300 group-hover:-translate-x-1" />
              
              {/* Corner Page Curl Effect */}
              {currentSpread > 0 && !isPageTurning && !isLoading && (
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-white opacity-0 group-hover:opacity-40 transition-opacity duration-300 transform rotate-45 rounded-tl-lg shadow-sm"></div>
              )}
            </button>

            <button 
              onClick={() => handlePageTurn('next')}
              disabled={currentSpread === totalSpreads - 1 || isPageTurning || isLoading}
              className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 z-10 group ${
                currentSpread === totalSpreads - 1 || isPageTurning || isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-white bg-opacity-90 text-gray-700 hover:bg-opacity-100 shadow-lg hover:shadow-xl hover:scale-110 border border-gray-200'
              }`}
            >
              <ChevronRight className="w-7 h-7 transition-transform duration-300 group-hover:translate-x-1" />
              
              {/* Corner Page Curl Effect */}
              {currentSpread < totalSpreads - 1 && !isPageTurning && !isLoading && (
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-white opacity-0 group-hover:opacity-40 transition-opacity duration-300 transform rotate-45 rounded-tr-lg shadow-sm"></div>
              )}
            </button>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-20">
                <div className="w-8 h-8 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

        {/* Navigation Arrows - Outside the book */}
        <button 
          onClick={() => handlePageTurn('prev')}
          disabled={currentSpread === 0 || isPageTurning || isLoading}
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10 group ${
            currentSpread === 0 || isPageTurning || isLoading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
          }`}
        >
          <ChevronLeft className="w-8 h-8 transition-transform duration-300 group-hover:-translate-x-1" />
          
          {/* Corner Page Curl Effect */}
          {currentSpread > 0 && !isPageTurning && !isLoading && (
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-white opacity-0 group-hover:opacity-40 transition-opacity duration-300 transform rotate-45 rounded-tl-lg shadow-sm"></div>
          )}
        </button>

        <button 
          onClick={() => handlePageTurn('next')}
          disabled={currentSpread === totalSpreads - 1 || isPageTurning || isLoading}
          className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10 group ${
            currentSpread === totalSpreads - 1 || isPageTurning || isLoading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
          }`}
        >
          <ChevronRight className="w-8 h-8 transition-transform duration-300 group-hover:translate-x-1" />
          
          {/* Corner Page Curl Effect */}
          {currentSpread < totalSpreads - 1 && !isPageTurning && !isLoading && (
            <div className="absolute -top-3 -right-3 w-8 h-8 bg-white opacity-0 group-hover:opacity-40 transition-opacity duration-300 transform rotate-45 rounded-tr-lg shadow-sm"></div>
          )}
        </button>

              {/* Page Number Display */}
              <div className="flex items-center space-x-3 px-6 py-2 bg-gray-50 rounded-full border border-gray-200">
                <span className="text-lg font-medium text-gray-700">
                  {currentPageNumber} / {totalPages}
                </span>
              </div>

              {/* Additional Controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={resetToFirstPage}
                  disabled={currentSpread === 0 || isPageTurning || isLoading}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentSpread === 0 || isPageTurning || isLoading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-brand-yellow text-white hover:bg-yellow-600 hover:scale-110 shadow-md'
                  }`}
                  title="Go to first page"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  className="w-10 h-10 rounded-full bg-brand-pink text-white hover:bg-pink-700 hover:scale-110 transition-all duration-300 flex items-center justify-center shadow-md"
                  title="Audio narration"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for Enhanced Page Flip Animations */}
      <style jsx>{`
        @keyframes pageFlipNext {
          0% { 
            transform: translateX(-100%) skewX(-10deg); 
            opacity: 0; 
            filter: blur(1px);
          }
          50% { 
            transform: translateX(0%) skewX(-10deg); 
            opacity: 0.8; 
            filter: blur(0.5px);
          }
          100% { 
            transform: translateX(100%) skewX(-10deg); 
            opacity: 0; 
            filter: blur(1px);
          }
        }
        
        @keyframes pageFlipPrev {
          0% { 
            transform: translateX(100%) skewX(10deg); 
            opacity: 0; 
            filter: blur(1px);
          }
          50% { 
            transform: translateX(0%) skewX(10deg); 
            opacity: 0.8; 
            filter: blur(0.5px);
          }
          100% { 
            transform: translateX(-100%) skewX(10deg); 
            opacity: 0; 
            filter: blur(1px);
          }
        }
        
        .rotate-y-3 {
          transform: rotateY(3deg);
        }
      `}</style>
    </div>
  );
}