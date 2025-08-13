import React from 'react';
import { RotateCcw, Award, Home } from 'lucide-react';

interface BookCompletionScreenProps {
  bookTitle: string;
  bookCover: string;
  pointsEarned: number;
  readingTimeMinutes: number;
  onReadAgain: () => void;
  onStartQuiz: () => void;
  onReturnToMain?: () => void;
}

export default function BookCompletionScreen({
  bookTitle,
  bookCover,
  pointsEarned,
  readingTimeMinutes,
  onReadAgain,
  onStartQuiz,
  onReturnToMain
}: BookCompletionScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Book Cover with Complete Badge */}
        <div className="relative mb-6">
          <div className="w-32 aspect-[3/4] mx-auto rounded-lg overflow-hidden shadow-lg relative">
            <img
              src={bookCover}
              alt={bookTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
              <span>📖</span>
              <span>Read to Me</span>
            </div>
          </div>
          
          {/* Complete Badge */}
          <div className="absolute -top-2 -right-2 transform rotate-12">
            <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg border-4 border-white">
              ✓ COMPLETE!
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-blue-600 mb-2">Book Complete!</h1>
        <h2 className="text-lg text-gray-700 mb-6">{bookTitle}</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <div className="text-sm text-gray-600 mb-1">POINTS EARNED</div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">⭐</span>
              </div>
              <span className="text-2xl font-bold text-gray-800">{pointsEarned}</span>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">READING TIME</div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">⏱️</span>
              </div>
              <span className="text-2xl font-bold text-gray-800">{readingTimeMinutes} min</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={onStartQuiz}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-full transition-colors flex items-center justify-center space-x-3 shadow-lg"
          >
            <Award className="w-6 h-6" />
            <span className="text-lg">Play Quiz</span>
          </button>
          
          <button
            onClick={onReadAgain}
            className="w-full bg-white hover:bg-gray-50 text-blue-500 font-bold py-3 px-6 rounded-full border-2 border-blue-500 transition-colors flex items-center justify-center space-x-3"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Read Again</span>
          </button>
          
          {onReturnToMain && (
            <button
              onClick={onReturnToMain}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-full transition-colors flex items-center justify-center space-x-3"
            >
              <Home className="w-5 h-5" />
              <span>Back to Library</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}