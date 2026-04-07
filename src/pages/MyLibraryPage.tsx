import { useState } from 'react';
import { Heart, Clock, Palette } from 'lucide-react';

interface MyLibraryPageProps {
  onBack: () => void;
  userName?: string;
}

export default function MyLibraryPage({ onBack, userName = 'User' }: MyLibraryPageProps) {
  const [activeTab, setActiveTab] = useState<'favorites' | 'recent' | 'gallery'>('recent');

  // Mock data - replace with real data
  const recentBooks = [
    { id: 1, title: 'Trombone Shorty', cover: '/api/placeholder/120/160', hasAudio: true },
    { id: 2, title: 'Hike to the Top', cover: '/api/placeholder/120/160', hasAudio: true },
    { id: 3, title: 'Why Does My Body Make Bubbles?', cover: '/api/placeholder/120/160', hasAudio: false },
    { id: 4, title: 'Dumpy the Dump Truck', cover: '/api/placeholder/120/160', hasAudio: true },
    { id: 5, title: "A Butterfly's Life", cover: '/api/placeholder/120/160', hasAudio: false },
    { id: 6, title: '100 First Words for Little Artists', cover: '/api/placeholder/120/160', hasAudio: false },
    { id: 7, title: 'Hide and Seek', cover: '/api/placeholder/120/160', hasAudio: false },
  ];

  const favoriteBooks = [
    { id: 1, title: 'Hike to the Top', cover: '/api/placeholder/120/160', hasAudio: true },
    { id: 2, title: 'Dumpy the Dump Truck', cover: '/api/placeholder/120/160', hasAudio: true },
    { id: 3, title: '100 First Words for Little Artists', cover: '/api/placeholder/120/160', hasAudio: false },
    { id: 4, title: 'Duck-Billed Dinosaurs', cover: '/api/placeholder/120/160', hasAudio: false },
    { id: 5, title: 'Earn Wisely', cover: '/api/placeholder/120/160', hasAudio: false },
    { id: 6, title: 'Electric Zombie', cover: '/api/placeholder/120/160', hasAudio: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <h1 className="text-4xl font-bold text-[#2196F3] mb-8">My Library</h1>
        
        {/* Tabs */}
        <div className="flex space-x-8 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-4 px-2 font-medium text-lg transition-colors ${
              activeTab === 'favorites'
                ? 'text-[#2196F3] border-b-2 border-[#2196F3]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5" />
              <span>FAVORITES</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`pb-4 px-2 font-medium text-lg transition-colors ${
              activeTab === 'recent'
                ? 'text-[#2196F3] border-b-2 border-[#2196F3]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>RECENT</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`pb-4 px-2 font-medium text-lg transition-colors ${
              activeTab === 'gallery'
                ? 'text-[#2196F3] border-b-2 border-[#2196F3]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>STORY SKETCH GALLERY</span>
            </div>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'recent' && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Recently Read</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {recentBooks.map((book) => (
                <div key={book.id} className="group cursor-pointer">
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <img 
                      src={book.cover} 
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {book.hasAudio && (
                      <div className="absolute bottom-2 left-2 bg-[#4CAF50] text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                        <span>🔊</span>
                        <span>Read to Me</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-700 line-clamp-2">{book.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Favorite Books</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {favoriteBooks.map((book) => (
                <div key={book.id} className="group cursor-pointer">
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <img 
                      src={book.cover} 
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {book.hasAudio && (
                      <div className="absolute bottom-2 left-2 bg-[#4CAF50] text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                        <span>🔊</span>
                        <span>Read to Me</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-700 line-clamp-2">{book.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Story Sketch Gallery</h2>
            <div className="text-center py-16 text-gray-500">
              <Palette className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium mb-2">Your story sketches will appear here</h3>
              <p className="text-lg">Start creating to see your artwork!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}