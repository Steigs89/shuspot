import React, { useState } from 'react';
import { ArrowLeft, Play, Clock, Star, Mic, Volume2 } from 'lucide-react';

interface VoiceCoachingDashboardProps {
  onBack: () => void;
  onStartPractice: (bookId: string) => void;
}

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  readingTime: number;
  difficulty: string;
  practiceScore?: number;
  completedSessions: number;
  totalSessions: number;
}

export default function VoiceCoachingDashboard({ onBack, onStartPractice }: VoiceCoachingDashboardProps) {
  const [selectedLevel, setSelectedLevel] = useState('D - E');

  const books: Book[] = [
    {
      id: '1',
      title: 'Ocean Adventures',
      author: 'Sarah Waters',
      cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 15,
      difficulty: 'D - E',
      practiceScore: 85,
      completedSessions: 3,
      totalSessions: 5
    },
    {
      id: '2',
      title: 'Space Explorers',
      author: 'Mike Chen',
      cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 12,
      difficulty: 'D - E',
      practiceScore: 92,
      completedSessions: 5,
      totalSessions: 5
    },
    {
      id: '3',
      title: 'Forest Friends',
      author: 'Emma Green',
      cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 18,
      difficulty: 'D - E',
      completedSessions: 1,
      totalSessions: 6
    },
    {
      id: '4',
      title: 'Dinosaur Discovery',
      author: 'Tom Rex',
      cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 10,
      difficulty: 'D - E',
      practiceScore: 78,
      completedSessions: 2,
      totalSessions: 4
    },
    {
      id: '5',
      title: 'Magic Castle',
      author: 'Luna Bright',
      cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 20,
      difficulty: 'D - E',
      completedSessions: 0,
      totalSessions: 7
    },
    {
      id: '6',
      title: 'Animal Friends',
      author: 'Jake Wilson',
      cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 8,
      difficulty: 'D - E',
      practiceScore: 88,
      completedSessions: 4,
      totalSessions: 4
    }
  ];

  const readingLevels = ['AA - A', 'B - C', 'D - E', 'F - G', 'H - I', 'J - K'];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">BACK</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
  <div className="bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block bg-white/60 backdrop-blur-md rounded-2xl px-8 py-6 shadow-lg border border-white/50">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Mic className="w-8 h-8 text-blue-700 drop-shadow-sm" />
              <h1 className="text-4xl font-light text-blue-800 drop-shadow-sm">Voice Coach</h1>
            </div>
            <p className="text-lg text-blue-700 drop-shadow-sm">Practice reading aloud and improve your pronunciation</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Reading Level Filter */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-blue-800 font-medium">Reading Level</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {readingLevels.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedLevel === level
                    ? 'bg-brand-pink text-white shadow-lg'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Book Cover */}
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
                {book.practiceScore && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    <div className="absolute top-2 right-2 bg-brand-yellow text-white text-xs px-2 py-1 rounded-full font-medium">
                      {book.practiceScore}%
                    </div>
                  </div>
                )}
              </div>

              {/* Book Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                  {book.title}
                </h3>
                <p className="text-xs text-gray-500 mb-2">{book.author}</p>
                
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{book.completedSessions}/{book.totalSessions}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-brand-pink h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(book.completedSessions / book.totalSessions) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{book.readingTime} min</span>
                  </div>
                  {book.practiceScore && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 fill-brand-yellow text-brand-yellow" />
                      <span>{book.practiceScore}%</span>
                    </div>
                  )}
                </div>

                {/* Start Practice Button */}
                <button
                  onClick={() => onStartPractice(book.id)}
                  className="w-full bg-brand-pink hover:bg-pink-800 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Practice</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Practice Tips */}
        <div className="mt-12 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center space-x-2">
            <Volume2 className="w-5 h-5" />
            <span>Voice Coaching Tips</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-blue rounded-full mt-2 flex-shrink-0"></div>
              <p>Read slowly and clearly, focusing on pronunciation</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-blue rounded-full mt-2 flex-shrink-0"></div>
              <p>Listen to the reference audio before recording</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-blue rounded-full mt-2 flex-shrink-0"></div>
              <p>Practice difficult words multiple times</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-blue rounded-full mt-2 flex-shrink-0"></div>
              <p>Use proper expression and intonation</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}