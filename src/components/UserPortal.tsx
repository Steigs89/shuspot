import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Clock, Trophy, Star, Calendar, User, Heart, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUserStats } from '../contexts/UserStatsContext';
import { supabase } from '../lib/supabase';
import cuteAnimalsGroup from '../assets/cute-animals-group.png';
import adorableCartoonDog from '../assets/adorable-cartoon-dog-face.png';
import cuteAnimalsCircleBadge from '../assets/cartoon-safari-cartoon-group-of-animals-fzghABMD_t-removebg-preview.png';
import adorableBabyAnimals from '../assets/adorable-baby-animals-cartoon-style_1308-179165-removebg-preview.png';

interface UserPortalProps {
  onBack: () => void;
  onLogout: () => void;
  favorites: {
    books: any[];
    videoBooks: any[];
    voiceCoach: any[];
    audiobooks: any[];
    readToMe: any[];
  };
  onOpenBook?: (bookId: string, category: string) => void;
  currentUser?: { id: string; name: string; email: string; readingLevelSystem?: string; avatar?: string } | null;
  onAvatarChange?: (newAvatar: string) => void;
}

interface ProgressData {
  library: {
    completedBooks: number;
    hoursSpent: string;
    pagesRead: number;
  };
}

interface ActivityItem {
  id: string;
  title: string;
  type: string;
  metric: string;
  value: string;
  date: string;
  progress: number;
  isHighlighted?: boolean;
}

interface CourseItem {
  id: string;
  name: string;
  metric1: string;
  value1: string;
  metric2: string;
  value2: string;
  completion: string;
}

export default function UserPortal({ onBack, onLogout, favorites, onOpenBook, currentUser, onAvatarChange }: UserPortalProps) {
  const { userStats, getProgressBySection } = useUserStats();
  const [currentView, setCurrentView] = useState<'progress' | 'activity' | 'favourites' | 'account'>('progress');
  const [progressTab, setProgressTab] = useState<'weekly' | 'monthly'>('weekly');
  const [activityTab, setActivityTab] = useState<'library' | 'school'>('library');
  const [currentWeek, setCurrentWeek] = useState('15-21, Apr');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  // Avatar options
  const avatarOptions = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴',
    '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦗',
    '🕷️', '🦂', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐',
    '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈'
  ];

  // Handle avatar selection (just visual selection, not saving yet)
  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
  };

  // Handle confirming the avatar change
  const handleConfirmAvatarChange = async () => {
    if (!selectedAvatar || !currentUser) return;

    try {
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar: selectedAvatar
        }
      });

      if (error) {
        console.error('Error updating avatar:', error);
        return;
      }

      // Close avatar selector and reset selection
      setShowAvatarSelector(false);
      setSelectedAvatar(null);
      
      // Call the parent's onAvatarChange if provided (to update the main app state)
      if (onAvatarChange) {
        onAvatarChange(selectedAvatar);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };

  // Handle opening avatar selector
  const handleOpenAvatarSelector = () => {
    setSelectedAvatar(currentUser?.avatar || null); // Pre-select current avatar
    setShowAvatarSelector(true);
  };

  // Format time from minutes to hours and minutes
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  // Available sections for progress tracking
  const availableSections = ['All', 'Voice Coach', 'Books', 'Video Books', 'Read to Me', 'Audiobooks'];

  // Get current stats based on selected tab and section
  const currentStats = getProgressBySection(selectedSection, progressTab);
  
  // Debug logging to see what data we're getting
  console.log('🔍 UserPortal Debug:');
  console.log('📊 Selected Section:', selectedSection);
  console.log('📅 Progress Tab:', progressTab);
  console.log('📈 Current Stats:', currentStats);
  console.log('📚 User Stats:', userStats);

  const progressData: ProgressData = {
    library: {
      completedBooks: currentStats.booksCompleted,
      hoursSpent: formatTime(currentStats.timeSpent),
      pagesRead: currentStats.pagesRead
    }
  };

  // Convert reading sessions to activity data
  const activityData: ActivityItem[] = userStats.readingSessions
    .slice(-10) // Show last 10 activities
    .map((session, index) => ({
      id: session.bookId + index,
      title: session.bookTitle,
      type: session.bookType === 'pdf' ? 'Books' : 
            session.bookType === 'audiobook' ? 'Audiobooks' :
            session.bookType === 'video' ? 'Video Book' :
            session.bookType === 'readToMe' ? 'Read to Me' :
            session.bookType === 'voiceCoach' ? 'Voice Coach' : 'Books',
      metric: session.bookType === 'video' ? 'Watch time' : 'Pages read',
      value: session.bookType === 'video' ? formatTime(session.timeSpent) : session.pagesRead.toString(),
      date: new Date(session.completedAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      progress: session.totalPages > 0 ? Math.round((session.pagesRead / session.totalPages) * 100) : 0,
      isHighlighted: session.isCompleted
    }))
    .reverse(); // Show most recent first

  // Convert quiz results to course data
  const courseData: CourseItem[] = userStats.quizResults
    .slice(-5) // Show last 5 quiz results
    .map((quiz, index) => ({
      id: quiz.bookId + index,
      name: quiz.bookTitle.length > 15 ? quiz.bookTitle.substring(0, 15) + '...' : quiz.bookTitle,
      metric1: 'Quiz Results',
      value1: `${quiz.score}/${quiz.totalQuestions} Correct`,
      metric2: 'Time Spent',
      value2: formatTime(quiz.timeSpent),
      completion: quiz.passed ? 'Yes' : 'No'
    }))
    .reverse(); // Show most recent first

  const renderProgressView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-700">Progress</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setProgressTab('weekly')}
            className={`px-4 py-2 font-medium transition-colors ${progressTab === 'weekly'
              ? 'text-gray-800 border-b-2 border-gray-800'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setProgressTab('monthly')}
            className={`px-4 py-2 font-medium transition-colors ${progressTab === 'monthly'
              ? 'text-gray-800 border-b-2 border-gray-800'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Section Selection */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Section to View Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {availableSections.map((section) => (
            <button
              key={section}
              onClick={() => setSelectedSection(section)}
              className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                selectedSection === section
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
              }`}
            >
              <div className="text-sm">
                {section === 'All' && '📚'}
                {section === 'Voice Coach' && '🎤'}
                {section === 'Books' && '📖'}
                {section === 'Video Books' && '📹'}
                {section === 'Read to Me' && '👂'}
                {section === 'Audiobooks' && '🔊'}
              </div>
              <div className="text-xs mt-1">{section}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Currently viewing: <span className="font-semibold text-blue-600">{selectedSection}</span> progress
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center space-x-4 bg-gray-100 rounded-lg p-4">

      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Library Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-sm border border-blue-200 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
              <span>📚 Library</span>
            </h3>
            {/* Fun decorative elements */}
            <div className="absolute top-2 right-2 w-8 h-8 opacity-30">
              <img
                src={cuteAnimalsGroup}
                alt="Cute Animals"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">📖</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 flex items-center space-x-1">
                  <span>{progressData.library.completedBooks}</span>
                  <span className="text-lg">🎉</span>
                </div>
                <div className="text-sm text-gray-600">Completed Books</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">⏰</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 flex items-center space-x-1">
                  <span>{progressData.library.hoursSpent}</span>
                  <span className="text-lg">⭐</span>
                </div>
                <div className="text-sm text-gray-600">Hours spent in Library</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">📄</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 flex items-center space-x-1">
                  <span>{progressData.library.pagesRead}</span>
                  <span className="text-lg">🚀</span>
                </div>
                <div className="text-sm text-gray-600">Pages Read</div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );

  const renderActivityView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-700">Activity</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActivityTab('library')}
            className={`px-4 py-2 font-medium transition-colors ${activityTab === 'library'
              ? 'text-gray-800 border-b-2 border-gray-800'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Library
          </button>
          <button
            onClick={() => setActivityTab('school')}
            className={`px-4 py-2 font-medium transition-colors relative ${activityTab === 'school'
              ? 'text-gray-800 border-b-2 border-gray-800'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            School
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {activityTab === 'library' ? (
          activityData.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl shadow-sm border p-6 transition-all hover:shadow-md ${item.isHighlighted ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">D-E</span>
                </div>
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div>
                    <div className="font-semibold text-gray-800">{item.title}</div>
                    <div className="text-sm text-gray-500">{item.type}</div>
                    <div className="text-sm text-gray-500">Exercise</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{item.value}</div>
                    <div className="text-sm text-gray-500">{item.metric}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{item.date}</div>
                    <div className="text-sm text-gray-500">Date</div>
                  </div>
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-6">
            {/* Course Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-400 ring-2 ring-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">1a - COURSE 02/25</h3>
              <div className="space-y-4">
                {courseData.map((course) => (
                  <div key={course.id} className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <div className="font-semibold text-gray-800">{course.name}</div>
                        <div className="text-sm text-gray-500">{course.metric1}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{course.value1}</div>
                        {course.value2 && (
                          <div className="text-sm text-gray-500">{course.value2}</div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{course.completion}</div>
                        <div className="text-sm text-gray-500">Completion</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Course */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">1a - COURSE 01/25</h3>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <div className="font-semibold text-gray-800">OTR SLL</div>
                    <div className="text-sm text-gray-500">Incorrect words</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">10</div>
                    <div className="text-sm text-gray-500">9/10 Correct</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Yes</div>
                    <div className="text-sm text-gray-500">Completion</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderFavouritesView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-700">Favourites</h1>
        <div className="text-sm text-gray-500">
          {Object.values(favorites).reduce((total, category) => total + category.length, 0)} items favorited
        </div>
      </div>

      {/* Favorites Categories */}
      <div className="space-y-8">
        {/* Books */}
        {favorites.books.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <span>Books ({favorites.books.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favorites.books.map((book) => (
                <div
                  key={book.id}
                  className="group cursor-pointer"
                  onClick={() => onOpenBook?.(book.id, 'books')}
                >
                  <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-2 overflow-hidden">
                    <img
                      src={book.cover || 'https://via.placeholder.com/200x300'}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 truncate">{book.title}</h3>
                  <p className="text-xs text-gray-500">{book.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Books */}
        {favorites.videoBooks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <div className="text-red-600 text-sm">📹</div>
              </div>
              <span>Video Books ({favorites.videoBooks.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favorites.videoBooks.map((video) => (
                <div
                  key={video.id}
                  className="group cursor-pointer"
                  onClick={() => onOpenBook?.(video.id, 'videoBooks')}
                >
                  <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-2 overflow-hidden relative">
                    <img
                      src={video.cover || 'https://via.placeholder.com/200x300'}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 truncate">{video.title}</h3>
                  <p className="text-xs text-gray-500">{video.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voice Coach */}
        {favorites.voiceCoach.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="text-green-600 text-sm">🎤</div>
              </div>
              <span>Voice Coach ({favorites.voiceCoach.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favorites.voiceCoach.map((book) => (
                <div
                  key={book.id}
                  className="group cursor-pointer"
                  onClick={() => onOpenBook?.(book.id, 'voiceCoach')}
                >
                  <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-2 overflow-hidden">
                    <img
                      src={book.cover || 'https://via.placeholder.com/200x300'}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 truncate">{book.title}</h3>
                  <p className="text-xs text-gray-500">{book.author}</p>
                  <div className="text-xs text-green-600 font-medium">
                    Score: {book.practiceScore || 'N/A'}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audiobooks */}
        {favorites.audiobooks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <div className="text-purple-600 text-sm">🔊</div>
              </div>
              <span>Audiobooks ({favorites.audiobooks.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favorites.audiobooks.map((book) => (
                <div
                  key={book.id}
                  className="group cursor-pointer"
                  onClick={() => onOpenBook?.(book.id, 'audiobooks')}
                >
                  <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-2 overflow-hidden">
                    <img
                      src={book.cover || 'https://via.placeholder.com/200x300'}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 truncate">{book.title}</h3>
                  <p className="text-xs text-gray-500">{book.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Read to Me */}
        {favorites.readToMe.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <div className="text-pink-600 text-sm">📖</div>
              </div>
              <span>Read to Me ({favorites.readToMe.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favorites.readToMe.map((book) => (
                <div
                  key={book.id}
                  className="group cursor-pointer"
                  onClick={() => onOpenBook?.(book.id, 'readToMe')}
                >
                  <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-2 overflow-hidden">
                    <img
                      src={book.cover || 'https://via.placeholder.com/200x300'}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 truncate">{book.title}</h3>
                  <p className="text-xs text-gray-500">{book.author}</p>
                  <div className="text-xs text-pink-600 font-medium">
                    Progress: {book.progress || 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {Object.values(favorites).every(category => category.length === 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No favorites yet</h3>
            <p className="text-gray-500 mb-6">
              Start exploring books and click the heart icon to add them to your favorites!
            </p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Explore Books
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderAccountView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-700">Progress</h1>
          <p className="text-gray-500">My Account</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value="Denial"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Birthday</label>
              <input
                type="text"
                value="01/01/2019"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
            <input
              type="email"
              value="denialsmom@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value="••••••••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <div className="flex items-center space-x-3 px-4 py-3 border border-gray-300 rounded-lg">
              <span className="text-2xl">🇺🇸</span>
              <span className="text-gray-700">English</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subscription</label>
            <div className="flex space-x-3">
              <button className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium">
                Cancel subscription
              </button>
              <button className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium">
                Change subscription
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delete Account</label>
            <button className="px-6 py-3 bg-gray-400 text-white rounded-lg font-medium">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Bottom Background Image */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-64 bg-no-repeat bg-bottom bg-contain opacity-20 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${adorableBabyAnimals})`,
          backgroundSize: 'contain',
          backgroundPosition: 'bottom center'
        }}
      ></div>
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>

            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Settings className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentView === 'progress' && renderProgressView()}
            {currentView === 'activity' && renderActivityView()}
            {currentView === 'favourites' && renderFavouritesView()}
            {currentView === 'account' && renderAccountView()}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-8 relative">
              {/* Fun Animal Badge - positioned at upper right corner of entire sidebar box */}
              <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden z-10">
                <img
                  src={cuteAnimalsCircleBadge}
                  alt="Animal Friends Badge"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* User Avatar */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-5xl">{currentUser?.avatar || '🐶'}</span>
                </div>
                <button
                  onClick={handleOpenAvatarSelector}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-1 mb-3 font-medium"
                >
                  Change Avatar
                </button>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center justify-center space-x-2">
                  <span>{currentUser?.name || 'User'}</span>
                  <span className="text-lg">🌟</span>
                </h3>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">Reading Star</span>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="space-y-2">
                <button
                  onClick={() => setCurrentView('progress')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${currentView === 'progress'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <div className={`w-3 h-3 rounded-full ${currentView === 'progress' ? 'bg-white' : 'bg-gray-400'
                    }`}></div>
                  <span className="font-medium">Progress</span>
                </button>

                <button
                  onClick={() => setCurrentView('activity')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors relative ${currentView === 'activity'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <div className={`w-3 h-3 rounded-full ${currentView === 'activity' ? 'bg-white' : 'bg-gray-400'
                    }`}></div>
                  <span className="font-medium">Activity</span>
                  <div className="absolute right-3 top-3 w-2 h-2 bg-red-500 rounded-full"></div>
                </button>

                <button
                  onClick={() => setCurrentView('favourites')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${currentView === 'favourites'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <div className={`w-3 h-3 rounded-full ${currentView === 'favourites' ? 'bg-white' : 'bg-gray-400'
                    }`}></div>
                  <span className="font-medium">Favourites</span>
                </button>

                <button
                  onClick={() => setCurrentView('account')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${currentView === 'account'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <div className={`w-3 h-3 rounded-full ${currentView === 'account' ? 'bg-white' : 'bg-gray-400'
                    }`}></div>
                  <span className="font-medium">My Account</span>
                </button>
              </nav>

              {/* Logout Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={onLogout}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Selector Popup - Inside UserPortal */}
      {showAvatarSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Choose Your Avatar</h2>
              <button
                onClick={() => setShowAvatarSelector(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <span className="text-gray-600 text-xl">×</span>
              </button>
            </div>
            
            <p className="text-gray-600 text-center mb-8">
              Pick your favorite animal friend to represent you!
            </p>
            
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-4 mb-8">
              {avatarOptions.map((avatar, index) => (
                <button
                  key={index}
                  onClick={() => handleAvatarSelect(avatar)}
                  className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl transition-all duration-300 hover:scale-110 hover:shadow-lg ${
                    selectedAvatar === avatar
                      ? 'border-pink-400 bg-pink-50 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
            
            <div className="text-center space-x-4">
              <button
                onClick={() => setShowAvatarSelector(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-300 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAvatarChange}
                disabled={!selectedAvatar}
                className={`px-8 py-3 font-bold rounded-2xl transition-all duration-300 shadow-lg ${
                  selectedAvatar
                    ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white hover:from-pink-500 hover:to-purple-500'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}