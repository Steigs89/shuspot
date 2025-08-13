import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, Mic, Play, Pause, RotateCcw, Star, Clock, Target } from 'lucide-react';

interface VoiceCoachingPracticeProps {
  onBack: () => void;
  bookId: string;
}

interface PracticeSession {
  currentPage: number;
  totalPages: number;
  readingSpeed: number; // words per minute
  pronunciationScore: number;
  fluencyScore: number;
  isRecording: boolean;
  isPlaying: boolean;
  recordingTime: number;
  wordsToHighlight: string[];
}

export default function VoiceCoachingPractice({ onBack, bookId }: VoiceCoachingPracticeProps) {
  const [session, setSession] = useState<PracticeSession>({
    currentPage: 1,
    totalPages: 5,
    readingSpeed: 0,
    pronunciationScore: 0,
    fluencyScore: 0,
    isRecording: false,
    isPlaying: false,
    recordingTime: 0,
    wordsToHighlight: ['momentum', 'cutback', 'surfboard']
  });

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // Mock book pages data
  const bookPages = [
    {
      id: 1,
      title: "In Control",
      content: `When surfers get low on waves, they sometimes perform a move called a cutback. It is when surfers quickly turn their boards back up a wave. Then, they turn their boards back down when they are near the top of waves. They ride up the faces of waves and then use gravity to surf down waves. Surfers use the force and strength of this motion, or momentum, to ride for as long as they can.

By making small changes in their stances, surfers can alter how boards travel on waves. Most of the time, surfers keep their stronger foot close to the tail of a surfboard. This is because a surfer's back foot helps to control the turn of the board. Shifting body weight and pressing down on the back of the board will turn it and keep its nose out of the water.`,
      image: "https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 12
    },
    {
      id: 2,
      title: "Wave Riding",
      content: `Professional surfers spend years mastering the art of wave riding. They learn to read the ocean, understanding how waves form and break. The best surfers can predict where a wave will break next and position themselves accordingly.

Balance is crucial in surfing. Surfers must maintain their center of gravity while the board moves beneath them. They use their arms for balance and their legs to control the board's direction. Advanced surfers can perform tricks like aerials, where they launch themselves above the wave.`,
      image: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1",
      pageNumber: 13
    }
  ];

  const currentPageData = bookPages[session.currentPage - 1];

  const startRecording = () => {
    setSession(prev => ({ ...prev, isRecording: true, recordingTime: 0 }));
    recordingTimer.current = setInterval(() => {
      setSession(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
    }, 1000);
  };

  const stopRecording = () => {
    setSession(prev => ({ 
      ...prev, 
      isRecording: false,
      pronunciationScore: Math.floor(Math.random() * 20) + 80, // Mock score 80-100
      fluencyScore: Math.floor(Math.random() * 15) + 85, // Mock score 85-100
      readingSpeed: Math.floor(Math.random() * 30) + 120 // Mock WPM 120-150
    }));
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
    }
  };

  const playReferenceAudio = () => {
    setSession(prev => ({ ...prev, isPlaying: true }));
    // Mock audio playback
    setTimeout(() => {
      setSession(prev => ({ ...prev, isPlaying: false }));
    }, 3000);
  };

  const nextPage = () => {
    if (session.currentPage < session.totalPages) {
      setSession(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  };

  const prevPage = () => {
    if (session.currentPage > 1) {
      setSession(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightText = (text: string) => {
    let highlightedText = text;
    session.wordsToHighlight.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, `<mark class="bg-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-300" onclick="handleWordClick('${word}')">${word}</mark>`);
    });
    return highlightedText;
  };

  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">BACK</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Page {session.currentPage} of {session.totalPages}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
          {/* Left Panel - Book Content */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden relative">
            {/* Book Page */}
            <div className="h-full flex flex-col">
              {/* Page Header */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{currentPageData.title}</h2>
                <div className="text-sm text-gray-500 mt-1">Page {currentPageData.pageNumber}</div>
              </div>

              {/* Page Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-lg max-w-none">
                  <div 
                    className="text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: highlightText(currentPageData.content) }}
                  />
                </div>
              </div>

              {/* Page Navigation */}
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <button 
                  onClick={prevPage}
                  disabled={session.currentPage === 1}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    session.currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {session.currentPage} / {session.totalPages}
                </div>

                <button 
                  onClick={nextPage}
                  disabled={session.currentPage === session.totalPages}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    session.currentPage === session.totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Practice Controls */}
          <div className="space-y-6">
            {/* Text Reading Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Text reading</h3>
              
              {/* Audio Controls */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <button
                  onClick={playReferenceAudio}
                  disabled={session.isPlaying}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                    session.isPlaying 
                      ? 'bg-gray-300 text-gray-500' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {session.isPlaying ? (
                    <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </button>

                <button
                  onClick={session.isRecording ? stopRecording : startRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                    session.isRecording 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Mic className="w-6 h-6" />
                </button>
              </div>

              {/* Control Labels */}
              <div className="flex items-center justify-center space-x-12 text-sm text-gray-600">
                <div className="text-center">
                  <div className="font-medium">Text listen</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Read</div>
                  {session.isRecording && (
                    <div className="text-red-500 font-mono">{formatTime(session.recordingTime)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Words to Practice */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Words to practice</h3>
              <div className="space-y-2">
                {session.wordsToHighlight.map((word, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedWord(word)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedWord === word 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{word}</div>
                    <div className="text-sm text-gray-500 capitalize">/{word.toLowerCase()}/</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            {(session.pronunciationScore > 0 || session.fluencyScore > 0) && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600">Pronunciation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-lg font-bold text-gray-900">{session.pronunciationScore}%</div>
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">Fluency</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-lg font-bold text-gray-900">{session.fluencyScore}%</div>
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RotateCcw className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-gray-600">Reading Speed</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">{session.readingSpeed} WPM</div>
                  </div>
                </div>

                {/* Overall Score */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round((session.pronunciationScore + session.fluencyScore) / 2)}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Score</div>
                  </div>
                </div>
              </div>
            )}

            {/* Practice Tips */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Practice Tip</h4>
              <p className="text-sm text-blue-800">
                Focus on the highlighted words. Listen to the pronunciation first, then practice reading them slowly and clearly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}