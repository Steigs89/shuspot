import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ChevronUp, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Mic, Volume2, StopCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import Lottie from 'lottie-react';
import happyDogAnimation from '../assets/Happy Dog.json';
import dogCompanion from '../assets/cartoon-dog-cute-drawing-printable-free-style-volumetric-lighting_921860-112557-removebg-preview.png';import { assessPronunciation, ISEResult } from '../services/iflytek-ise';
import { speakWithIFlyTek } from '../services/iflytek-tts';

// Configure PDF.js worker
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

interface VoiceCoachPracticeInterfaceProps {
  onBack: () => void;
  bookId: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  pdfBook?: PdfBookData; // Optional PDF book for uploaded PDFs
  onProgressUpdate?: (bookId: string, pagesRead: number, timeSpent?: number) => void;
}

export default function VoiceCoachPracticeInterface({ onBack, bookId, isFavorited = false, onToggleFavorite, pdfBook, onProgressUpdate }: VoiceCoachPracticeInterfaceProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(pdfBook ? pdfBook.totalPages : 30);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // PDF-specific states
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pdfPageText, setPdfPageText] = useState<string>('');
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Speech Recognition States
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [readWords, setReadWords] = useState<string[]>([]);
  const [missedWords, setMissedWords] = useState<string[]>([]);
  const [coachingFeedback, setCoachingFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [wordsToImprove, setWordsToImprove] = useState<string[]>([]);
  
  // Speech Synthesis States
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Dog Animation States
  const [dogAnimating, setDogAnimating] = useState(false);
  
  // Word Highlighting States
  const [highlightedWords, setHighlightedWords] = useState<Set<string>>(new Set());
  const [currentlyReading, setCurrentlyReading] = useState<string>('');

  // iFlyTek ISE scoring states
  const [iseResult, setIseResult] = useState<ISEResult | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognizedTextRef = useRef<string>('');

  // Language toggle — EN / ZH
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  // Dog speech bubble
  const [dogMessage, setDogMessage] = useState<string | null>(null);
  const [dogVisible, setDogVisible] = useState(false);
  const [dogSubText, setDogSubText] = useState<string | null>(null); // "what I heard" transcript

  const UI_STRINGS = {
    textReading: 'Text reading',
    wordsToPractice: 'Words to practice',
    needsWork: 'Needs work',
    great: 'Great ✓',
    whatIHeard: 'What I heard',
    analysing: 'Analysing your reading...',
    listenPrompt: 'Read the text aloud and practice your pronunciation',
    recordingPrompt: "🎤 I'm listening... Start reading!",
    allGreat: 'All great! 🎉',
    noWordData: 'No word data returned',
    listen: 'Listen',
    listening: 'Listening...',
    readAloud: 'Read Aloud',
    recording: 'Recording...',
  };

  const t = useCallback((key: keyof typeof UI_STRINGS) => {
    if (lang === 'en') return UI_STRINGS[key];
    return translations[key] || UI_STRINGS[key];
  }, [lang, translations]);

  const switchLanguage = async () => {
    const next = lang === 'en' ? 'zh' : 'en';
    setLang(next);
    if (next === 'zh' && Object.keys(translations).length === 0) {
      const libreUrl = import.meta.env.VITE_LIBRETRANSLATE_URL;
      if (!libreUrl) return;
      setIsTranslating(true);
      try {
        const results = await Promise.all(
          Object.entries(UI_STRINGS).map(([key, val]) =>
            fetch(`${libreUrl}/translate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ q: val, source: 'en', target: 'zh', format: 'text' }),
            })
              .then(r => r.json())
              .then(d => [key, d.translatedText || val] as [string, string])
              .catch(() => [key, val] as [string, string])
          )
        );
        setTranslations(Object.fromEntries(results));
      } finally {
        setIsTranslating(false);
      }
    }
  };

  // Practice words from the surfing text
  const practiceWords = [
    'momentum', 'cutback', 'gravity', 'surfers', 'waves', 'boards'
  ];

  const practiceText = `In Control

When surfers get low on waves, they sometimes perform a move called a cutback. It is when surfers quickly turn their boards back up a wave. Then, they turn their boards back down when they are near the top of waves. They ride up the faces of waves and then use gravity to surf down waves. Surfers use the force and strength of this motion, or momentum, to ride for as long as they can.

By making small changes in their stances, surfers can alter how boards travel on waves. Most of the time, surfers keep their stronger foot close to the tail of a surfboard. This is because a surfer's back foot helps to control the turn of the board. Shifting body weight and pressing down on the back of the board will turn it and keep its nose out of the water.`;

  // Dynamic text and words based on PDF or static content
  const currentText = pdfPageText || practiceText;
  const currentPracticeWords = pdfBook ? extractPracticeWordsFromText(pdfPageText) : practiceWords;
  
  // Extract words from current text for tracking
  const textWords = currentText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .map(word => word.toLowerCase());

  // Function to extract practice words from PDF text
  function extractPracticeWordsFromText(text: string): string[] {
    if (!text) return [];
    
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4) // Focus on longer words for practice
      .map(word => word.toLowerCase());
    
    // Remove duplicates and take up to 8 unique words
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 8);
  }

  // Load PDF document if provided
  useEffect(() => {
    if (pdfBook && pdfBook.pdfUrl) {
      loadPdfDocument();
    }
  }, [pdfBook]);

  // Load PDF page when currentPage changes
  useEffect(() => {
    if (pdfDocument && pdfBook) {
      loadPdfPage(currentPage);
    }
  }, [pdfDocument, currentPage, pdfBook]);

  const loadPdfDocument = async () => {
    if (!pdfBook) return;
    
    setIsLoadingPdf(true);
    try {
      console.log('Loading PDF document:', pdfBook.title);
      const loadingTask = pdfjsLib.getDocument(pdfBook.pdfUrl);
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      console.log('PDF loaded successfully, pages:', pdf.numPages);
    } catch (error) {
      console.error('Error loading PDF:', error);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const loadPdfPage = async (pageNumber: number) => {
    if (!pdfDocument || !canvasRef.current) return;

    try {
      console.log('Loading PDF page:', pageNumber);
      const page = await pdfDocument.getPage(pageNumber);
      
      // Extract text from the page
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      setPdfPageText(pageText);
      console.log('Extracted text from page:', pageText.substring(0, 100) + '...');

      // Render the page
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: 1.5 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      console.log('PDF page rendered successfully');
    } catch (error) {
      console.error('Error loading PDF page:', error);
    }
  };

  // Initialize Speech APIs
  useEffect(() => {
    // Initialize Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
      
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Initialize Speech Recognition
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setRecognizedText(prev => {
            const next = prev + ' ' + finalTranscript;
            recognizedTextRef.current = next.trim();
            return next;
          });
          analyzeReading(finalTranscript);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setCoachingFeedback('Sorry, I had trouble hearing you. Please try again!');
        setShowFeedback(true);
      };
      
      recognition.onend = () => {
        if (isRecording) {
          // Restart recognition if still recording
          recognition.start();
        }
      };
      
      setSpeechRecognition(recognition);
    }
  }, []);

  // Analyze child's reading during recording (no feedback popup)
  const analyzeReading = (spokenText: string) => {
    const spokenWords = spokenText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    setReadWords(prev => [...prev, ...spokenWords]);
    
    // Update highlighted words in real-time
    const newHighlightedWords = new Set(highlightedWords);
    spokenWords.forEach(spokenWord => {
      // Find matching words in the text
      textWords.forEach(textWord => {
        if (textWord.includes(spokenWord) || spokenWord.includes(textWord)) {
          newHighlightedWords.add(textWord);
        }
      });
    });
    setHighlightedWords(newHighlightedWords);
    
    // Set the most recent word as currently being read
    if (spokenWords.length > 0) {
      setCurrentlyReading(spokenWords[spokenWords.length - 1]);
    }
    
    // Find practice words that were attempted and update words to improve
    const attemptedPracticeWords = spokenWords.filter(word => 
      practiceWords.some(practiceWord => 
        practiceWord.toLowerCase().includes(word) || word.includes(practiceWord.toLowerCase())
      )
    );
    
    // Update words that still need improvement (remove successfully read words)
    const stillNeedImprovement = practiceWords.filter(word => 
      !spokenWords.some(spoken => 
        spoken.includes(word.toLowerCase()) || word.toLowerCase().includes(spoken)
      )
    );
    
    setWordsToImprove(stillNeedImprovement);
  };

  // Generate final coaching feedback after recording stops
  const generateFinalFeedback = () => {
    const allSpokenWords = recognizedText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    // Find words that were read correctly from the text
    const correctWords = allSpokenWords.filter(word => 
      textWords.includes(word)
    );
    
    // Find practice words that were successfully read
    const successfulPracticeWords = practiceWords.filter(word => 
      allSpokenWords.some(spoken => 
        spoken.includes(word.toLowerCase()) || word.toLowerCase().includes(spoken)
      )
    );
    
    // Find practice words that still need work
    const missedPracticeWords = practiceWords.filter(word => 
      !allSpokenWords.some(spoken => 
        spoken.includes(word.toLowerCase()) || word.toLowerCase().includes(spoken)
      )
    );
    
    // Generate encouraging feedback
    let feedback = '';
    
    if (correctWords.length > 5) {
      feedback += `Excellent reading! You read ${correctWords.length} words clearly. `;
    } else if (correctWords.length > 0) {
      feedback += `Good job! I heard you read: ${correctWords.slice(0, 3).join(', ')}. `;
    }
    
    if (successfulPracticeWords.length > 0) {
      feedback += `Great work on these practice words: ${successfulPracticeWords.join(', ')}! `;
    }
    
    if (missedPracticeWords.length > 0 && missedPracticeWords.length < practiceWords.length) {
      feedback += `Keep practicing: ${missedPracticeWords.slice(0, 2).join(', ')}.`;
    } else if (missedPracticeWords.length === 0) {
      feedback += `Amazing! You read all the practice words perfectly! 🌟`;
    }
    
    if (feedback) {
      setCoachingFeedback(feedback);
      setShowFeedback(true);
      
      // Hide feedback after 6 seconds
      setTimeout(() => setShowFeedback(false), 6000);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      
      // Track progress when moving to next page
      if (onProgressUpdate && pdfBook) {
        onProgressUpdate(pdfBook.id, newPage, 1); // 1 minute per page estimate
        console.log('Progress updated:', pdfBook.title, 'Page:', newPage, '/', totalPages);
      }
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const toggleListening = () => {
    if (!isListening) {
      setDogAnimating(true);
      const textToRead = pdfPageText || practiceText;
      const appId = import.meta.env.VITE_IFLYTEK_APP_ID;
      const apiKey = import.meta.env.VITE_IFLYTEK_API_KEY;
      const apiSecret = import.meta.env.VITE_IFLYTEK_API_SECRET;

      if (appId && apiKey && apiSecret) {
        setIsListening(true);
        speakWithIFlyTek(textToRead.slice(0, 300), { appId, apiKey, apiSecret, voice: 'en_us_henry', speed: 40 })
          .then(() => { setIsListening(false); setDogAnimating(false); })
          .catch((err) => {
            console.error('iFlyTek TTS error, falling back to browser TTS:', err);
            // Fallback to browser TTS
            if (window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(textToRead);
              utterance.rate = 0.8;
              utterance.onend = () => { setIsListening(false); setDogAnimating(false); };
              window.speechSynthesis.speak(utterance);
            } else {
              setIsListening(false);
              setDogAnimating(false);
            }
          });
      } else {
        // Browser TTS fallback (no iFlyTek keys)
        setIsListening(true);
        if (speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(textToRead);
          utterance.rate = 0.8;
          utterance.pitch = 1.1;
          const childVoice = availableVoices.find(v =>
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('karen') ||
            v.name.toLowerCase().includes('female')
          );
          if (childVoice) utterance.voice = childVoice;
          utterance.onend = () => { setIsListening(false); setDogAnimating(false); };
          speechSynthesis.speak(utterance);
        } else {
          setIsListening(false);
          setDogAnimating(false);
        }
      }
      if (isRecording) setIsRecording(false);
    } else {
      // Stop listening
      if (speechSynthesis) speechSynthesis.cancel();
      setIsListening(false);
      setDogAnimating(false);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      // Reset previous results
      setIseResult(null);
      setRecognizedText('');
      setCoachingFeedback('');
      setShowFeedback(false);
      setHighlightedWords(new Set());
      setCurrentlyReading('');
      setDogMessage(null);
      setDogSubText(null);
      audioChunksRef.current = [];
      recognizedTextRef.current = '';

      // Start browser speech recognition for live transcript
      if (speechRecognition) {
        speechRecognition.start();
      }

      // Start MediaRecorder for iFlyTek audio capture
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const appId = import.meta.env.VITE_IFLYTEK_APP_ID;
          const apiKey = import.meta.env.VITE_IFLYTEK_API_KEY;
          const apiSecret = import.meta.env.VITE_IFLYTEK_API_SECRET;

          console.log('🎤 Recording stopped. Audio size:', audioBlob.size, 'bytes');
          console.log('🔑 iFlyTek keys present:', !!(appId && apiKey && apiSecret));

          if (appId && apiKey && apiSecret) {
            setIsAssessing(true);
            console.log('🚀 Sending to iFlyTek ISE...');
            try {
              const result = await assessPronunciation(audioBlob, currentText.slice(0, 500), {
                appId, apiKey, apiSecret,
                category: 'read_sentence',
                ageGroup: 'child',
              });
              console.log('✅ iFlyTek ISE result:', result);
              setIseResult(result);
              // Generate friendly feedback from scores
              const score = result.overallScore;
              const feedback = score >= 90
                ? "Amazing! Your pronunciation is excellent! 🌟"
                : score >= 75
                ? "Great job! Keep practicing those tricky words. 👍"
                : score >= 60
                ? "Good effort! Try reading a bit slower and clearer. 😊"
                : "Keep going — practice makes perfect! Try again. 💪";
              setCoachingFeedback(feedback);
              // Dog message based on score
              const dogMsg = score >= 90
                ? "Wow, you're amazing! 🌟"
                : score >= 75
                ? "Great job! Keep it up! 🐾"
                : score >= 60
                ? "Good try! Slow down a little 😊"
                : "Don't give up! Try again 💪";
              setDogMessage(dogMsg);
              setDogVisible(true);
              const transcript = recognizedTextRef.current || '(no transcript captured)';
              setTimeout(() => {
                setDogMessage(null);
                setDogSubText(transcript);
              }, 3000);
            } catch (err) {
              console.error('❌ iFlyTek ISE error:', err);
              generateFinalFeedback();
            } finally {
              setIsAssessing(false);
            }
          } else {
            console.warn('⚠️ No iFlyTek keys — using browser fallback');
            generateFinalFeedback();
            setDogMessage("Nice reading! Keep it up! 🐾");
            setDogVisible(true);
            const transcript = recognizedTextRef.current || '(no transcript captured)';
            setTimeout(() => {
              setDogMessage(null);
              setDogSubText(transcript);
            }, 3000);
          }
        };
        recorder.start();
      }).catch(() => {
        // Mic permission denied — still use speech recognition only
        if (speechRecognition) speechRecognition.start();
      });

    } else {
      // Stop recording
      if (speechRecognition) speechRecognition.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }

    setIsRecording(!isRecording);
    if (isListening) {
      setIsListening(false);
      if (speechSynthesis) speechSynthesis.cancel();
    }
  };

  // Render text with real-time word highlighting
  // Use inline-block with min-width to prevent layout shift when highlights appear
  const renderHighlightedText = (text: string) => {
    const words = text.split(/(\s+)/);
    
    return words.map((word, index) => {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      const isHighlighted = highlightedWords.has(cleanWord);
      const isCurrentlyReading = currentlyReading === cleanWord;
      const isPracticeWord = currentPracticeWords.some(pw => pw.toLowerCase() === cleanWord);
      
      if (!cleanWord) return <span key={index}>{word}</span>;
      
      // Use outline instead of background to avoid layout shift
      return (
        <span
          key={index}
          className={`transition-colors duration-200 rounded ${
            isCurrentlyReading && isRecording
              ? 'bg-yellow-200 text-gray-900 outline outline-1 outline-yellow-400'
              : isHighlighted
              ? isPracticeWord
                ? 'bg-green-100 text-green-900 outline outline-1 outline-green-300'
                : 'bg-blue-100 text-blue-900 outline outline-1 outline-blue-200'
              : isPracticeWord
              ? 'bg-orange-50 text-orange-800 outline outline-1 outline-orange-200'
              : 'text-gray-800'
          }`}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <button
          onClick={() => {
            // Stop all audio when going back
            if (speechSynthesis) {
              speechSynthesis.cancel();
            }
            if (speechRecognition && isRecording) {
              speechRecognition.stop();
            }
            
            // Reset states
            setIsListening(false);
            setIsRecording(false);
            setDogAnimating(false);
            setShowFeedback(false);
            
            // Call the original onBack
            onBack();
          }}
          className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white/90 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>

        <div className="flex items-center space-x-3">
        </div>

        <button
          onClick={switchLanguage}
          disabled={isTranslating}
          className="h-10 px-3 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white/90 transition-colors text-sm font-semibold text-gray-700 min-w-[52px]"
        >
          {isTranslating ? '...' : lang === 'en' ? '中文' : 'EN'}
        </button>
      </div>

      {/* Title Section - Centered Over Left Side */}
      {pdfBook && (
        <div className="absolute top-20 left-6 right-1/2 z-10 flex justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-md px-3 py-1 shadow-md border border-white/20">
            <h2 className="text-sm font-semibold text-gray-900">{pdfBook.title}</h2>
          </div>
        </div>
      )}

      {/* Main Content - Mobile Optimized */}
      <div className={`${pdfBook ? 'pt-32' : 'pt-14'} pb-16 px-3 sm:px-6 min-h-screen flex items-center`}>
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-8 items-center">
          {/* Left Side - Reading Content */}
          <div className="relative h-[650px]">
            {pdfBook ? (
              /* PDF Rendering */
              <div className="bg-white rounded-2xl shadow-2xl h-full overflow-hidden relative">
                {isLoadingPdf ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading PDF...</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-full flex flex-col">
                    {/* PDF Canvas Container - Full Height */}
                    <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 rounded-t-2xl relative">
                      <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-full border border-gray-300 rounded-lg shadow-lg bg-white"
                      />
                      
                      {/* Text Overlay - Always Visible on top of PDF */}
                      {pdfPageText && (
                        <div className="absolute inset-4 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto m-4 shadow-xl">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 sticky top-0 bg-white pb-2 border-b border-gray-200">
                              Practice Text - Page {currentPage}
                            </h3>
                            <div className="text-gray-700 leading-relaxed space-y-2 text-sm">
                              {pdfPageText.split('\n\n').map((paragraph, index) => (
                                <p key={index} className="text-justify">
                                  {renderHighlightedText(paragraph)}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Page Navigation */}
                    <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-4 rounded-b-2xl">
                      <div className="flex items-center gap-3 mb-1">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-pink text-white disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-brand-pink rounded-full transition-all duration-300"
                              style={{ width: `${(currentPage / totalPages) * 100}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newPage = Math.min(totalPages, currentPage + 1);
                            setCurrentPage(newPage);
                            if (onProgressUpdate && pdfBook && newPage > currentPage) {
                              onProgressUpdate(pdfBook.id, newPage, 1);
                              if (newPage >= totalPages) {
                                setTimeout(() => alert(`🎉 You've completed "${pdfBook.title}"!`), 500);
                              }
                            }
                          }}
                          disabled={currentPage >= totalPages}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-pink text-white disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-center text-xs text-gray-400">PAGE {currentPage} OF {totalPages}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Static Content Fallback */
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl relative h-full overflow-hidden">
                {/* Surf Background Image */}
                <div 
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    backgroundImage: `url('https://images.pexels.com/photos/390051/surfer-wave-sunset-the-indian-ocean-390051.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&dpr=1')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.3
                  }}
                ></div>
                
                {/* Content overlay */}
                <div className="relative z-10 h-full flex flex-col">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 mb-4">
                    <h2 className="text-2xl font-superclarendon-bold text-gray-900 mb-6">
                      In Control
                    </h2>

                    <div className="text-gray-800 leading-relaxed space-y-4 text-base overflow-y-auto max-h-[520px]">
                      {currentText.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="text-justify">
                          {renderHighlightedText(paragraph)}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-auto pt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-brand-pink rounded-full transition-all duration-300"
                        style={{ width: `${(currentPage / totalPages) * 100}%` }}
                      />
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-1">PAGE {currentPage} OF {totalPages}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Practice Interface */}
          <div className="space-y-4 lg:space-y-6 h-auto lg:h-[650px] flex flex-col w-full">            {/* Text Reading Section */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl flex-1">
              <h3 className="text-xl font-superclarendon-black text-gray-700 mb-4">
                {t('textReading')}
              </h3>
              <div className="flex-1 overflow-y-auto">
                {isAssessing ? (
                  <div className="flex flex-col items-center justify-center h-full py-6 space-y-3">
                    <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Analysing your reading...</p>                  </div>
                ) : iseResult ? (
                  <div className="space-y-3">
                    {/* What I heard — truncated to 2 lines */}
                    {recognizedText && (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <h4 className="text-xs font-medium text-green-700 mb-0.5 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {t('whatIHeard')}
                        </h4>
                        <p className="text-green-800 text-xs italic line-clamp-2">"{recognizedText.trim()}"</p>
                      </div>
                    )}
                    {/* Score circle + 3 stats */}
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.9" fill="none"
                            stroke={iseResult.overallScore >= 80 ? '#22c55e' : iseResult.overallScore >= 60 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="3"
                            strokeDasharray={`${iseResult.overallScore} 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-base font-bold text-gray-800 leading-none">{iseResult.overallScore}</span>
                          <span className="text-[8px] text-gray-400">/100</span>
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-1 text-center">
                        {[
                          { label: 'Accuracy', val: iseResult.accuracy },
                          { label: 'Fluency', val: iseResult.fluency },
                          { label: 'Complete', val: iseResult.completeness },
                        ].map(({ label, val }) => (
                          <div key={label}>
                            <div className="text-sm font-bold text-gray-800">{val}</div>
                            <div className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</div>
                            <div className="mt-0.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-blue rounded-full" style={{ width: `${val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Feedback */}
                    {coachingFeedback && (
                      <p className="text-xs text-gray-600 bg-brand-blue/10 rounded-lg px-3 py-2 border border-brand-blue/20">
                        {coachingFeedback}
                      </p>
                    )}
                  </div>
                ) : recognizedText ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        What I heard you read:
                      </h4>
                      <p className="text-green-700 text-sm leading-relaxed">{recognizedText}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500 text-center px-4">
                      {isRecording ? t('recordingPrompt') : t('listenPrompt')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Words to Practice Section */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl flex-1">
              <h3 className="text-base font-superclarendon-black text-gray-700 mb-3">
                {t('wordsToPractice')}
              </h3>

              {iseResult ? (
                iseResult.words.length > 0 ? (
                  <div className="flex gap-4 h-full">
                    {/* Deduplicate: keep worst score per unique word */}
                    {(() => {
                      const wordMap = new Map<string, typeof iseResult.words[0]>();
                      iseResult.words.forEach(w => {
                        const key = w.word.toLowerCase();
                        const existing = wordMap.get(key);
                        if (!existing || w.score < existing.score) wordMap.set(key, w);
                      });
                      const unique = Array.from(wordMap.values());
                      const needsWork = unique.filter(w => w.score < 95);
                      const great = unique.filter(w => w.score >= 95);
                      const colors = {
                        'good': 'bg-green-100 text-green-800 border-green-300',
                        'needs-practice': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                        'mispronounced': 'bg-orange-100 text-orange-800 border-orange-300',
                        'missed': 'bg-gray-100 text-gray-500 border-gray-300',
                      };
                      return (
                        <>
                          {/* Left: needs work */}
                          <div className="w-[45%] min-w-0 flex-shrink-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">{t('needsWork')}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {needsWork.map((w, i) => (
                                <div key={i} className={`rounded-md px-2 py-0.5 border text-center ${colors[w.status]}`}>
                                  <div className="text-xs font-medium">{w.word}</div>
                                  <div className="text-[9px] opacity-70">{w.score}</div>
                                </div>
                              ))}
                              {needsWork.length === 0 && <p className="text-xs text-gray-400 italic">{t('allGreat')}</p>}
                            </div>
                          </div>
                          <div className="w-px bg-gray-200 flex-shrink-0" />
                          {/* Right: great — 3 columns */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">{t('great')}</p>
                            <ul className="grid grid-cols-3 gap-x-1 gap-y-0.5">
                              {great.map((w, i) => (
                                <li key={i} className="flex items-center gap-1 text-xs text-green-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                  {w.word}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">{t('noWordData')}</p>
                )
              ) : (
                <div className="grid grid-cols-3 gap-2 content-start">
                  {currentPracticeWords.map((word, index) => {
                    const wasRead = readWords.some(r =>
                      r.toLowerCase().includes(word.toLowerCase()) ||
                      word.toLowerCase().includes(r.toLowerCase())
                    );
                    const needsImprovement = wordsToImprove.includes(word);
                    return (
                      <div
                        key={index}
                        className={`rounded-lg px-2 py-1.5 text-center cursor-pointer border ${
                          wasRead ? 'bg-green-50 border-green-300' :
                          needsImprovement ? 'bg-orange-50 border-orange-300 animate-pulse' :
                          'bg-blue-50 border-blue-200'
                        }`}
                        onClick={() => {
                          if (speechSynthesis) {
                            const u = new SpeechSynthesisUtterance(word);
                            u.rate = 0.7; u.pitch = 1.2;
                            speechSynthesis.speak(u);
                          }
                        }}
                      >
                        <span className={`text-xs font-medium ${wasRead ? 'text-green-800' : needsImprovement ? 'text-orange-800' : 'text-blue-800'}`}>
                          {word}
                        </span>
                        {wasRead && <CheckCircle className="w-3 h-3 text-green-600 mx-auto mt-0.5" />}
                        {needsImprovement && <AlertCircle className="w-3 h-3 text-orange-600 mx-auto mt-0.5" />}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Pill Buttons — outside the box, below words to practice */}
            <div className="flex gap-3">
              <button
                onClick={toggleListening}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full shadow-md transition-all duration-300 ${
                  isListening ? 'bg-brand-blue/80 scale-95' : 'bg-brand-blue hover:brightness-105'
                }`}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                </svg>
                <span className="text-white font-semibold text-sm">{isListening ? t('listening') : t('listen')}</span>
              </button>
              <button
                onClick={toggleRecording}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full shadow-md transition-all duration-300 ${
                  isRecording
                    ? 'bg-red-500 scale-95 animate-pulse'
                    : 'bg-brand-pink hover:brightness-105'
                }`}
              >
                {isRecording ? (
                  <>
                    <StopCircle className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold text-sm">Tap to Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold text-sm">{t('readAloud')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
        <button onClick={prevPage} disabled={currentPage === 1}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-brand-pink text-white hover:brightness-105'}`}>
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
        <button onClick={nextPage} disabled={currentPage === totalPages}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${currentPage === totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-brand-pink text-white hover:brightness-105'}`}>
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Coaching Feedback Overlay (fallback when no iFlyTek) */}
      {showFeedback && coachingFeedback && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-md">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-6 shadow-2xl border-4 border-white/20 animate-bounce">
            <div className="text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-bold mb-3">Great Job!</h3>
              <p className="text-white/90 leading-relaxed">
                {coachingFeedback}
              </p>
              <button
                onClick={() => setShowFeedback(false)}
                className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
              >
                Keep Reading! 📚
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls - Overlapping content for max space */}

      {/* Dog companion — anchored to bottom, slides up on first result */}
      <div
        className={`fixed bottom-0 left-0 z-50 flex flex-col items-start transition-transform duration-700 ease-out ${
          dogVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
      {(dogMessage || dogSubText) && (
          <div className="relative mb-1 ml-10 bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-lg border border-gray-100 w-80">
            {dogMessage ? (
              <p className="text-sm font-medium text-gray-700">{dogMessage}</p>
            ) : (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Here's what I heard 👂</p>
                <p className="text-xs text-gray-700 italic">"{dogSubText}"</p>
              </div>
            )}
            <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
          </div>
        )}
        <Lottie
          animationData={happyDogAnimation}
          loop={true}
          autoplay={true}
          style={{ width: 220, height: 220, marginBottom: -24 }}
        />
      </div>
    </div>
  );
}