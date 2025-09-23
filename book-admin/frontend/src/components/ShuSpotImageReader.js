import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import '../styles/AudioControls.css';

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
  
  // Audio state
  const [audioFiles, setAudioFiles] = useState({});
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted
  const [volume, setVolume] = useState(0.8);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioPlaylist, setAudioPlaylist] = useState([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const audioRef = useRef(null);
  const playlistRef = useRef([]);
  const playlistIndexRef = useRef(0);
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
    // First, honor direct URL if provided (e.g., Supabase public URL)
    if (pageData?.url) {
      return pageData.url;
    }
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
            console.log('🎯 Generated book notes URL for page', pageNumber, ':', url);
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

  // Extract audio files from book data
  const extractAudioFiles = useCallback(() => {
    console.log('🎵 Extracting audio files from book data...');
    console.log('🎵 Book object:', book);
    const audioMap = {};
    
    // Check if book has page sequence with audio files
    if (book?._page_sequence) {
      book._page_sequence.forEach((page, index) => {
        const pageNumber = page.page_number || index + 1;
        if (page.audio_files && page.audio_files.length > 0) {
          audioMap[pageNumber] = page.audio_files.map(audio => ({
            filename: audio.filename,
            url: audio.url,
            type: audio.type || 'page_audio'
          }));
        }
      });
    }
    
    // For "Our Sun is A Star", we know which pages have audio from our test
    if (book?._folder_path && Object.keys(audioMap).length === 0) {
      console.log('🎵 No audio in page sequence, using known audio pages...');
      
      const folderPathMatch = book._folder_path.match(/.*CROP-ShuSpot[\/\\](.+)$/);
      if (folderPathMatch) {
        const [, relativePath] = folderPathMatch;
        const cleanPath = relativePath.replace(/\\/g, '/');
        
        // Based on our audio test results for "Our Sun is A Star"
        const knownAudioPages = [1, 2, 3, 5, 6, 7, 9, 10, 13, 14, 15, 16, 19, 20, 21];
        
        knownAudioPages.forEach(pageNum => {
          let pattern;
          if (pageNum === 1) {
            pattern = 'intro title.mp3';
          } else {
            pattern = `page ${pageNum}.mp3`;
          }
          
          audioMap[pageNum] = [{
            filename: pattern,
            url: `https://xzwdtcczndgglqikmlwj.supabase.co/storage/v1/object/public/books/CROP-ShuSpot/${cleanPath}/${pattern}`,
            type: pageNum === 1 ? 'intro' : 'page_audio'
          }];
        });
      }
    }
    
    console.log('🎵 Audio files extracted:', audioMap);
    setAudioFiles(audioMap);
    
    return audioMap;
  }, [book]);

  // Get audio URL for a specific page (simplified to prevent loops)
  const getAudioUrl = useCallback((pageNumber) => {
    const pageAudio = audioFiles[pageNumber];
    if (pageAudio && pageAudio.length > 0) {
      // Return the first audio file for the page
      return pageAudio[0].url;
    }
    
    return null; // Only use pre-mapped audio files to prevent loops
  }, [audioFiles]);

  // Get sequential audio playlist for current spread
  const getAudioPlaylist = useCallback(() => {
    const pagesToTry = [currentPage];
    if (currentPage % 2 === 0) {
      pagesToTry.push(currentPage + 1);
    } else {
      pagesToTry.unshift(currentPage - 1);
    }
    
    const playlist = [];
    for (const pageNum of pagesToTry) {
      if (pageNum > 0 && pageNum <= totalPages) {
        const url = getAudioUrl(pageNum);
        if (url && audioFiles[pageNum]) {
          playlist.push({
            pageNumber: pageNum,
            url: url,
            title: `Page ${pageNum}`
          });
        }
      }
    }
    
    console.log('🎵 📋 Audio playlist for spread:', playlist);
    return playlist;
  }, [currentPage, totalPages, audioFiles, getAudioUrl]);

  // Update refs when state changes
  useEffect(() => {
    playlistRef.current = audioPlaylist;
    playlistIndexRef.current = currentPlaylistIndex;
  }, [audioPlaylist, currentPlaylistIndex]);

  // Test if audio URL is accessible
  const testAudioUrl = useCallback(async (url) => {
    try {
      console.log('🎵 Testing audio URL accessibility:', url);
      const response = await fetch(url, { method: 'HEAD' });
      console.log('🎵 Audio URL test response:', response.status, response.statusText);
      return response.ok;
    } catch (error) {
      console.error('🎵 Audio URL test failed:', error);
      return false;
    }
  }, []);

  // Audio control functions - fixed for reliable playback
  const playAudio = useCallback(async (audioUrl, pageNumber = currentPage, isAutoContinue = false) => {
    if (!audioUrl) {
      console.log('🎵 No audio URL provided');
      return;
    }
    
    console.log('🎵 Playing audio:', audioUrl);
    console.log('🎵 Current volume:', volume, 'Muted:', isMuted);
    
    // Test URL accessibility first
    const isAccessible = await testAudioUrl(audioUrl);
    if (!isAccessible) {
      console.error('🎵 ❌ Audio URL is not accessible:', audioUrl);
      setIsPlaying(false);
      return;
    }
    
    // Stop and cleanup any existing audio
    if (audioRef.current) {
      console.log('🎵 Stopping existing audio');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Remove all event listeners to prevent memory leaks
      audioRef.current.removeEventListener('loadedmetadata', () => {});
      audioRef.current.removeEventListener('timeupdate', () => {});
      audioRef.current.removeEventListener('ended', () => {});
      audioRef.current.removeEventListener('error', () => {});
      audioRef.current = null;
    }
    
    // Create new audio element with better configuration
    const audio = new Audio();
    
    // Set audio properties for better compatibility
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    
    // Set volume immediately
    audio.volume = isMuted ? 0 : volume;
    console.log('🎵 Audio element volume set to:', audio.volume);
    
    // Add event listeners with proper cleanup
    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      console.log('🎵 Audio metadata loaded. Duration:', audio.duration);
    };
    
    const handleTimeUpdate = () => {
      setAudioProgress(audio.currentTime);
    };
    
    const handleEnded = () => {
      console.log('🎵 Audio ended');
      setAudioProgress(0);
      
      // Use refs to get current values
      const currentPlaylist = playlistRef.current;
      const currentIndex = playlistIndexRef.current;
      
      console.log('🎵 Current playlist:', currentPlaylist);
      console.log('🎵 Current index:', currentIndex);
      
      // Check if there's a next audio in the playlist
      if (currentPlaylist.length > 0 && currentIndex < currentPlaylist.length - 1) {
        const nextIndex = currentIndex + 1;
        const nextAudio = currentPlaylist[nextIndex];
        console.log(`🎵 🎬 Auto-playing next audio: ${nextAudio.title} (${nextIndex + 1}/${currentPlaylist.length})`);
        
        setCurrentPlaylistIndex(nextIndex);
        // Small delay to ensure clean transition
        setTimeout(() => {
          playAudio(nextAudio.url, nextAudio.pageNumber, true);
        }, 200);
      } else {
        console.log('🎵 🏁 Playlist finished');
        setIsPlaying(false);
        setCurrentAudio(null);
        setCurrentPlaylistIndex(0);
        setAudioPlaylist([]);
      }
    };
    
    const handleError = (e) => {
      console.error('🎵 Audio error:', e);
      console.error('🎵 Audio error details:', audio.error);
      setIsPlaying(false);
      setCurrentAudio(null);
    };
    
    const handleCanPlay = () => {
      console.log('🎵 Audio can play - ready for playback');
    };
    
    const handleLoadStart = () => {
      console.log('🎵 Audio load started');
    };
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);
    
    // Store reference
    audioRef.current = audio;
    
    // Check browser audio capabilities
    console.log('🎵 Browser audio capabilities:');
    console.log('  - Audio constructor available:', typeof Audio !== 'undefined');
    console.log('  - AudioContext available:', typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined');
    
    // Set source and load
    audio.src = audioUrl;
    audio.load();
    
    // Set playing state immediately to prevent multiple clicks
    setIsPlaying(true);
    setCurrentAudio(audioUrl);
    
    // Wait for audio to be ready, then play
    const attemptPlay = () => {
      console.log('🎵 Attempting to play audio...');
      console.log('🎵 Audio ready state:', audio.readyState);
      console.log('🎵 Audio network state:', audio.networkState);
      console.log('🎵 Audio src:', audio.src);
      console.log('🎵 Audio volume before play:', audio.volume);
      console.log('🎵 Audio muted before play:', audio.muted);
      
      audio.play()
        .then(() => {
          console.log('🎵 ✅ Audio play() promise resolved! Volume:', audio.volume);
          console.log('🎵 Audio element properties after play():');
          console.log('  - paused:', audio.paused);
          console.log('  - ended:', audio.ended);
          console.log('  - currentTime:', audio.currentTime);
          console.log('  - duration:', audio.duration);
          console.log('  - volume:', audio.volume);
          console.log('  - muted:', audio.muted);
          console.log('  - readyState:', audio.readyState);
          
          // Multiple verification checks
          const verifyPlayback = (attempt) => {
            setTimeout(() => {
              if (audio && audioRef.current === audio) {
                console.log(`🎵 Verification attempt ${attempt}:`);
                console.log('  - currentTime:', audio.currentTime);
                console.log('  - paused:', audio.paused);
                console.log('  - ended:', audio.ended);
                console.log('  - volume:', audio.volume);
                
                if (audio.currentTime > 0 && !audio.paused) {
                  console.log('🎵 ✅ Audio is definitely playing!');
                } else if (attempt < 3) {
                  console.log(`🎵 ⚠️ Audio not progressing, attempt ${attempt + 1}...`);
                  verifyPlayback(attempt + 1);
                } else {
                  console.log('🎵 ❌ Audio failed to start after multiple attempts');
                  // Try one more manual restart
                  if (!audio.paused) {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.play().catch(e => console.log('🎵 Final restart failed:', e));
                  }
                }
              }
            }, attempt * 500);
          };
          
          verifyPlayback(1);
        })
        .catch(error => {
          console.error('🎵 ❌ Audio play failed:', error);
          setIsPlaying(false);
          setCurrentAudio(null);
          
          // Provide specific error feedback
          if (error.name === 'NotAllowedError') {
            console.log('🎵 Browser blocked autoplay. User interaction required.');
          } else if (error.name === 'NotSupportedError') {
            console.log('🎵 Audio format not supported by browser.');
          } else {
            console.log('🎵 Unknown audio error:', error.message);
          }
        });
    };
    
    // Try to play immediately if ready, otherwise wait for canplay event
    if (audio.readyState >= 3) { // HAVE_FUTURE_DATA
      attemptPlay();
    } else {
      audio.addEventListener('canplay', attemptPlay, { once: true });
    }
  }, [isMuted, volume, currentPage, testAudioUrl]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      console.log('🎵 Pausing audio at time:', audioRef.current.currentTime);
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    console.log('🎵 🔘 PLAY BUTTON CLICKED! Current state - isPlaying:', isPlaying);
    
    if (isPlaying) {
      console.log('🎵 Pausing audio...');
      pauseAudio();
    } else {
      console.log('🎵 Starting sequential audio playback...');
      
      // Get the audio playlist for current spread
      const playlist = getAudioPlaylist();
      
      console.log('🎵 🔍 Debug - Current page:', currentPage);
      console.log('🎵 🔍 Debug - Audio files:', audioFiles);
      console.log('🎵 🔍 Debug - Generated playlist:', playlist);
      
      if (playlist.length > 0) {
        console.log(`🎵 📋 Starting playlist with ${playlist.length} audio files`);
        setAudioPlaylist(playlist);
        setCurrentPlaylistIndex(0);
        
        const firstAudio = playlist[0];
        console.log(`🎵 🎯 Playing first audio: ${firstAudio.title} (1/${playlist.length})`);
        playAudio(firstAudio.url, firstAudio.pageNumber);
      } else {
        console.log(`🎵 ❌ No audio available for current spread`);
        console.log('🎵 Available audio files:', Object.keys(audioFiles));
      }
    }
  }, [isPlaying, pauseAudio, playAudio, getAudioPlaylist]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    console.log(`🎵 🔇 Toggling mute: ${isMuted} → ${newMutedState}`);
    
    if (audioRef.current) {
      const newVolume = newMutedState ? 0 : volume;
      audioRef.current.volume = newVolume;
      console.log(`🎵 Audio volume changed to: ${newVolume}`);
      console.log(`🎵 Audio muted property: ${audioRef.current.muted}`);
      
      // Also set the muted property for better browser compatibility
      audioRef.current.muted = newMutedState;
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((newVolume) => {
    console.log(`🎵 🔊 Volume slider changed to: ${newVolume}`);
    setVolume(newVolume);
    
    if (audioRef.current) {
      if (!isMuted) {
        audioRef.current.volume = newVolume;
        console.log(`🎵 Audio element volume updated to: ${newVolume}`);
      }
      // If volume is changed while muted, unmute automatically
      if (isMuted && newVolume > 0) {
        setIsMuted(false);
        audioRef.current.muted = false;
        audioRef.current.volume = newVolume;
        console.log(`🎵 Auto-unmuted due to volume change`);
      }
    }
  }, [isMuted]);

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

  // Extract audio files when book data is loaded
  useEffect(() => {
    if (book && pages.length > 0) {
      extractAudioFiles();
    }
  }, [book, pages, extractAudioFiles]);

  // Handle page changes for audio - MANUAL ONLY (no autoplay)
  useEffect(() => {
    // Stop current audio when page changes
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    // Reset playlist when page changes
    if (audioPlaylist.length > 0) {
      console.log('🎵 📄 Page changed, resetting audio playlist');
      setAudioPlaylist([]);
      setCurrentPlaylistIndex(0);
    }
    
    // Just log what audio is available, don't auto-play
    const pagesToTry = [currentPage];
    if (currentPage % 2 === 0) {
      pagesToTry.push(currentPage + 1);
    } else {
      pagesToTry.unshift(currentPage - 1);
    }
    
    // Find available audio but don't play it
    for (const pageNum of pagesToTry) {
      if (pageNum > 0 && pageNum <= totalPages && audioFiles[pageNum]) {
        console.log(`🎵 Audio available for page ${pageNum} (click play button to hear)`);
        break;
      }
    }
  }, [currentPage, totalPages, audioFiles, isPlaying, audioPlaylist.length]);

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

              {/* Audio Controls */}
              <div className="enhanced-nav-audio">
                {(() => {
                  // Check for audio on current page or adjacent page in spread
                  const pagesToTry = [currentPage];
                  if (currentPage % 2 === 0) {
                    pagesToTry.push(currentPage + 1);
                  } else {
                    pagesToTry.unshift(currentPage - 1);
                  }
                  
                  let hasAudio = false;
                  let audioPage = null;
                  
                  for (const pageNum of pagesToTry) {
                    if (pageNum > 0 && pageNum <= totalPages && audioFiles[pageNum]) {
                      hasAudio = true;
                      audioPage = pageNum;
                      break;
                    }
                  }
                  
                  return hasAudio ? (
                    <div className="audio-controls">
                      {audioPlaylist.length > 1 && (
                        <button 
                          onClick={() => {
                            if (currentPlaylistIndex > 0) {
                              const prevIndex = currentPlaylistIndex - 1;
                              const prevAudio = audioPlaylist[prevIndex];
                              console.log(`🎵 ⏮️ Skipping to previous: ${prevAudio.title}`);
                              setCurrentPlaylistIndex(prevIndex);
                              playAudio(prevAudio.url, prevAudio.pageNumber);
                            }
                          }}
                          className="nav-btn audio-prev-btn"
                          title="Previous Audio"
                          disabled={currentPlaylistIndex === 0}
                          style={{ opacity: currentPlaylistIndex === 0 ? 0.5 : 1 }}
                        >
                          ⏮️
                        </button>
                      )}
                      
                      <button 
                        onClick={toggleAudio} 
                        className="nav-btn audio-play-btn" 
                        title={isPlaying ? "Pause Audio" : `Play Audio (Page ${audioPage})`}
                      >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      
                      {audioPlaylist.length > 1 && (
                        <button 
                          onClick={() => {
                            if (currentPlaylistIndex < audioPlaylist.length - 1) {
                              const nextIndex = currentPlaylistIndex + 1;
                              const nextAudio = audioPlaylist[nextIndex];
                              console.log(`🎵 ⏭️ Skipping to next: ${nextAudio.title}`);
                              setCurrentPlaylistIndex(nextIndex);
                              playAudio(nextAudio.url, nextAudio.pageNumber);
                            }
                          }}
                          className="nav-btn audio-next-btn"
                          title="Next Audio"
                          disabled={currentPlaylistIndex === audioPlaylist.length - 1}
                          style={{ opacity: currentPlaylistIndex === audioPlaylist.length - 1 ? 0.5 : 1 }}
                        >
                          ⏭️
                        </button>
                      )}
                      
                      <button 
                        onClick={toggleMute} 
                        className="nav-btn audio-mute-btn" 
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      
                      <div className="audio-progress-container">
                        <div className="audio-progress-bar">
                          <div 
                            className="audio-progress-fill" 
                            style={{ 
                              width: audioDuration > 0 ? `${(audioProgress / audioDuration) * 100}%` : '0%' 
                            }}
                          />
                        </div>
                        <div className="audio-time">
                          {Math.floor(audioProgress)}s / {Math.floor(audioDuration)}s
                        </div>
                      </div>
                      
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="volume-slider"
                        title="Volume"
                      />
                      
                      <button 
                        onClick={() => {
                          const audioUrl = getAudioUrl(audioPage);
                          if (audioUrl) {
                            console.log('🎵 🧪 Testing direct audio playback...');
                            const testAudio = new Audio(audioUrl);
                            testAudio.volume = 0.8;
                            testAudio.play()
                              .then(() => console.log('🎵 ✅ Direct test successful'))
                              .catch(e => console.error('🎵 ❌ Direct test failed:', e));
                          }
                        }}
                        className="nav-btn audio-test-btn"
                        title="Test Direct Audio"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        Test
                      </button>
                      
                      <div className="audio-page-indicator">
                        {audioPlaylist.length > 1 ? (
                          <div>
                            <div>Page {audioPage}</div>
                            <div style={{ fontSize: '11px', color: '#888' }}>
                              {currentPlaylistIndex + 1}/{audioPlaylist.length} in sequence
                            </div>
                          </div>
                        ) : (
                          <div>Page {audioPage}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="no-audio-indicator">
                      <span className="text-gray-400">No audio for this spread</span>
                    </div>
                  );
                })()}
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
