import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Heart, Settings, LogOut, Shield } from 'lucide-react';
import { useUserStats } from '../contexts/UserStatsContext';
import { useReadingHistory } from '../hooks/useReadingHistory';
import { TimePeriod } from '../api/readingHistory';
import { supabase } from '../lib/supabase';
import { ParentalControlsSettings } from './library/ParentalControlsSettings';
import cuteAnimalsGroup from '../assets/cute-animals-group.png';
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

export default function UserPortal({ onBack, onLogout, favorites, onOpenBook, currentUser, onAvatarChange }: UserPortalProps) {
  const { getProgressBySection } = useUserStats();
  
  // State declarations - must come before hooks that use them
  const [currentView, setCurrentView] = useState<'progress' | 'history' | 'favourites' | 'account'>('progress');
  const [progressTab, setProgressTab] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [historyPeriod, setHistoryPeriod] = useState<TimePeriod>('weekly');
  const [historyDate, setHistoryDate] = useState<Date>(new Date());
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [showParentalControls, setShowParentalControls] = useState(false);

  // Reading history for History table view
  const {
    history: historyTableData,
    stats: historyTableStats,
    loading: historyTableLoading,
    setTimePeriod: setHistoryTablePeriod,
    setCurrentDate: setHistoryTableDate
  } = useReadingHistory({
    userId: currentUser?.id || null,
    timePeriod: historyPeriod,
    currentDate: historyDate,
    autoFetch: true
  });

  // Update history table period when historyPeriod changes
  useEffect(() => {
    setHistoryTablePeriod(historyPeriod);
  }, [historyPeriod, setHistoryTablePeriod]);

  // Update history table date when historyDate changes
  useEffect(() => {
    setHistoryTableDate(historyDate);
  }, [historyDate, setHistoryTableDate]);

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

  const renderProgressView = () => {
    // Get current stats based on selected tab and section
    const currentStats = getProgressBySection(selectedSection, progressTab);
    
    const progressData: ProgressData = {
      library: {
        completedBooks: currentStats.booksCompleted,
        hoursSpent: formatTime(currentStats.timeSpent),
        pagesRead: currentStats.pagesRead
      }
    };

    return (
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
  };

  const renderHistoryView = () => {
    // Helper function to navigate time periods
    const navigatePeriod = (direction: 'prev' | 'next') => {
      const newDate = new Date(historyDate);
      
      switch (historyPeriod) {
        case 'daily':
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
          break;
        case 'weekly':
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
          break;
        case 'monthly':
          newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
          break;
        case 'all':
          // No navigation for "all time"
          return;
      }
      
      setHistoryDate(newDate);
    };

    // Format date range display
    const getDateRangeDisplay = () => {
      const date = historyDate;
      
      switch (historyPeriod) {
        case 'daily':
          return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'weekly': {
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        case 'monthly':
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        case 'all':
          return 'All Time';
        default:
          return '';
      }
    };

    // Use stats from history table hook
    const periodStats = {
      books: {
        totalPages: historyTableStats?.books.totalPages || 0,
        avgReadingLevel: historyTableStats?.books.avgReadingLevel || 0,
        count: historyTableStats?.books.uniqueBooksRead || 0
      },
      readToMe: {
        totalPages: historyTableStats?.readToMe.totalPages || 0,
        avgReadingLevel: historyTableStats?.readToMe.avgReadingLevel || 0,
        count: historyTableStats?.readToMe.uniqueBooksRead || 0
      },
      audiobooks: {
        totalMinutes: historyTableStats?.audiobooks.totalMinutes || 0,
        avgReadingLevel: historyTableStats?.audiobooks.avgReadingLevel || 0,
        count: historyTableStats?.audiobooks.uniqueAudiobooksListened || 0
      },
      videos: {
        totalMinutes: historyTableStats?.videos.totalMinutesWatched || 0,
        count: historyTableStats?.videos.totalVideosWatched || 0
      },
      voiceCoach: {
        totalMinutes: historyTableStats?.voiceCoach?.totalMinutes || 0,
        avgScore: historyTableStats?.voiceCoach?.avgScore || 0,
        count: historyTableStats?.voiceCoach?.sessionsCompleted || 0
      }
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-700">Reading History</h1>
        </div>

        {/* Time Period Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Time Period</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setHistoryPeriod('daily');
                setHistoryDate(new Date());
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                historyPeriod === 'daily'
                  ? 'bg-gradient-to-r from-[#d75e9c] to-[#c54d8a] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📅 Daily
            </button>
            <button
              onClick={() => {
                setHistoryPeriod('weekly');
                setHistoryDate(new Date());
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                historyPeriod === 'weekly'
                  ? 'bg-gradient-to-r from-[#d75e9c] to-[#c54d8a] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Weekly
            </button>
            <button
              onClick={() => {
                setHistoryPeriod('monthly');
                setHistoryDate(new Date());
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                historyPeriod === 'monthly'
                  ? 'bg-gradient-to-r from-[#d75e9c] to-[#c54d8a] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📆 Monthly
            </button>
            <button
              onClick={() => {
                setHistoryPeriod('all');
                setHistoryDate(new Date());
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                historyPeriod === 'all'
                  ? 'bg-gradient-to-r from-[#d75e9c] to-[#c54d8a] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌍 All Time
            </button>
          </div>
        </div>

        {/* Time Navigation */}
        {historyPeriod !== 'all' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigatePeriod('prev')}
                className="px-4 py-2 bg-gradient-to-r from-[#a1ced2] to-[#8fc0c5] hover:from-[#8fc0c5] hover:to-[#7db0b5] text-white rounded-lg font-medium transition-colors shadow-md"
              >
                ← Previous
              </button>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800">{getDateRangeDisplay()}</div>
                <div className="text-sm text-gray-500">
                  {historyPeriod === 'daily' && 'Daily View'}
                  {historyPeriod === 'weekly' && 'Weekly View'}
                  {historyPeriod === 'monthly' && 'Monthly View'}
                </div>
              </div>
              <button
                onClick={() => navigatePeriod('next')}
                disabled={historyDate >= new Date()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-md ${
                  historyDate >= new Date()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#a1ced2] to-[#8fc0c5] hover:from-[#8fc0c5] hover:to-[#7db0b5] text-white'
                }`}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Period Summary Cards */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Period Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Books Summary */}
            <div className="bg-gradient-to-br from-[#a1ced2]/20 to-[#8fc0c5]/30 rounded-xl p-5 border-2 border-[#a1ced2]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#a1ced2] to-[#8fc0c5] rounded-lg flex items-center justify-center text-white text-xl shadow-md">
                  📚
                </div>
                <h4 className="font-bold text-gray-800">Books</h4>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{periodStats.books.totalPages}</span> pages read
                </p>
                <p className="text-sm text-gray-700">
                  Average AR Level: <span className="font-semibold">{periodStats.books.avgReadingLevel.toFixed(1)}</span>
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{periodStats.books.count}</span> books
                </p>
              </div>
            </div>

            {/* Audiobooks Summary */}
            <div className="bg-gradient-to-br from-[#d75e9c]/20 to-[#c54d8a]/30 rounded-xl p-5 border-2 border-[#d75e9c]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#d75e9c] to-[#c54d8a] rounded-lg flex items-center justify-center text-white text-xl shadow-md">
                  🎧
                </div>
                <h4 className="font-bold text-gray-800">Audiobooks</h4>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{Math.floor(periodStats.audiobooks.totalMinutes / 60)}h {periodStats.audiobooks.totalMinutes % 60}m</span> listened
                </p>
                <p className="text-sm text-gray-700">
                  Average AR Level: <span className="font-semibold">{periodStats.audiobooks.avgReadingLevel.toFixed(1)}</span>
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{periodStats.audiobooks.count}</span> audiobooks
                </p>
              </div>
            </div>

            {/* Read to Me Summary */}
            <div className="bg-gradient-to-br from-[#d75e9c]/20 to-[#c54d8a]/30 rounded-xl p-5 border-2 border-[#d75e9c]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#d75e9c] to-[#c54d8a] rounded-lg flex items-center justify-center text-white text-xl shadow-md">
                  📖
                </div>
                <h4 className="font-bold text-gray-800">Read to Me</h4>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{periodStats.readToMe.totalPages}</span> pages read
                </p>
                <p className="text-sm text-gray-700">
                  Average AR Level: <span className="font-semibold">{periodStats.readToMe.avgReadingLevel.toFixed(1)}</span>
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{periodStats.readToMe.count}</span> books
                </p>
              </div>
            </div>

            {/* Videos Summary */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl p-5 border-2 border-yellow-400">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-lg flex items-center justify-center text-white text-xl shadow-md">
                  📹
                </div>
                <h4 className="font-bold text-gray-800">Videos</h4>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{periodStats.videos.count}</span> videos watched
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{Math.floor(periodStats.videos.totalMinutes / 60)}h {periodStats.videos.totalMinutes % 60}m</span> watched
                </p>
              </div>
            </div>

            {/* Voice Coach Summary */}
            <div className="bg-gradient-to-br from-[#a1ced2]/20 to-[#8fc0c5]/30 rounded-xl p-5 border-2 border-[#a1ced2]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#a1ced2] to-[#8fc0c5] rounded-lg flex items-center justify-center text-white text-xl shadow-md">
                  🎤
                </div>
                <h4 className="font-bold text-gray-800">Voice Coach</h4>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{periodStats.voiceCoach.count}</span> sessions
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{Math.floor(periodStats.voiceCoach.totalMinutes / 60)}h {periodStats.voiceCoach.totalMinutes % 60}m</span> practiced
                </p>
                {periodStats.voiceCoach.avgScore > 0 && (
                  <p className="text-sm text-gray-700">
                    Avg Score: <span className="font-semibold">{periodStats.voiceCoach.avgScore.toFixed(0)}%</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {historyTableLoading ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading history...</h3>
                <p className="text-gray-500">Fetching your reading records</p>
              </div>
            ) : historyTableData.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Reading Level (AR)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Pages Read / Time Listened</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Genre</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Book / Video Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historyTableData.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(entry.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {entry.readingLevel ? entry.readingLevel.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {entry.bookType === 'audiobook' || entry.bookType === 'video'
                          ? `${Math.floor(entry.minutesListened / 60)}h ${entry.minutesListened % 60}m`
                          : `${entry.pagesRead} pages`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {entry.genre || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => onOpenBook?.(entry.bookId, entry.bookType === 'book' ? 'books' : entry.bookType === 'audiobook' ? 'audiobooks' : entry.bookType === 'read-to-me' ? 'readToMe' : 'videoBooks')}
                          className="text-[#d75e9c] hover:text-[#c54d8a] hover:underline font-medium text-left"
                        >
                          {entry.bookTitle}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No history found</h3>
                <p className="text-gray-500">
                  No reading activity for this time period yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Note:</span> To manage your subscription or delete your account, please visit <span className="font-semibold">Parental Controls</span> in the sidebar.
          </p>
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
            {currentView === 'history' && renderHistoryView()}
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
                  onClick={() => setCurrentView('history')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${currentView === 'history'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <div className={`w-3 h-3 rounded-full ${currentView === 'history' ? 'bg-white' : 'bg-gray-400'
                    }`}></div>
                  <span className="font-medium">History</span>
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

                <button
                  onClick={() => setShowParentalControls(true)}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors text-gray-600 hover:bg-gray-100"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Parental Controls</span>
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

      {/* Parental Controls Settings */}
      {showParentalControls && (
        <ParentalControlsSettings
          onClose={() => setShowParentalControls(false)}
        />
      )}
    </div>
  );
}