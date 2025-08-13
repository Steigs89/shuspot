import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { pdfjs as pdfjsLib } from 'react-pdf';
import BookCompletionScreen from './BookCompletionScreen';
import QuizModal from './QuizModal';
import { QuizGenerator } from '../utils/quizGenerator';
import { useUserStats } from '../contexts/UserStatsContext';

// Set up PDF.js worker - use version that matches react-pdf
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs';

interface PdfReadAlongInterfaceProps {
  onBack: () => void;
  pdfBook: {
    id: string;
    title: string;
    author: string;
    cover: string;
    pdfUrl: string;
    totalPages: number;
    file: File;
    mediaType?: string;
  };
  onProgressUpdate?: (bookId: string, pagesRead: number, timeSpent?: number) => void;
}

interface PdfPage {
  pageNumber: number;
  text: string;
  words: string[];
  audioTimings: number[];
  imageUrl: string; // Canvas data URL for the rendered PDF page
}

export default function PdfReadAlongInterface({ onBack, pdfBook, onProgressUpdate }: PdfReadAlongInterfaceProps) {
  const { addReadingSession, updateReadingProgress, completeBook, addQuizResult } = useUserStats();
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev'>('next');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(1.0); // Volume from 0.0 to 1.0
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [avatarAnimating, setAvatarAnimating] = useState(false);
  const [pdfPages, setPdfPages] = useState<PdfPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [readingStartTime, setReadingStartTime] = useState<number>(Date.now());
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);


  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [googleVoices, setGoogleVoices] = useState<any[]>([]);
  const [selectedGoogleVoice, setSelectedGoogleVoice] = useState<string>('');
  const [voiceEngine] = useState<'google'>('google');

  const GOOGLE_API_KEY = 'AIzaSyCO3KGws-7lAIyzjphIMJ0RHEg6iqpCASM';

  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // Load Turn.js and jQuery from CDN for reliability
  useEffect(() => {
    const loadTurnJS = () => {
      // Load jQuery from CDN if not already loaded
      if (!(window as any).$) {
        const jqueryScript = document.createElement('script');
        jqueryScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js';
        jqueryScript.onload = () => {
          console.log('jQuery loaded successfully');
          // Load Turn.js after jQuery is loaded
          const turnScript = document.createElement('script');
          turnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/turn.js/4.1.0/turn.min.js';
          turnScript.onload = () => {
            console.log('Turn.js loaded successfully');
          };
          turnScript.onerror = () => {
            console.error('Failed to load Turn.js from CDN');
          };
          document.head.appendChild(turnScript);
        };
        jqueryScript.onerror = () => {
          console.error('Failed to load jQuery from CDN');
        };
        document.head.appendChild(jqueryScript);
      } else {
        // jQuery already loaded, just load Turn.js
        if (!(window as any).$.fn.turn) {
          const turnScript = document.createElement('script');
          turnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/turn.js/4.1.0/turn.min.js';
          turnScript.onload = () => {
            console.log('Turn.js loaded successfully');
          };
          turnScript.onerror = () => {
            console.error('Failed to load Turn.js from CDN');
          };
          document.head.appendChild(turnScript);
        }
      }
    };

    loadTurnJS();
  }, []);

  // Initialize Google TTS voices only
  useEffect(() => {

    // Load Google Cloud TTS voices
    const loadGoogleVoices = async () => {
      try {
        // Google Cloud TTS voices - diverse selection with different characteristics
        const childFriendlyVoices = [
          { 
            name: 'en-US-Neural2-F', 
            displayName: 'Emma (Warm Female)', 
            language: 'en-US', 
            gender: 'FEMALE',
            pitch: 3.0,
            speakingRate: 0.85,
            description: 'Warm, nurturing female voice'
          },
          { 
            name: 'en-US-Neural2-A', 
            displayName: 'Alex (Friendly Male)', 
            language: 'en-US', 
            gender: 'MALE',
            pitch: -2.0,
            speakingRate: 0.9,
            description: 'Friendly, approachable male voice'
          },
          { 
            name: 'en-US-Neural2-C', 
            displayName: 'Charlie (Energetic Male)', 
            language: 'en-US', 
            gender: 'MALE',
            pitch: 0.0,
            speakingRate: 1.0,
            description: 'Energetic, upbeat male voice'
          },
          { 
            name: 'en-US-Neural2-G', 
            displayName: 'Grace (Gentle Female)', 
            language: 'en-US', 
            gender: 'FEMALE',
            pitch: 4.0,
            speakingRate: 0.8,
            description: 'Gentle, soothing female voice'
          },
          { 
            name: 'en-US-Neural2-H', 
            displayName: 'Hannah (Cheerful Female)', 
            language: 'en-US', 
            gender: 'FEMALE',
            pitch: 2.5,
            speakingRate: 0.95,
            description: 'Cheerful, bright female voice'
          },
          { 
            name: 'en-US-Neural2-D', 
            displayName: 'David (Calm Male)', 
            language: 'en-US', 
            gender: 'MALE',
            pitch: -1.0,
            speakingRate: 0.85,
            description: 'Calm, steady male voice'
          },
          { 
            name: 'en-GB-Neural2-A', 
            displayName: 'Arthur (British Male)', 
            language: 'en-GB', 
            gender: 'MALE',
            pitch: -0.5,
            speakingRate: 0.9,
            description: 'British accent, storytelling voice'
          },
          { 
            name: 'en-GB-Neural2-B', 
            displayName: 'Bella (British Female)', 
            language: 'en-GB', 
            gender: 'FEMALE',
            pitch: 2.0,
            speakingRate: 0.85,
            description: 'British accent, elegant female voice'
          },
        ];
        
        setGoogleVoices(childFriendlyVoices);
        setSelectedGoogleVoice(childFriendlyVoices[0].name); // Default to Emma
        
        console.log('Google voices loaded:', childFriendlyVoices);
      } catch (error) {
        console.error('Error loading Google voices:', error);
      }
    };

    loadGoogleVoices();
  }, []);

  // Ultra-fast PDF loading with instant UI
  useEffect(() => {
    const loadPdfContent = async () => {
      console.log('🚀 Starting ultra-fast PDF loading for:', pdfBook.title);
      const startTime = performance.now();
      
      try {
        // INSTANT UI: Show interface immediately with placeholder
        setIsLoading(false); // Remove loading screen immediately
        setPdfPages([{
          pageNumber: 1,
          text: 'Loading your story...',
          words: ['Loading', 'your', 'story...'],
          audioTimings: [0, 500, 1000],
          imageUrl: '' // Empty image initially
        }]);
        
        // Load PDF in background
        const loadingTask = pdfjsLib.getDocument({
          url: pdfBook.pdfUrl,
          disableFontFace: true,
          useSystemFonts: true,
          // Ultra-fast loading options
          verbosity: 0, // Disable verbose logging
          maxImageSize: 1024 * 1024, // Limit image size for speed
        });
        
        const pdf = await loadingTask.promise;
        console.log('📄 PDF loaded, processing first page...');
        
        // Load ONLY the first page initially
        const firstPage = await pdf.getPage(1);
        const firstPageData = await processPageFast(firstPage, 1);
        setPdfPages([firstPageData]);
        
        const firstPageTime = performance.now();
        console.log(`⚡ First page ready in ${Math.round(firstPageTime - startTime)}ms`);
        
        // Load remaining pages in background (don't wait)
        const totalPages = Math.min(pdf.numPages, 10); // Further reduced to 10 pages
        loadRemainingPagesInBackground(pdf, totalPages, firstPageData);
        
      } catch (error) {
        console.error('❌ Error loading PDF:', error);
        setPdfPages([{
          pageNumber: 1,
          text: `Unable to load PDF content for "${pdfBook.title}". Please try again.`,
          words: ["Unable", "to", "load", "PDF", "content", "for", `"${pdfBook.title}".`, "Please", "try", "again."],
          audioTimings: [0, 500, 1000, 1500, 2000, 2500, 3000, 4000, 4500, 5000],
          imageUrl: ''
        }]);
      }
    };

    // Background loading function (non-blocking)
    const loadRemainingPagesInBackground = async (pdf: any, totalPages: number, firstPage: PdfPage) => {
      const pages = [firstPage];
      
      // Load pages 2-5 first (immediate next pages)
      const priorityPages = Math.min(5, totalPages);
      for (let pageNum = 2; pageNum <= priorityPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const pageData = await processPageFast(page, pageNum);
          pages.push(pageData);
          setPdfPages([...pages]); // Update UI progressively
          
          // Tiny delay to keep UI responsive
          await new Promise(resolve => setTimeout(resolve, 5));
        } catch (error) {
          console.warn(`Failed to load page ${pageNum}:`, error);
        }
      }
      
      // Load remaining pages with lower priority
      for (let pageNum = priorityPages + 1; pageNum <= totalPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const pageData = await processPageFast(page, pageNum);
          pages.push(pageData);
          setPdfPages([...pages]);
          
          // Longer delay for background loading
          await new Promise(resolve => setTimeout(resolve, 20));
        } catch (error) {
          console.warn(`Failed to load page ${pageNum}:`, error);
        }
      }
      
      console.log(`✅ All ${pages.length} pages loaded in background`);
    };

    // Ultra-fast page processing function
    const processPageFast = async (page: any, pageNum: number): Promise<PdfPage> => {
      // Extract text content
      const textContent = await page.getTextContent();
      const textItems = textContent.items as any[];
      
      // Combine all text items into a single string
      const fullText = textItems
        .filter(item => item.str && item.str.trim())
        .map(item => item.str)
        .join(' ')
        .trim();
      
      // Split into words and clean them up
      const words = fullText
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => word.trim());
      
      // Generate audio timings (500ms per word on average)
      const audioTimings = words.map((_, index) => index * 500);
      
      // Ultra-fast rendering with minimal quality
      const viewport = page.getViewport({ scale: 1.0 }); // Even lower scale for speed
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      
      // Use JPEG with lower quality for maximum speed
      const imageUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality for speed
      
      return {
        pageNumber: pageNum,
        text: fullText,
        words: words,
        audioTimings: audioTimings,
        imageUrl: imageUrl
      };
    };

    // Optimization 3: Extract page processing into separate function
    const processPage = async (page: any, pageNum: number): Promise<PdfPage> => {
      // Extract text content
      const textContent = await page.getTextContent();
      const textItems = textContent.items as any[];
      
      // Combine all text items into a single string
      const fullText = textItems
        .filter(item => item.str && item.str.trim())
        .map(item => item.str)
        .join(' ')
        .trim();
      
      // Split into words and clean them up
      const words = fullText
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => word.trim());
      
      // Generate audio timings (500ms per word on average)
      const audioTimings = words.map((_, index) => index * 500);
      
      // Optimization 4: Use lower scale for faster rendering
      const viewport = page.getViewport({ scale: 1.5 }); // Reduced from 2.0 to 1.5
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      
      // Optimization 5: Use WebP format if supported, otherwise JPEG for smaller size
      let imageUrl: string;
      try {
        imageUrl = canvas.toDataURL('image/webp', 0.8); // WebP with 80% quality
      } catch {
        imageUrl = canvas.toDataURL('image/jpeg', 0.85); // JPEG fallback with 85% quality
      }
      
      return {
        pageNumber: pageNum,
        text: fullText,
        words: words,
        audioTimings: audioTimings,
        imageUrl: imageUrl
      };
    };

    loadPdfContent();
  }, [pdfBook]);

  const currentPageData = pdfPages[currentPage];

  // Generate Google Cloud TTS audio
  const generateGoogleAudio = async (text: string, voiceName: string): Promise<string> => {
    try {
      console.log('Making Google TTS request with:', { text: text.substring(0, 50) + '...', voiceName });
      
      // Find the voice configuration to get custom settings
      const voiceConfig = googleVoices.find(v => v.name === voiceName);
      const pitch = voiceConfig?.pitch || 2.0;
      const speakingRate = voiceConfig?.speakingRate || 0.9;
      
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text: text },
          voice: {
            languageCode: voiceName.startsWith('en-US') ? 'en-US' : 'en-GB',
            name: voiceName
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speakingRate,
            pitch: pitch,
            volumeGainDb: 0.0
          }
        })
      });

      console.log('Google TTS response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google TTS API Error:', response.status, errorText);
        throw new Error(`Google TTS API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Google TTS response received, audio content length:', data.audioContent?.length);
      
      // Convert base64 audio to blob URL
      const audioBytes = data.audioContent;
      const binaryString = atob(audioBytes);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Google TTS audio blob created:', audioUrl);
      
      return audioUrl;
    } catch (error) {
      console.error('Error generating Google TTS audio:', error);
      throw error;
    }
  };

  // AI Voice synthesis and word highlighting logic
  useEffect(() => {
    // Stop all audio immediately
    
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement.src = '';
    }
    
    if (progressRef.current) {
      clearTimeout(progressRef.current);
      progressRef.current = null;
    }
    
    // Removed browser TTS references
    setAvatarAnimating(false);
    
    // Exit early if not playing
    if (!isPlaying || !currentPageData) {
      return;
    }
    
    setAvatarAnimating(true);

    const startSpeechAndHighlighting = async () => {
      try {
        if (voiceEngine === 'google' && selectedGoogleVoice) {
          // Use Google Cloud TTS
          console.log('Generating Google TTS audio...');
          try {
            const audioUrl = await generateGoogleAudio(currentPageData.text, selectedGoogleVoice);
            
            const audio = new Audio(audioUrl);
            audio.volume = isMuted ? 0 : volumeLevel;
            setAudioElement(audio);

            // Add more event listeners for better debugging
            audio.oncanplay = () => {
              console.log('Google TTS audio can play');
              if (isPlaying) {
                audio.play().then(() => {
                  console.log('Google TTS audio started playing');
                  startWordHighlighting(audio);
                }).catch(error => {
                  console.error('Error playing Google TTS audio:', error);
                  setAvatarAnimating(false);
                });
              }
            };

            audio.onloadeddata = () => {
              console.log('Google TTS audio loaded');
            };

            audio.onended = () => {
              console.log('Google TTS audio ended');
              setAvatarAnimating(false);
              setTimeout(async () => {
                if (currentPage < pdfPages.length - 1) {
                  nextPage();
                } else {
                  // Book completed - show completion screen
                  setIsPlaying(false);
                  const readingTime = Math.round((Date.now() - readingStartTime) / 60000); // Convert to minutes
                  const pointsEarned = Math.max(100, readingTime * 50); // Base points + time bonus
                  
                  // Track book completion in user stats - map media type to correct book type
                  console.log('🔍 PdfReadAlongInterface - Full pdfBook object:', pdfBook);
                  console.log('📊 PdfReadAlongInterface - Media Type:', pdfBook.mediaType);
                  console.log('🔤 PdfReadAlongInterface - Media Type (exact string):', JSON.stringify(pdfBook.mediaType));
                  
                  let bookType: 'pdf' | 'audiobook' | 'video' | 'readToMe' | 'voiceCoach' = 'pdf';
                  if (pdfBook.mediaType === 'Read to me') bookType = 'readToMe';
                  else if (pdfBook.mediaType === 'Voice Coach') bookType = 'voiceCoach';
                  else if (pdfBook.mediaType === 'Video Books' || pdfBook.mediaType === 'Videos') bookType = 'video';
                  else if (pdfBook.mediaType === 'Audiobooks') bookType = 'audiobook';
                  
                  console.log('📈 PdfReadAlongInterface - Final Book Type:', bookType);
                  console.log('🔍 PdfReadAlongInterface - Mapping check:');
                  console.log('  - Is "Read to me"?', pdfBook.mediaType === 'Read to me');
                  console.log('  - Is "Voice Coach"?', pdfBook.mediaType === 'Voice Coach');
                  console.log('  - Is "Books"?', pdfBook.mediaType === 'Books');
                  console.log('💾 About to call completeBook with:', {
                    bookId: pdfBook.id,
                    bookTitle: pdfBook.title,
                    bookType: bookType,
                    totalPages: pdfBook.totalPages,
                    readingTime: readingTime
                  });
                  
                  try {
                    await completeBook(pdfBook.id, pdfBook.title, bookType, pdfBook.totalPages, readingTime);
                    console.log('✅ PdfReadAlongInterface - Book completion saved successfully');
                  } catch (error) {
                    console.error('❌ PdfReadAlongInterface - Error saving book completion:', error);
                  }
                  
                  // Generate quiz questions from PDF content
                  const questions = QuizGenerator.generateQuiz(pdfPages, pdfBook.title);
                  setQuizQuestions(questions);
                  
                  setShowCompletionScreen(true);
                }
              }, 500);
            };

            audio.onerror = (error) => {
              console.error('Google TTS playback error:', error);
              setAvatarAnimating(false);
            };

            // Force load the audio
            audio.load();
            
          } catch (error) {
            console.error('Failed to generate Google TTS audio:', error);
            setAvatarAnimating(false);
          }
        } else {
          console.error('Google TTS not available or no voice selected');
          setAvatarAnimating(false);
        }
      } catch (error) {
        console.error('Error starting speech:', error);
        setAvatarAnimating(false);
      }
    };

    const startWordHighlighting = (audioEl?: HTMLAudioElement) => {
      let wordIndex = 0;
      const currentAudio = audioEl || audioElement;
      
      if (voiceEngine === 'google' && currentAudio) {
        const totalWords = currentPageData.words.length;
        
        const syncHighlighting = () => {
          if (!isPlaying || !currentAudio) return;
          
          const currentTime = currentAudio.currentTime;
          const totalDuration = currentAudio.duration;
          
          if (totalDuration && totalDuration > 0) {
            const progressRatio = currentTime / totalDuration;
            const expectedWordIndex = Math.floor(progressRatio * totalWords);
            
            if (expectedWordIndex !== wordIndex && expectedWordIndex < totalWords && expectedWordIndex >= 0) {
              wordIndex = expectedWordIndex;
              setCurrentWordIndex(wordIndex);
              setProgress((wordIndex / totalWords) * 100);
            }
          }
          
          if (isPlaying) {
            requestAnimationFrame(syncHighlighting);
          }
        };
        
        const startMonitoring = () => {
          if (currentAudio.duration && currentAudio.duration > 0) {
            syncHighlighting();
          } else {
            setTimeout(startMonitoring, 100);
          }
        };
        
        startMonitoring();
        
      } else {
        // Browser TTS highlighting
        const totalWords = currentPageData.words.length;
        const wordsPerSecond = 2.5;
        const wordDelay = 1000 / wordsPerSecond;

        const highlightWords = () => {
          if (wordIndex < totalWords && isPlaying) {
            setCurrentWordIndex(wordIndex);
            setProgress((wordIndex / totalWords) * 100);

            const currentWord = currentPageData.words[wordIndex];
            let delay = wordDelay;
            
            if (currentWord.includes('.') || currentWord.includes('!') || currentWord.includes('?')) {
              delay *= 1.1;
            }

            progressRef.current = setTimeout(() => {
              wordIndex++;
              highlightWords();
            }, delay);
          }
        };

        highlightWords();
      }
    };



    startSpeechAndHighlighting();

    return () => {
      // Cleanup on unmount
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.src = '';
      }
      
      if (progressRef.current) {
        clearTimeout(progressRef.current);
        progressRef.current = null;
      }
      
      setAvatarAnimating(false);
      setAudioElement(null);
    };
  }, [isPlaying, currentPage]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setCurrentWordIndex(0);
    }
  };

  const nextPage = () => {
    const $ = (window as any).$;
    if ($ && $('#flipbook').turn) {
      $('#flipbook').turn('next');
    } else {
      // Fallback to manual navigation
      if (currentPage < pdfPages.length - 1) {
        setIsPageTurning(true);
        setTurnDirection('next');
        setTimeout(() => {
          setCurrentPage(currentPage + 1);
          setCurrentWordIndex(0);
          setProgress(0);
          setTimeout(() => {
            setIsPageTurning(false);
          }, 400);
        }, 200);
      } else {
        // On last page, trigger completion
        setIsPlaying(false);
        const readingTime = Math.round((Date.now() - readingStartTime) / 60000);
        const pointsEarned = Math.max(100, readingTime * 50);
        
        // Track book completion in user stats - map media type to correct book type
        console.log('🔍 PdfReadAlongInterface (nextPage) - Full pdfBook object:', pdfBook);
        console.log('📊 PdfReadAlongInterface (nextPage) - Media Type:', pdfBook.mediaType);
        console.log('🔤 PdfReadAlongInterface (nextPage) - Media Type (exact string):', JSON.stringify(pdfBook.mediaType));
        
        let bookType: 'pdf' | 'audiobook' | 'video' | 'readToMe' | 'voiceCoach' = 'pdf';
        if (pdfBook.mediaType === 'Read to me') bookType = 'readToMe';
        else if (pdfBook.mediaType === 'Voice Coach') bookType = 'voiceCoach';
        else if (pdfBook.mediaType === 'Video Books' || pdfBook.mediaType === 'Videos') bookType = 'video';
        else if (pdfBook.mediaType === 'Audiobooks') bookType = 'audiobook';
        
        console.log('📈 PdfReadAlongInterface (nextPage) - Final Book Type:', bookType);
        console.log('💾 About to call completeBook (nextPage) with:', {
          bookId: pdfBook.id,
          bookTitle: pdfBook.title,
          bookType: bookType,
          totalPages: pdfBook.totalPages,
          readingTime: readingTime
        });
        
        // Save book completion
        (async () => {
          try {
            await completeBook(pdfBook.id, pdfBook.title, bookType, pdfBook.totalPages, readingTime);
            console.log('✅ PdfReadAlongInterface (nextPage) - Book completion saved successfully');
          } catch (error) {
            console.error('❌ PdfReadAlongInterface (nextPage) - Error saving book completion:', error);
          }
        })();
        
        // Generate quiz questions from PDF content
        const questions = QuizGenerator.generateQuiz(pdfPages, pdfBook.title);
        setQuizQuestions(questions);
        
        setShowCompletionScreen(true);
      }
    }
  };

  const prevPage = () => {
    const $ = (window as any).$;
    if ($ && $('#flipbook').turn) {
      $('#flipbook').turn('previous');
    } else {
      // Fallback to manual navigation
      if (currentPage > 0) {
        setIsPageTurning(true);
        setTurnDirection('prev');
        setTimeout(() => {
          setCurrentPage(currentPage - 1);
          setCurrentWordIndex(0);
          setProgress(0);
          setTimeout(() => {
            setIsPageTurning(false);
          }, 400);
        }, 200);
      }
    }
  };

  const renderHighlightedText = (text: string, words: string[]) => {
    return (
      <div className="text-xl leading-relaxed font-serif text-gray-800 max-w-2xl mx-auto">
        {words.map((word, index) => (
          <span
            key={index}
            className={`transition-all duration-300 ${index === currentWordIndex && isPlaying
              ? 'bg-yellow-300 text-gray-900 px-1 rounded shadow-sm transform scale-105'
              : index < currentWordIndex && isPlaying
                ? 'text-blue-600'
                : 'text-gray-800'
              }`}
          >
            {word}{' '}
          </span>
        ))}
      </div>
    );
  };

  // Quiz and completion handlers
  const handleReadAgain = () => {
    setShowCompletionScreen(false);
    setCurrentPage(0);
    setCurrentWordIndex(0);
    setProgress(0);
    setReadingStartTime(Date.now());
  };

  // Debug: Log when completion screen is shown
  useEffect(() => {
    if (showCompletionScreen) {
      console.log('🎉 DEBUG - Completion screen is now showing for:', pdfBook.title);
      console.log('📊 DEBUG - Book media type:', pdfBook.mediaType);
    }
  }, [showCompletionScreen, pdfBook.title, pdfBook.mediaType]);

  const handleStartQuiz = () => {
    console.log('Starting quiz...', { 
      quizQuestionsLength: quizQuestions.length, 
      quizQuestions: quizQuestions,
      showCompletionScreen,
      showQuizModal 
    });
    // Don't hide completion screen, just show quiz modal over it
    setShowQuizModal(true);
    console.log('After setting states - showQuizModal should be true');
  };

  const handleQuizComplete = (score: number, passed: boolean, badge?: string) => {
    // Track quiz result in user stats
    const readingTime = Math.round((Date.now() - readingStartTime) / 60000);
    addQuizResult({
      bookId: pdfBook.id,
      bookTitle: pdfBook.title,
      score: score,
      totalQuestions: quizQuestions.length || 5,
      passed: passed,
      badge: badge,
      timeSpent: readingTime
    });

    if (passed && badge) {
      setUserBadges(prev => [...prev, badge]);
      // Save badge to localStorage
      const savedBadges = JSON.parse(localStorage.getItem('userBadges') || '[]');
      localStorage.setItem('userBadges', JSON.stringify([...savedBadges, badge]));
    }
  };

  const handleCloseQuiz = () => {
    console.log('handleCloseQuiz called - closing quiz modal');
    setShowQuizModal(false);
    setShowCompletionScreen(true); // Return to completion screen
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your book...</p>
        </div>
      </div>
    );
  }

  // Show completion screen when book is finished
  if (showCompletionScreen) {
    const readingTime = Math.round((Date.now() - readingStartTime) / 60000);
    const pointsEarned = Math.max(100, readingTime * 50);
    
    return (
      <>
        <BookCompletionScreen
          bookTitle={pdfBook.title}
          bookCover={pdfBook.cover}
          pointsEarned={pointsEarned}
          readingTimeMinutes={readingTime}
          onReadAgain={handleReadAgain}
          onStartQuiz={handleStartQuiz}
          onReturnToMain={onBack}
        />
        
        {/* Quiz Modal */}
        <QuizModal
          isOpen={showQuizModal}
          onClose={handleCloseQuiz}
          bookTitle={pdfBook.title}
          bookCover={pdfBook.cover}
          bookAuthor={pdfBook.author}
          questions={quizQuestions.length > 0 ? quizQuestions : [
            {
              id: 1,
              question: "Test question - What did you think of this book?",
              options: ["Great", "Good", "Okay"],
              correctAnswer: 0
            },
            {
              id: 2,
              question: "How would you rate this story?",
              options: ["Amazing", "Good", "Okay"],
              correctAnswer: 0
            },
            {
              id: 3,
              question: "What did you learn?",
              options: ["Something new", "Nothing", "Everything"],
              correctAnswer: 0
            },
            {
              id: 4,
              question: "Would you read this again?",
              options: ["Yes", "Maybe", "No"],
              correctAnswer: 0
            },
            {
              id: 5,
              question: "Did you enjoy the story?",
              options: ["Yes, loved it!", "It was okay", "Not really"],
              correctAnswer: 0
            }
          ]}
          onQuizComplete={handleQuizComplete}
          startDirectly={true}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 relative overflow-hidden">
        {/* Header */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => {
              // Stop all audio when going back
              setIsPlaying(false);
              
              // Stop and cleanup audio element (ElevenLabs/Google TTS)
              if (audioElement) {
                audioElement.pause();
                audioElement.currentTime = 0;
                audioElement.src = '';
                audioElement.load(); // Reset the audio element
              }
              
              // Removed browser TTS references
              
              // Clear any active timeouts
              if (progressRef.current) {
                clearTimeout(progressRef.current);
                progressRef.current = null;
              }
              
              // Reset all states
              setAvatarAnimating(false);
              setCurrentWordIndex(0);
              setProgress(0);
              setAudioElement(null);
              
              // Call the original onBack
              onBack();
            }}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        </div>

      {/* Book Title & Voice Selector - Compact */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
          <h1 className="text-base font-bold text-gray-800 text-center mb-2">{pdfBook.title}</h1>
          
          {/* Compact Voice Controls - All in one line */}
          <div className="flex items-center justify-center space-x-4">
            {/* Google TTS Voice Selector */}
            {googleVoices.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Voice:</span>
                <select
                  value={selectedGoogleVoice}
                  onChange={(e) => setSelectedGoogleVoice(e.target.value)}
                  className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {googleVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Book Area - Taller */}
      <div className="flex items-center justify-center min-h-screen p-2 pt-12 pb-12">
        <div className="relative max-w-6xl w-full h-full">
          {/* Simple Book Page - Guaranteed to Work */}
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden relative p-2 lg:p-3 h-[calc(100vh-100px)]"
            style={{
              width: '100%',
              maxWidth: '1200px',
              margin: '0 auto',
              transform: isPageTurning 
                ? turnDirection === 'next' 
                  ? 'perspective(1000px) rotateY(-5deg) scale(0.99)' 
                  : 'perspective(1000px) rotateY(5deg) scale(0.99)'
                : 'perspective(1000px) rotateY(0deg) scale(1)',
              transition: 'all 0.6s ease-out'
            }}
          >
            {/* Paper Texture Overlay */}
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Page Turn Effect Overlay */}
            {isPageTurning && (
              <div
                className={`absolute inset-0 z-10 pointer-events-none transition-all duration-600 ease-out ${
                  turnDirection === 'next'
                    ? 'bg-gradient-to-l from-black/10 via-transparent to-transparent'
                    : 'bg-gradient-to-r from-black/10 via-transparent to-transparent'
                }`}
              />
            )}

            {/* Page Content */}
            <div className="flex h-full relative z-20">
              {currentPageData ? (
                <>
                  {/* PDF Page Image */}
                  <div className="w-1/2 flex items-center justify-center p-1">
                    {currentPageData.imageUrl ? (
                      <img
                        src={currentPageData.imageUrl}
                        alt={`Page ${currentPageData.pageNumber}`}
                        className="w-full h-full object-contain rounded-lg shadow-md"
                        onLoad={() => console.log('PDF image loaded successfully')}
                        onError={(e) => {
                          console.error('Image failed to load:', currentPageData.imageUrl);
                          console.log('Current page data:', currentPageData);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                        <p className="text-gray-500">Page {currentPageData.pageNumber}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Highlighted Text */}
                  <div className="w-1/2 flex items-center justify-center p-2 border-l border-gray-200">
                    <div className="max-w-full overflow-y-auto max-h-full">
                      {renderHighlightedText(currentPageData.text, currentPageData.words)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-center">
                  <p className="text-gray-500 text-xl">
                    {pdfPages.length === 0 ? 'Loading PDF...' : 'Loading page...'}
                  </p>
                </div>
              )}
            </div>

            {/* Page Number */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-lg z-30">
              <span className="text-sm font-medium text-gray-600">
                {currentPage + 1} / {pdfPages.length || 1}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevPage}
        disabled={currentPage === 0 || isPageTurning}
        className={`absolute left-8 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all z-10 group ${
          currentPage === 0 || isPageTurning
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
        }`}
      >
        <ChevronLeft className="w-8 h-8 transition-transform duration-300 group-hover:-translate-x-1" />
      </button>

      <button
        onClick={nextPage}
        disabled={isPageTurning}
        className={`absolute right-8 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all z-10 group ${isPageTurning
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : currentPage === pdfPages.length - 1
          ? 'bg-green-500 text-white hover:bg-green-600 shadow-xl hover:shadow-2xl hover:scale-110 border border-green-400'
          : 'bg-white bg-opacity-95 text-gray-700 hover:bg-opacity-100 shadow-xl hover:shadow-2xl hover:scale-110 border border-gray-200'
          }`}
      >
        <ChevronRight className="w-8 h-8 transition-transform duration-300 group-hover:translate-x-1" />
      </button>

      {/* Animated Dog Companion - Fixed position with speech lines */}
      <div className="fixed bottom-0 left-0 z-[9999] pointer-events-none overflow-visible">
        <div className="relative transform -translate-x-6 translate-y-6">
          {/* Main Dog Image - HUGE and popping out */}
          <div className={`relative w-80 h-80 transition-all duration-500 ${
            avatarAnimating ? 'animate-pulse' : ''
          }`}>
            <img
              src="/src/assets/cartoon-dog-cute-drawing-printable-free-style-volumetric-lighting_921860-112557-removebg-preview.png"
              alt="Reading companion dog"
              className={`w-full h-full object-contain drop-shadow-2xl transition-all duration-500 ${
                avatarAnimating 
                  ? 'filter brightness-110' 
                  : 'hover:scale-105'
              }`}
            />
            
            {/* Speech lines coming from dog's mouth when talking */}
            {avatarAnimating && (
              <>
                {/* Animated speech lines */}
                <div className="absolute top-1/3 right-1/4 transform translate-x-4">
                  {/* Speech line 1 */}
                  <div className="w-8 h-0.5 bg-blue-400 rounded-full animate-pulse opacity-80"></div>
                  {/* Speech line 2 */}
                  <div className="w-12 h-0.5 bg-blue-500 rounded-full animate-pulse delay-300 opacity-70 mt-1"></div>
                  {/* Speech line 3 */}
                  <div className="w-6 h-0.5 bg-blue-400 rounded-full animate-pulse delay-500 opacity-60 mt-1"></div>
                </div>
                
                {/* Sound indicator */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center animate-pulse">
                  <Volume2 className="w-3 h-3 text-white" />
                </div>
                
                {/* Gentle floating reading note */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                  <div className="animate-pulse delay-1000">
                    <span className="text-lg opacity-70">📖</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Speech bubble when talking */}
          {avatarAnimating && (
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl px-4 py-2 shadow-lg border-2 border-pink-200 animate-pulse">
              <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
                📖 Reading to you!
              </div>
              {/* Speech bubble tail */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls - Overlapping content for max space */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-xl px-4 py-2 flex items-center space-x-3 border border-white/20">
          {/* Play/Pause Button - Smaller */}
          <button
            onClick={togglePlayPause}
            className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Progress Bar - Smaller */}
          <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentPage / (pdfPages.length - 1)) * 100}%` }}
            ></div>
          </div>

          {/* Volume Control with Slider */}
          <div className="relative">
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              onMouseEnter={() => setShowVolumeSlider(true)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isMuted
                ? 'bg-red-100 text-red-500 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {isMuted ? (
                <VolumeX className="w-3 h-3" />
              ) : volumeLevel > 0.5 ? (
                <Volume2 className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3 opacity-60" />
              )}
            </button>
            
            {/* Volume Slider */}
            {showVolumeSlider && (
              <div 
                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-3 border border-white/20"
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="text-xs text-gray-600 font-medium">Volume</div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volumeLevel}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolumeLevel(newVolume);
                      setIsMuted(newVolume === 0);
                      
                      // Update current audio element volume if playing
                      if (audioElement) {
                        audioElement.volume = newVolume;
                      }
                    }}
                    className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volumeLevel * 100}%, #e5e7eb ${volumeLevel * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setIsMuted(!isMuted);
                        if (audioElement) {
                          audioElement.volume = isMuted ? volumeLevel : 0;
                        }
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <span className="text-xs text-gray-500">
                      {Math.round(volumeLevel * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Restart Button - Smaller */}
          <button
            onClick={() => {
              setCurrentPage(0);
              setCurrentWordIndex(0);
              setProgress(0);
              setIsPlaying(false);
            }}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Floating Elements for Ambiance */}
      <div className="absolute top-20 right-20 w-4 h-4 bg-purple-300 rounded-full animate-pulse opacity-60"></div>
      <div className="absolute top-40 left-20 w-3 h-3 bg-pink-300 rounded-full animate-pulse opacity-40"></div>
      <div className="absolute bottom-40 right-40 w-5 h-5 bg-purple-400 rounded-full animate-pulse opacity-50"></div>

      {/* Realistic Page Flip Animations */}
      <style jsx>{`
        @keyframes flipPageNext {
          0% {
            transform: rotateY(0deg);
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          25% {
            transform: rotateY(-45deg);
            box-shadow: -10px 0 30px rgba(0,0,0,0.3);
          }
          75% {
            transform: rotateY(-135deg);
            box-shadow: 10px 0 30px rgba(0,0,0,0.3);
          }
          100% {
            transform: rotateY(-180deg);
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
        }
        
        @keyframes flipPagePrev {
          0% {
            transform: rotateY(0deg);
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          25% {
            transform: rotateY(45deg);
            box-shadow: 10px 0 30px rgba(0,0,0,0.3);
          }
          75% {
            transform: rotateY(135deg);
            box-shadow: -10px 0 30px rgba(0,0,0,0.3);
          }
          100% {
            transform: rotateY(180deg);
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
        }
        
        .book-container {
          position: relative;
        }
        
        .flipping-page {
          pointer-events: none;
        }
        
        .page-front, .page-back {
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .base-page {
          transition: all 0.3s ease;
        }
        
        .book-container:hover .base-page {
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>

    {/* Quiz Modal - Show over PDF interface */}
    <QuizModal
      isOpen={showQuizModal}
      onClose={handleCloseQuiz}
      bookTitle={pdfBook.title}
      bookCover={pdfBook.cover}
      bookAuthor={pdfBook.author}
      questions={quizQuestions.length > 0 ? quizQuestions : [
        {
          id: 1,
          question: "Test question - What did you think of this book?",
          options: ["Great", "Good", "Okay"],
          correctAnswer: 0
        },
        {
          id: 2,
          question: "How would you rate this story?",
          options: ["Amazing", "Good", "Okay"],
          correctAnswer: 0
        },
        {
          id: 3,
          question: "What did you learn?",
          options: ["Something new", "Nothing", "Everything"],
          correctAnswer: 0
        },
        {
          id: 4,
          question: "Would you read this again?",
          options: ["Yes", "Maybe", "No"],
          correctAnswer: 0
        },
        {
          id: 5,
          question: "Did you enjoy the story?",
          options: ["Yes, loved it!", "It was okay", "Not really"],
          correctAnswer: 0
        }
      ]}
      onQuizComplete={handleQuizComplete}
      startDirectly={true}
    />
  </>
  );
}