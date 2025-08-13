import React, { useState } from 'react';
import { ArrowLeft, Heart, MapPin, Play } from 'lucide-react';
import ReadAlongInterface from './ReadAlongInterface';

interface ReadToMeBookOverviewProps {
  onBack: () => void;
  bookId: string;
}

interface TableOfContentsItem {
  id: number;
  title: string;
  page: number;
}

export default function ReadToMeBookOverview({ onBack, bookId }: ReadToMeBookOverviewProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [showReading, setShowReading] = useState(false);

  const tableOfContents: TableOfContentsItem[] = [
    { id: 1, title: "The Magic Begins", page: 2 },
    { id: 2, title: "Into the Forest", page: 4 },
    { id: 3, title: "Meeting New Friends", page: 6 },
    { id: 4, title: "The Great Adventure", page: 8 },
    { id: 5, title: "Finding the Treasure", page: 10 },
    { id: 6, title: "Home Again", page: 12 }
  ];

  const handleStartReading = () => {
    setShowReading(true);
  };

  if (showReading) {
    return <ReadAlongInterface onBack={() => setShowReading(false)} />;
  }

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
              src="https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=600&h=900&dpr=1"
              alt="The Magic Forest Adventure"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-600/30 via-purple-400/20 to-purple-200/30"></div>
            
            {/* Book Title Overlay */}
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-8">
              <h1 className="text-5xl lg:text-6xl font-bold text-yellow-200 mb-3 drop-shadow-2xl">
                The Magic
              </h1>
              <h1 className="text-5xl lg:text-6xl font-bold text-yellow-200 mb-6 drop-shadow-2xl">
                Forest Adventure
              </h1>
              <p className="text-xl lg:text-2xl text-yellow-100 font-medium drop-shadow-lg">
                By Sarah Mitchell
              </p>
              <p className="text-lg text-yellow-100 mt-2 drop-shadow">
                Illustrated by Emma Artist
              </p>
            </div>
          </div>

          {/* Content Panel */}
          <div className="space-y-6 py-8 lg:py-12">
            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full border border-purple-200 hover:bg-purple-200 transition-colors">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span className="font-medium">Read to Me</span>
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

            {/* Table of Contents */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Table of contents</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {tableOfContents.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={handleStartReading}
                  >
                    <span className="text-gray-900 font-medium">{item.title}</span>
                    <span className="text-gray-500 font-medium">{item.page}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reading Progress and Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-6 mb-6">
                <button 
                  onClick={handleStartReading}
                  className="w-12 h-12 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <Play className="w-6 h-6 ml-1" />
                </button>
                <div className="flex-1 grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">0/12</div>
                    <div className="text-sm text-gray-500">Pages Read</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">00m 00s</div>
                    <div className="text-sm text-gray-500">Time Listened</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">01/01/2024</div>
                    <div className="text-sm text-gray-500">Date</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Book Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">BOOK INFO</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Ages:</span>
                  <span className="font-semibold text-gray-900">5-7</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Listen time:</span>
                  <span className="font-semibold text-gray-900">8-15 mins</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Reading Level:</span>
                  <span className="font-semibold text-gray-900">D-E</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}