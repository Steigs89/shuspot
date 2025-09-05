import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { getApiUrl } from '../utils/api';

const ShuSpotImageReader = ({ book, onBack, onBookmarkPage }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNavigation, setShowNavigation] = useState(true);
  const [useEnhancedReader, setUseEnhancedReader] = useState(true); // Default to enhanced
  const [readingTime, setReadingTime] = useState(0);
  const [startTime] = useState(Date.now());
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState(null);
  // Dynamic flipbook height (based on single page aspect ratio, not full spread)
  const BOOK_WIDTH = 1400; // full spread width - balanced size for good visibility
  const SINGLE_PAGE_WIDTH = BOOK_WIDTH / 2;
  const [bookHeight, setBookHeight] = useState(650); // Reduced from 800 to fit better in container
  const imageAspectHeightRef = useRef(null); // store ideal image-based height
  // Using consistent double-spread layout (removed coverMode for stability)
    const [turnJsLoaded, setTurnJsLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [jQueryLoaded, setJQueryLoaded] = useState(false);
  
  const flipBookRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const libsLoadedRef = useRef(false); // prevent double script injection (StrictMode)
  const turnInitRef = useRef(false);   // prevent duplicate Turn.js init
  
  const title = book?.title || 'Unknown Book';
  const bookId = book?.id;

  // Memoize the image URL function to prevent infinite re-renders
  const getImageUrl = useCallback((pageData, pageNumber) => {
    // UPDATED VERSION - New timestamp: 2024-01-09 - If you see old URL patterns, clear browser cache completely
    console.log('🔥 UPDATED getImageUrl VERSION - 2024-01-09 - If you see absolute paths, browser cache needs clearing');
    
    // Don't encode path segments - let the browser handle URL encoding
    const encodePath = (path) => {
      return path; // Return path as-is, browser will encode when needed
    };

    console.log('🖼️ getImageUrl called for page:', pageNumber);
    console.log('📁 pageData:', pageData);
    console.log('📚 book folder_path:', book?.folder_path);

    if (pageData?.file_path) {
      const cropMatch = pageData.file_path.match(/.*CROP-ShuSpot[\/\\](.+)$/);
      
      if (cropMatch) {
        const [, relativePath] = cropMatch;
        const cleanPath = relativePath.replace(/[\\/]+/g, '/');
        const url = `${getApiUrl()}/CROP-ShuSpot/${encodePath(cleanPath)}`;
        console.log('🎯 Generated pageData URL:', url);
        return url;
      }
    }

    if (book?.notes) {
      try {
        const parsedNotes = JSON.parse(book.notes);
        const folderPath = parsedNotes.folder_path;
        if (folderPath) {
          const cropMatch = folderPath.match(/.*CROP-ShuSpot[\/\\](.+)$/);
          
          if (cropMatch) {
            const [, relativePath] = cropMatch;
            const cleanPath = relativePath.replace(/[\\/]+/g, '/');
            const url = `${getApiUrl()}/CROP-ShuSpot/${encodePath(cleanPath)}/resized/crop-${pageNumber}.png`;
            console.log('🎯 Generated notes URL:', url);
            return url;
          }
        }
      } catch (e) {
        console.error('Error parsing notes:', e);
      }
    }

    // Fallback: folder_path may have spaces
    if (book?.folder_path) {
      const cropMatch = book.folder_path.match(/.*CROP-ShuSpot[\/\\](.+)$/);
      if (cropMatch) {
        const [, relativePath] = cropMatch;
        const cleanPath = relativePath.replace(/[\\/]+/g, '/');
        const url = `${getApiUrl()}/CROP-ShuSpot/${encodePath(cleanPath)}/resized/crop-${pageNumber}.png`;
        console.log('🎯 Generated folder_path URL:', url);
        return url;
      }
    }
    
    const fallbackUrl = `${getApiUrl()}/CROP-ShuSpot/page-${pageNumber}.png`;
    console.log('🎯 Generated fallback URL:', fallbackUrl);
    return fallbackUrl;
  }, [book?.notes, book?.folder_path]);

  // Load jQuery and Turn.js from the working files (book-effect style)
  useEffect(() => {
    console.log('🔄 BOOK-EFFECT STYLE: Loading jQuery and Turn.js from public files');
    
    const loadScripts = async () => {
      try {
        // Load jQuery first
        if (!window.jQuery) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/jquery.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          console.log('✅ jQuery loaded from public/js/jquery.js');
        }

        // Then load Turn.js
        if (!window.jQuery.fn.turn) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/turn.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          console.log('✅ Turn.js loaded from public/js/turn.js');
        }

        // Check if Turn.js is available
        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.turn) {
          console.log('✅ BOOK-EFFECT STYLE: jQuery and Turn.js loaded successfully');
          setTurnJsLoaded(true);
        } else {
          console.error('❌ BOOK-EFFECT STYLE: Turn.js not available after loading');
          setTurnJsLoaded(false);
        }
      } catch (error) {
        console.error('❌ BOOK-EFFECT STYLE: Error loading scripts:', error);
        setTurnJsLoaded(false);
      }
    };

    loadScripts();
  }, []);

  // Fetch book data from props
  const fetchBookData = useCallback(async () => {
    console.log('fetchBookData called with:', { bookId, book });
    console.log('Book structure:', book);
    
    if (!book) {
      console.error('No book data provided');
      setError('No book data provided');
      setLoading(false);
      return;
    }

    // Check for page_sequence in the book object
    let pageSequence = null;
    if (book._page_sequence && Array.isArray(book._page_sequence)) {
      pageSequence = book._page_sequence;
    } else if (book.page_sequence && Array.isArray(book.page_sequence)) {
      pageSequence = book.page_sequence;
    } else if (book.notes && typeof book.notes === 'string') {
      // Try parsing notes if it's a JSON string
      try {
        const parsedNotes = JSON.parse(book.notes);
        if (parsedNotes.page_sequence && Array.isArray(parsedNotes.page_sequence)) {
          pageSequence = parsedNotes.page_sequence;
        }
      } catch (e) {
        console.log('Notes is not valid JSON:', e);
      }
    } else if (book.notes && book.notes.page_sequence) {
      pageSequence = book.notes.page_sequence;
    }

    if (pageSequence && Array.isArray(pageSequence)) {
      setPages(pageSequence);
      setTotalPages(pageSequence.length);
      // Map pages to images for the reader
      const imageData = pageSequence.map((page, index) => ({
        ...page,
        src: getImageUrl(page, index + 1),
        url: getImageUrl(page, index + 1), // Add both src and url for compatibility
        id: index + 1
      }));
      setImages(imageData);
      setLoading(false);
      console.log('Using book data from props:', pageSequence.length, 'pages');
      console.log('Sample image data:', imageData[0]);
      console.log('Sample image URL:', imageData[0]?.url);
    } else {
      // Fallback: Generate page sequence based on available images
      console.log('No page sequence found, generating fallback...');
      console.log('Available keys in book:', Object.keys(book || {}));
      
      // Try to determine how many pages by checking the folder structure
      if (book?.notes) {
        try {
          const parsedNotes = JSON.parse(book.notes);
          const folderPath = parsedNotes.folder_path;
          if (folderPath) {
            // Generate a default sequence of 23 pages (based on your logs showing 23 pages)
            const defaultPageCount = 23;
            const generatedSequence = Array.from({ length: defaultPageCount }, (_, index) => ({
              page_number: index + 1,
              file_path: folderPath
            }));
            
            setPages(generatedSequence);
            setTotalPages(generatedSequence.length);
            
            const imageData = generatedSequence.map((page, index) => ({
              ...page,
              src: getImageUrl(page, index + 1),
              url: getImageUrl(page, index + 1),
              id: index + 1
            }));
            
            setImages(imageData);
            setLoading(false);
            console.log('Generated fallback sequence with', defaultPageCount, 'pages');
            console.log('Sample fallback image URL:', imageData[0]?.url);
            return;
          }
        } catch (e) {
          console.error('Error parsing notes for fallback:', e);
        }
      }
      
      setError('No pages found in book data');
      setLoading(false);
    }
  }, [bookId, book, getImageUrl]);

  // User activity handler - only show navigation near top/bottom edges
  const handleUserActivity = useCallback((e) => {
    if (e && e.clientY !== undefined) {
      const windowHeight = window.innerHeight;
      const topZone = windowHeight * 0.15; // Top 15% of screen
      const bottomZone = windowHeight * 0.85; // Bottom 15% of screen
      
      // Only show navigation if mouse is in top or bottom zones
      if (e.clientY <= topZone || e.clientY >= bottomZone) {
        setShowNavigation(true);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
          setShowNavigation(false);
        }, 3000); // Shorter timeout for edge-based navigation
      } else {
        // In the middle area, hide navigation
        setShowNavigation(false);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      }
    }
  }, []);

  // Separate function for non-mouse activities (keyboard, etc.)
  const showNavigationTemporarily = useCallback(() => {
    setShowNavigation(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowNavigation(false);
    }, 2000);
  }, []);

  // Robust Turn.js initialization that prevents DOM hierarchy errors
  const initializeTurnJS = useCallback(() => {
    if (!flipBookRef.current || !window.jQuery || !images.length) {
      console.log('Turn.js initialization skipped - missing dependencies');
      return;
    }

    if (turnInitRef.current) {
      return;
    }

    try {
      const $ = window.jQuery;
      const $flipbook = $(flipBookRef.current);
      
      // Destroy existing instance completely
      if ($flipbook.data('turn')) {
        try {
          $flipbook.turn('destroy');
        } catch (e) {
          console.log('Turn.js destroy error (ignored):', e);
        }
      }

      // Clear all content and event handlers
      $flipbook.off().empty().removeData();
      
      // Create pages with proper structure for Turn.js double display
      images.forEach((image, index) => {
        const pageNumber = index + 1;
        const imgSrc = image.url || image.src;
        
        // Create page element with proper sizing for double display
        const pageDiv = $(`<div class="page" data-page="${pageNumber}"></div>`);
        
        // Set page dimensions - for double display, each page is half the book width
        const pageWidth = BOOK_WIDTH / 2;
        pageDiv.css({
          width: pageWidth + 'px',
          height: bookHeight + 'px',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #ddd'
        });
        
        // Create image element with proper sizing
        const img = $(`<img src="${imgSrc}" alt="Page ${pageNumber}" draggable="false" />`);
        img.css({
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none'
        });
        
        // Add image loading handlers
        img.on('load', () => {
          console.log(`✅ Page ${pageNumber} loaded:`, imgSrc);
        });
        
        img.on('error', (e) => {
          console.error(`❌ Page ${pageNumber} failed to load:`, imgSrc);
          // Add a placeholder for failed images
          img.replaceWith(`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#666;">Page ${pageNumber}<br>Image failed to load</div>`);
        });
        
        pageDiv.append(img);
        $flipbook.append(pageDiv);
        
        console.log(`📄 Added page ${pageNumber} (${pageWidth}x${bookHeight}):`, imgSrc);
      });

      // Initialize Turn.js with proper double-page configuration
      setTimeout(() => {
        try {
          // Verify all pages are present
          const pageCount = $flipbook.children('.page').length;
          if (pageCount !== images.length) {
            console.error('❌ Page count mismatch:', pageCount, 'vs', images.length);
            return;
          }

          console.log('🔧 Initializing Turn.js with', pageCount, 'pages...');

          $flipbook.turn({
            width: BOOK_WIDTH,
            height: bookHeight,
            autoCenter: true,
            elevation: 50,
            gradients: true,
            acceleration: true,
            display: 'double', // This enables left/right page display
            duration: 600,
            pages: pageCount,
            page: 1,
            turnCorners: "bl,br,tl,tr", // Enable all corner turning
            cornerSize: 50, // Increase corner sensitivity area
            when: {
              turned: function(event, page, view) {
                console.log('📖 Turned to page:', page, 'View:', view);
                setCurrentPage(page);
                showNavigationTemporarily();
                
                // Log what pages are currently visible
                const currentView = $flipbook.turn('view', page);
                console.log('👀 Current view:', currentView);
              },
              turning: function(event, page, view) {
                console.log('🔄 Turning to page:', page, 'View:', view);
                return true;
              },
              start: function(event, pageObject, corner) {
                console.log('▶️ Turn started from corner:', corner);
                return true;
              },
              end: function(event, pageObject, turned) {
                console.log('⏹️ Turn ended, turned:', turned);
              },
              missing: function(event, pages) {
                console.log('❓ Missing pages:', pages);
                // Return empty divs for missing pages
                for (let i = 0; i < pages.length; i++) {
                  pages[i] = $('<div class="page missing-page"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#999;">Missing Page</div></div>');
                }
              }
            }
          });

          turnInitRef.current = true;
          setIsInitialized(true);
          console.log('✅ Turn.js initialized successfully with', images.length, 'pages');
          
          // Add custom methods for better arrow integration
          $flipbook[0].turnToPage = function(pageNumber, animate = true) {
            if (animate) {
              $flipbook.turn('page', pageNumber);
            } else {
              $flipbook.turn('page', pageNumber);
            }
          };
          
          $flipbook[0].turnNext = function() {
            const current = $flipbook.turn('page');
            const total = $flipbook.turn('pages');
            if (current < total) {
              $flipbook.turn('next');
              return true;
            }
            return false;
          };
          
          $flipbook[0].turnPrevious = function() {
            const current = $flipbook.turn('page');
            if (current > 1) {
              $flipbook.turn('previous');
              return true;
            }
            return false;
          };
          
        } catch (initError) {
          console.error('❌ Turn.js initialization error:', initError);
          setIsInitialized(false);
          // Fallback to simple page viewer
          console.log('Falling back to simple page viewer');
        }
      }, 200); // Slightly longer delay for stability

    } catch (error) {
      console.error('❌ Turn.js setup error:', error);
      setIsInitialized(false);
    }
  }, [images, showNavigationTemporarily, bookHeight]);

  // After height recalculation, ensure flipbook centered and size adjusted for mode
  // Only initialize once after images & library loaded
  useEffect(() => {
    if (turnJsLoaded && images.length > 0 && !isInitialized) {
      initializeTurnJS();
    }
  }, [turnJsLoaded, images, isInitialized, initializeTurnJS]);

  // Resize without destroying instance to avoid Turn.js internal state errors
  useEffect(() => {
    if (isInitialized && flipBookRef.current && window.jQuery) {
      try {
        const $flipbook = window.jQuery(flipBookRef.current);
        if ($flipbook.data('turn')) {
          $flipbook.turn('size', BOOK_WIDTH, bookHeight);
        }
      } catch (e) {
        console.log('Resize error (ignored):', e);
      }
    }
  }, [bookHeight, isInitialized]);

  // Helper: compute capped height that fits viewport (no scroll)
  const computeViewportHeight = useCallback((ideal) => {
    // Use a reasonable height that fits well in the container
    return 650;
  }, [showNavigation]);

  // Measure first image to set ideal height and then cap to viewport
  useEffect(() => {
    if (images.length > 0) {
      const first = images[0];
      const probe = new Image();
      probe.onload = () => {
        if (probe.naturalWidth && probe.naturalHeight) {
          let ideal = Math.round((probe.naturalHeight / probe.naturalWidth) * SINGLE_PAGE_WIDTH);
          ideal = Math.min(Math.max(ideal, 450), 1200); // broader clamp before viewport cap
          imageAspectHeightRef.current = ideal;
          const capped = computeViewportHeight(ideal);
          setBookHeight(capped);
        }
      };
      probe.src = first.url || first.src;
    }
  }, [images, computeViewportHeight]);

  // Recalculate on resize or showNavigation changes
  useEffect(() => {
    const onResize = () => {
      if (imageAspectHeightRef.current) {
        setBookHeight(computeViewportHeight(imageAspectHeightRef.current));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [computeViewportHeight]);

  // Disable body scroll while reader open
  useEffect(() => {
    if (useEnhancedReader) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalOverflow; };
    }
  }, [useEnhancedReader]);

  // Fetch book pages
  useEffect(() => {
    fetchBookData();
  }, [fetchBookData]);

  // Initialize Turn.js when ready
  useEffect(() => {
    if (turnJsLoaded && images.length > 0 && flipBookRef.current) {
      initializeTurnJS();
    }
  }, [turnJsLoaded, images]);

  // Navigation functions with Turn.js support
  const nextPage = useCallback(() => {
    if (turnJsLoaded && flipBookRef.current && window.jQuery) {
      try {
        const $flipbook = window.jQuery(flipBookRef.current);
        if ($flipbook.data('turn') && currentPage < totalPages) {
          $flipbook.turn('next');
        }
      } catch (error) {
        console.log('Turn.js next error:', error);
        if (currentPage < totalPages) {
          setCurrentPage(prev => prev + 1);
        }
      }
    } else if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [turnJsLoaded, currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (turnJsLoaded && flipBookRef.current && window.jQuery) {
      try {
        const $flipbook = window.jQuery(flipBookRef.current);
        if ($flipbook.data('turn') && currentPage > 1) {
          $flipbook.turn('previous');
        }
      } catch (error) {
        console.log('Turn.js previous error:', error);
        if (currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
      }
    } else if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [turnJsLoaded, currentPage]);

  const goToPage = useCallback((pageNumber) => {
    if (turnJsLoaded && flipBookRef.current && window.jQuery) {
      try {
        const $flipbook = window.jQuery(flipBookRef.current);
        if ($flipbook.data('turn') && pageNumber >= 1 && pageNumber <= totalPages) {
          $flipbook.turn('page', pageNumber);
        }
      } catch (error) {
        console.log('Turn.js goToPage error:', error);
        if (pageNumber >= 1 && pageNumber <= totalPages) {
          setCurrentPage(pageNumber);
        }
      }
    } else if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  }, [turnJsLoaded, totalPages]);

  // Enhanced arrow handlers that trigger Turn.js animation
  const handleLeftArrowClick = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (turnJsLoaded && flipBookRef.current && window.jQuery && currentPage > 1) {
      try {
        const flipbookElement = flipBookRef.current;
        if (flipbookElement.turnPrevious) {
          console.log('🔄 Left arrow using custom Turn.js method');
          const success = flipbookElement.turnPrevious();
          if (success) return;
        }
        
        const $flipbook = window.jQuery(flipBookRef.current);
        if ($flipbook.data('turn')) {
          console.log('🔄 Left arrow triggering Turn.js previous');
          $flipbook.turn('previous');
          return;
        }
      } catch (error) {
        console.log('Turn.js left arrow error:', error);
      }
    }
    
    // Fallback for non-Turn.js mode
    if (currentPage > 1) {
      console.log('🔄 Left arrow fallback to previousPage');
      previousPage();
    }
  }, [turnJsLoaded, currentPage, previousPage]);

  const handleRightArrowClick = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (turnJsLoaded && flipBookRef.current && window.jQuery && currentPage < totalPages) {
      try {
        const flipbookElement = flipBookRef.current;
        if (flipbookElement.turnNext) {
          console.log('🔄 Right arrow using custom Turn.js method');
          const success = flipbookElement.turnNext();
          if (success) return;
        }
        
        const $flipbook = window.jQuery(flipBookRef.current);
        if ($flipbook.data('turn')) {
          console.log('🔄 Right arrow triggering Turn.js next');
          $flipbook.turn('next');
          return;
        }
      } catch (error) {
        console.log('Turn.js right arrow error:', error);
      }
    }
    
    // Fallback for non-Turn.js mode
    if (currentPage < totalPages) {
      console.log('🔄 Right arrow fallback to nextPage');
      nextPage();
    }
  }, [turnJsLoaded, currentPage, totalPages, nextPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          previousPage();
          showNavigationTemporarily();
          break;
        case 'ArrowRight':
          nextPage();
          showNavigationTemporarily();
          break;
        case 'Home':
          goToPage(1);
          showNavigationTemporarily();
          break;
        case 'End':
          goToPage(totalPages);
          showNavigationTemporarily();
          break;
        default:
          break;
      }
    };

    if (useEnhancedReader) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [useEnhancedReader, totalPages, previousPage, nextPage, goToPage, showNavigationTemporarily]);

  // Reading time update
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      setReadingTime(elapsed);
    }, 60000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (loading) {
    return (
      <div className="reader-loading">
        <div className="loading-spinner"></div>
        <p>Loading book...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enhanced-reader-error">
        <h3>Error Loading Book</h3>
        <p>{error}</p>
        <p className="text-sm text-gray-400 mt-4">
          Debug info: Total pages found: {pages.length}, Images: {images.length}
        </p>
        <p className="text-sm text-gray-400">
          Book data keys: {book ? Object.keys(book).join(', ') : 'No book data'}
        </p>
        <button 
          className="nav-btn mt-4" 
          onClick={onBack}
        >
          <ChevronLeft size={20} />
          Back to Overview
        </button>
      </div>
    );
  }

  return (
    <div className="enhanced-shuspot-reader">
      {useEnhancedReader ? (
        <div className="enhanced-reader-container" style={{ 
          height: '100%',
          padding: '20px 20px 0 20px',
          display: 'flex',
          flexDirection: 'column',
          background: '#f1c40f', // Match book-effect background
          overflow: 'hidden'
        }}>
          {/* Navigation Header */}
          <div className={`enhanced-nav-overlay ${showNavigation ? 'visible' : ''}`}>
            <div className="enhanced-nav-content">
              <div className="enhanced-nav-left">
                <button onClick={onBack} className="nav-btn" title="Back to Library">
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={() => {
                    setUseEnhancedReader(false);
                    setCurrentPage(1);
                  }} 
                  className="nav-btn" 
                  title="Switch to Classic Reader"
                >
                  <BookOpen size={20} />
                </button>
              </div>

              <div className="enhanced-nav-center">
                <h1 className="book-title-nav">{title}</h1>
                <div className="page-indicator">
                  Page {currentPage} of {totalPages}
                </div>
              </div>

              <div className="enhanced-nav-right">
                <button onClick={() => setShowNavigation(!showNavigation)} className="nav-btn" title="Hide UI">
                  ×
                </button>
              </div>
            </div>
          </div>

          {/* Main Book Container */}
          <div 
            className="enhanced-book-container" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowNavigation(!showNavigation);
              }
            }}
            onMouseMove={handleUserActivity}
          >
            <div className="enhanced-flipbook-wrapper">
              {turnJsLoaded && images.length > 0 ? (
                // Determine if showing only the cover (page 1)
                <div ref={containerRef} className="flipbook-container" style={{ 
                  width: `${BOOK_WIDTH}px`, 
                  height: `${bookHeight}px`,
                  margin: '0 auto',
                  maxWidth: '96vw',
                  position: 'relative',
                  transition: 'height 0.25s ease'
                }}>
                  {/* Left Page Turn Arrow */}
                  <button 
                    className="page-turn-arrow left-arrow"
                    onClick={handleLeftArrowClick}
                    disabled={currentPage <= 1}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 1000,
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      fontSize: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    ←
                  </button>
                  
                  {/* Right Page Turn Arrow */}
                  <button 
                    className="page-turn-arrow right-arrow"
                    onClick={handleRightArrowClick}
                    disabled={currentPage >= totalPages}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 1000,
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      fontSize: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    →
                  </button>

                  <div ref={flipBookRef} className="flipbook">
                    {/* Turn.js will populate this with pages */}
                  </div>
                  {/* External wide click zones overlayed ABOVE flipbook to avoid interfering with internal DOM */}
                  <div
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      console.log('🔄 Left click zone triggered');
                      handleLeftArrowClick(e); 
                    }}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '14%',
                      cursor: currentPage > 1 ? 'w-resize' : 'default',
                      zIndex: 1500,
                      background: 'transparent'
                    }}
                  />
                  <div
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      console.log('🔄 Right click zone triggered');
                      handleRightArrowClick(e); 
                    }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '14%',
                      cursor: currentPage < totalPages ? 'e-resize' : 'default',
                      zIndex: 1500,
                      background: 'transparent'
                    }}
                  />
                </div>
              ) : images.length > 0 ? (
                <div 
                  className="simple-page-viewer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const centerX = rect.width / 2;
                    
                    if (clickX > centerX + 50) {
                      e.stopPropagation();
                      nextPage();
                    } else if (clickX < centerX - 50) {
                      e.stopPropagation();
                      previousPage();
                    }
                  }}
                >
                  <div className="current-page">
                    <img
                      src={images[currentPage - 1]?.url} 
                      alt={`Page ${currentPage}`}
                      className="page-image"
                      draggable={false}
                      onLoad={() => console.log(`Page ${currentPage} loaded`)}
                      onError={(e) => {
                        console.error(`Failed to load page ${currentPage}:`, images[currentPage - 1]?.url);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="enhanced-reader-loading">
                  <div className="loading-spinner"></div>
                  <p>No pages found for this book</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Total pages in sequence: {pages.length}
                  </p>
                  <p className="text-sm text-gray-600">
                    Images found: {images.length}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            {showNavigation && (
              <>
                <button 
                  className={`enhanced-nav-arrow left ${currentPage <= 1 ? 'disabled' : ''}`}
                  onClick={handleLeftArrowClick}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft size={32} />
                </button>

                <button 
                  className={`enhanced-nav-arrow right ${currentPage >= totalPages ? 'disabled' : ''}`}
                  onClick={handleRightArrowClick}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight size={32} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Progress Bar */}
          <div className={`enhanced-progress-bar ${showNavigation ? 'visible' : 'hidden'}`}>
            <div className="progress-track">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${(currentPage / totalPages) * 100}%` 
                }}
              />
            </div>
            <div className="progress-info">
              <span>{readingTime}m read</span>
              <span>{Math.round((currentPage / totalPages) * 100)}% complete</span>
            </div>
          </div>
        </div>
      ) : (
        // Classic reader implementation would go here
        <div className="reader-container">
          <h2>Classic Reader Mode</h2>
          <p>Classic reader not implemented in this version</p>
          <button onClick={() => setUseEnhancedReader(true)}>
            Switch to Enhanced Reader
          </button>
        </div>
      )}
    </div>
  );
};

export default ShuSpotImageReader;
