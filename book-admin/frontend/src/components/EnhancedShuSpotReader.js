import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Minimize2, BookOpen, RotateCcw } from 'lucide-react';

const EnhancedShuSpotReader = ({ book, onBack }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const flipBookRef = useRef(null);
  const turnJsRef = useRef(null);

  // Load Turn.js dynamically
  useEffect(() => {
    const loadTurnJS = async () => {
      try {
        // Load jQuery if not already loaded
        if (!window.jQuery) {
          const jqueryScript = document.createElement('script');
          jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
          jqueryScript.async = true;
          document.head.appendChild(jqueryScript);
          
          await new Promise((resolve) => {
            jqueryScript.onload = resolve;
          });
        }

        // Load Turn.js
        if (!window.jQuery.fn.turn) {
          const turnScript = document.createElement('script');
          turnScript.src = 'https://cdn.jsdelivr.net/gh/blasten/turn.js@master/turn.min.js';
          turnScript.async = true;
          document.head.appendChild(turnScript);
          
          await new Promise((resolve) => {
            turnScript.onload = resolve;
          });
        }

        // Initialize Turn.js
        initializeTurnJS();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load Turn.js:', error);
        setIsLoading(false);
      }
    };

    loadTurnJS();

    // Cleanup
    return () => {
      if (turnJsRef.current && window.jQuery) {
        try {
          window.jQuery(flipBookRef.current).turn('destroy');
        } catch (error) {
          console.log('Turn.js cleanup error:', error);
        }
      }
    };
  }, []);

  const initializeTurnJS = () => {
    if (!flipBookRef.current || !window.jQuery) return;

    const $ = window.jQuery;
    const $flipbook = $(flipBookRef.current);

    // Initialize Turn.js
    $flipbook.turn({
      width: 800,
      height: 600,
      elevation: 50,
      gradients: true,
      autoCenter: true,
      duration: 1000,
      pages: book.images?.length || 1,
      when: {
        turning: function(event, page, view) {
          setCurrentPage(page);
        },
        turned: function(event, page, view) {
          setCurrentPage(page);
        }
      }
    });

    turnJsRef.current = $flipbook;

    // Add resize handler
    const handleResize = () => {
      if (turnJsRef.current) {
        const container = flipBookRef.current.parentElement;
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 100;
        const aspectRatio = 4/3; // Book aspect ratio

        let width = containerWidth;
        let height = width / aspectRatio;

        if (height > containerHeight) {
          height = containerHeight;
          width = height * aspectRatio;
        }

        turnJsRef.current.turn('size', width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100); // Initial resize
  };

  const goToPage = (pageNum) => {
    if (turnJsRef.current && pageNum >= 1 && pageNum <= (book.images?.length || 1)) {
      turnJsRef.current.turn('page', pageNum);
    }
  };

  const nextPage = () => {
    if (turnJsRef.current) {
      turnJsRef.current.turn('next');
    }
  };

  const previousPage = () => {
    if (turnJsRef.current) {
      turnJsRef.current.turn('previous');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleUI = () => {
    setShowUI(!showUI);
  };

  const resetView = () => {
    if (turnJsRef.current) {
      turnJsRef.current.turn('page', 1);
    }
  };

  if (isLoading) {
    return (
      <div className="enhanced-reader-loading">
        <div className="loading-spinner"></div>
        <p>Loading enhanced book reader...</p>
      </div>
    );
  }

  if (!book || !book.images) {
    return (
      <div className="enhanced-reader-error">
        <BookOpen size={48} />
        <h3>No book data available</h3>
        <button onClick={onBack} className="btn btn-primary">
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className={`enhanced-shuspot-reader ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Top Navigation Bar */}
      <div className={`enhanced-top-nav ${showUI ? 'visible' : 'hidden'}`}>
        <div className="enhanced-nav-content">
          <div className="enhanced-nav-left">
            <button onClick={onBack} className="nav-btn" title="Back to Library">
              <ChevronLeft size={24} />
            </button>
            <button onClick={resetView} className="nav-btn" title="Reset to First Page">
              <RotateCcw size={20} />
            </button>
          </div>

          <div className="enhanced-nav-center">
            <h1 className="book-title-nav">{book.title}</h1>
            <div className="page-indicator">
              Page {currentPage} of {book.images?.length || 1}
            </div>
          </div>

          <div className="enhanced-nav-right">
            <button onClick={toggleFullscreen} className="nav-btn" title="Toggle Fullscreen">
              <Minimize2 size={20} />
            </button>
            <button onClick={toggleUI} className="nav-btn" title="Hide UI">
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Book Container */}
      <div className="enhanced-book-container" onClick={toggleUI}>
        <div className="enhanced-flipbook-wrapper">
          <div ref={flipBookRef} className="enhanced-flipbook" id="flipbook">
            {book.images?.map((image, index) => (
              <div key={index} className="page-content">
                <img 
                  src={image.url} 
                  alt={`Page ${index + 1}`}
                  className="page-image"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button 
          className={`enhanced-nav-arrow left ${currentPage <= 1 ? 'disabled' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            previousPage();
          }}
          disabled={currentPage <= 1}
          style={{ display: showUI ? 'flex' : 'none' }}
        >
          <ChevronLeft size={32} />
        </button>

        <button 
          className={`enhanced-nav-arrow right ${currentPage >= (book.images?.length || 1) ? 'disabled' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            nextPage();
          }}
          disabled={currentPage >= (book.images?.length || 1)}
          style={{ display: showUI ? 'flex' : 'none' }}
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Bottom Progress Bar */}
      <div className={`enhanced-progress-bar ${showUI ? 'visible' : 'hidden'}`}>
        <div className="progress-track">
          <div 
            className="progress-fill"
            style={{ 
              width: `${((currentPage) / (book.images?.length || 1)) * 100}%` 
            }}
          ></div>
        </div>
        <div className="progress-text">
          {Math.round(((currentPage) / (book.images?.length || 1)) * 100)}% Complete
        </div>
      </div>

      {/* Page Thumbnails (when UI is visible) */}
      {showUI && (
        <div className="thumbnail-strip">
          {book.images?.slice(0, 10).map((image, index) => (
            <div
              key={index}
              className={`thumbnail ${currentPage === index + 1 ? 'active' : ''}`}
              onClick={() => goToPage(index + 1)}
            >
              <img src={image.url} alt={`Page ${index + 1}`} />
              <span className="thumbnail-number">{index + 1}</span>
            </div>
          ))}
          {book.images?.length > 10 && (
            <div className="thumbnail more-pages">
              +{book.images.length - 10} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedShuSpotReader;
