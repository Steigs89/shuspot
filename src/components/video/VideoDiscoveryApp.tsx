import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { VideoMainPage } from "./VideoMainPage";
import { VideoChannelPage } from "./VideoChannelPage";
import { VideoFullScreenPlayer } from "./VideoFullScreenPlayer";
import { VideoMiniPlayer } from "./VideoMiniPlayer";
import { VideoChannelsPage } from "./VideoChannelsPage";
import { Episode, Channel, Series } from "../../lib/videoMockData";
import { useVideoChannels, useVideoSeries, useVideoContent } from "../../hooks/useVideos";
import { transformAllVideoData } from "../../lib/videoDataTransform";

type View = 
  | { type: "main" }
  | { type: "library" }
  | { type: "channel"; channelId: string };

export default function VideoDiscoveryApp() {
  const [currentView, setCurrentView] = useState<View>({ type: "main" });
  const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);
  const [miniPlayerEpisode, setMiniPlayerEpisode] = useState<Episode | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedProgress, setSavedProgress] = useState<Record<string, number>>({});

  // Fetch real data from Supabase
  const { channels: rawChannels, loading: channelsLoading } = useVideoChannels();
  const { series: rawSeries, loading: seriesLoading } = useVideoSeries();
  const { videos: rawVideos, loading: videosLoading } = useVideoContent();

  // Transform data to UI format
  const [channels, setChannels] = useState<Channel[]>([]);
  const [series, setSeries] = useState<Series[]>([]);

  useEffect(() => {
    if (!channelsLoading && !seriesLoading && !videosLoading) {
      const transformed = transformAllVideoData(rawChannels, rawSeries, rawVideos);
      setChannels(transformed.channels);
      setSeries(transformed.series);
      
      // Check if there's a video to auto-play
      const autoPlayVideoId = sessionStorage.getItem('autoPlayVideoId');
      if (autoPlayVideoId) {
        // Find the video in the transformed data
        for (const series of transformed.series) {
          for (const season of series.seasons) {
            const episode = season.episodes.find(ep => ep.id === autoPlayVideoId);
            if (episode) {
              // Auto-play this video
              handleEpisodeClick(episode);
              // Clear the session storage
              sessionStorage.removeItem('autoPlayVideoId');
              break;
            }
          }
        }
      }
    }
  }, [rawChannels, rawSeries, rawVideos, channelsLoading, seriesLoading, videosLoading]);

  const loading = channelsLoading || seriesLoading || videosLoading;

  const handleChannelClick = (channelId: string) => {
    setCurrentView({ type: "channel", channelId });
  };

  const handleEpisodeClick = (episode: Episode) => {
    setPlayingEpisode(episode);
    setMiniPlayerEpisode(null);
    // Restore saved progress if available
    const savedTime = savedProgress[episode.id] || 0;
    setCurrentTime(savedTime);
    setIsFullscreen(true);
  };

  const handleClosePlayer = () => {
    // Move to mini player and save current progress
    if (playingEpisode) {
      setMiniPlayerEpisode(playingEpisode);
      // Save progress for this episode
      setSavedProgress(prev => ({
        ...prev,
        [playingEpisode.id]: currentTime
      }));
      setPlayingEpisode(null);
      setIsFullscreen(false);
    }
  };

  const handleCloseMiniPlayer = () => {
    // Save progress before closing
    if (miniPlayerEpisode) {
      setSavedProgress(prev => ({
        ...prev,
        [miniPlayerEpisode.id]: currentTime
      }));
    }
    setMiniPlayerEpisode(null);
    setCurrentTime(0);
  };

  const handleMaximizeMiniPlayer = () => {
    if (miniPlayerEpisode) {
      setPlayingEpisode(miniPlayerEpisode);
      setMiniPlayerEpisode(null);
      // Keep the current time when maximizing
      setIsFullscreen(true);
    }
  };

  const getNextEpisode = (): Episode | undefined => {
    if (!playingEpisode) return undefined;

    const currentSeries = series.find((s) =>
      s.seasons.some((season) =>
        season.episodes.some((ep) => ep.id === playingEpisode.id)
      )
    );
    if (!currentSeries) return undefined;

    const currentSeason = currentSeries.seasons.find(
      (s) => s.number === playingEpisode.seasonNumber
    );
    if (!currentSeason) return undefined;

    const currentEpisodeIndex = currentSeason.episodes.findIndex(
      (ep) => ep.id === playingEpisode.id
    );

    // Try next episode in same season
    if (currentEpisodeIndex < currentSeason.episodes.length - 1) {
      return currentSeason.episodes[currentEpisodeIndex + 1];
    }

    // Try first episode of next season
    const nextSeason = currentSeries.seasons.find(
      (s) => s.number === playingEpisode.seasonNumber + 1
    );
    if (nextSeason && nextSeason.episodes.length > 0) {
      return nextSeason.episodes[0];
    }

    return undefined;
  };

  const handlePlayNext = () => {
    const nextEpisode = getNextEpisode();
    if (nextEpisode) {
      setPlayingEpisode(nextEpisode);
      setCurrentTime(0);
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black -mx-4 sm:-mx-6 -my-4 sm:-my-8">
      {/* Main Content */}
      {currentView.type === "main" && (
        <VideoMainPage
          channels={channels}
          series={series}
          onChannelClick={handleChannelClick}
          onEpisodeClick={handleEpisodeClick}
        />
      )}

      {currentView.type === "library" && (
        <VideoChannelsPage
          channels={channels}
          onChannelClick={handleChannelClick}
        />
      )}

      {currentView.type === "channel" && (() => {
        const channel = channels.find((c) => c.id === currentView.channelId);
        if (!channel) return null;
        return (
          <VideoChannelPage
            channel={channel}
            allSeries={series}
            onBack={() => setCurrentView({ type: "main" })}
            onEpisodeClick={handleEpisodeClick}
          />
        );
      })()}

      {/* Full Screen Player */}
      {isFullscreen && playingEpisode && (
        <VideoFullScreenPlayer
          episode={playingEpisode}
          nextEpisode={getNextEpisode()}
          initialTime={currentTime}
          onClose={handleClosePlayer}
          onPlayNext={handlePlayNext}
          onRestart={handleRestart}
          onTimeUpdate={setCurrentTime}
        />
      )}

      {/* Mini Player */}
      <AnimatePresence>
        {miniPlayerEpisode && !isFullscreen && (
          <VideoMiniPlayer
            episode={miniPlayerEpisode}
            currentTime={currentTime}
            duration={miniPlayerEpisode.duration}
            onClose={handleCloseMiniPlayer}
            onMaximize={handleMaximizeMiniPlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
