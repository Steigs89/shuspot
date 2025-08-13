import React from 'react';
import { Heart, FileText } from 'lucide-react';

interface BookCardWithHoverProps {
  book: {
    id: string;
    title: string;
    author?: string;
    cover: string;
    totalPages?: number;
    pagesRead?: number;
    genre?: string;
    gradeLevel?: string;
    difficulty?: string;
  };
  onClick: () => void;
  onToggleFavorite?: () => void;
  isFavorited?: boolean;
  category?: string;
  showProgress?: boolean;
  className?: string;
}

export default function BookCardWithHover({
  book,
  onClick,
  onToggleFavorite,
  isFavorited = false,
  category,
  showProgress = false,
  className = ""
}: BookCardWithHoverProps) {
  const pageCount = book.totalPages || 0;
  const readingLevel = book.gradeLevel || book.difficulty || '';

  return (
    <div
      className={`group cursor-pointer relative ${className}`}
      onClick={onClick}
    >
      {/* Book Cover */}
      <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 relative">
        <img
          src={book.cover}
          alt={book.title}
          className="w-full h-full object-cover"
        />
        
        {/* Category Badge */}
        {category && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {category === 'books' ? 'PDF' : 
             category === 'videoBooks' ? 'Video' :
             category === 'voiceCoach' ? 'Voice' : 
             category === 'readToMe' ? 'Audio' : category}
          </div>
        )}

        {/* Progress Bar */}
        {showProgress && book.pagesRead && book.totalPages && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(book.pagesRead / book.totalPages) * 100}%` }}
            />
          </div>
        )}

        {/* Hover Overlay - Epic Style */}
        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
          {/* Top Section - Title */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-white font-bold text-sm leading-tight mb-1">
                {book.title}
              </h3>
              {book.author && (
                <p className="text-white/80 text-xs">
                  by {book.author}
                </p>
              )}
              {readingLevel && (
                <div className="mt-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-medium">
                  {readingLevel}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section - Page Count and Favorite */}
          <div className="flex items-center justify-between">
            {/* Page Count */}
            <div className="flex items-center space-x-1 text-white">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">
                {pageCount > 0 ? `${pageCount} pgs` : 'N/A'}
              </span>
            </div>

            {/* Favorite Button */}
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className={`p-1 rounded-full transition-colors ${
                  isFavorited 
                    ? 'text-red-400 hover:text-red-300' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}