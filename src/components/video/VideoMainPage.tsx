import { motion } from "motion/react";
import { useState } from "react";
import {
  Channel,
  GradeLevel,
  Genre,
  Episode,
  Series,
} from "../../lib/videoMockData";
import { User } from "lucide-react";
import { RotatingBanner } from './RotatingBanner';
import ParentalControlsModal from '../library/ParentalControlsModal';
import { ParentalSettings } from '../../types/library';

interface MainVideoPageProps {
  channels: Channel[];
  series: Series[];
  onChannelClick: (channelId: string) => void;
  onEpisodeClick: (episode: Episode) => void;
}

const gradeLevels: GradeLevel[] = [
  "Pre-K",
  "K",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
];
const genres: Genre[] = [
  "Science",
  "Art",
  "Music",
  "Stories",
  "Math",
  "Sports",
  "Cooking",
  "Geography",
  "History",
  "Wellness",
];

export function VideoMainPage({
  channels,
  series,
  onChannelClick,
  onEpisodeClick,
}: MainVideoPageProps) {
  const [selectedGrade, setSelectedGrade] =
    useState<GradeLevel | null>(null);
  const [selectedGenre, setSelectedGenre] =
    useState<Genre | null>(null);

  // Filter channels based on selected grade and genre
  const filteredChannels = channels.filter((channel) => {
    if (
      selectedGrade &&
      !channel.gradeLevels.includes(selectedGrade)
    )
      return false;
    if (
      selectedGenre &&
      !channel.genres.includes(selectedGenre)
    )
      return false;
    return true;
  });

  const [showParentalControls, setShowParentalControls] = useState(false);
  
  // Default parental settings
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
      minLevel: 'A',
      maxLevel: 'Z'
    },
    pinProtection: {
      enabled: true,
      pinHash: '1234'
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

  const handleSaveParentalSettings = (settings: ParentalSettings) => {
    setParentalSettings(settings);
    // TODO: Save to localStorage or Supabase
    console.log('Parental settings saved:', settings);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-black h-16">
        <div className="w-full h-full px-4 flex items-center justify-between gap-4">
          {/* Avatar - Left */}
          <button 
            onClick={() => setShowParentalControls(true)}
            className="flex-shrink-0 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <User className="w-8 h-8 text-white" />
          </button>

          {/* Search Bar - Center */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search videos..."
                className="w-full bg-white/10 text-white placeholder-white/50 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
          </div>

          {/* Logo - Right (navigates to library) with gradient background */}
          <button 
            onClick={() => window.location.href = '/library'}
            className="relative flex-shrink-0 hover:opacity-90 transition-opacity"
          >
            {/* Strong white gradient background */}
            <div className="absolute -inset-2 bg-gradient-to-r from-white/40 via-white/60 to-white/70 rounded-xl blur-md" />
            <div className="absolute -inset-1 bg-gradient-to-r from-white/30 via-white/50 to-white/60 rounded-lg" />
            <div className="relative px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <img
                src="https://shuspot.com/assets/SS%20Logo%20Final%20Black%20With%20Color%20Spots%20HR-BK57Y7PG.png"
                alt="ShuSpot"
                className="h-12 w-auto"
              />
            </div>
          </button>
        </div>
      </div>

      {/* Parental Controls Modal */}
      <ParentalControlsModal
        isOpen={showParentalControls}
        onClose={() => setShowParentalControls(false)}
        currentSettings={parentalSettings}
        onSave={handleSaveParentalSettings}
      />

      <div className="w-full px-4 py-6">
        {/* VIDEOS Heading - Fun and Kid-Friendly */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-white text-4xl md:text-5xl font-black mb-6 text-center"
          style={{ 
            fontFamily: 'Comic Sans MS, cursive, sans-serif',
            textShadow: '3px 3px 0px rgba(36, 191, 230, 0.5)'
          }}
        >
          🎬 VIDEOS 🎬
        </motion.h1>

        {/* Auto-Rotating Banner */}
        {channels.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <RotatingBanner
              banners={channels.map(channel => ({
                id: channel.id,
                imageUrl: channel.banner || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop',
                title: channel.name,
                subtitle: channel.description || 'Explore amazing educational videos for kids',
                channelId: channel.id
              }))}
              height="300px"
              onBannerClick={(channelId) => {
                onChannelClick(channelId);
              }}
            />
          </motion.div>
        )}

        {/* Grade Level Chips (Tier 1) */}
        <div className="mb-6">
          <h3 className="text-white mb-4 font-bold">
            📚 Pick Your Grade Level
          </h3>
          <div className="flex flex-wrap gap-3">
            {gradeLevels.map((grade) => (
              <motion.button
                key={grade}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  setSelectedGrade(
                    selectedGrade === grade ? null : grade,
                  )
                }
                className={`px-6 py-3 rounded-full transition-all font-bold ${
                  selectedGrade === grade
                    ? "bg-[#24BFE6] text-white shadow-lg scale-105"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {grade}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Genre Chips (Tier 2) */}
        <div className="mb-8">
          <h3 className="text-white mb-4 font-bold">🎨 Choose a Topic</h3>
          <div className="flex flex-wrap gap-3">
            {genres.map((genre) => (
              <motion.button
                key={genre}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  setSelectedGenre(
                    selectedGenre === genre ? null : genre,
                  )
                }
                className={`px-6 py-3 rounded-full transition-all font-bold ${
                  selectedGenre === genre
                    ? "bg-[#24BFE6] text-white shadow-lg scale-105"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {genre}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Channel Gallery */}
        <div>
          <h3 className="text-white mb-6 font-bold">
            {selectedGrade || selectedGenre
              ? `📺 Channels for ${selectedGrade || ""} ${selectedGenre || ""}`
              : "📺 All Channels"}
            <span className="text-white/50 ml-2">
              ({filteredChannels.length})
            </span>
          </h3>

          {filteredChannels.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/50 text-xl">
                No channels match your selection
              </p>
              <button
                onClick={() => {
                  setSelectedGrade(null);
                  setSelectedGenre(null);
                }}
                className="mt-4 text-[#24BFE6] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredChannels.map((channel, index) => (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onChannelClick(channel.id)}
                  className="bg-white/5 rounded-2xl overflow-hidden cursor-pointer group hover:bg-white/10 transition-all shadow-lg hover:shadow-2xl relative"
                >
                  {/* Channel Banner */}
                  <div className="relative h-48">
                    <img
                      src={channel.banner}
                      alt={channel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Channel Logo - Moved to banner */}
                    <div className="absolute bottom-3 left-3">
                      <div className="w-14 h-14 rounded-full border-3 border-white shadow-xl overflow-hidden bg-white">
                        <img
                          src={channel.logo}
                          alt={`${channel.name} logo`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Favorite Icon */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle favorite logic here
                      }}
                      className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-white hover:text-red-500 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </motion.button>
                  </div>

                  {/* Channel Info */}
                  <div className="px-4 py-4">
                    <h4 className="text-white font-bold mb-2 line-clamp-2">
                      {channel.name}
                    </h4>
                    <p className="text-white/70 text-sm line-clamp-3 mb-3">
                      {channel.description}
                    </p>

                    {/* Genre Tags */}
                    <div className="flex flex-wrap gap-1">
                      {channel.genres
                        .slice(0, 2)
                        .map((genre) => (
                          <span
                            key={genre}
                            className="bg-[#24BFE6]/20 text-[#24BFE6] text-xs px-2 py-1 rounded-full"
                          >
                            {genre}
                          </span>
                        ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}