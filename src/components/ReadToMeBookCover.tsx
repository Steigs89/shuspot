import React, { useState } from 'react';
import { ArrowLeft, Heart, Play, Star } from 'lucide-react';

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

interface ReadToMeBookCoverProps {
  onBack: () => void;
  onStartReading: () => void;
  bookId: string;
  pdfBook?: PdfBookData;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

export default function ReadToMeBookCover({ onBack, onStartReading, bookId, pdfBook, isFavorited = false, onToggleFavorite }: ReadToMeBookCoverProps) {

  // Dynamic book data based on bookId or pdfBook
  const getBookData = (id: string) => {
    const books = {
      'read-to-me-dummy': {
        title: 'Bright Family Meets Cat Ninja',
        subtitle: 'Chapter 5',
        description: 'The bake-off has become a kitchen nightmare! Our heroes have to defend themselves, save the villains, and win the contest.',
        cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=1',
        writtenBy: ['Meika Hashimoto', 'Gabe Soria'],
        illustratedBy: 'Rafa Ribs',
        colorsBy: 'Warren Wucinich',
        ageRange: '6-12',
        grLevel: '-',
        hasQuiz: true,
        categories: ['SCIENCE FICTION', 'ACTION STORIES', 'SUPERHEROES'],
        spotlightWords: ['contest', 'esteemed', 'concept'],
        emoji: '🦸‍♂️🐱‍👤',
        gradientFrom: 'from-blue-500',
        gradientVia: 'via-purple-600',
        gradientTo: 'to-red-500'
      },
      '1': {
        title: 'The Magic Forest Adventure',
        subtitle: 'Chapter 1',
        description: 'Join our brave heroes as they discover a magical forest filled with talking animals, enchanted trees, and mysterious secrets waiting to be uncovered.',
        cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=1',
        writtenBy: ['Sarah Mitchell'],
        illustratedBy: 'Emma Woods',
        colorsBy: 'Jake Rivers',
        ageRange: '5-10',
        grLevel: 'K-2',
        hasQuiz: true,
        categories: ['FANTASY', 'ADVENTURE', 'NATURE'],
        spotlightWords: ['magical', 'enchanted', 'mysterious'],
        emoji: '🌲🦋',
        gradientFrom: 'from-green-500',
        gradientVia: 'via-emerald-600',
        gradientTo: 'to-teal-500'
      },
      '2': {
        title: 'Space Explorers',
        subtitle: 'Mission Alpha',
        description: 'Blast off into an incredible journey through the cosmos! Meet alien friends, explore distant planets, and discover the wonders of the universe.',
        cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=1',
        writtenBy: ['Mike Chen'],
        illustratedBy: 'Luna Star',
        colorsBy: 'Nova Bright',
        ageRange: '6-11',
        grLevel: '1-3',
        hasQuiz: true,
        categories: ['SCIENCE FICTION', 'ADVENTURE', 'SPACE'],
        spotlightWords: ['cosmos', 'universe', 'explore'],
        emoji: '🚀👽',
        gradientFrom: 'from-indigo-500',
        gradientVia: 'via-purple-600',
        gradientTo: 'to-pink-500'
      },
      '3': {
        title: 'Ocean Mysteries',
        subtitle: 'Deep Sea Discovery',
        description: 'Dive deep into the ocean depths where colorful coral reefs hide amazing sea creatures and ancient treasures beyond your wildest dreams.',
        cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=1',
        writtenBy: ['Lisa Waters'],
        illustratedBy: 'Ocean Blue',
        colorsBy: 'Coral Reef',
        ageRange: '5-9',
        grLevel: 'K-2',
        hasQuiz: true,
        categories: ['ADVENTURE', 'OCEAN', 'DISCOVERY'],
        spotlightWords: ['depths', 'treasures', 'creatures'],
        emoji: '🌊🐠',
        gradientFrom: 'from-blue-500',
        gradientVia: 'via-cyan-600',
        gradientTo: 'to-teal-500'
      },
      '4': {
        title: 'Dinosaur Discovery',
        subtitle: 'Prehistoric Adventure',
        description: 'Travel back in time to meet the mighty dinosaurs! Learn about these incredible creatures and the amazing world they lived in millions of years ago.',
        cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=1',
        writtenBy: ['Tom Rex'],
        illustratedBy: 'Dino Hunter',
        colorsBy: 'Fossil Brown',
        ageRange: '6-10',
        grLevel: '1-2',
        hasQuiz: true,
        categories: ['EDUCATIONAL', 'HISTORY', 'DINOSAURS'],
        spotlightWords: ['prehistoric', 'mighty', 'incredible'],
        emoji: '🦕🦖',
        gradientFrom: 'from-orange-500',
        gradientVia: 'via-red-600',
        gradientTo: 'to-yellow-500'
      },
      '5': {
        title: 'Princess Adventures',
        subtitle: 'Royal Quest',
        description: 'Follow Princess Luna on her brave quest to save the kingdom! With courage, kindness, and magic, she faces challenges and makes new friends.',
        cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=1',
        writtenBy: ['Emma Royal'],
        illustratedBy: 'Castle Dreams',
        colorsBy: 'Royal Purple',
        ageRange: '4-8',
        grLevel: 'Pre-K-1',
        hasQuiz: true,
        categories: ['FANTASY', 'PRINCESS', 'ADVENTURE'],
        spotlightWords: ['courage', 'kingdom', 'quest'],
        emoji: '👸✨',
        gradientFrom: 'from-pink-500',
        gradientVia: 'via-purple-600',
        gradientTo: 'to-indigo-500'
      },
      '6': {
        title: 'Animal Friends',
        subtitle: 'Friendship Tales',
        description: 'Meet a wonderful group of animal friends who learn about friendship, sharing, and caring for each other in their cozy forest home.',
        cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&dpr=1',
        writtenBy: ['Jake Wilson'],
        illustratedBy: 'Forest Friend',
        colorsBy: 'Nature Green',
        ageRange: '3-7',
        grLevel: 'Pre-K-K',
        hasQuiz: true,
        categories: ['ANIMALS', 'FRIENDSHIP', 'NATURE'],
        spotlightWords: ['friendship', 'caring', 'sharing'],
        emoji: '🐻🐰',
        gradientFrom: 'from-green-500',
        gradientVia: 'via-yellow-600',
        gradientTo: 'to-orange-500'
      }
    };

    return books[id as keyof typeof books] || books['read-to-me-dummy'];
  };

  // Use PDF book data if provided, otherwise use dummy data
  const bookData = pdfBook ? {
    title: pdfBook.title,
    subtitle: `${pdfBook.genre} • ${pdfBook.gradeLevel}`,
    description: `Enjoy this wonderful ${pdfBook.genre.toLowerCase()} story with our Read to Me feature. The story will be read aloud with beautiful narration and highlighting.`,
    cover: pdfBook.cover,
    writtenBy: [pdfBook.author],
    illustratedBy: 'Various Artists',
    colorsBy: 'Digital',
    ageRange: pdfBook.gradeLevel,
    grLevel: pdfBook.gradeLevel,
    hasQuiz: false,
    categories: [pdfBook.genre.toUpperCase(), 'READ TO ME', 'PDF BOOK'],
    spotlightWords: ['reading', 'story', 'adventure'],
    emoji: pdfBook.genre === 'Animals' ? '🐾' : 
           pdfBook.genre === 'Adventure' ? '🗺️' : 
           pdfBook.genre === 'Fantasy' ? '✨' : 
           pdfBook.genre === 'Education' ? '📚' : '📖',
    gradientFrom: 'from-purple-500',
    gradientVia: 'via-pink-600',
    gradientTo: 'to-blue-500'
  } : getBookData(bookId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm">
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-2 gap-8 items-start min-h-[600px] max-h-[80vh]">
          {/* Left Side - Book Information */}
          <div className="flex flex-col h-full justify-between">
            {/* Main Book Info Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-xl">
              <div className="flex items-start space-x-6 mb-6">
                {/* Small Book Cover - Use actual PDF cover or generated cover */}
                {pdfBook ? (
                  <div className="w-24 h-32 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img
                      src={pdfBook.cover}
                      alt={pdfBook.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-purple-500 text-white text-xs px-1 py-0.5 rounded flex items-center space-x-1">
                      <Play className="w-2 h-2" />
                      <span>{pdfBook.totalPages}</span>
                    </div>
                  </div>
                ) : (
                  <div className={`w-24 h-32 bg-gradient-to-br ${bookData.gradientFrom} ${bookData.gradientVia} ${bookData.gradientTo} rounded-lg overflow-hidden flex-shrink-0 relative`}>
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <div className="text-center">
                        <div className="text-lg mb-1">{bookData.emoji}</div>
                        <div className="text-white text-xs font-superclarendon-bold leading-tight">
                          {bookData.title.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded flex items-center space-x-1">
                      <Play className="w-2 h-2" />
                      <span>41</span>
                    </div>
                  </div>
                )}

                {/* Book Details */}
                <div className="flex-1">
                  <h1 className="text-2xl font-superclarendon-bold text-gray-900 mb-1">
                    {bookData.title}
                  </h1>
                  <h2 className="text-lg font-superclarendon-black text-gray-600 mb-3">
                    {bookData.subtitle}
                  </h2>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">
                    {bookData.description}
                  </p>
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {bookData.categories.map((category) => (
                  <span
                    key={category}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                  >
                    {category}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={onToggleFavorite}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isFavorited
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                  <span>Favorite</span>
                </button>
                
                <button
                  onClick={onStartReading}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-md"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Reading</span>
                </button>
              </div>
            </div>



            {/* About This Book Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-xl mb-6">
              <h3 className="text-xl font-superclarendon-black text-gray-900 mb-4">
                About This Book
              </h3>
              <div className="space-y-3 text-base">
                <div>
                  <span className="font-medium text-gray-700">By: </span>
                  <span className="text-blue-600 font-medium">
                    {bookData.writtenBy.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Illustrated by: </span>
                  <span className="text-blue-600 font-medium">{bookData.illustratedBy}</span>
                </div>
                {pdfBook && (
                  <div>
                    <span className="font-medium text-gray-700">Total Pages: </span>
                    <span className="text-purple-600 font-medium">{pdfBook.totalPages}</span>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{bookData.ageRange}</div>
                  <div className="text-xs text-gray-500 mt-1">Age Range</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{bookData.grLevel}</div>
                  <div className="text-xs text-gray-500 mt-1">GR Level</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{bookData.hasQuiz ? 'Yes' : 'No'}</div>
                  <div className="text-xs text-gray-500 mt-1">Quiz</div>
                </div>
              </div>




            </div>
          </div>

          {/* Right Side - Large Book Cover */}
          <div className="flex flex-col h-full">
            {/* Book Cover - Flex grow to take available space */}
            <div className="relative w-full max-w-lg mx-auto flex-1 flex items-center justify-center">
              {/* Main Book Cover - Use actual PDF cover or generated cover */}
              {pdfBook ? (
                <div className="w-full h-[480px] rounded-2xl shadow-2xl overflow-hidden relative transform rotate-1 hover:rotate-0 transition-transform duration-300">
                  <img
                    src={pdfBook.cover}
                    alt={pdfBook.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay for Read to Me branding */}
                  <div className="absolute top-4 left-4 bg-purple-500/90 text-white px-3 py-1 rounded-full text-sm font-bold">
                    📖 Read to Me
                  </div>
                  {/* Progress indicator if available */}
                  {pdfBook.pagesRead && pdfBook.pagesRead > 0 && (
                    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {Math.round((pdfBook.pagesRead / pdfBook.totalPages) * 100)}% Complete
                    </div>
                  )}
                </div>
              ) : (
                <div className={`w-full h-[480px] bg-gradient-to-br ${bookData.gradientFrom} ${bookData.gradientVia} ${bookData.gradientTo} rounded-2xl shadow-2xl overflow-hidden relative transform rotate-1 hover:rotate-0 transition-transform duration-300`}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
                    {/* Epic! Logo */}
                    <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-base font-bold mb-4">
                      epic!
                    </div>
                    
                    {/* Dynamic Title */}
                    <h2 className="text-white text-2xl font-superclarendon-bold mb-4 leading-tight px-3">
                      {bookData.title.toUpperCase()}
                    </h2>
                    
                    {/* Characters */}
                    <div className="text-6xl mb-4">{bookData.emoji}</div>
                    
                    {/* Subtitle */}
                    <div className="bg-black/60 px-3 py-2 rounded text-white text-base font-bold">
                      "{bookData.subtitle}"
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Book Info Below Cover - Aligned with left side bottom */}
            <div className="w-full max-w-lg mx-auto mt-6 text-center bg-white/90 backdrop-blur-md rounded-xl p-5 shadow-xl mb-6">
              <h2 className="text-2xl font-superclarendon-bold text-blue-600 mb-2">
                {bookData.title}
              </h2>
              <p className="text-lg font-superclarendon-black text-purple-600 mb-4">
                "{bookData.subtitle}"
              </p>
              
              <div className="grid grid-cols-3 gap-4 text-base">
                <div className="text-left">
                  <div className="text-gray-500 text-sm uppercase tracking-wide font-medium mb-1">Written By</div>
                  {bookData.writtenBy.map((author, index) => (
                    <div key={index} className="font-bold text-gray-900">{author}</div>
                  ))}
                </div>
                <div className="text-left">
                  <div className="text-gray-500 text-sm uppercase tracking-wide font-medium mb-1">Illustrated By</div>
                  <div className="font-bold text-gray-900">{bookData.illustratedBy}</div>
                </div>
                <div className="text-left">
                  <div className="text-gray-500 text-sm uppercase tracking-wide font-medium mb-1">Colors By</div>
                  <div className="font-bold text-gray-900">{bookData.colorsBy}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}