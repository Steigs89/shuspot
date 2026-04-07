import { motion } from "motion/react";
import { useState } from "react";
import { Channel, Series, Episode } from "../../lib/videoMockData";
import { ArrowLeft, ChevronDown, Music, Moon, Film, Zap, GraduationCap, Sparkles } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface NewChannelPageProps {
  channel: Channel;
  allSeries: Series[];
  onBack: () => void;
  onEpisodeClick: (episode: Episode) => void;
}

export function VideoChannelPage({ 
  channel, 
  allSeries, 
  onBack, 
  onEpisodeClick
}: NewChannelPageProps) {
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const { language } = useLanguage();

  const channelSeries = allSeries.filter(s => s.channelId === channel.id);
  const selectedSeries = selectedSeriesId 
    ? allSeries.find(s => s.id === selectedSeriesId)
    : channelSeries[0];

  const selectedSeason = selectedSeries?.seasons.find(s => s.number === selectedSeasonNumber);

  // Helper function to get content type icon
  const getContentTypeIcon = (episode: Episode) => {
    if (episode.isSong) return <Music className="w-4 h-4" />;
    if (episode.isLullaby) return <Moon className="w-4 h-4" />;
    if (episode.isAnimation) return <Film className="w-4 h-4" />;
    if (episode.isDance) return <Zap className="w-4 h-4" />;
    return null;
  };

  // Helper function to get content type label
  const getContentTypeLabel = (episode: Episode) => {
    if (episode.isSong) return "Song";
    if (episode.isLullaby) return "Lullaby";
    if (episode.isAnimation) return "Animation";
    if (episode.isDance) return "Dance";
    return null;
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Channel Header Section - YouTube Style */}
      <div className="relative">
        {/* Channel Banner - Full Width */}
        <div className="relative h-[200px] md:h-[250px] w-full">
          <img
            src={channel.banner}
            alt={`${channel.name} banner`}
            className="w-full h-full object-cover"
          />
          
          {/* Back Button - Overlay on top-left */}
          <div className="absolute top-4 left-4 z-10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="bg-black/50 backdrop-blur-sm p-3 rounded-full text-white hover:bg-black/70 transition-colors focus:ring-2 focus:ring-white/50 focus:outline-none"
              aria-label="Go back to main video page"
            >
              <ArrowLeft className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        {/* Channel Info Section - YouTube Style Layout */}
        <div className="w-full px-6 md:px-12 py-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-center items-start">
            {/* Channel Logo - Left Side */}
            <img
              src={channel.logo}
              alt={`${channel.name} logo`}
              className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover flex-shrink-0"
            />
            
            {/* Channel Info - Right Side */}
            <div className="flex-1">
              {/* Channel Name */}
              <h1 className="text-white text-3xl md:text-5xl font-black mb-3">
                {channel.name}
              </h1>
              
              {/* Channel Description */}
              <p className="text-white text-base md:text-lg mb-4">
                {channel.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Series Hero Banner */}
      {selectedSeries && (
        <div className="w-full px-6 md:px-12 pt-4">
          {/* Series Banner */}
          <div className="relative h-[400px] md:h-[450px] w-full rounded-t-2xl overflow-hidden bg-gradient-to-b from-gray-900 to-black">
            <img
              src={selectedSeries.banner || selectedSeries.thumbnail}
              alt={selectedSeries.title}
              className="w-full h-full object-cover object-[center_30%]"
              style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            
            {/* Series Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-4">
              <h2 className="text-white text-2xl md:text-3xl font-black mb-2">
                {selectedSeries.title}
              </h2>
              <button
                onClick={() => {
                  const firstEpisode = selectedSeries.seasons[0]?.episodes[0];
                  if (firstEpisode) {
                    onEpisodeClick(firstEpisode);
                  }
                }}
                className="bg-white hover:bg-white/90 text-black font-bold py-2 px-6 rounded-full flex items-center gap-2 transition-all hover:scale-105"
              >
                <div className="w-0 h-0 border-l-[10px] border-l-black border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent" />
                PLAY
              </button>
            </div>
          </div>

          {/* More Shows Horizontal Slider - Only show if multiple shows */}
          {channelSeries.length > 1 && (
            <div className="w-full px-6 md:px-12 py-4">
              <h3 className="text-white text-sm font-bold mb-3">More Shows</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {channelSeries.map((series) => (
                  <motion.button
                    key={series.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedSeriesId(series.id);
                      setSelectedSeasonNumber(1);
                    }}
                    className={`flex-shrink-0 w-32 transition-all ${
                      selectedSeries?.id === series.id
                        ? "ring-2 ring-blue-400"
                        : "opacity-70 hover:opacity-100"
                    } rounded-md overflow-hidden`}
                  >
                    <img
                      src={series.thumbnail}
                      alt={series.title}
                      className="w-full h-20 object-cover"
                    />
                    <div className="bg-white/10 p-2">
                      <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                        {series.title}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Episodes Section */}
      <div className="w-full px-6 md:px-12 py-4">
        {selectedSeries && selectedSeason && (
          <>
            {/* Episodes Title */}
            <h2 className="text-white text-2xl font-bold mb-4">Episodes</h2>

            {/* Season Selector */}
            {selectedSeries.seasons.length > 1 && (
              <div className="mb-6">
                {/* Mobile: Dropdown style */}
                <div className="md:hidden relative">
                  <button
                    onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                    className="w-full bg-white/10 text-white px-4 py-3 rounded-lg flex items-center justify-between font-bold"
                  >
                    <span>Season {selectedSeasonNumber}</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showSeasonDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-lg overflow-hidden shadow-2xl z-20"
                    >
                      {selectedSeries.seasons.map((season) => (
                        <button
                          key={season.number}
                          onClick={() => {
                            setSelectedSeasonNumber(season.number);
                            setShowSeasonDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-white hover:bg-white/10 transition-colors ${
                            selectedSeasonNumber === season.number ? 'bg-[#24BFE6]' : ''
                          }`}
                        >
                          Season {season.number}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Desktop: Chips */}
                <div className="hidden md:block">
                  <div className="flex gap-3 flex-wrap">
                    {selectedSeries.seasons.map((season) => (
                      <motion.button
                        key={season.number}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedSeasonNumber(season.number)}
                        className={`px-6 py-3 rounded-full transition-all font-bold ${
                          selectedSeasonNumber === season.number
                            ? "bg-[#24BFE6] text-white"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        Season {season.number}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Episode List */}
            <div className="flex flex-col gap-4 max-w-4xl">
              {selectedSeason.episodes.map((episode, index) => (
                <motion.div
                  key={episode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onEpisodeClick(episode)}
                  className="cursor-pointer group"
                >
                  <div className="flex gap-4">
                    {/* Episode Thumbnail with Play Button */}
                    <div className="relative w-32 md:w-40 flex-shrink-0">
                      <img
                        src={episode.thumbnail}
                        alt={episode.title}
                        className="w-full aspect-video object-cover rounded-lg"
                      />
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors rounded-lg">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <div className="w-0 h-0 border-l-[16px] border-l-black border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
                        </div>
                      </div>

                      {/* Runtime Badge */}
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                        {episode.runtime}
                      </div>
                    </div>
                    
                    {/* Episode Info */}
                    <div className="flex-1 py-1">
                      <div className="flex items-start gap-2 mb-1">
                        <h4 className="text-white font-bold text-base flex-1">
                          {episode.episodeNumber}. {episode.title}
                        </h4>
                        
                        {/* AR Level Badge */}
                        {episode.arLevel != null && (
                          <div className="flex-shrink-0 bg-[#24BFE6] text-white text-xs font-bold px-2 py-1 rounded">
                            AR {episode.arLevel.toFixed(1)}
                          </div>
                        )}
                      </div>
                      
                      {/* Content Type and Learning Type Badges */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {/* Content Type Badge */}
                        {getContentTypeLabel(episode) && (
                          <div className="flex items-center gap-1 bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            {getContentTypeIcon(episode)}
                            <span>{getContentTypeLabel(episode)}</span>
                          </div>
                        )}
                        
                        {/* Educational/Entertainment Badge */}
                        {episode.isEducational && (
                          <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            <GraduationCap className="w-3 h-3" />
                            <span>Educational</span>
                          </div>
                        )}
                        {episode.isEntertainment && (
                          <div className="flex items-center gap-1 bg-pink-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            <span>Entertainment</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Genre Tags */}
                      {episode.genres && episode.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {episode.genres.map((genre, idx) => (
                            <span
                              key={idx}
                              className="bg-white/10 text-white/80 text-xs px-2 py-0.5 rounded"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-white/50 text-sm mb-2">
                        {episode.runtime}
                      </p>
                      {episode.description && (
                        <p className="text-white/70 text-sm line-clamp-2 leading-relaxed">
                          {episode.description}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
