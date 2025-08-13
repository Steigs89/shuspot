import React, { useState } from 'react';
import { ArrowLeft, Heart, MapPin, Play, Clock, Star, BookOpen } from 'lucide-react';

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
  pagesRead?: number; // Track reading progress
}

interface PdfBookOverviewProps {
  pdfBook: PdfBookData;
  onBack: () => void;
  onStartReading: () => void;
}

export default function PdfBookOverview({ pdfBook, onBack, onStartReading }: PdfBookOverviewProps) {
  const [isFavorited, setIsFavorited] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Book Cover */}
          <div className="relative h-screen lg:h-auto lg:min-h-[700px] rounded-xl overflow-hidden shadow-lg mx-4">
            <img
              src={pdfBook.cover}
              alt={pdfBook.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
            
            {/* Book Title Overlay */}
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6">
                <h1 className="text-3xl lg:text-4xl font-superclarendon-bold mb-2 drop-shadow-lg">
                  {pdfBook.title}
                </h1>
                <p className="text-xl text-white/90 font-medium drop-shadow">
                  By {pdfBook.author}
                </p>
                <div className="mt-3 flex items-center space-x-4 text-sm text-white/80">
                  <span className="bg-white/20 px-2 py-1 rounded">{pdfBook.gradeLevel}</span>
                  <span className="bg-white/20 px-2 py-1 rounded">{pdfBook.genre}</span>
                </div>
              </div>
            </div>

            {/* PDF Badge */}
            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              PDF
            </div>
          </div>

          {/* Content Panel */}
          <div className="space-y-6 py-8 lg:py-12">
            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full border border-blue-200 hover:bg-blue-200 transition-colors">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="font-medium">PDF Reader</span>
              </button>
              <button 
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-2 rounded-full border transition-colors ${
                  isFavorited 
                    ? 'bg-red-50 border-red-200 text-red-500' 
                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-red-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 rounded-full bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                <MapPin className="w-5 h-5" />
              </button>
            </div>

            {/* Book Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-superclarendon-black text-gray-900 mb-4">Book Details</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Title:</span>
                  <span className="font-semibold text-gray-900">{pdfBook.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Author:</span>
                  <span className="font-semibold text-gray-900">{pdfBook.author}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Grade Level:</span>
                  <span className="font-semibold text-gray-900">{pdfBook.gradeLevel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Genre:</span>
                  <span className="font-semibold text-gray-900">{pdfBook.genre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Pages:</span>
                  <span className="font-semibold text-gray-900">{pdfBook.totalPages}</span>
                </div>
              </div>
            </div>

            {/* Reading Progress and Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-6 mb-6">
                <button 
                  onClick={onStartReading}
                  className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Play className="w-6 h-6 ml-1" />
                </button>
                <div className="flex-1 grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{pdfBook.pagesRead || 0}/{pdfBook.totalPages}</div>
                    <div className="text-sm text-gray-500">Pages Read</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">00m 00s</div>
                    <div className="text-sm text-gray-500">Time Read</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString()}</div>
                    <div className="text-sm text-gray-500">Date Added</div>
                  </div>
                </div>
              </div>
              
              {/* Start Reading Button */}
              <button
                onClick={onStartReading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-3"
              >
                <BookOpen className="w-6 h-6" />
                <span className="text-lg">Start Reading</span>
              </button>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-superclarendon-black text-gray-900 mb-4">PROGRESS</h3>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Reading Progress:</span>
                    <span className="font-semibold text-gray-900">
                      {Math.round(((pdfBook.pagesRead || 0) / pdfBook.totalPages) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(((pdfBook.pagesRead || 0) / pdfBook.totalPages) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Progress Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pages Read:</span>
                    <span className="font-semibold text-gray-900">{pdfBook.pagesRead || 0} / {pdfBook.totalPages}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-semibold flex items-center space-x-1 ${
                      (pdfBook.pagesRead || 0) === 0 
                        ? 'text-gray-600' 
                        : (pdfBook.pagesRead || 0) >= pdfBook.totalPages 
                          ? 'text-green-600' 
                          : 'text-blue-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        (pdfBook.pagesRead || 0) === 0 
                          ? 'bg-gray-400' 
                          : (pdfBook.pagesRead || 0) >= pdfBook.totalPages 
                            ? 'bg-green-500' 
                            : 'bg-blue-500'
                      }`}></div>
                      <span>
                        {(pdfBook.pagesRead || 0) === 0 
                          ? 'Not Started' 
                          : (pdfBook.pagesRead || 0) >= pdfBook.totalPages 
                            ? 'Completed' 
                            : 'In Progress'
                        }
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}