import { useState } from 'react';
import { ArrowLeft, Play, Clock, Star, Mic, Volume2 } from 'lucide-react';

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
  pagesRead?: number;
}

interface VoiceCoachingDashboardProps {
  onBack: () => void;
  onStartPractice: (bookId: string, pdfBook?: PdfBookData) => void;
  uploadedPdfBooks?: PdfBookData[];
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

export default function VoiceCoachingDashboard({ onBack, onStartPractice, uploadedPdfBooks = [] }: VoiceCoachingDashboardProps) {
  const [selectedLevel, setSelectedLevel] = useState('All');

  const hardcodedBooks: Book[] = [];

  const readingLevels = ['All', 'AA - A', 'B - C', 'D - E', 'F - G', 'H - I', 'J - K'];

  const filteredPdfBooks = selectedLevel === 'All'
    ? uploadedPdfBooks
    : uploadedPdfBooks.filter(b => b.gradeLevel === selectedLevel);

  const hasBooks = filteredPdfBooks.length > 0 || hardcodedBooks.length > 0;

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
      <div className="bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block bg-white/60 backdrop-blur-md rounded-2xl px-8 py-6 shadow-lg border border-white/50">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <Mic className="w-8 h-8 text-blue-700" />
              <h1 className="text-4xl font-light text-blue-800">AI Voice Coach</h1>
            </div>
            <p className="text-lg text-blue-700">Practice reading aloud and improve your pronunciation</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Reading Level Filter */}
        <div className="mb-8">
          <p className="text-blue-800 font-medium mb-3">Reading Level</p>
          <div className="flex flex-wrap gap-2">
            {readingLevels.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedLevel === level
                    ? 'bg-brand-pink text-white shadow-md'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Books Grid */}
        {hasBooks ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {/* Uploaded PDF books */}
            {filteredPdfBooks.map((pdfBook) => (
              <div key={`pdf-${pdfBook.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img src={pdfBook.cover} alt={pdfBook.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">PDF</div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">{pdfBook.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{pdfBook.author}</p>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{pdfBook.pagesRead || 0}/{pdfBook.totalPages}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-brand-pink h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((pdfBook.pagesRead || 0) / pdfBook.totalPages) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{pdfBook.totalPages} pages</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 fill-blue-400 text-blue-400" />
                      <span>{pdfBook.gradeLevel}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onStartPractice(pdfBook.id, pdfBook)}
                    className="w-full bg-brand-pink hover:bg-pink-800 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Practice</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Hardcoded books (empty by default) */}
            {hardcodedBooks.map((book) => (
              <div key={book.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                  {book.practiceScore && (
                    <div className="absolute top-2 right-2 bg-brand-yellow text-white text-xs px-2 py-1 rounded-full font-medium">
                      {book.practiceScore}%
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">{book.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{book.author}</p>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{book.completedSessions}/{book.totalSessions}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-brand-pink h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(book.completedSessions / book.totalSessions) * 100}%` }}
                      />
                    </div>
                  </div>
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
        ) : (
          <div className="text-center py-20 text-gray-500">
            <Mic className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No Voice Coach books yet</p>
            <p className="text-sm">Upload a PDF and set its media type to "Voice Coach" to get started.</p>
          </div>
        )}

        {/* Practice Tips */}
        <div className="mt-12 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center space-x-2">
            <Volume2 className="w-5 h-5" />
            <span>Voice Coaching Tips</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
              <p>Read slowly and clearly, focusing on pronunciation</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
              <p>Listen to the reference audio before recording</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
              <p>Practice difficult words multiple times</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
              <p>Use proper expression and intonation</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
