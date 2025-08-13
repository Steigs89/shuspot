import React, { useState } from 'react';
import { ArrowLeft, Clock, Star, BookOpen, PlayCircle, Volume2 } from 'lucide-react';

interface ReadToMeDashboardProps {
  onBack: () => void;
  onBookSelect: (bookId: string) => void;
}

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  readingTime: number;
  rating: number;
  category: string;
  progress?: number;
  isNew?: boolean;
}

export default function ReadToMeDashboard({ onBack, onBookSelect }: ReadToMeDashboardProps) {
  const [selectedLevel, setSelectedLevel] = useState('D - E');

  const books: Book[] = [
    {
      id: '1',
      title: 'The Magic Forest Adventure',
      author: 'Sarah Mitchell',
      cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 15,
      rating: 4.8,
      category: 'Fantasy',
      isNew: true,
      progress: 65
    },
    {
      id: '2',
      title: 'Space Explorers',
      author: 'Mike Chen',
      cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 12,
      rating: 4.9,
      category: 'Science Fiction',
      progress: 30
    },
    {
      id: '3',
      title: 'Ocean Mysteries',
      author: 'Lisa Waters',
      cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 18,
      rating: 4.7,
      category: 'Adventure',
      progress: 85
    },
    {
      id: '4',
      title: 'Dinosaur Discovery',
      author: 'Tom Rex',
      cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 10,
      rating: 4.6,
      category: 'Educational'
    },
    {
      id: '5',
      title: 'Princess Adventures',
      author: 'Emma Royal',
      cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 14,
      rating: 4.8,
      category: 'Fantasy'
    },
    {
      id: '6',
      title: 'Animal Friends',
      author: 'Jake Wilson',
      cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 8,
      rating: 4.5,
      category: 'Animals'
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
     <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block bg-white/60 backdrop-blur-md rounded-2xl px-8 py-6 shadow-lg border border-white/50">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Volume2 className="w-8 h-8 text-yellow-700 drop-shadow-sm" />
              <h1 className="text-4xl font-light text-yellow-800 drop-shadow-sm">Read to Me</h1>
            </div>
            <p className="text-lg text-yellow-700 drop-shadow-sm">Listen to engaging stories with beautiful narration</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Reading Level Filter */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-yellow-800 font-medium">Reading Level</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {readingLevels.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedLevel === level
                    ? 'bg-brand-pink text-white shadow-lg'
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
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
            <div 
              key={book.id} 
              className="group cursor-pointer"
              onClick={() => onBookSelect(book.id)}
            >
              <div className="relative">
                <div className="w-full aspect-[3/4] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {book.isNew && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      New
                    </div>
                  )}
                </div>
                
                {book.progress && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-2 rounded-b-lg">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{book.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-brand-pink to-pink-700 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${book.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-3 space-y-1">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-brand-pink transition-colors">
                  {book.title}
                </h3>
                <p className="text-xs text-gray-500">{book.author}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{book.readingTime} min</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-brand-yellow text-brand-yellow" />
                    <span>{book.rating}</span>
                  </div>
                </div>
                <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {book.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Reading Tips */}
        <div className="mt-12 bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Read to Me Tips</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-800">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-yellow rounded-full mt-2 flex-shrink-0"></div>
              <p>Follow along with the highlighted text as the story is read</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-yellow rounded-full mt-2 flex-shrink-0"></div>
              <p>Use the pause button if you need more time to look at pictures</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-yellow rounded-full mt-2 flex-shrink-0"></div>
              <p>Turn pages manually or let the story advance automatically</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-yellow rounded-full mt-2 flex-shrink-0"></div>
              <p>Enjoy the beautiful illustrations and engaging narration</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}