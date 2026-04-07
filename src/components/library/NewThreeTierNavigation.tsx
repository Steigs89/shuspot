import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Sparkles, X, ChevronDown } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useGenres } from '../../hooks/useGenres';
import { useTranslation } from '../../contexts/LanguageContext';
import { useParentalControlsContext } from '../../contexts/ParentalControlsContext';
import { GRADE_LEVELS, MEDIA_TYPES, MEDIA_TYPES_WITHOUT_GENRES } from '../../constants/library';
import { MediaType } from '../../contexts/NavigationContext';
import ReadingSystemModal from './ReadingSystemModal';
import NewTierButton from './NewTierButton';

export default function NewThreeTierNavigation() {
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

  const { controls } = useParentalControlsContext();
  useTranslation(); // Keep context active for future use
  const [showReadingSystemModal, setShowReadingSystemModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const hasScrolled = useRef(false);
  const lastScrollY = useRef(0);
  const lastStateChange = useRef(0);

  // Fetch genres for Tier 3
  const { genres } = useGenres({
    popular: true,
    limit: 10
  });

  // Stable scroll behavior with proper direction tracking
  useEffect(() => {
    let scrollAccumulator = 0;
    let lastDirection: 'up' | 'down' | null = null;
    let directionConfidence = 0; // Track how confident we are in the direction
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const now = Date.now();
      const timeSinceChange = now - lastStateChange.current;
      
      // Strong cooldown after state changes
      if (timeSinceChange < 1200) {
        lastScrollY.current = currentScrollY;
        return;
      }
      
      // At top - always show full
      if (currentScrollY < 30) {
        if (isMinimized) {
          setIsMinimized(false);
          lastStateChange.current = now;
          scrollAccumulator = 0;
          lastDirection = null;
          directionConfidence = 0;
        }
        lastScrollY.current = currentScrollY;
        return;
      }
      
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      // Ignore tiny movements
      if (Math.abs(scrollDelta) < 3) {
        return;
      }
      
      // Determine current direction
      const currentDirection = scrollDelta > 0 ? 'down' : 'up';
      
      // If direction changed
      if (lastDirection && lastDirection !== currentDirection) {
        // Only reset if we're confident in the new direction (not just a tiny bounce)
        if (Math.abs(scrollDelta) > 10) {
          scrollAccumulator = 0;
          directionConfidence = 0;
        } else {
          // Small counter-movement, ignore it and keep accumulating in original direction
          lastScrollY.current = currentScrollY;
          return;
        }
      }
      
      // Build confidence in the direction
      if (lastDirection === currentDirection) {
        directionConfidence++;
      } else {
        directionConfidence = 1;
      }
      
      // Accumulate scroll in current direction
      scrollAccumulator += scrollDelta;
      lastDirection = currentDirection;
      lastScrollY.current = currentScrollY;
      
      // Only trigger state change after significant accumulated scroll AND confidence
      if (!isMinimized && scrollAccumulator > 150 && currentScrollY > 350 && directionConfidence >= 3) {
        // Scrolling down - minimize
        setIsMinimized(true);
        lastStateChange.current = now;
        scrollAccumulator = 0;
        lastDirection = null;
        directionConfidence = 0;
      } else if (isMinimized && scrollAccumulator < -80 && directionConfidence >= 2) {
        // Scrolling up - show (more forgiving threshold and confidence)
        setIsMinimized(false);
        lastStateChange.current = now;
        scrollAccumulator = 0;
        lastDirection = null;
        directionConfidence = 0;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMinimized]);

  // Check if current media type should show genre tier
  const showGenreTier = !MEDIA_TYPES_WITHOUT_GENRES.includes(selectedMediaType);

  // Auto-scroll when all three selections are made
  useEffect(() => {
    if (selectedGrade && selectedMediaType && selectedGenre !== 'All' && !hasScrolled.current) {
      hasScrolled.current = true;
      
      setTimeout(() => {
        window.scrollBy({
          top: 200,
          behavior: 'smooth'
        });
      }, 500);
    }
    
    if (!selectedGrade || !selectedMediaType || selectedGenre === 'All') {
      hasScrolled.current = false;
    }
  }, [selectedGrade, selectedMediaType, selectedGenre]);

  const handleSettingsClick = () => {
    setShowReadingSystemModal(true);
  };

  const handleReadingSystemChange = (system: string) => {
    setReadingSystem(system as any);
    setShowReadingSystemModal(false);
  };

  const handleSurprise = () => {
    // Use filtered arrays for surprise selection (Requirement 5.6)
    const randomGrade = filteredLevels.length > 0
      ? filteredLevels[Math.floor(Math.random() * filteredLevels.length)].value
      : GRADE_LEVELS[0].value;
    const randomMediaType = filteredFormats.length > 0
      ? filteredFormats[Math.floor(Math.random() * filteredFormats.length)].value
      : MEDIA_TYPES[0].id;
    const randomGenre = filteredTopics.length > 0 
      ? filteredTopics[Math.floor(Math.random() * filteredTopics.length)].value 
      : 'All';
    
    setGrade(randomGrade);
    setMediaType(randomMediaType as MediaType);
    setGenre(randomGenre);
  };

  const handleClear = () => {
    setGrade('1');
    setMediaType('books');
    setGenre('All');
  };

  // Map grade levels to the new format
  const levels = GRADE_LEVELS.map((level, index) => ({
    value: level.value,
    label: level.label,
    color: index % 2 === 0 ? 'from-[#d75e9c] to-[#c54d8a]' : 'from-[#a1ced2] to-[#8fc0c5]',
    bgColor: index % 2 === 0 ? 'bg-pink-50' : 'bg-teal-50',
    borderColor: index % 2 === 0 ? 'border-[#d75e9c]' : 'border-[#a1ced2]'
  }));

  // Filter grade levels based on parental controls (Requirement 5.1, 5.5, 5.6)
  const filteredLevels = levels.filter(level => {
    if (!controls?.restricted_grade_levels) return true;
    return !controls.restricted_grade_levels.includes(level.value);
  });

  // Map media types to the new format
  const formats = MEDIA_TYPES.map((type, index) => ({
    value: type.id,
    icon: getMediaTypeEmoji(type.id),
    labelEn: type.name,
    color: index % 2 === 0 ? 'from-[#d75e9c] to-[#c54d8a]' : 'from-[#a1ced2] to-[#8fc0c5]',
    bgColor: index % 2 === 0 ? 'bg-pink-50' : 'bg-teal-50',
    borderColor: index % 2 === 0 ? 'border-[#d75e9c]' : 'border-[#a1ced2]',
    image: getMediaTypeImage(type.id)
  }));

  // Filter media types based on parental controls (Requirement 5.1, 5.5)
  const filteredFormats = formats.filter(format => {
    if (!controls?.blocked_media_types) return true;
    return !controls.blocked_media_types.includes(format.value);
  });

  // Map genres to the new format with images
  const topics = genres.map((genre, index) => ({
    value: genre.name,
    icon: getGenreEmoji(genre.name),
    labelEn: genre.name,
    color: index % 2 === 0 ? 'from-[#d75e9c] to-[#c54d8a]' : 'from-[#a1ced2] to-[#8fc0c5]',
    image: getGenreImage(genre.name)
  }));

  // Filter genres based on parental controls (Requirement 5.1, 5.5)
  const filteredTopics = topics.filter(topic => {
    if (!controls?.blocked_genres) return true;
    return !controls.blocked_genres.includes(topic.value);
  });

  return (
    <>
      {/* Fun minimized tab - always visible at top, shows when dock is hidden */}
      <AnimatePresence mode="wait">
        {isMinimized && (
          <motion.div
            key="minimized-tab"
            initial={{ y: -100, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.5
              }
            }}
            exit={{ 
              y: -100, 
              opacity: 0,
              transition: {
                duration: 0.25,
                ease: "easeInOut"
              }
            }}
            className="sticky left-0 right-0 z-40 cursor-pointer"
            style={{ top: '0px' }}
            onClick={() => setIsMinimized(false)}
          >
            <div className="bg-gradient-to-r from-[#d75e9c] via-[#a1ced2] to-[#d75e9c] shadow-lg">
              <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
                <span className="text-3xl sm:text-4xl animate-bounce">📚</span>
                <span className="text-white font-black text-base sm:text-lg md:text-xl drop-shadow-md">Tap to see menu!</span>
                <span className="text-3xl sm:text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
      {!isMinimized && (
        <motion.div
          key="dock"
          initial={{ y: -100, opacity: 0 }}
          animate={{ 
            y: 0,
            opacity: 1,
            transition: {
              type: "spring",
              stiffness: 400,
              damping: 30,
              mass: 0.5
            }
          }}
          exit={{ 
            y: -100,
            opacity: 0,
            transition: {
              duration: 0.25,
              ease: "easeInOut"
            }
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => {
            // Simple drag to dismiss - swipe up to hide
            if (info.velocity.y < -300) {
              setIsMinimized(true);
            }
          }}
          className="sticky left-0 right-0 z-50 bg-gradient-to-br from-pink-100 via-pink-50 to-purple-100 shadow-xl border-b border-pink-200 relative"
          style={{ 
            top: '0px',
            maxWidth: '100vw',
            cursor: 'grab'
          }}
        >
        {/* Minimize button - top right corner */}
        <button
          onClick={() => setIsMinimized(true)}
          className="absolute top-2 right-2 z-50 w-8 h-8 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center transition-all hover:scale-110"
          title="Hide menu"
        >
          <ChevronDown className="w-5 h-5 text-gray-700" />
        </button>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Breadcrumb Indicators - Always at top */}
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-200">
          {/* Left side text */}
          <div>
            <h2 className="text-xl font-black text-gray-800">Choose Your Interest</h2>
            <p className="text-base font-bold text-gray-500 mt-1">Pick ① - ② - ③</p>
          </div>
          
          {/* Center - Breadcrumb indicators */}
          <div className="flex items-center gap-3 flex-1 justify-center">
            {/* Level Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d75e9c] to-[#c54d8a] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                ①
              </div>
              {selectedGrade ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`px-3 py-1 bg-gradient-to-br ${filteredLevels.find(l => l.value === selectedGrade)?.color || levels.find(l => l.value === selectedGrade)?.color} border-2 ${filteredLevels.find(l => l.value === selectedGrade)?.borderColor || levels.find(l => l.value === selectedGrade)?.borderColor} rounded-full shadow-sm`}
                >
                  <span className="font-black text-gray-900 text-xs">
                    {filteredLevels.find(l => l.value === selectedGrade)?.label || levels.find(l => l.value === selectedGrade)?.label}
                  </span>
                </motion.div>
              ) : (
                <div className="w-8 h-1 bg-gray-300 rounded-full" />
              )}
            </div>

            <div className="text-gray-400 text-lg">›</div>

            {/* Format Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a1ced2] to-[#8fc0c5] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                ②
              </div>
              {selectedMediaType ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`px-3 py-1 bg-gradient-to-br ${filteredFormats.find(f => f.value === selectedMediaType)?.color || formats.find(f => f.value === selectedMediaType)?.color} border-2 ${filteredFormats.find(f => f.value === selectedMediaType)?.borderColor || formats.find(f => f.value === selectedMediaType)?.borderColor} rounded-full shadow-sm flex items-center gap-1`}
                >
                  <span className="text-sm">{filteredFormats.find(f => f.value === selectedMediaType)?.icon || formats.find(f => f.value === selectedMediaType)?.icon}</span>
                  <span className="font-black text-gray-900 text-xs">
                    {filteredFormats.find(f => f.value === selectedMediaType)?.labelEn || formats.find(f => f.value === selectedMediaType)?.labelEn}
                  </span>
                </motion.div>
              ) : (
                <div className="w-8 h-1 bg-gray-300 rounded-full" />
              )}
            </div>

            <div className="text-gray-400 text-lg">›</div>

            {/* Topic Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d75e9c] to-[#c54d8a] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                ③
              </div>
              {selectedGenre && selectedGenre !== 'All' ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`px-3 py-1 bg-gradient-to-br ${filteredTopics.find(t => t.value === selectedGenre)?.color || topics.find(t => t.value === selectedGenre)?.color || 'from-gray-400 to-gray-500'} border-2 border-gray-400 rounded-full shadow-sm flex items-center gap-1`}
                >
                  <span className="text-sm">{filteredTopics.find(t => t.value === selectedGenre)?.icon || topics.find(t => t.value === selectedGenre)?.icon || '📚'}</span>
                  <span className="font-black text-gray-900 text-xs">
                    {selectedGenre}
                  </span>
                </motion.div>
              ) : (
                <div className="w-8 h-1 bg-gray-300 rounded-full" />
              )}
            </div>
          </div>
          
          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSurprise}
              className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white rounded-full font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Surprise Me
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded-full font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1 border border-gray-200"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>

          {/* Tier 1: Level */}
          <div className="mb-2 bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-[80px]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d75e9c] to-[#c54d8a] text-white flex items-center justify-center font-bold text-xl shadow">
                ①
              </div>
              <h3 className="text-base font-black text-gray-900">Level</h3>
            </div>
            <div className="flex justify-between items-center gap-1.5 flex-1 px-4">
              {/* Settings button */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleSettingsClick}
                className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 border-2 border-gray-400 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-sm"
                title="Reading System Settings"
              >
                <Settings className="w-3.5 h-3.5 text-gray-700" />
              </motion.button>
              {filteredLevels.map((level) => (
                <NewTierButton
                  key={level.value}
                  label={level.label}
                  selected={selectedGrade === level.value}
                  onClick={() => setGrade(level.value)}
                  gradient={level.color}
                  bgColor={level.bgColor}
                  borderColor={level.borderColor}
                  type="pill"
                />
              ))}
            </div>
          </div>
        </div>

          {/* Tier 2: Format */}
          <div className="mb-2 bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-[80px]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a1ced2] to-[#8fc0c5] text-white flex items-center justify-center font-bold text-xl shadow flex-shrink-0">
                ②
              </div>
              <h3 className="text-base font-black text-gray-900">Type</h3>
            </div>
            <div className="flex justify-between items-center gap-2 flex-1 px-4">
              {filteredFormats.map((format) => (
                <NewTierButton
                  key={format.value}
                  icon={format.icon}
                  label={format.labelEn}
                  selected={selectedMediaType === format.value}
                  onClick={() => setMediaType(format.value as MediaType)}
                  gradient={format.color}
                  bgColor={format.bgColor}
                  borderColor={format.borderColor}
                  type="card"
                  image={format.image}
                />
              ))}
            </div>
          </div>
        </div>

          {/* Tier 3: Topic - only show if media type supports genres */}
          {showGenreTier && (
            <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 min-w-[80px]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d75e9c] to-[#c54d8a] text-white flex items-center justify-center font-bold text-xl shadow flex-shrink-0">
                  ③
                </div>
                <h3 className="text-base font-black text-gray-900">Topic</h3>
              </div>
              <div className="flex justify-center gap-3 items-center flex-1 overflow-x-auto pb-2 scrollbar-hide">
                {/* All Topics button */}
                <NewTierButton
                  icon="🌈"
                  label="All Topics"
                  selected={selectedGenre === 'All'}
                  onClick={() => setGenre('All')}
                  gradient="from-purple-500 to-pink-500"
                  type="topic"
                />
                {filteredTopics.map((topic) => (
                  <NewTierButton
                    key={topic.value}
                    icon={topic.icon}
                    label={topic.labelEn}
                    selected={selectedGenre === topic.value}
                    onClick={() => setGenre(topic.value)}
                    gradient={topic.color}
                    type="topic"
                    image={topic.image}
                  />
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
      </motion.div>
      )}
      </AnimatePresence>

      {/* Reading System Modal */}
      <ReadingSystemModal
        isOpen={showReadingSystemModal}
        onClose={() => setShowReadingSystemModal(false)}
        currentSystem={readingSystem}
        onSystemChange={handleReadingSystemChange}
      />
    </>
  );
}

// Helper functions to map data to emojis and images
function getMediaTypeEmoji(typeId: string): string {
  const emojiMap: Record<string, string> = {
    'books': '📚',
    'read-to-me': '📖',
    'audiobooks': '🎧',
    'video-books': '🎬',
    'videos': '📺',
    'comics': '💥',
    'ai-voice': '🎙️',
    'coach': '🎯',
    'downloads': '⬇️'
  };
  return emojiMap[typeId] || '📚';
}

function getMediaTypeImage(typeId: string): string | undefined {
  const imageMap: Record<string, string> = {
    'books': '/Possible Media Type Icons (row 2)/Book-1.png',
    'read-to-me': '/Possible Media Type Icons (row 2)/Read to Me-1.png',
    'audiobooks': '/Possible Media Type Icons (row 2)/Audiobook-1.png',
    'video-books': '/Possible Media Type Icons (row 2)/Videos-1.png',
    'videos': '/Possible Media Type Icons (row 2)/Videos-2.png',
    'comics': '/Possible Media Type Icons (row 2)/Comic Book-1.png',
    'ai-voice': '/Possible Media Type Icons (row 2)/Ai Voice Coach-1.png',
    'coach': '/Possible Media Type Icons (row 2)/Ai Voice Coach-2.png',
    'downloads': '/Possible Media Type Icons (row 2)/Printables:Downloadables-1.png'
  };
  return imageMap[typeId];
}

function getGenreEmoji(genreName: string): string {
  const emojiMap: Record<string, string> = {
    'Animals & Their Habitats': '🦁',
    'Backyard Animals': '🐿️',
    'Baby Animals': '🐣',
    'Sharks, Big Cats, Birds, Snakes, Bugs': '🦈',
    'Cats, Dogs, Pets, Horses': '🐕',
    'Dinosaurs, Fish': '🦕',
    'Plants & Their Environments': '🌱',
    'Weather, Spring, Winter': '⛅',
    'Art, Music, Makerspace': '🎨',
    'Bodies in Motion, Five Senses': '🏃',
    'Healthy Habits': '🥗',
    'Addition & Subtraction, Counting': '🔢',
    'Measuring, Telling Time': '⏰',
    'Learning to Read': '📖',
    'Shapes, Colors, Letters & Numbers': '🔷',
    'Biography, History': '📜',
    'Black History Month, Women\'s History Month': '✊',
    'Native Americans': '🪶',
    'Our Neighborhood': '🏘️',
    'Jobs Around Town': '👷',
    'Economics: Goods & Services': '💰',
    'American Symbols': '🗽',
    'Adventure, Comic Books': '🦸',
    'Fairy Tales, Princesses': '👸',
    'Unicorns, Mythical Creatures': '🦄',
    'Superheroes': '⚡',
    'Space': '🚀',
    'Sports, Soccer': '⚽',
    'Airplanes': '✈️',
    'Boats & Ships': '⛵',
    'Cars & Trucks': '🚗',
    'Cars, Trucks & Trains': '🚂',
    'Trains': '🚂',
    'Bravery, Bullying': '🦁',
    'Friendship, Kindness': '💝',
    'Families': '👨‍👩‍👧‍👦',
    'Grief & Loss': '🕊️',
    'Growth Mindset': '🌟',
    'Identifying Emotions': '😊',
    'Mindfulness': '🧘',
    'Laugh Out Loud': '😂'
  };
  return emojiMap[genreName] || '📚';
}

function getGenreImage(genreName: string): string | undefined {
  // Map genre names to specific icon files
  const imageMap: Record<string, string> = {
    'Animals & Their Habitats': '/Possible Genre Icons (1)/527748d1-6cb6-4f65-a66f-0816aa95c333.png',
    'Backyard Animals': '/Possible Genre Icons (1)/3eee8c52-77dc-4a78-894e-60d7d2b50f8c.png',
    'Baby Animals': '/Possible Genre Icons (1)/ba969b35-9924-434b-9599-a696ed7ca139.png',
    'Sharks, Big Cats, Birds, Snakes, Bugs': '/Possible Genre Icons (1)/8185c32a-39be-4f54-b2c1-4d8d9cf1204a.png',
    'Cats, Dogs, Pets, Horses': '/Possible Genre Icons (1)/cab1ba94-92b0-4b67-ad37-2d9f37a41dbb.png',
    'Dinosaurs, Fish': '/Possible Genre Icons (1)/940c746a-cb30-44e8-b4f3-39e02624b732.png',
    'Plants & Their Environments': '/Possible Genre Icons (1)/b6675d83-fb17-417c-992a-24287a457911.png',
    'Weather, Spring, Winter': '/Possible Genre Icons (1)/c58a8e8e-78d7-4aca-b98a-e7f988dd6448.png',
    'Art, Music, Makerspace': '/Possible Genre Icons (1)/3a46b368-f38a-475c-8569-39daca762081.png',
    'Bodies in Motion, Five Senses': '/Possible Genre Icons (1)/44c3134e-8f42-4856-92e4-9d69e434f33c.png',
    'Healthy Habits': '/Possible Genre Icons (1)/ba5fb454-48fe-409a-955d-7f18e510b47b.png',
    'Addition & Subtraction, Counting': '/Possible Genre Icons (1)/2ef0c4bb-8ffe-4f6a-ad56-a075f8aa205d.png',
    'Measuring, Telling Time': '/Possible Genre Icons (1)/829f0f67-c045-4cb8-891b-a1d6812ad51c.png',
    'Learning to Read': '/Possible Genre Icons (1)/155ee023-12fc-45eb-9eda-7b5b33f2c7c1.png',
    'Shapes, Colors, Letters & Numbers': '/Possible Genre Icons (1)/c2504452-cb1a-429e-955a-f9b587b483af.png',
    'Biography, History': '/Possible Genre Icons (1)/1afb0c25-6bc0-4101-91f7-192c3d69d6ee.png',
    'Black History Month, Women\'s History Month': '/Possible Genre Icons (1)/ad1a392d-2c4f-4109-8c78-4e685559a565.png',
    'Native Americans': '/Possible Genre Icons (1)/0dd87882-96d9-4ece-adc4-69d11ff59a2e.png',
    'Our Neighborhood': '/Possible Genre Icons (1)/b7bee205-5782-4b90-ba2d-c719a1f00e0d.png',
    'Jobs Around Town': '/Possible Genre Icons (1)/4a88bbf4-eaa2-4326-99e6-07ae005bf76c.png',
    'Economics: Goods & Services': '/Possible Genre Icons (1)/2d73a85d-e695-4d91-9b60-1ce5804251aa.png',
    'American Symbols': '/Possible Genre Icons (1)/21541d63-35e8-417d-b22e-fc02277ac777.png',
    'Adventure, Comic Books': '/Possible Genre Icons (1)/99f0bcae-6571-49f0-a12c-dd3e2ecb1347.png',
    'Fairy Tales, Princesses': '/Possible Genre Icons (1)/c6476168-e0bd-4afa-91e7-a86d7eb272ac.png',
    'Unicorns, Mythical Creatures': '/Possible Genre Icons (1)/f31830a1-85a8-4fda-8694-1e0f40959142.png',
    'Superheroes': '/Possible Genre Icons (1)/e898180a-bb22-4555-9edd-45251590f585.png',
    'Space': '/Possible Genre Icons (1)/786269ad-046a-4a85-b1a6-38b4355976d9.png',
    'Sports, Soccer': '/Possible Genre Icons (1)/4b18c72f-2050-4ce3-bf8f-f6ec0d9ea411.png',
    'Airplanes': '/Possible Genre Icons (1)/718e1488-2013-4e2b-b6a0-b6bc682a80ea.png',
    'Boats & Ships': '/Possible Genre Icons (1)/663ce932-901d-4bd7-8c44-2d9b036b294d.png',
    'Cars & Trucks': '/Possible Genre Icons (1)/67b00583-1bab-4eb4-acdf-76257225a5e0.png',
    'Cars, Trucks & Trains': '/Possible Genre Icons (1)/67b00583-1bab-4eb4-acdf-76257225a5e0.png',
    'Trains': '/Possible Genre Icons (1)/8faec2f1-faad-4cb5-9912-90a06232b412.png',
    'Bravery, Bullying': '/Possible Genre Icons (1)/9a60eb66-e1d3-404c-b8ea-7efc7050bac1.png',
    'Friendship, Kindness': '/Possible Genre Icons (1)/e3ad1ac3-06e7-4157-a456-ab5f69b56182.png',
    'Families': '/Possible Genre Icons (1)/b6d9b9a9-aeab-48c3-8fd2-c75aa2417b24.png',
    'Grief & Loss': '/Possible Genre Icons (1)/dee18061-55ca-4cd5-babf-a00795dc23ce.png',
    'Growth Mindset': '/Possible Genre Icons (1)/f7cc1665-9382-41fc-85dd-af2c6a67433b.png',
    'Identifying Emotions': '/Possible Genre Icons (1)/eee2bfea-25cb-481b-9beb-015b828a77e9.png',
    'Mindfulness': '/Possible Genre Icons (1)/ac8d5ce0-8d5a-4348-b033-acd40bf7a43e.png',
    'Laugh Out Loud': '/Possible Genre Icons (1)/93c98bd2-7fb9-4b42-a844-c5ba486176b3.png'
  };
  return imageMap[genreName];
}
