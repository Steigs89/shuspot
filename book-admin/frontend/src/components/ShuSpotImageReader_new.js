import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Settings, Maximize2 } from 'lucide-react';
import { getApiUrl } from '../utils/api';

const ShuSpotImageReader = ({ book, onBack, onBookmarkPage }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNavigation, setShowNavigation] = useState(true);
  const [useEnhancedReader, setUseEnhancedReader] = useState(true); // Default to enhanced
  const [turnJsLoaded, setTurnJsLoaded] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [startTime] = useState(Date.now());
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  const flipBookRef = useRef(null);
  const turnJsRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  
  const title = book?.title || 'Unknown Book';
  const totalPages = images.length;

  console.log('ShuSpotImageReader rendered with:', { book, useEnhancedReader, turnJsLoaded });

  // Load Turn.js library
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.jQuery) {
      const loadTurnJS = async () => {
        try {
          // Load jQuery first
          if (!document.getElementById('jquery-script')) {
            const jqueryScript = document.createElement('script');
            jqueryScript.id = 'jquery-script';
            jqueryScript.src = '/js/jquery.js';
            jqueryScript.async = true;
            document.body.appendChild(jqueryScript);

            await new Promise((resolve) => {
              jqueryScript.onload = resolve;
            });
          }

          // Then load Turn.js
          if (!document.getElementById('turnjs-script')) {
            const turnScript = document.createElement('script');
            turnScript.id = 'turnjs-script';
            turnScript.src = '/js/turn.js';
            turnScript.async = true;
            document.body.appendChild(turnScript);

            await new Promise((resolve) => {
              turnScript.onload = resolve;
            });
          }

          console.log('Turn.js loaded successfully');
          setTurnJsLoaded(true);
        } catch (error) {
          console.error('Error loading Turn.js:', error);
          setTurnJsLoaded(false);
        }
      };

      loadTurnJS();
    } else if (window.jQuery && window.jQuery().turn) {
      setTurnJsLoaded(true);
    }
  }, []);

  // Fetch book pages
  useEffect(() => {
    const fetchBookData = async () => {
      if (!book?.id) return;
      
      setLoading(true);
      try {
        const response = await fetch(`${getApiUrl()}/books/${book.id}/pages`);
        const data = await response.json();
        
        if (data.pages && Array.isArray(data.pages)) {
          setPages(data.pages);
          
          // Convert pages to image URLs
          const imageUrls = data.pages.map((page, index) => ({
            url: getImageUrl(page, index + 1),
            pageNumber: index + 1
          }));
          
          setImages(imageUrls);
          console.log('Images loaded:', imageUrls.length);
        }
      } catch (error) {
        console.error('Error fetching book data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookData();
  }, [book?.id]);

  // Initialize Turn.js when ready
  useEffect(() => {
    if (!useEnhancedReader || !turnJsLoaded || !flipBookRef.current || images.length === 0) {
      return;
    }

    const initializeTurnJS = () => {
      try {
        const $ = window.jQuery;
        const $flipbook = $(flipBookRef.current);
        
        if ($flipbook.turn) {
          $flipbook.turn('destroy');
        }

        // Wait for images to be in DOM
        setTimeout(() => {
          try {
            $flipbook.turn({
              width: 800,
              height: 600,
              elevation: 50,
              gradients: true,
              autoCenter: true,
              duration: 800,
              pages: images.length,
              page: currentPage,
              when: {
                turning: function(event, page, view) {
                  console.log('Turning to page:', page);
                  setCurrentPage(page);
                },
                turned: function(event, page, view) {
                  console.log('Turned to page:', page);
                  setCurrentPage(page);
                }
              }
            });

            turnJsRef.current = $flipbook;
            console.log('Turn.js initialized successfully with', images.length, 'pages');
          } catch (error) {
            console.error('Error initializing Turn.js:', error);
          }
        }, 500);
      } catch (error) {
        console.error('Error in initializeTurnJS:', error);
      }
    };

    initializeTurnJS();

    return () => {
      try {
        if (turnJsRef.current && window.jQuery) {
          turnJsRef.current.turn('destroy');
          turnJsRef.current = null;
        }
      } catch (error) {
        console.error('Error destroying Turn.js:', error);
      }
    };
  }, [useEnhancedReader, turnJsLoaded, images.length, currentPage]);

  // Helper function to get image URL
  const getImageUrl = (pageData, pageNumber) => {
    if (pageData?.file_path) {
      const materialMatch = pageData.file_path.match(/MaterialsShuspotI\/([^/]+.*)$/);
      const cropMatch = pageData.file_path.match(/WEEK 70 CROP-SHuSpot\/([^/]+.*)$/);

      if (materialMatch) {
        const [, relativePath] = materialMatch;
        return `${getApiUrl()}/shuspot-images/MaterialsShuspotI/${relativePath}`;
      } else if (cropMatch) {
        const bookPath = cropMatch[1].replace(/\/[^/]+$/, '');
        return `${getApiUrl()}/shuspot-images/WEEK 70 CROP-SHuSpot/${bookPath}/resized/crop-${pageNumber}.png`;
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
            return `${getApiUrl()}/shuspot-images/MaterialsShuspotI/${relativePath}/${imageFile}`;
          } else if (cropMatch) {
            return `${getApiUrl()}/shuspot-images/WEEK 70 CROP-SHuSpot/${cropMatch[1]}/resized/crop-${pageNumber}.png`;
          }
        }
      } catch (e) {
        console.error('Error parsing notes:', e);
      }
    }

    return `${getApiUrl()}/shuspot-images/${encodeURIComponent(book?.folder_path || '')}/${pageNumber}.jpg`;
  };

  // Navigation functions
  const nextPage = () => {
    if (useEnhancedReader && turnJsRef.current) {
      turnJsRef.current.turn('next');
    } else if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (useEnhancedReader && turnJsRef.current) {
      turnJsRef.current.turn('previous');
    } else if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (pageNumber) => {
    if (useEnhancedReader && turnJsRef.current) {
      turnJsRef.current.turn('page', pageNumber);
    } else {
      setCurrentPage(pageNumber);
    }
  };

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          previousPage();
          break;
        case 'ArrowRight':
          nextPage();
          break;
        case 'Home':
          goToPage(1);
          break;
        case 'End':
          goToPage(totalPages);
          break;
      }
    };

    if (useEnhancedReader) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [useEnhancedReader, totalPages]);

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

  return (
    <div className="shuspot-reader">
      {useEnhancedReader ? (
        <div className="enhanced-reader-container">
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
              {images.length > 0 && turnJsLoaded ? (
                <div className="flipbook-container" style={{ width: '800px', height: '600px', margin: '0 auto' }}>
                  <div id="flipbook" ref={flipBookRef}>
                    {images.map((image, index) => (
                      <div key={index} className="page">
                        <img
                          src={image.url}
                          alt={`Page ${index + 1}`}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            display: 'block'
                          }}
                          draggable={false}
                          onLoad={() => console.log(`Page ${index + 1} loaded for flipbook`)}
                          onError={(e) => {
                            console.error(`Failed to load page ${index + 1}:`, image.url);
                          }}
                        />
                      </div>
                    ))}
                  </div>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    previousPage();
                  }}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft size={32} />
                </button>

                <button 
                  className={`enhanced-nav-arrow right ${currentPage >= totalPages ? 'disabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPage();
                  }}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight size={32} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Progress Bar */}
          <div className={`enhanced-progress-container ${showNavigation ? 'visible' : ''}`}>
            <div 
              className="enhanced-progress-bar"
              style={{ 
                width: `${(currentPage / totalPages) * 100}%` 
              }}
            />
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
