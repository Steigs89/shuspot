import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, Volume2 } from 'lucide-react';

interface PageReadingInterfaceProps {
  onBack: () => void;
}

interface BookPage {
  id: number;
  leftText: string;
  rightText?: string;
  leftImage?: string;
  rightImage: string;
  pageNumber: number;
}

export default function PageReadingInterface({ onBack }: PageReadingInterfaceProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [fontSize, setFontSize] = useState(16);
  const [isPageTurning, setIsPageTurning] = useState(false);
  const flipbookRef = useRef<HTMLDivElement>(null);
  const turnJsRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Expanded dummy book pages data with more content
  const bookPages: BookPage[] = [
    {
      id: 1,
      leftText: `It was Christmas Eve, and the snow outside was beginning to fall softly against the frosted windows. In the cozy house at the end of the cobblestone street, Marie and her younger brother Fritz were bustling about excitedly, getting ready for their family's annual Christmas party. The anticipation filled the air like magic.`,
      rightText: `The grand parlor had been beautifully decorated for the occasion. Garlands of evergreen draped the mantelpiece, and in the corner stood a magnificent Christmas tree. It was covered in twinkling candles, delicate glass ornaments, tiny sugared almonds wrapped in silver paper, and at the very top, a beautiful pink sugarplum fairy with gossamer wings.`,
      rightImage: "https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 2
    },
    {
      id: 2,
      leftText: `Soon the guests began to arrive in their finest winter coats and boots, stamping the snow from their feet. There were children everywhere, their laughter echoing through the halls as they played games and chased each other around the furniture. The house came alive with joy and merriment.`,
      rightText: `Just as the party reached its peak, Marie's mysterious godfather, Herr Drosselmeyer, arrived at the door. He was a tall, peculiar man with wild gray hair and twinkling eyes, carrying a large velvet bag full of the most wonderful and unusual presents anyone had ever seen.`,
      rightImage: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 3
    },
    {
      id: 3,
      leftText: `Herr Drosselmeyer was known throughout the town as a master craftsman who created the most magical toys and intricate clockwork mechanisms. The children gathered around him in a wide circle, their eyes sparkling with wonder as he began to distribute his extraordinary gifts with great ceremony.`,
      rightText: `When it was finally Marie's turn, Herr Drosselmeyer reached deep into his mysterious bag and pulled out a beautiful wooden nutcracker. It was carved and painted to look like a brave soldier, complete with a bright red uniform, golden buttons, and the kindest, most gentle face Marie had ever seen.`,
      rightImage: "https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 4
    },
    {
      id: 4,
      leftText: `"This is no ordinary nutcracker," Herr Drosselmeyer whispered to Marie, his voice filled with mystery and magic. "He has been waiting for someone special like you. Take very good care of him, for he holds secrets that only a kind heart can unlock." Marie hugged the nutcracker close, feeling its warmth.`,
      rightText: `But Fritz, feeling jealous of his sister's beautiful and obviously special gift, suddenly grabbed the nutcracker from Marie's hands. "Let me see it! I want to play with it too!" he shouted. In their struggle, the precious nutcracker slipped from their grasp and fell to the hard wooden floor with a terrible crack.`,
      rightImage: "https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 5
    },
    {
      id: 5,
      leftText: `Marie gasped in horror as she saw that her beloved nutcracker's jaw had broken, hanging loose and crooked. Tears filled her eyes as she gently picked up her wounded soldier, cradling him in her arms. "Don't worry, my dear friend," she whispered softly, "I'll take care of you and make you better."`,
      rightText: `That night, long after all the guests had gone home and the house had grown quiet and still, Marie crept downstairs in her white nightgown to check on her injured nutcracker. The parlor was dark and peaceful, with only the silver moonlight streaming through the tall windows, casting magical shadows across the room.`,
      rightImage: "https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 6
    },
    {
      id: 6,
      leftText: `As the grandfather clock in the hallway began to chime midnight, something truly magical started to happen. The Christmas tree began to grow taller and taller, its branches stretching toward the ceiling, while Marie felt herself becoming smaller and smaller, as if she were shrinking like Alice in Wonderland.`,
      rightText: `Suddenly, the nutcracker in her arms began to stir and move! His wooden limbs became flexible, his painted eyes blinked, and he sat up in her hands. "Thank you for caring for me," he said in the gentlest voice. "I am the Nutcracker Prince, and you have broken an evil spell with your kindness."`,
      rightImage: "https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 7
    },
    {
      id: 7,
      leftText: `The Nutcracker Prince stood up and bowed gracefully to Marie. He was now the same size as her, dressed in his magnificent red uniform with golden braiding. "An evil Mouse King cast a spell on me," he explained, "but your pure heart and kindness have set me free. Will you help me defeat him once and for all?"`,
      rightText: `Just then, a terrible squeaking and scratching filled the air. From every corner of the room came an army of mice, led by the fearsome Mouse King with his seven crowns and gleaming sword. "The Nutcracker Prince!" he hissed. "You cannot escape me!" The battle for the kingdom was about to begin.`,
      rightImage: "https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 8
    },
    {
      id: 8,
      leftText: `The Nutcracker Prince drew his tiny sword and called forth an army of toy soldiers from under the Christmas tree. They marched in perfect formation, their drums beating and flags flying. Marie watched in amazement as the epic battle between good and evil unfolded before her very eyes in the moonlit parlor.`,
      rightText: `The battle raged back and forth across the room. Just when it seemed the Mouse King might win, Marie threw her slipper at him, striking him down. The mice scattered in defeat, and the Nutcracker Prince was victorious! "You have saved me twice now," he said gratefully. "Come, let me show you my kingdom."`,
      rightImage: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 9
    }
  ];

  const totalPages = bookPages.length * 2 + 2; // Each spread has 2 pages + front and back covers
  const currentPageData = bookPages[Math.floor((currentPage - 1) / 2)];

  // Initialize Turn.js
  useEffect(() => {
    const initializeTurnJs = () => {
      console.log('Attempting to initialize Turn.js...');
      
      if (!flipbookRef.current) {
        console.log('flipbookRef.current is null, cannot initialize');
        return;
      }
      
      if (!window.$ || !window.$.fn.turn) {
        console.log('jQuery or Turn.js not available');
        return;
      }

      // Wait for React to finish rendering all pages
      setTimeout(() => {
        if (!flipbookRef.current) {
          console.log('flipbookRef.current became null during timeout');
          return;
        }

        const childrenCount = flipbookRef.current.children.length;
        console.log(`DOM children count: ${childrenCount}, Expected: ${totalPages}`);
        
        if (childrenCount !== totalPages) {
          console.log(`Mismatch: Expected ${totalPages} pages, but found ${childrenCount} DOM children`);
          return;
        }

        // Destroy existing instance if it exists
        if (turnJsRef.current) {
          try {
            window.$(flipbookRef.current).turn('destroy');
            console.log('Destroyed existing Turn.js instance');
          } catch (e) {
            console.log('No existing turn instance to destroy');
          }
        }

        console.log('Initializing Turn.js with settings...');
        // Initialize Turn.js
        turnJsRef.current = window.$(flipbookRef.current).turn({
          width: 1000,
          height: 600,
          autoCenter: true,
          acceleration: true,
          gradients: true,
          elevation: 50,
          duration: 1000,
          pages: totalPages,
          when: {
            turning: function(event: any, page: number, view: any) {
              console.log(`Turning to page: ${page}`);
              setIsPageTurning(true);
              setCurrentPage(page);
              
              // Play page turn sound effect (optional)
              try {
                const audio = new Audio('/sounds/page-turn.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {
                  // Ignore audio errors if file doesn't exist
                });
              } catch (e) {
                // Ignore audio errors
              }
            },
            turned: function(event: any, page: number, view: any) {
              console.log(`Turned to page: ${page}`);
              setIsPageTurning(false);
            }
          }
        });

        console.log('Turn.js initialized successfully');
        setIsInitialized(true);

        // Add keyboard navigation
        window.$(document).keydown(function(e: any) {
          if (e.keyCode === 37) { // Left arrow
            window.$(flipbookRef.current).turn('previous');
          } else if (e.keyCode === 39) { // Right arrow
            window.$(flipbookRef.current).turn('next');
          }
        });
      }, 0); // Defer to next tick to ensure DOM is ready
    };

    // Load Turn.js if not already loaded
    if (!window.$ || !window.$.fn.turn) {
      console.log('Loading jQuery and Turn.js...');
      const script1 = document.createElement('script');
      script1.src = '/js/jquery.js';
      script1.onload = () => {
        console.log('jQuery loaded');
        const script2 = document.createElement('script');
        script2.src = '/js/turn.js';
        script2.onload = () => {
          console.log('Turn.js loaded');
          initializeTurnJs();
        };
        document.head.appendChild(script2);
      };
      document.head.appendChild(script1);
    } else {
      console.log('jQuery and Turn.js already available');
      initializeTurnJs();
    }

    return () => {
      // Cleanup
      if (turnJsRef.current && flipbookRef.current && window.$ && window.$.fn.turn) {
        try {
          window.$(flipbookRef.current).turn('destroy');
        } catch (e) {
          console.log('Error destroying turn instance');
        }
      }
      if (window.$ && window.$.fn) {
        window.$(document).off('keydown');
      }
    };
  }, [totalPages]);

  const handlePageTurn = (direction: 'next' | 'prev') => {
    if (isPageTurning || !turnJsRef.current || !isInitialized) {
      console.log('Cannot turn page: isPageTurning:', isPageTurning, 'turnJsRef:', !!turnJsRef.current, 'isInitialized:', isInitialized);
      return;
    }
    
    if (direction === 'next') {
      console.log('Turning to next page');
      window.$(flipbookRef.current).turn('next');
    } else {
      console.log('Turning to previous page');
      window.$(flipbookRef.current).turn('previous');
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

  const renderPage = (pageIndex: number, key: number) => {
    // Handle front cover (page 0)
    if (pageIndex === 0) {
      return (
        <div key={key} className="hard flex flex-col justify-center items-center p-8 bg-gradient-to-br from-brand-pink to-pink-700">
          <h1 className="text-4xl font-bold text-white mb-4">The Nutcracker</h1>
          <p className="text-xl text-white opacity-90">By E. T. A. Hoffman</p>
          <small className="text-white opacity-70 mt-4">A Classic Christmas Tale</small>
        </div>
      );
    }

    // Handle back cover (last page)
    if (pageIndex === totalPages - 1) {
      return (
        <div key={key} className="hard flex flex-col justify-center items-center p-8 bg-gradient-to-br from-brand-pink to-pink-700">
          <h2 className="text-3xl font-bold text-white mb-4">The End</h2>
          <p className="text-lg text-white opacity-90">Thank you for reading!</p>
        </div>
      );
    }

    // Calculate which book page this corresponds to (accounting for front cover)
    const adjustedPageIndex = pageIndex - 1; // Subtract 1 for front cover
    const spreadIndex = Math.floor(adjustedPageIndex / 2);
    const pageData = bookPages[spreadIndex];
    
    if (!pageData) {
      return (
        <div key={key} className="page flex items-center justify-center">
          <p className="text-gray-500">Page not found</p>
        </div>
      );
    }

    const isLeftPageInSpread = adjustedPageIndex % 2 === 0;

    return (
      <div key={key} className="page">
        {isLeftPageInSpread ? (
          // Left page - Text
          <div className="h-full p-8 flex flex-col justify-center">
            <p 
              className="text-gray-800 leading-relaxed font-serif"
              style={{ fontSize: `${fontSize}px`, lineHeight: '1.7' }}
            >
              {pageData.leftText}
            </p>
          </div>
        ) : (
          // Right page - Image and text
          <div className="h-full flex flex-col">
            <div className="flex-1">
              <img
                src={pageData.rightImage}
                alt={`Page ${pageData.pageNumber} illustration`}
                className="w-full h-full object-cover"
              />
            </div>
            {pageData.rightText && (
              <div className="p-6 bg-white">
                <p 
                  className="text-gray-800 leading-relaxed font-serif"
                  style={{ fontSize: `${fontSize}px`, lineHeight: '1.7' }}
                >
                  {pageData.rightText}
                </p>
              </div>
            )}
          </div>
        )}
        <small className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-500">
          {pageIndex + 1}
        </small>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <div className="absolute top-4 left-4 z-20">
        <button 
          onClick={onBack}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      <div className="flex items-center justify-center min-h-screen p-8">
        {/* Main Reading Area with Turn.js */}
        <div className="relative">
          {/* Flipbook Container */}
          <div 
            ref={flipbookRef}
            className="flipbook shadow-2xl"
          >
            {/* Generate all pages */}
            {Array.from({ length: totalPages }, (_, index) => (
              renderPage(index, index)
            ))}
          </div>

        </div>
      </div>

      {/* Navigation Arrows - Outside the book */}
      <button 
        onClick={() => handlePageTurn('prev')}
        disabled={currentPage <= 1 || isPageTurning || !isInitialized}
        className={`absolute left-8 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10 group ${
          currentPage <= 1 || isPageTurning || !isInitialized
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
            : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
        }`}
      >
        <ChevronLeft className="w-8 h-8 transition-transform duration-300 group-hover:-translate-x-1" />
      </button>

      <button 
        onClick={() => handlePageTurn('next')}
        disabled={currentPage >= totalPages || isPageTurning || !isInitialized}
        className={`absolute right-8 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10 group ${
          currentPage >= totalPages || isPageTurning || !isInitialized
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
            : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
        }`}
      >
        <ChevronRight className="w-8 h-8 transition-transform duration-300 group-hover:translate-x-1" />
      </button>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="bg-white rounded-full shadow-xl px-8 py-4 flex items-center space-x-6">
          {/* Font Size Controls */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={decreaseFontSize}
              disabled={fontSize <= 12}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                fontSize <= 12 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-brand-blue text-white hover:bg-blue-600 hover:scale-110'
              }`}
            >
              <Minus className="w-4 h-4" />
            </button>            
            <div className="flex items-center space-x-2 px-3">
              <span className="text-2xl font-serif">Aa</span>
              <span className="text-sm text-gray-500">{fontSize}px</span>
            </div>
            <button 
              onClick={increaseFontSize}
              disabled={fontSize >= 24}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                fontSize >= 24 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-brand-blue text-white hover:bg-blue-600 hover:scale-110'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Page Number Display */}
          <div className="flex items-center space-x-3 px-6 py-2 bg-gray-50 rounded-full border border-gray-200">
            <span className="text-lg font-medium text-gray-700">
              {currentPage} / {totalPages}
            </span>
          </div>

          {/* Additional Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (!isPageTurning && isInitialized) {
                  window.$(flipbookRef.current).turn('page', 1);
                }
              }}
              disabled={currentPage <= 1 || isPageTurning}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                currentPage <= 1 || isPageTurning
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
  );
}