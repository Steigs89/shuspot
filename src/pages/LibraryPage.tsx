import { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import LibraryHeader from '../components/library/LibraryHeader';
import NewThreeTierNavigation from '../components/library/NewThreeTierNavigation';
import MainGallery from '../components/library/MainGallery';
import FirstLoginModal from '../components/library/FirstLoginModal';
import { ParentalSettings } from '../types/library';
import { supabase } from '../lib/supabase';

export default function LibraryPage() {
  const {
    selectedGrade,
    selectedMediaType,
    selectedGenre,
    isFirstLogin,
    setReadingSystem,
    setIsFirstLogin,
    setMediaType
  } = useNavigation();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [parentalSettings, setParentalSettings] = useState<ParentalSettings>({
    contentFiltering: {
      maxGradeLevel: '6',
      allowedGenres: [],
      blockedGenres: []
    },
    timeLimits: {
      enabled: false,
      dailyMinutes: 60,
      weeklyMinutes: 420
    },
    readingLevelRestrictions: {
      enabled: false,
      minLevel: 'K',
      maxLevel: '6'
    },
    pinProtection: {
      enabled: true,
      pinHash: '1234' // Demo PIN
    },
    videoControls: {
      dailyVideoLimit: false,
      dailyVideoMinutes: 40,
      restrictedHours: false,
      restrictedStartHour: 22,
      restrictedEndHour: 6,
      ageVerification: false,
      antiAddiction: false,
      antiAddictionInterval: 20,
      maxContentRating: 'G',
      requireApproval: false,
      blockedChannels: [],
      allowedChannels: []
    }
  });

  // Load user profile and parental settings from Supabase
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser({
            name: user.user_metadata?.name || 'Student',
            avatar: user.user_metadata?.avatar || '🐶',
            email: user.email
          });
          
          if (user.user_metadata?.parental_settings) {
            setParentalSettings(user.user_metadata.parental_settings);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Handle logo click - reset to books view
  const handleLogoClick = () => {
    // Reset to books media type to show normal library view
    console.log('Logo clicked - resetting to books');
    setMediaType('books');
  };

  // Debug: Log current media type
  console.log('LibraryPage - selectedMediaType:', selectedMediaType);

  // Handle search
  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search query:', query);
  };

  // Handle avatar click - TODO: Navigate to UserPortal or implement new behavior
  const handleAvatarClick = () => {
    // For now, do nothing - UserPortal should be opened from App.tsx
    console.log('Avatar clicked - UserPortal should be opened from parent component');
  };

  // Handle book click - navigate to book player
  const handleBookClick = (bookId: string) => {
    window.location.href = `/book/${bookId}`;
  };

  // Handle My Library click
  const handleMyLibraryClick = () => {
    // Navigate to My Library page or show My Library modal
    console.log('My Library clicked from header');
    // You can add navigation logic here
  };

  // Handle genre click - navigate to single genre view
  const handleGenreClick = (genreId: string) => {
    window.location.href = `/library/genre/${genreId}`;
  };

  // Handle first login completion
  const handleFirstLoginComplete = async (system: string) => {
    await setReadingSystem(system as any);
    setIsFirstLogin(false);
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <LibraryHeader
        onLogoClick={handleLogoClick}
        onSearch={handleSearch}
        onAvatarClick={handleAvatarClick}
        onMyLibraryClick={handleMyLibraryClick}
        userName="Student"
        showMobileNavigation={true}
      />

      {/* Three-Tier Navigation (hidden for videos and video-books) */}
      {selectedMediaType !== 'videos' && selectedMediaType !== 'video-books' && (
        <NewThreeTierNavigation />
      )}

      {/* Main Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MainGallery
          grade={selectedGrade}
          mediaType={selectedMediaType}
          genre={selectedGenre}
          onBookClick={handleBookClick}
          onGenreClick={handleGenreClick}
        />
      </div>

      {/* First Login Modal */}
      <FirstLoginModal
        isOpen={isFirstLogin}
        onComplete={handleFirstLoginComplete}
      />
    </div>
  );
}
