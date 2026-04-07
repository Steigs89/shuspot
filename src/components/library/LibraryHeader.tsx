import { useState, useEffect } from 'react';
import { Search, User, ChevronDown, Settings } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { Z_INDEX, SEARCH_DEBOUNCE, GRADE_LEVELS, MEDIA_TYPES } from '../../constants/library';
import { useTranslation } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useGenres } from '../../hooks/useGenres';
import appLogo from '../../assets/SS Logo Final Black With Color Spots HR.png';
import LanguageSwitch from '../LanguageSwitch';
import ReadingSystemModal from './ReadingSystemModal';

interface LibraryHeaderProps {
  onLogoClick: () => void;
  onSearch: (query: string) => void;
  onAvatarClick: () => void;
  onMyLibraryClick?: () => void; // Add My Library click handler
  userAvatar?: string;
  userName?: string;
  showMobileNavigation?: boolean; // New prop to control mobile navigation
}

export default function LibraryHeader({
  onLogoClick,
  onSearch,
  onAvatarClick,
  onMyLibraryClick,
  userAvatar,
  userName = 'User',
  showMobileNavigation = false
}: LibraryHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE);
  const { t, translateGenre } = useTranslation();

  // Navigation state for mobile
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showReadingSystemModal, setShowReadingSystemModal] = useState(false);

  // Get navigation context
  const {
    selectedGrade,
    selectedMediaType,
    selectedGenre,
    readingSystem,
    setGrade,
    setMediaType,
    setGenre,
    setReadingSystem
  } = useNavigation();

  // Fetch genres for mobile navigation
  const { genres } = useGenres({
    popular: true,
    limit: 20
  });

  // Trigger search when debounced value changes
  useEffect(() => {
    if (debouncedSearch) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, onSearch]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowGradeDropdown(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <header
      className="sticky top-0 bg-white shadow-sm border-b border-gray-200"
      style={{ zIndex: Z_INDEX.HEADER }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <button
            onClick={onLogoClick}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg"
            style={{ '--tw-ring-color': '#d8609c' } as any}
            aria-label="Go to homepage"
          >
            <img
              src={appLogo}
              alt="ShuSpot Logo"
              className="h-8 w-auto md:h-10"
            />
          </button>

          {/* Search Bar - Hidden on mobile, shown on tablet+ */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md mx-8"
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t('header.search.placeholder')}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': '#d8609c' } as any}
                aria-label={t('header.search.placeholder')}
              />
            </div>
          </form>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-3">
            {/* Language Switch - Hidden on mobile, shown on tablet+ */}
            <LanguageSwitch className="hidden md:flex" />
            
            {/* Mobile Language Switch - Show on mobile only */}
            <LanguageSwitch className="md:hidden" size="sm" />
            
            {/* My Library Button - Mobile only */}
            <button
              onClick={onMyLibraryClick}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              style={{ color: '#d8609c' }}
              aria-label="My Library"
            >
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            </button>
            
            {/* User Avatar */}
            <button
              onClick={onAvatarClick}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-full p-1"
              style={{ '--tw-ring-color': '#d8609c' } as any}
              aria-label={`${t('header.user.profile')}: ${userName}`}
            >
              {userAvatar ? (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: '#d8609c' }}>
                  {userAvatar}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#d8609c' }}>
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
              <span className="hidden lg:block text-sm font-bold" style={{ color: '#a1ced3' }}>
                {t('header.hello')}, {userName}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar and Navigation */}
        <div className="md:hidden pb-3 space-y-3">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t('header.search.mobile.placeholder')}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#d8609c' } as any}
                aria-label={t('header.search.mobile.placeholder')}
              />
            </div>
          </form>

          {/* Mobile Navigation - Only show if enabled */}
          {showMobileNavigation && (
            <div className="space-y-3 pt-2 border-t border-gray-200">
              {/* Grade Level Selector */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGradeDropdown(!showGradeDropdown);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#d8609c' } as any}
                >
                  <span className="text-sm font-medium">
                    {t('navigation.grade.level')}: {GRADE_LEVELS.find(g => g.value === selectedGrade)?.label || selectedGrade}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showGradeDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showGradeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {GRADE_LEVELS.map((grade) => (
                      <button
                        key={grade.value}
                        onClick={() => {
                          setGrade(grade.value);
                          setShowGradeDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          selectedGrade === grade.value ? 'font-semibold' : ''
                        }`}
                        style={{ 
                          color: selectedGrade === grade.value ? '#d8609c' : 'inherit',
                          backgroundColor: selectedGrade === grade.value ? '#fdf2f8' : 'transparent'
                        }}
                      >
                        {grade.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Media Type Selector */}
              <div className="flex flex-wrap gap-2">
                {MEDIA_TYPES.map((mediaType) => (
                  <button
                    key={mediaType.id}
                    onClick={() => setMediaType(mediaType.id as any)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedMediaType === mediaType.id
                        ? 'text-white shadow-md'
                        : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedMediaType === mediaType.id ? '#d8609c' : undefined
                    }}
                  >
                    <span className="text-lg">{mediaType.icon}</span>
                    <span>{t(`media.${mediaType.id}`, mediaType.id)}</span>
                  </button>
                ))}
              </div>

              {/* Genre Selector */}
              <button
                onClick={() => setShowGenreModal(true)}
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#d8609c' } as any}
              >
                <span className="text-sm font-medium">
                  {t('navigation.genre')}: {selectedGenre === 'All' ? t('navigation.all.genres') : translateGenre(selectedGenre)}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Reading System Settings */}
              <button
                onClick={() => setShowReadingSystemModal(true)}
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#d8609c' } as any}
              >
                <span className="text-sm font-medium">
                  ⚙️ {t('navigation.change.reading.system')} ({readingSystem})
                </span>
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Genre Selection Modal - Mobile */}
      {showGenreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{t('navigation.select.genre')}</h2>
                <button
                  onClick={() => setShowGenreModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <button
                onClick={() => {
                  setGenre('All');
                  setShowGenreModal(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedGenre === 'All' ? 'font-semibold' : 'hover:bg-gray-50'
                }`}
                style={{
                  color: selectedGenre === 'All' ? '#d8609c' : 'inherit',
                  backgroundColor: selectedGenre === 'All' ? '#fdf2f8' : 'transparent'
                }}
              >
                <div className="text-4xl mb-3">📚</div>
                <div className="text-sm font-semibold">{t('navigation.all.genres')}</div>
              </button>
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => {
                    setGenre(genre.id);
                    setShowGenreModal(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedGenre === genre.id ? 'font-semibold' : 'hover:bg-gray-50'
                  }`}
                  style={{
                    color: selectedGenre === genre.id ? '#d8609c' : 'inherit',
                    backgroundColor: selectedGenre === genre.id ? '#fdf2f8' : 'transparent'
                  }}
                >
                  <div className="text-4xl mb-3">{genre.icon}</div>
                  <div className="text-sm font-semibold">{translateGenre(genre.name)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reading System Modal */}
      <ReadingSystemModal
        isOpen={showReadingSystemModal}
        onClose={() => setShowReadingSystemModal(false)}
        currentSystem={readingSystem}
        onSystemChange={setReadingSystem}
      />
    </header>
  );
}
