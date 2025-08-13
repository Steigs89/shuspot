import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, Volume2 } from 'lucide-react';
import { pdfjs as pdfjsLib } from 'react-pdf';
import { useUserStats } from '../contexts/UserStatsContext';

// This MUST be before you call pdfjsLib.getDocument()
// Using version that matches react-pdf
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs';

interface PdfBookData {
  id: string;
  title: string;
  author: string;
  cover: string;
  pdfUrl: string;
  gradeLevel: string;
  mediaType: string;
  genre: string;
  totalPages: number;
  file: File;
}

interface PdfViewerProps {
  onBack: () => void;
  pdfBook: PdfBookData;
  onProgressUpdate?: (bookId: string, pagesRead: number) => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

export default function PdfViewer({ onBack, pdfBook, onProgressUpdate, isFavorited = false, onToggleFavorite }: PdfViewerProps) {
  const { updateReadingProgress, addReadingSession } = useUserStats();
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [showNavigation, setShowNavigation] = useState(true);
  const [readingTime, setReadingTime] = useState(0); // Reading time in minutes
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [startTime] = useState(Date.now());
  const [isMobile, setIsMobile] = useState(false);

  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftRenderTaskRef = useRef<any>(null);
  const rightRenderTaskRef = useRef<any>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        console.log('Starting PDF load for:', pdfBook.title);

        // Always use the File object directly - most reliable approach
        if (!pdfBook.file || pdfBook.file.size === 0) {
          throw new Error('No valid PDF file available');
        }

        console.log('Using File object directly, size:', pdfBook.file.size, 'type:', pdfBook.file.type);
        
        // Convert File to ArrayBuffer for PDF.js
        console.log('Converting file to ArrayBuffer...');
        const arrayBuffer = await pdfBook.file.arrayBuffer();
        console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);

        console.log('Loading PDF with pdfjsLib.getDocument...');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.log('PDF loading timeout reached');
            reject(new Error('PDF loading timeout after 15 seconds'));
          }, 15000);
        });
        
        console.log('Waiting for PDF to load...');
        const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
        
        console.log('PDF loaded successfully, pages:', pdf.numPages);
        setPdfDocument(pdf);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', pdfBook.title, error);
        setIsLoading(false);
        alert(`Failed to load PDF: ${pdfBook.title}. Error: ${error.message}`);
      }
    };

    loadPdf();

    // Cleanup
    return () => {
      if (pdfDocument) {
        pdfDocument.destroy();
      }
    };
  }, [pdfBook.id]); // Only depend on book ID to avoid unnecessary reloads

  // Render pages when current page or scale changes
  useEffect(() => {
    if (pdfDocument && !isLoading) {
      renderPages();
    }
  }, [pdfDocument, currentPage, scale, isLoading]);

  // Track reading progress when page changes (with debouncing to prevent infinite loops)
  useEffect(() => {
    if (onProgressUpdate && currentPage > 0) {
      // Debounce the progress update to prevent infinite loops
      const timeoutId = setTimeout(() => {
        const pagesRead = Math.min(currentPage + 1, pdfBook.totalPages);
        onProgressUpdate(pdfBook.id, pagesRead);
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    }
  }, [currentPage, pdfBook.id, pdfBook.totalPages]); // Remove onProgressUpdate from dependencies

  // Navigation starts hidden
  useEffect(() => {
    setShowNavigation(false);
  }, []);

  // Update reading time every minute and track progress
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      setReadingTime(elapsed);
      
      // Update reading progress in user stats every minute
      if (elapsed > 0) {
        updateReadingProgress(pdfBook.id, currentPage, 1); // 1 minute increment
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [startTime, currentPage, pdfBook.id]);

  // Initialize reading session when component mounts
  useEffect(() => {
    addReadingSession({
      bookId: pdfBook.id,
      bookTitle: pdfBook.title,
      bookType: 'pdf',
      pagesRead: currentPage,
      totalPages: pdfBook.totalPages,
      timeSpent: 0,
      isCompleted: false
    });
  }, [pdfBook.id]); // Only run once when component mounts

  // Handle user activity to show navigation
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

  const renderPages = async () => {
    if (!pdfDocument) return;

    try {
      // Render left page (current page)
      if (currentPage <= pdfBook.totalPages) {
        await renderPage(currentPage, leftCanvasRef.current, leftRenderTaskRef);
      }

      // Render right page (current page + 1) if it exists
      if (currentPage + 1 <= pdfBook.totalPages) {
        await renderPage(currentPage + 1, rightCanvasRef.current, rightRenderTaskRef);
      } else if (rightCanvasRef.current) {
        // Cancel any ongoing render task for right canvas
        if (rightRenderTaskRef.current) {
          rightRenderTaskRef.current.cancel();
          rightRenderTaskRef.current = null;
        }
        // Clear right canvas if no page to show
        const context = rightCanvasRef.current.getContext('2d');
        if (context) {
          context.clearRect(0, 0, rightCanvasRef.current.width, rightCanvasRef.current.height);
        }
      }
    } catch (error) {
      console.error('Error rendering pages:', error);
    }
  };

  const renderPage = async (pageNumber: number, canvas: HTMLCanvasElement | null, renderTaskRef: React.MutableRefObject<any>) => {
    if (!canvas || !pdfDocument) return;

    try {
      // Cancel any previous render task for this canvas
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      const page = await pdfDocument.getPage(pageNumber);
      const context = canvas.getContext('2d');

      if (!context) return;

      // Calculate viewport with optimized scale
      const viewport = page.getViewport({ scale });

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Use simple, reliable rendering
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;

      // Clear the render task reference when completed
      if (renderTaskRef.current === renderTask) {
        renderTaskRef.current = null;
      }
    } catch (error) {
      // Only log error if it's not a cancellation
      if (error.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNumber}:`, error);
      }
    }
  };

  const nextSpread = () => {
    if (currentPage + 2 <= pdfBook.totalPages) {
      setIsPageTurning(true);
      setShowNavigation(false); // Hide navigation when turning pages
      setTimeout(() => {
        setCurrentPage(currentPage + 2);
        setTimeout(() => setIsPageTurning(false), 300);
      }, 150);
    }
  };

  const prevSpread = () => {
    if (currentPage > 1) {
      setIsPageTurning(true);
      setShowNavigation(false); // Hide navigation when turning pages
      setTimeout(() => {
        setCurrentPage(Math.max(1, currentPage - 2));
        setTimeout(() => setIsPageTurning(false), 300);
      }, 150);
    }
  };

  const increaseScale = () => {
    if (scale < 2.0) {
      setScale(scale + 0.2);
    }
  };

  const decreaseScale = () => {
    if (scale > 0.5) {
      setScale(scale - 0.2);
    }
  };

  const resetToFirstPage = () => {
    if (!isPageTurning) {
      setCurrentPage(1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-pink border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (!pdfDocument) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeft className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">PDF Not Available</h2>
          <p className="text-gray-600 mb-4">
            This PDF is no longer available. PDFs need to be re-uploaded after refreshing the page.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Hover area at bottom to show navigation */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 z-50"
        onMouseEnter={() => setShowNavigation(true)}
      />

      {/* Top Border Bar with Toggle Arrow - Only visible when nav is hidden */}
      <div className={`absolute top-0 left-0 right-0 z-40 transition-all duration-300 ${showNavigation ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
        {/* Top border bar */}
        <div className="w-full h-1 bg-blue-500"></div>

        {/* Toggle Arrow connected to the bar */}
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

      {/* Epic-Style Top Navigation Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 transition-transform duration-300 ${showNavigation ? 'translate-y-0' : '-translate-y-full'}`}
        onMouseLeave={() => setShowNavigation(false)}
      >
        <div className="bg-blue-500 text-white px-4 py-3 flex items-center justify-between shadow-lg">
          {/* Left Controls */}
          <div className="flex items-center space-x-6">
            <button className="text-white hover:text-blue-200 transition-colors">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            </button>
            <button
              onClick={onToggleFavorite}
              className={`transition-colors ${isFavorited ? 'text-red-300' : 'text-white hover:text-red-300'}`}
            >
              <div className="text-3xl">♥</div>
            </button>
            <button className="text-white hover:text-blue-200 transition-colors">
              <div className="text-3xl">🎁</div>
            </button>
          </div>

          {/* Center Title */}
          <div className="flex-1 text-center">
            <h1 className="text-lg font-superclarendon-bold truncate px-4">{pdfBook.title}</h1>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-4">
            {/* Collapse/Expand Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNavigation(false);
              }}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="text-2xl">▲</div>
              </div>
            </button>
            {/* Close Button */}
            <button
              onClick={onBack}
              className="text-white hover:text-blue-200 transition-colors text-3xl"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* Main Book Container */}
      <div className="flex items-center justify-center min-h-screen p-2 sm:p-4 md:p-8">
        <div className="relative max-w-7xl w-full">
          {/* Book Spread Container */}
          <div
            className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden transition-all duration-700 ease-out border border-gray-200 cursor-pointer"
            style={{
              aspectRatio: isMobile ? '4/5' : '16/10', // Taller aspect ratio on mobile
              minHeight: isMobile ? '400px' : '600px', // Shorter on mobile
              transform: isPageTurning ? 'perspective(1200px) rotateY(2deg)' : 'perspective(1200px) rotateY(0deg)',
              transformStyle: 'preserve-3d'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowNavigation(false);
            }}
          >
            {/* Page Turn Animation Overlay */}
            {isPageTurning && (
              <div
                className="absolute inset-0 z-10 pointer-events-none transition-all duration-600 ease-out bg-gradient-to-r from-transparent via-white/20 to-white/40"
                style={{
                  transform: 'translateX(0%) skewX(-15deg)',
                  animation: 'pageFlipNext 0.6s ease-out'
                }}
              />
            )}

            {/* Book Spine */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-300 transform -translate-x-1/2 z-5"></div>

            {/* Mobile: Single page view, Desktop: Two page spread */}
            <div className="flex h-full">
              {/* Mobile: Show only current page, Desktop: Left page */}
              <div className={`${isMobile ? 'w-full' : 'w-1/2'} p-2 sm:p-4 flex items-center justify-center ${!isMobile ? 'border-r border-gray-200' : ''}`}>
                <canvas
                  ref={leftCanvasRef}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: isPageTurning ? 'transform -translate-x-2' : '',
                    transition: 'transform 0.6s ease-out'
                  }}
                />
              </div>

              {/* Desktop only: Right page */}
              {!isMobile && (
                <div className="w-1/2 p-2 sm:p-4 flex items-center justify-center">
                  <canvas
                    ref={rightCanvasRef}
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: isPageTurning ? 'transform translate-x-2' : '',
                      transition: 'transform 0.6s ease-out'
                    }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* Navigation Arrows - Outside the book */}
          <button
            onClick={prevSpread}
            disabled={currentPage <= 1 || isPageTurning}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10 group ${currentPage <= 1 || isPageTurning
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
              }`}
          >
            <ChevronLeft className="w-8 h-8 transition-transform duration-300 group-hover:-translate-x-1" />
          </button>

          <button
            onClick={nextSpread}
            disabled={currentPage >= pdfBook.totalPages || isPageTurning}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10 group ${currentPage >= pdfBook.totalPages || isPageTurning
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
              }`}
          >
            <ChevronRight className="w-8 h-8 transition-transform duration-300 group-hover:translate-x-1" />
          </button>


        </div>
      </div>

      {/* Epic-Style Reading Timer - Above Progress Bar */}
      <div className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30 transition-all duration-300 ${showNavigation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
        <div className="bg-white rounded-full shadow-lg p-4 border border-gray-200">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Circular Progress Background */}
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="#e5e7eb"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="url(#gradient)"
                strokeWidth="5"
                fill="none"
                strokeDasharray={`${(readingTime / 60) * 219.911} 219.911`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>

            {/* Reading Icon and Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl mb-1">📖</div>
              <div className="text-sm font-bold text-gray-700">Read</div>
            </div>
          </div>

          {/* Reading Time Text */}
          <div className="text-center mt-3">
            <div className="text-sm font-medium text-gray-600">
              for {readingTime} minute{readingTime !== 1 ? 's' : ''}!
            </div>
            <div className="text-yellow-500 text-lg">⭐</div>
          </div>
        </div>
      </div>

      {/* Epic-Style Bottom Progress Bar */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${showNavigation ? 'translate-y-0' : 'translate-y-full'
        }`}>
        <div className="bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
          {/* Progress Bar */}
          <div className="flex items-center space-x-4 mb-2">
            <div
              className="flex-1 bg-gray-200 rounded-full h-3 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                const newPage = Math.max(1, Math.min(pdfBook.totalPages, Math.round(percentage * pdfBook.totalPages)));
                setCurrentPage(newPage);
              }}
            >
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(currentPage / pdfBook.totalPages) * 100}%` }}
              ></div>
            </div>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <div className="w-8 h-8 flex items-center justify-center text-xl">⚙️</div>
            </button>
          </div>

          {/* Page Indicator */}
          <div className="text-center">
            <span className="text-sm font-medium text-gray-600">
              PAGE {currentPage} OF {pdfBook.totalPages}
            </span>
          </div>
        </div>
      </div>



      {/* Custom CSS for Page Flip Animation */}
      <style jsx>{`
        @keyframes pageFlipNext {
          0% { 
            transform: translateX(-100%) skewX(-10deg); 
            opacity: 0; 
          }
          50% { 
            transform: translateX(0%) skewX(-10deg); 
            opacity: 0.8; 
          }
          100% { 
            transform: translateX(100%) skewX(-10deg); 
            opacity: 0; 
          }
        }
      `}</style>
    </div>
  );
}