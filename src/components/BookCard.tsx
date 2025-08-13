import React from 'react';
import { Clock, Star, BookOpen, PlayCircle } from 'lucide-react';

interface BookCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    cover: string;
    readingTime: number;
    rating: number;
    progress?: number;
    isNew?: boolean;
    category: string;
  };
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
}

export default function BookCard({ book, size = 'medium', showProgress = false }: BookCardProps) {
  const sizeClasses = {
    small: 'w-32',
    medium: 'w-40',
    large: 'w-48',
  };

  return (
    <div className="group cursor-pointer">
      <div className="relative">
        <div className={`${sizeClasses[size]} aspect-[3/4] rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow`}>
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
        
        {showProgress && book.progress && (
          <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-2 rounded-b-lg">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{book.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${book.progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 space-y-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-purple-600 transition-colors">
          {book.title}
        </h3>
        <p className="text-xs text-gray-500">{book.author}</p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{book.readingTime} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{book.rating}</span>
          </div>
        </div>
        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
          {book.category}
        </span>
      </div>
    </div>
  );
}