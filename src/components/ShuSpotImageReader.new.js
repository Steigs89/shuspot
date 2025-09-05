import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ShuSpotImageReader = ({ book, onBack }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [showNavigation, setShowNavigation] = useState(true);
  const [readingTime, setReadingTime] = useState(0);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [startTime] = useState(Date.now());

  const hideTimeoutRef = useRef(null);

  // Book data extraction
  const pages = book?._page_sequence || [];
  const totalPages = book?._total_pages || pages.length || 0;
  const title = book?.Name || book?.title || 'Unknown Title';

  // Debug logging
  console.log('Book data:', book);
  console.log('Page sequence:', pages);
  console.log('Total pages:', totalPages);
  console.log('Book folder path:', book?._folder_path);
  console.log('Current page:', currentPage);

  // Reading time update
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      setReadingTime(elapsed);
    }, 60000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Initial navigation state
  useEffect(() => {
    setShowNavigation(false);
  }, []);

  // User activity handler
  const handleUserActivity = () => {
    setShowNavigation(true);
    setLastActivityTime(Date.now());
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowNavigation(false);
    }, 5000);
  };

  // Page data getters
  const getLeftPageData = () => {
    const pageIndex = Math.floor((currentPage - 1) / 2) * 2;
    return pages[pageIndex] || null;
  };

  const getRightPageData = () => {
    const pageIndex = Math.floor((currentPage - 1) / 2) * 2 + 1;
    return pages[pageIndex] || null;
  };

  // Navigation handlers
  const nextSpread = () => {
    const nextPageNum = currentPage + 2;
    if (nextPageNum <= totalPages) {
      setIsPageTurning(true);
      setShowNavigation(false);
      setTimeout(() => {
        setCurrentPage(nextPageNum);
        setTimeout(() => setIsPageTurning(false), 300);
      }, 150);
    }
  };

  const prevSpread = () => {
    if (currentPage > 2) {
      setIsPageTurning(true);
      setShowNavigation(false);
      setTimeout(() => {
        const prevPageNum = Math.max(1, currentPage - 2);
        setCurrentPage(prevPageNum);
        setTimeout(() => setIsPageTurning(false), 300);
      }, 150);
    }
  };

  const leftPageData = getLeftPageData();
  const rightPageData = getRightPageData();

  // Image URL construction
  const constructImageUrl = (pageData, pageNumber) => {
    if (!pageData?.file_path && !book?.notes) return null;

    if (pageData?.file_path) {
      const materialMatch = pageData.file_path.match(/MaterialsShuspotI\/([^/]+.*)$/);
      const cropMatch = pageData.file_path.match(/WEEK 70 CROP-SHuSpot\/([^/]+.*)$/);

      if (materialMatch) {
        const [, relativePath] = materialMatch;
        return `http://localhost:8000/shuspot-images/MaterialsShuspotI/${relativePath}`;
      } else if (cropMatch) {
        const bookPath = cropMatch[1].replace(/\/[^/]+$/, '');
        return `http://localhost:8000/shuspot-images/WEEK 70 CROP-SHuSpot/${bookPath}/resized/crop-${pageNumber}.png`;
      }
    }

    if (book?.notes) {
      try {
        const parsedNotes = JSON.parse(book.notes);
        const folderPath = parsedNotes.folder_path;
        
        if (folderPath) {
          const materialMatch = folderPath.match(/MaterialsShuspotI\/([^/]+.*)$/);
          const cropMatch = folderPath.match(/WEEK 70 CROP-SHuSpot\/([^/]+.*)$/);
          
          if (materialMatch) {
            const [, relativePath] = materialMatch;
            const imageFile = `screenshot ${pageNumber}.png`;
            return `http://localhost:8000/shuspot-images/MaterialsShuspotI/${relativePath}/${imageFile}`;
          } else if (cropMatch) {
            return `http://localhost:8000/shuspot-images/WEEK 70 CROP-SHuSpot/${cropMatch[1]}/resized/crop-${pageNumber}.png`;
          }
        }
      } catch (e) {
        console.error('Error parsing notes:', e);
      }
    }

    return null;
  };

  const leftImageUrl = constructImageUrl(leftPageData, currentPage);
  const rightImageUrl = constructImageUrl(rightPageData, currentPage + 1);

  return (
    <div className="shuspot-image-reader relative w-full h-full">
      {/* Hover area */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 z-50"
        onMouseEnter={handleUserActivity}
      />

      {/* Top Border Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-40 transition-all duration-300 ${
          showNavigation ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="w-full h-1 bg-blue-500" />
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNavigation(!showNavigation);
            }}
            className="w-16 h-10 bg-blue-500 text-white rounded-b-lg shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <div className="text-2xl">{showNavigation ? '▲' : '▼'}</div>
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div
        className={`absolute top-0 left-0 right-0 bg-white shadow-lg z-30 transition-transform duration-300 ${
          showNavigation ? 'translate-y-0' : '-translate-y-full'
        }`}
        onMouseLeave={() => setShowNavigation(false)}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex space-x-2">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-gray-600 rounded-full" />
                <div className="w-1 h-1 bg-gray-600 rounded-full" />
                <div className="w-1 h-1 bg-gray-600 rounded-full" />
              </div>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <span className="text-2xl">♥</span>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <span className="text-2xl">🎁</span>
            </button>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold truncate px-4">{title}</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNavigation(false);
              }}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <span className="text-2xl">▲</span>
            </button>
            <button 
              onClick={onBack}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full h-full pt-16 pb-20">
        <div className="relative w-full h-full flex items-center justify-center px-4">
          <div 
            className={`relative w-full max-w-6xl aspect-[16/10] ${
              isPageTurning ? 'scale-95' : 'scale-100'
            } transition-transform duration-300`}
          >
            {/* Pages Container */}
            <div className="absolute inset-0 flex">
              {/* Left Page */}
              <div className="flex-1 p-2">
                {leftImageUrl ? (
                  <img
                    src={leftImageUrl}
                    alt={`Page ${currentPage}`}
                    className="w-full h-full object-contain"
                    style={{
                      transform: isPageTurning ? 'translateX(-8px)' : 'none',
                      transition: 'transform 0.3s ease-out'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📖</div>
                      <p className="text-gray-600">Page {currentPage}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Page */}
              <div className="flex-1 p-2">
                {rightImageUrl ? (
                  <img
                    src={rightImageUrl}
                    alt={`Page ${currentPage + 1}`}
                    className="w-full h-full object-contain"
                    style={{
                      transform: isPageTurning ? 'translateX(8px)' : 'none',
                      transition: 'transform 0.3s ease-out'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📖</div>
                      <p className="text-gray-600">Page {currentPage + 1}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSpread}
              disabled={currentPage <= 1 || isPageTurning}
              className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 shadow-lg transition-opacity ${
                currentPage <= 1 || isPageTurning ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-white'
              }`}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <button
              onClick={nextSpread}
              disabled={currentPage >= totalPages || isPageTurning}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 shadow-lg transition-opacity ${
                currentPage >= totalPages || isPageTurning ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-white'
              }`}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>

      {/* Reading Timer */}
      <div 
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 transition-all duration-300"
        style={{
          opacity: showNavigation ? 1 : 0,
          transform: `translate(-50%, ${showNavigation ? '0' : '1rem'})`,
          pointerEvents: showNavigation ? 'auto' : 'none'
        }}
      >
        <div className="bg-white rounded-full shadow-lg p-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="#e5e7eb"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="url(#timer-gradient)"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(readingTime / 60) * 175.93} 175.93`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-xl">📖</div>
              <div className="text-xs font-semibold text-gray-600 mt-1">
                {readingTime}m
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white shadow-lg transition-transform duration-300"
        style={{
          transform: `translateY(${showNavigation ? '0' : '100%'})`
        }}
      >
        <div className="px-4 py-2">
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300"
              style={{ width: `${(currentPage / totalPages) * 100}%` }}
            />
          </div>
          <div className="text-center mt-1">
            <span className="text-sm font-medium text-gray-600">
              {currentPage} / {totalPages}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShuSpotImageReader;
