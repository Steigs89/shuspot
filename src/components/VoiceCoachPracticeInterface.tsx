import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Heart, Settings, ChevronUp, Volume2, Mic, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { pdfjs as pdfjsLib } from 'react-pdf';
import dogCompanion from '../assets/cartoon-dog-cute-drawing-printable-free-style-volumetric-lighting_921860-112557-removebg-preview.png';

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

  // Practice words from the surfing text
  const practiceWords = [
    'momentum', 'cutback', 'gravity', 'surfers', 'waves', 'boards', 'control', 'strength'
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
          setRecognizedText(prev => prev + ' ' + finalTranscript);
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
      // Start reading the text aloud
      setDogAnimating(true);
      if (speechSynthesis) {
        // Use PDF text if available, otherwise use static text
        const textToRead = pdfPageText || practiceText;
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = 0.8; // Slower for kids
        utterance.pitch = 1.1; // Slightly higher pitch
        utterance.volume = 1;
        
        // Use a child-friendly voice if available
        const childVoice = availableVoices.find(voice => 
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('female')
        );
        if (childVoice) utterance.voice = childVoice;
        
        utterance.onend = () => {
          setIsListening(false);
          setDogAnimating(false);
        };
        
        speechSynthesis.speak(utterance);
      }
    } else {
      // Stop reading
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
      setDogAnimating(false);
    }
    
    setIsListening(!isListening);
    if (isRecording) setIsRecording(false);
  };

  const toggleRecording = () => {
    if (!isRecording) {
      // Start speech recognition
      if (speechRecognition) {
        setRecognizedText('');
        setCoachingFeedback('');
        setShowFeedback(false);
        setHighlightedWords(new Set()); // Reset highlighting
        setCurrentlyReading('');
        speechRecognition.start();
      }
    } else {
      // Stop speech recognition and provide feedback
      if (speechRecognition) {
        speechRecognition.stop();
      }
      
      // Generate final coaching feedback after recording stops
      if (recognizedText.trim()) {
        generateFinalFeedback();
      }
    }
    
    setIsRecording(!isRecording);
    if (isListening) {
      setIsListening(false);
      if (speechSynthesis) speechSynthesis.cancel();
    }
  };

  // Render text with real-time word highlighting
  const renderHighlightedText = (text: string) => {
    const words = text.split(/(\s+)/); // Split but keep whitespace
    
    return words.map((word, index) => {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      const isHighlighted = highlightedWords.has(cleanWord);
      const isCurrentlyReading = currentlyReading === cleanWord;
      const isPracticeWord = currentPracticeWords.some(pw => pw.toLowerCase() === cleanWord);
      
      // Skip whitespace
      if (!cleanWord) {
        return <span key={index}>{word}</span>;
      }
      
      return (
        <span
          key={index}
          className={`transition-all duration-300 ${
            isCurrentlyReading && isRecording
              ? 'bg-yellow-300 text-gray-900 px-1 rounded shadow-sm transform scale-105 animate-pulse'
              : isHighlighted
              ? isPracticeWord
                ? 'bg-green-200 text-green-900 px-1 rounded shadow-sm'
                : 'bg-blue-200 text-blue-900 px-1 rounded'
              : isPracticeWord
              ? 'bg-orange-100 text-orange-800 px-1 rounded border border-orange-200'
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
          <button 
            onClick={onToggleFavorite}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              isFavorited ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            <Heart className={`w-6 h-6 text-white ${isFavorited ? 'fill-current' : ''}`} />
          </button>
          <button className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white/90 transition-colors">
            <Settings className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        <button className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white/90 transition-colors">
          <ChevronUp className="w-6 h-6 text-gray-700" />
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

      {/* Main Content - Even Taller */}
      <div className={`${pdfBook ? 'pt-32' : 'pt-14'} pb-16 px-6 h-screen flex items-center`}>
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
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
                    <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between rounded-b-2xl">
                      <button
                        onClick={() => {
                          const newPage = Math.max(1, currentPage - 1);
                          setCurrentPage(newPage);
                        }}
                        disabled={currentPage <= 1}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>
                      
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={toggleListening}
                          disabled={isListening}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>{isListening ? 'Reading...' : 'Read to Me'}</span>
                        </button>
                      </div>
                      
                      <button
                        onClick={() => {
                          const newPage = Math.min(totalPages, currentPage + 1);
                          setCurrentPage(newPage);
                          
                          // Track progress when moving to next page
                          if (onProgressUpdate && pdfBook && newPage > currentPage) {
                            onProgressUpdate(pdfBook.id, newPage, 1); // 1 minute per page estimate
                            console.log('Progress updated via Next button:', pdfBook.title, 'Page:', newPage, '/', totalPages);
                            
                            // Show completion message if book is finished
                            if (newPage >= totalPages) {
                              setTimeout(() => {
                                alert(`🎉 Congratulations! You've completed "${pdfBook.title}"! Great job practicing your reading skills!`);
                              }, 500);
                            }
                          }
                        }}
                        disabled={currentPage >= totalPages}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
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

                    <div className="text-gray-800 leading-relaxed space-y-4 text-base overflow-y-auto max-h-[500px]">
                      {currentText.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="text-justify">
                          {renderHighlightedText(paragraph)}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Page number indicator */}
                  <div className="absolute bottom-4 right-4 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg">
                    {currentPage}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Practice Interface */}
          <div className="space-y-6 h-[650px] flex flex-col">
            {/* Text Reading Section */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl flex-1">
              <h3 className="text-xl font-superclarendon-black text-gray-700 mb-4">
                Text reading
              </h3>
              <div className="flex-1 overflow-y-auto">
                {recognizedText ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        What I heard you read:
                      </h4>
                      <p className="text-green-700 text-sm leading-relaxed">
                        {recognizedText}
                      </p>
                    </div>
                    
                    {readWords.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          Words you've read ({readWords.length}):
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(readWords)].slice(0, 10).map((word, index) => (
                            <span key={index} className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                              {word}
                            </span>
                          ))}
                          {readWords.length > 10 && (
                            <span className="text-blue-600 text-xs">+{readWords.length - 10} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500 text-center px-4">
                      {isRecording 
                        ? "🎤 I'm listening... Start reading!" 
                        : "Read the text aloud and practice your pronunciation"
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Words to Practice Section */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl flex-1">
              <h3 className="text-xl font-superclarendon-black text-gray-700 mb-4">
                Words to practice
              </h3>
              <div className="grid grid-cols-2 gap-3 h-full content-start">
                {currentPracticeWords.map((word, index) => {
                  const wasRead = readWords.some(readWord => 
                    readWord.toLowerCase().includes(word.toLowerCase()) || 
                    word.toLowerCase().includes(readWord.toLowerCase())
                  );
                  const needsImprovement = wordsToImprove.includes(word);
                  
                  return (
                    <div
                      key={index}
                      className={`rounded-lg p-3 text-center transition-colors cursor-pointer h-fit border-2 ${
                        wasRead 
                          ? 'bg-green-50 border-green-300 hover:bg-green-100' 
                          : needsImprovement
                          ? 'bg-orange-50 border-orange-300 hover:bg-orange-100 animate-pulse'
                          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      }`}
                      onClick={() => {
                        // Pronounce the word when clicked
                        if (speechSynthesis) {
                          const utterance = new SpeechSynthesisUtterance(word);
                          utterance.rate = 0.7;
                          utterance.pitch = 1.2;
                          speechSynthesis.speak(utterance);
                        }
                      }}
                    >
                      <span className={`font-medium ${
                        wasRead 
                          ? 'text-green-800' 
                          : needsImprovement
                          ? 'text-orange-800'
                          : 'text-blue-800'
                      }`}>
                        {word}
                      </span>
                      {wasRead && (
                        <CheckCircle className="w-4 h-4 text-green-600 mx-auto mt-1" />
                      )}
                      {needsImprovement && (
                        <AlertCircle className="w-4 h-4 text-orange-600 mx-auto mt-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            currentPage === 1
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
        <button
          onClick={nextPage}
          disabled={currentPage === totalPages}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            currentPage === totalPages
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Coaching Feedback Overlay */}
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

      {/* Animated Dog Companion - Voice Coach Helper */}
      <div className="fixed bottom-0 left-0 z-[9999] pointer-events-none overflow-visible">
        <div className="relative transform -translate-x-32 translate-y-8">
          {/* Main Dog Image - HUGE and coaching */}
          <div className={`relative w-80 h-80 transition-all duration-500 ${
            dogAnimating ? 'animate-pulse' : ''
          }`}>
            <img
              src={dogCompanion}
              alt="Voice Coach dog companion"
              className={`w-full h-full object-contain drop-shadow-2xl transition-all duration-500 ${
                dogAnimating 
                  ? 'filter brightness-110' 
                  : 'hover:scale-105'
              }`}
            />
            
            {/* Speech lines coming from dog's mouth when coaching */}
            {dogAnimating && (
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
                
                {/* Gentle coaching indicator */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                  <div className="animate-pulse delay-1000">
                    <span className="text-lg opacity-70">🎓</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Speech bubble when giving feedback */}
          {showFeedback && (
            <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl px-4 py-3 shadow-lg border-2 border-blue-200 animate-pulse max-w-xs">
              <div className="text-sm font-medium text-gray-700 text-center">
                🐕 Woof! {coachingFeedback.split(' ').slice(0, 8).join(' ')}...
              </div>
              {/* Speech bubble tail */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls - Overlapping content for max space */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center space-x-8 z-30">
        {/* Page Counter */}
        <div className="bg-blue-200/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-xl border border-white/20">
          <span className="text-blue-800 font-bold text-lg">
            {currentPage}/{totalPages}
          </span>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <button
              onClick={toggleListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                isListening
                  ? 'bg-green-500 text-white scale-110'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <Volume2 className="w-8 h-8" />
            </button>
            <p className="text-blue-800 text-sm font-medium mt-2">Text listen</p>
          </div>

          <div className="text-center">
            <button
              onClick={toggleRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                isRecording
                  ? 'bg-red-500 text-white scale-110 animate-pulse'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <Mic className="w-8 h-8" />
            </button>
            <p className="text-blue-800 text-sm font-medium mt-2">Read</p>
          </div>
        </div>
      </div>
    </div>
  );
}