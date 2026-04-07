import React, { useState, useEffect, useRef, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, Settings, Play, Pause, RotateCcw, Volume2, VolumeX, Eye, EyeOff, Maximize, AlertTriangle, Languages } from 'lucide-react';
import '../styles/ReactPageFlipReader.css';
import ReadingGoalTimer from './ReadingGoalTimer';
import { useReadingHistoryTracking } from '../hooks/useReadingHistoryTracking';
import { useAudioManager } from '../hooks/useAudioManager';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface Book {
  id: string;
  title: string;
  cover_image_url?: string;
  file_path?: string;
  notes?: string;
  metadata?: {
    pages?: Array<{ page_number: number; audio_url?: string; image_url?: string }>;
    audio_files?: string[];
  };
  _page_sequence?: Array<{ page_number: number; file_path?: string; audio_files?: Array<{ filename: string; url: string; type: string }> }>;
  audioType?: 'per-page' | 'full-book' | 'none';
  hasAudio?: boolean;
}

interface ReactPageFlipReaderProps {
  book: Book;
  onBack: () => void;
  onBookmarkPage?: (page: number) => void;
}

// Reader-specific translations (Chinese / English) — used by the rt() helper inside the component

const ReactPageFlipReader: React.FC<ReactPageFlipReaderProps> = ({ book, onBack, onBookmarkPage }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0, 1, 2])); // lazy load: start with first 3
  const [loading, setLoading] = useState(true);
  const [showNavigation, setShowNavigation] = useState(true);
  const [showSettingsPopout, setShowSettingsPopout] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [wordHighlightEnabled, setWordHighlightEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActivelyReading, setIsActivelyReading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const { language, setLanguage } = useLanguage();
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);

  // Reader UI strings — fall back to English keys already in LanguageContext where possible
  const rt = useCallback((key: string): string => {
    const map: Record<string, Record<'en' | 'zh', string>> = {
      'reader.page':           { en: 'Page',           zh: '第' },
      'reader.of':             { en: 'of',             zh: '页，共' },
      'reader.pages':          { en: '',               zh: '页' },
      'reader.play':           { en: 'Play',           zh: '播放' },
      'reader.pause':          { en: 'Pause',          zh: '暂停' },
      'reader.loading':        { en: 'Loading',        zh: '加载中' },
      'reader.word.highlight': { en: 'Word Highlight', zh: '单词高亮' },
      'reader.zoom':           { en: 'Zoom',           zh: '缩放' },
      'reader.fullscreen':     { en: 'Full Screen',    zh: '全屏' },
      'reader.report':         { en: 'Report Problem', zh: '报告问题' },
      'reader.translate':      { en: 'Chinese',        zh: 'English' },
      'reader.loading.book':   { en: 'Loading',        zh: '加载中' },
    };
    return map[key]?.[language] ?? map[key]?.['en'] ?? key;
  }, [language]);

  // Translate book title when switching to Chinese
  useEffect(() => {
    if (language === 'en') {
      setTranslatedTitle(null);
      return;
    }
    if (language === 'zh' && book.title) {
      const libreUrl = import.meta.env.VITE_LIBRETRANSLATE_URL;
      if (!libreUrl) {
        // No translation service — show title with Chinese book label
        setTranslatedTitle(`《${book.title}》`);
        return;
      }
      setTranslatedTitle(null); // clear while loading
      fetch(`${libreUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: book.title, source: 'en', target: 'zh', format: 'text' }),
      })
        .then(r => r.json())
        .then(d => {
          setTranslatedTitle(d.translatedText || `《${book.title}》`);
        })
        .catch(() => {
          setTranslatedTitle(`《${book.title}》`);
        });
    }
  }, [language, book.title]);

  const displayTitle = language === 'zh'
    ? (translatedTitle ?? `《${book.title}》`)
    : book.title;
  // Detect if mobile landscape (1 page) vs portrait (2 pages)
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const pagesReadInSessionRef = useRef(new Set<number>());
  const containerRef = useRef<HTMLDivElement>(null);
  
  const flipBookRef = useRef<any>(null);

  // Track orientation changes
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // On mobile portrait: 1 page at a time. Mobile landscape + desktop: 2-page spread.
  const usePortraitMode = isMobile && !isLandscape;

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const isReadToMeBook = (book as any).content_type === 'read-to-me' || 
                         (book.audioType === 'per-page' && book.hasAudio === true);
  
  const bookType = isReadToMeBook ? 'read-to-me' : 'book';
  
  const audioPages = React.useMemo(() => {
    if (!isReadToMeBook || !book.metadata?.pages) {
      console.log('🔇 No audio pages - isReadToMeBook:', isReadToMeBook, 'metadata.pages:', !!book.metadata?.pages);
      return [];
    }
    
    // Create a map of page_number -> audio_url for direct lookup
    const audioMap = new Map<number, string>();
    book.metadata.pages.forEach(page => {
      if (page.audio_url) {
        audioMap.set(page.page_number, page.audio_url);
      }
    });
    
    // Create audio pages array matching visual page numbers
    const pages = book.metadata.pages.map(page => ({
      pageNumber: page.page_number,
      imageUrl: page.image_url || '',
      audioUrl: audioMap.get(page.page_number) // Match by page number, not array index
    }));
    
    console.log('🎵 Audio pages created:', pages.length, 'pages');
    console.log('🎵 Audio map:', Array.from(audioMap.entries()));
    console.log('🎵 First page with audio:', pages.find(p => p.audioUrl));
    
    return pages;
  }, [isReadToMeBook, book.metadata?.pages]);
  
  const audioManager = useAudioManager(audioPages);

  const { updateProgress, markComplete } = useReadingProgress({
    bookId: book.id,
    bookType: 'supabase',
    totalPages: totalPages
  });

  const { trackPageRead } = useReadingHistoryTracking({
    bookId: book.id,
    bookTitle: book.title,
    bookType,
    userId: userId ?? '',
    readingLevel: undefined,
    genre: undefined,
    enabled: !!userId
  });

  const getImageUrl = useCallback((pageData: any, pageNumber: number): string => {
    if (pageData?.file_path?.startsWith('http')) return pageData.file_path;
    if (pageData?.image_url) return pageData.image_url;
    if (book?.metadata?.pages?.[pageNumber - 1]?.image_url) {
      return book.metadata.pages[pageNumber - 1].image_url || '';
    }
    if (book?.title) {
      const baseUrl = 'https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books';
      return `${baseUrl}/${encodeURIComponent(book.title)}/resized/crop-${pageNumber}.png`;
    }
    return '';
  }, [book]);

  useEffect(() => {
    const fetchBookData = async () => {
      if (!book) {
        setLoading(false);
        return;
      }

      let pageSequence = null;
      if (book.metadata?.pages && Array.isArray(book.metadata.pages)) {
        pageSequence = book.metadata.pages.map((page, index) => ({
          page_number: page.page_number || index + 1,
          file_path: page.image_url,
          image_url: page.image_url
        }));
      } else if (book._page_sequence && Array.isArray(book._page_sequence)) {
        pageSequence = book._page_sequence;
      }

      if (pageSequence?.length) {
        setTotalPages(pageSequence.length);
        setImages(pageSequence.map((page, index) => getImageUrl(page, index + 1)));
      }
      setLoading(false);
    };

    fetchBookData();
  }, [book, getImageUrl]);

  const goToNextPage = useCallback(() => {
    if (!flipBookRef.current) return;
    try {
      const pf = flipBookRef.current.pageFlip?.() ?? flipBookRef.current.getPageFlip?.();
      if (pf) {
        pf.flipNext();
      }
    } catch (e) {
      console.warn('flipNext failed', e);
    }
  }, []);

  const goToPrevPage = useCallback(() => {
    if (!flipBookRef.current) return;
    try {
      const pf = flipBookRef.current.pageFlip?.() ?? flipBookRef.current.getPageFlip?.();
      if (pf) {
        pf.flipPrev();
      }
    } catch (e) {
      console.warn('flipPrev failed', e);
    }
  }, []);

  const onFlip = useCallback((e: any) => {
    const newPage = e.data;
    setCurrentPage(newPage);
    onBookmarkPage?.(newPage + 1);
    trackPageRead(newPage + 1);
    pagesReadInSessionRef.current.add(newPage + 1);
    updateProgress(newPage + 1);
    if (totalPages > 0 && (newPage + 1) >= totalPages) markComplete();

    // Lazy load: preload a window of 4 pages ahead and 2 behind
    setLoadedImages(prev => {
      const next = new Set(prev);
      for (let i = Math.max(0, newPage - 2); i <= Math.min(totalPages - 1, newPage + 4); i++) {
        next.add(i);
      }
      return next;
    });
  }, [onBookmarkPage, trackPageRead, totalPages, updateProgress, markComplete]);

  useEffect(() => {
    if (!isReadToMeBook || currentPage < 0 || !audioPages.length) return;

    const loadPageAudio = async () => {
      // For page spreads, we need to play audio for both left and right pages
      // currentPage is the left page in a spread
      const leftPageIndex = currentPage;
      const rightPageIndex = currentPage + 1;
      
      const leftPageAudio = audioPages[leftPageIndex];
      const rightPageAudio = audioPages[rightPageIndex];
      
      // Collect page numbers to play sequentially
      const pagesToPlay: number[] = [];
      
      if (leftPageAudio?.audioUrl) {
        pagesToPlay.push(leftPageIndex + 1);
      }
      
      if (rightPageAudio?.audioUrl && rightPageIndex < audioPages.length) {
        pagesToPlay.push(rightPageIndex + 1);
      }
      
      if (pagesToPlay.length === 0) {
        console.log(`📖 Pages ${leftPageIndex + 1}-${rightPageIndex + 1} have no audio - showing silently`);
        setAudioError(null);
        return;
      }

      try {
        setAudioError(null);
        
        // Use sequential playback if available, otherwise fall back to single page
        if (audioManager.loadAndPlaySequential && pagesToPlay.length > 1) {
          console.log(`🎵 Playing ${pagesToPlay.length} audio files sequentially:`, pagesToPlay);
          await audioManager.loadAndPlaySequential(pagesToPlay);
        } else {
          console.log(`🎵 Playing audio for page ${pagesToPlay[0]}`);
          await audioManager.loadAndPlay(pagesToPlay[0]);
        }
      } catch (err) {
        console.error('Failed to load page audio:', err);
        setAudioError('Audio unavailable for this page');
      }
    };

    loadPageAudio();
  }, [currentPage, isReadToMeBook, audioPages.length]);

  useEffect(() => {
    if (userId && currentPage >= 0) trackPageRead(currentPage + 1);
  }, [userId, trackPageRead, currentPage]);

  const toggleNavigation = useCallback(() => setShowNavigation(!showNavigation), [showNavigation]);
  const toggleSettingsPopout = useCallback(() => setShowSettingsPopout(!showSettingsPopout), [showSettingsPopout]);
  const handleZoomIn = useCallback(() => setZoomLevel(prev => Math.min(prev + 10, 200)), []);
  const handleZoomOut = useCallback(() => setZoomLevel(prev => Math.max(prev - 10, 50)), []);
  // Sync fullscreen state with browser events (e.g. user presses Escape)
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const el = containerRef.current || document.documentElement;
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(false));
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false));
    }
  }, []);
  const handleReportProblem = useCallback(() => alert('Report problem functionality would be implemented here'), []);

  useEffect(() => {
    let activityTimer: NodeJS.Timeout | undefined;
    const handleActivity = () => {
      setIsActivelyReading(true);
      if (activityTimer) clearTimeout(activityTimer);
      activityTimer = setTimeout(() => setIsActivelyReading(false), 30000);
    };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, handleActivity, true));
    return () => {
      if (activityTimer) clearTimeout(activityTimer);
      events.forEach(event => document.removeEventListener(event, handleActivity, true));
    };
  }, []);

  useEffect(() => {
    if (!showSettingsPopout) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.epic-settings-wrapper')) setShowSettingsPopout(false);
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsPopout]);

  if (loading) {
    return (
      <div className="pageflip-reader-loading">
        <div className="loading-spinner"></div>
        <p>{rt('reader.loading.book')} {book.title}...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`pageflip-reader-container${isFullscreen ? ' fullscreen' : ''}`}>
      <div className={`epic-nav-header ${showNavigation ? 'visible' : ''}`}>
        <div className="epic-nav-content">
          <div className="epic-nav-left">
            <button className="epic-nav-btn back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
          </div>
          <div className="epic-nav-center">
            <h1 className="epic-book-title">{displayTitle}</h1>
          </div>
          <div className="epic-nav-right">
            {/* Translate toggle button */}
            <button
              className="epic-nav-btn"
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              title={rt('reader.translate')}
              style={{ gap: 4, fontSize: 13, fontWeight: 600 }}
            >
              <Languages size={18} />
              <span style={{ color: 'white', fontSize: 12 }}>{rt('reader.translate')}</span>
            </button>
          </div>
        </div>
        <button className="nav-toggle-arrow" onClick={toggleNavigation}>▲</button>
      </div>

      {!showNavigation && (
        <button className="floating-nav-toggle" onClick={toggleNavigation}>▼</button>
      )}

      <div className="large-book-container">
        {audioError && (
          <div className="audio-error-banner">
            <p>{audioError}</p>
            <button onClick={() => setAudioError(null)}>×</button>
          </div>
        )}
        
        {isReadToMeBook && audioManager.state.isLoading && (
          <div className="audio-loading-banner">
            <p>{rt('reader.loading')}...</p>
          </div>
        )}
        
        <div className="large-flipbook-wrapper">
          <HTMLFlipBook
            ref={flipBookRef}
            width={Math.floor(window.innerWidth * (usePortraitMode ? 0.92 : 0.425))}
            height={Math.floor(window.innerHeight * (usePortraitMode ? 0.80 : 0.85))}
            size="stretch"
            minWidth={usePortraitMode ? 280 : 300}
            maxWidth={usePortraitMode ? 900 : 1000}
            minHeight={400}
            maxHeight={1200}
            maxShadowOpacity={0.3}
            showCover={true}
            mobileScrollSupport={true}
            onFlip={onFlip}
            className="large-flipbook"
            startPage={0}
            drawShadow={true}
            flippingTime={600}
            usePortrait={usePortraitMode}
            autoSize={false}
            clickEventForward={true}
            useMouseEvents={true}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={false}
            style={{}}
            startZIndex={0}
          >
            {images.map((imageUrl, index) => (
              <div key={index} className="page">
                {loadedImages.has(index) ? (
                  <img
                    src={imageUrl}
                    alt={`Page ${index + 1}`}
                    loading="lazy"
                    onLoad={() => {
                      // Once loaded, preload next batch
                      setLoadedImages(prev => {
                        const next = new Set(prev);
                        for (let i = index + 1; i <= Math.min(images.length - 1, index + 3); i++) {
                          next.add(i);
                        }
                        return next;
                      });
                    }}
                  />
                ) : (
                  // Placeholder keeps the page slot in the flipbook
                  <div style={{ width: '100%', height: '100%', background: '#f5f5f5' }} />
                )}
              </div>
            ))}
          </HTMLFlipBook>
        </div>
      </div>

      <button
        className="pageflip-nav-arrow prev"
        onClick={goToPrevPage}
        disabled={currentPage === 0}
        aria-label="Previous page"
      >
        <ChevronLeft size={32} />
      </button>
      
      <button
        className="pageflip-nav-arrow next"
        onClick={goToNextPage}
        disabled={currentPage >= totalPages - 1}
        aria-label="Next page"
      >
        <ChevronRight size={32} />
      </button>

      <div className={`epic-progress-footer ${showNavigation ? 'visible' : ''}`}>
        <div className="epic-progress-content">
          <div className="epic-progress-left">
            {isReadToMeBook ? (
              <div className="audio-controls-compact">
                <button 
                  className={`epic-play-btn ${audioManager.state.isPlaying ? 'playing' : ''}`}
                  onClick={audioManager.state.isPlaying ? audioManager.pause : audioManager.play}
                  disabled={audioManager.state.isLoading}
                >
                  {audioManager.state.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  <span className="play-text">{audioManager.state.isPlaying ? rt('reader.pause') : rt('reader.play')}</span>
                </button>
                <button className="epic-audio-btn" onClick={audioManager.replay} disabled={audioManager.state.isLoading}>
                  <RotateCcw size={18} />
                </button>
                <div className="volume-control-wrapper">
                  <button 
                    className="epic-audio-btn" 
                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                    onMouseEnter={() => setShowVolumeSlider(true)}
                  >
                    {audioManager.state.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  {showVolumeSlider && (
                    <div 
                      className="volume-slider-popup"
                      onMouseLeave={() => setShowVolumeSlider(false)}
                    >
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={audioManager.state.volume * 100}
                        onChange={(e) => audioManager.setVolume(parseInt(e.target.value) / 100)}
                        className="volume-slider"
                      />
                      <div className="volume-percentage">{Math.round(audioManager.state.volume * 100)}%</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button className="epic-play-btn" disabled>
                <Play size={20} />
                <span className="play-text">{rt('reader.play')}</span>
              </button>
            )}
          </div>
          
          <div className="epic-progress-center">
            <div className="reading-goal-overlay">
              <ReadingGoalTimer goalMinutes={5} isReading={isActivelyReading} />
            </div>
            <div className="epic-progress-bar-container">
              <div className="epic-progress-bar">
                <div className="epic-progress-fill" style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }} />
              </div>
              <div className="epic-page-info">
                {rt('reader.page')} {currentPage + 1} {rt('reader.of')} {totalPages}{rt('reader.pages')}
              </div>
            </div>
          </div>
          
          <div className="epic-progress-right">
            <div className="epic-settings-wrapper">
              <button className="epic-settings-btn" onClick={toggleSettingsPopout}>
                <Settings size={20} />
              </button>
              {showSettingsPopout && (
                <div className="epic-settings-popout">
                  <div className="epic-settings-arrow"></div>
                  <div className="epic-settings-popout-content">
                    <div className="epic-popout-item">
                      <div className="epic-popout-label">
                        {wordHighlightEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                        {rt('reader.word.highlight')}
                      </div>
                      <div className={`epic-toggle-switch ${wordHighlightEnabled ? 'active' : ''}`} onClick={() => setWordHighlightEnabled(!wordHighlightEnabled)}>
                        <div className="epic-toggle-slider"></div>
                      </div>
                    </div>
                    <div className="epic-popout-item">
                      <div className="epic-popout-label"><span>🔍</span>{rt('reader.zoom')}</div>
                      <div className="epic-popout-zoom-controls">
                        <button className="epic-popout-zoom-btn" onClick={handleZoomOut}>−</button>
                        <div className="epic-popout-zoom-display">{zoomLevel}%</div>
                        <button className="epic-popout-zoom-btn" onClick={handleZoomIn}>+</button>
                      </div>
                    </div>
                    <div className="epic-popout-item">
                      <div className="epic-popout-label"><Maximize size={16} />{rt('reader.fullscreen')}</div>
                      <button className={`epic-popout-btn ${isFullscreen ? 'active' : ''}`} onClick={toggleFullscreen}>⛶</button>
                    </div>
                    <div className="epic-popout-item">
                      <div className="epic-popout-label"><AlertTriangle size={16} />{rt('reader.report')}</div>
                      <button className="epic-popout-btn report" onClick={handleReportProblem}>!</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactPageFlipReader;
