import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Heart, X, RotateCcw, SkipForward, Sparkles, Star } from 'lucide-react';
import { useReadingProgress } from '../hooks/useReadingProgress';

interface VideoBookPlayerProps {
  onBack: () => void;
  bookTitle: string;
  videoUrl?: string;
  uploadedVideo?: {
    id: string;
    title: string;
    author: string;
    cover: string;
    videoUrl: string;
    duration: number;
  };
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  onProgressUpdate?: (bookId: string, pagesRead: number, timeSpent?: number) => void;
}

interface WatchNextVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
}

export default function VideoBookPlayer({ onBack, bookTitle, uploadedVideo, isFavorited = false, onToggleFavorite, onProgressUpdate }: VideoBookPlayerProps) {
  const videoDuration = uploadedVideo ? uploadedVideo.duration : 245;
  
  // Initialize reading progress tracking (using seconds as "pages" for video)
  const { progress: readingProgress, updateProgress, markComplete } = useReadingProgress({
    bookId: uploadedVideo?.id || 'default-video',
    bookType: 'video',
    totalDuration: videoDuration
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(readingProgress?.currentPage || 0);
  const [duration, setDuration] = useState(videoDuration);
  const [hasTrackedCompletion, setHasTrackedCompletion] = useState(false);
  const [showRewardStars, setShowRewardStars] = useState(false);
  const [showMascot, setShowMascot] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Show mascot when video pauses
  useEffect(() => {
    if (!isPlaying && currentTime > 0 && currentTime < duration - 1) {
      setShowMascot(true);
      const timer = setTimeout(() => setShowMascot(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentTime, duration]);

  const watchNextVideos: WatchNextVideo[] = [
    {
      id: '1',
      title: 'Party Hearty Kitty-Corn',
      thumbnail: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1',
      duration: '3:45'
    },
    {
      id: '2',
      title: 'Adventure Kingdom Mo...',
      thumbnail: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1',
      duration: '5:12'
    },
    {
      id: '3',
      title: 'Caillou: The Jungle Expl...',
      thumbnail: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1',
      duration: '4:30'
    },
    {
      id: '4',
      title: 'StoryMakers | Nick Bruel',
      thumbnail: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1',
      duration: '6:15'
    }
  ];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setHasTrackedCompletion(false);
      setIsPlaying(true);
      videoRef.current.play();
    }
  };

  const handleSkipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(currentTime + 10, duration);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 relative overflow-hidden">
      {/* Animated Background Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-yellow-300/10 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-pink-300/10 rounded-full animate-float-slow"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-blue-300/10 rounded-full animate-float"></div>
      </div>

      {/* Reward Stars Animation */}
      {showRewardStars && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="relative">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-star-burst"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  transform: `rotate(${i * 30}deg) translateY(-100px)`,
                }}
              >
                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              </div>
            ))}
            <div className="text-6xl animate-bounce-big">🎉</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/30 to-transparent backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/90 hover:bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
        >
          <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600 group-hover:text-purple-700" />
        </button>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-superclarendon-bold text-white text-center flex-1 px-4 drop-shadow-lg">
          {bookTitle}
        </h1>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onToggleFavorite}
            className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 ${
              isFavorited 
                ? 'bg-red-400 hover:bg-red-500' 
                : 'bg-white/90 hover:bg-white'
            }`}
          >
            <Heart className={`w-6 h-6 sm:w-7 sm:h-7 ${isFavorited ? 'fill-white text-white' : 'text-red-400'}`} />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-6">
        {/* Main Video Player */}
        <div className="flex-1">
          <div 
            className="relative bg-black rounded-3xl overflow-hidden shadow-2xl"
            onMouseMove={handleMouseMove}
            onTouchStart={() => setShowControls(true)}
          >
            {/* Loading Animation */}
            {isLoading && (
              <div className="absolute inset-0 z-30 bg-gradient-to-br from-purple-400 via-pink-400 to-yellow-400 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative">
                    <div className="w-24 h-24 border-8 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">
                      🎬
                    </div>
                  </div>
                  <p className="mt-6 text-2xl font-superclarendon-bold text-white animate-pulse">
                    Loading your video...
                  </p>
                </div>
              </div>
            )}

            {/* Video Container */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {uploadedVideo ? (
                <>
                  {/* Actual Video Element */}
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain cursor-pointer"
                    src={uploadedVideo.videoUrl}
                    onTimeUpdate={(e) => {
                      const newTime = e.currentTarget.currentTime;
                      setCurrentTime(newTime);
                      
                      // Update reading progress (using seconds as progress)
                      updateProgress(Math.floor(newTime)).catch(console.error);
                      
                      // Track completion when video reaches 90% or more
                      if (!hasTrackedCompletion && uploadedVideo) {
                        const progressPercent = (newTime / duration) * 100;
                        if (progressPercent >= 90) {
                          setHasTrackedCompletion(true);
                          
                          // Mark complete in reading progress system
                          markComplete().catch(console.error);
                          
                          if (onProgressUpdate) {
                            onProgressUpdate(uploadedVideo.id, 1, Math.round(duration / 60));
                          }
                          console.log('Video completion tracked:', uploadedVideo.title);
                          
                          // Show reward stars animation
                          setShowRewardStars(true);
                          setTimeout(() => setShowRewardStars(false), 3000);
                        }
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      setDuration(e.currentTarget.duration);
                      setIsLoading(false);
                    }}
                    onLoadStart={() => setIsLoading(true)}
                    onCanPlay={() => setIsLoading(false)}
                    onEnded={() => {
                      setIsPlaying(false);
                      
                      // Track completion when video ends (if not already tracked)
                      if (!hasTrackedCompletion && uploadedVideo) {
                        setHasTrackedCompletion(true);
                        
                        // Mark complete in reading progress system
                        markComplete().catch(console.error);
                        
                        if (onProgressUpdate) {
                          onProgressUpdate(uploadedVideo.id, 1, Math.round(duration / 60));
                        }
                        console.log('Video completion tracked on end:', uploadedVideo.title);
                        
                        // Show reward stars animation
                        setShowRewardStars(true);
                        setTimeout(() => setShowRewardStars(false), 3000);
                      }
                    }}
                    onClick={togglePlay}
                    muted={isMuted}
                  />

                  {/* Play Button Overlay */}
                  {!isPlaying && !isLoading && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/20 to-black/40 hover:from-black/30 hover:to-black/50 transition-all duration-300 group z-10"
                    >
                      <div className="relative">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl animate-pulse-slow">
                          <Play className="w-10 h-10 sm:w-12 sm:h-12 text-white ml-2" />
                        </div>
                        <div className="absolute -inset-2 bg-white/20 rounded-full animate-ping"></div>
                      </div>
                    </button>
                  )}

                  {/* Mascot Animation when paused */}
                  {showMascot && !isLoading && (
                    <div className="absolute top-4 right-4 z-20 animate-bounce-in">
                      <div className="bg-white/95 rounded-3xl p-4 shadow-2xl">
                        <div className="text-5xl animate-wave">👋</div>
                        <div className="mt-2 text-sm font-bold text-purple-600">
                          Take a break!
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Placeholder Video Content */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-300 to-yellow-300 opacity-80"></div>

                  {/* Unicorn Character Placeholder */}
                  <div className="relative z-10 text-center">
                    <div className="text-8xl mb-4">🦄</div>
                    <h2 className="text-3xl font-superclarendon-bold text-white mb-2">
                      Pretty Perfect Kitty-Corn
                    </h2>
                    <p className="text-white/80 text-lg">An amazing adventure awaits!</p>
                  </div>

                  {/* Play Button Overlay */}
                  {!isPlaying && !isLoading && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/20 to-black/40 hover:from-black/30 hover:to-black/50 transition-all duration-300 group z-10"
                    >
                      <div className="relative">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl animate-pulse-slow">
                          <Play className="w-10 h-10 sm:w-12 sm:h-12 text-white ml-2" />
                        </div>
                        <div className="absolute -inset-2 bg-white/20 rounded-full animate-ping"></div>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Enhanced Video Controls */}
            <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
              <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8 pb-3 px-3 sm:px-4">
                {/* Fun Animated Progress Bar */}
                <div className="mb-3">
                  <div
                    className="w-full bg-white/20 rounded-full h-3 sm:h-4 cursor-pointer relative overflow-hidden shadow-lg"
                    onClick={(e) => {
                      if (videoRef.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = clickX / rect.width;
                        const newTime = percentage * duration;
                        videoRef.current.currentTime = newTime;
                        setCurrentTime(newTime);
                      }
                    }}
                  >
                    {/* Animated background shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    
                    {/* Progress fill with gradient */}
                    <div
                      className="relative h-full rounded-full transition-all duration-300 bg-gradient-to-r from-blue-400 via-pink-400 to-yellow-400 shadow-lg"
                      style={{ width: `${progressPercentage}%` }}
                    >
                      {/* Sparkle effect at the end */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <Sparkles className="w-4 h-4 text-white animate-pulse" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Time display */}
                  <div className="flex justify-between mt-1 px-1">
                    <span className="text-white text-xs font-bold drop-shadow-lg">
                      {formatTime(currentTime)}
                    </span>
                    <span className="text-white text-xs font-bold drop-shadow-lg">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Compact Control Buttons Row */}
                <div className="flex items-center justify-between px-2">
                  {/* Left side controls */}
                  <div className="flex items-center gap-2">
                    {/* Play/Pause Button */}
                    <button
                      onClick={togglePlay}
                      className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      ) : (
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-0.5" />
                      )}
                    </button>

                    {/* Replay Button */}
                    <button
                      onClick={handleReplay}
                      className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
                      title="Start Over"
                    >
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-180 transition-transform duration-500" />
                    </button>

                    {/* Skip Forward Button */}
                    <button
                      onClick={handleSkipForward}
                      className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
                      title="Skip 10 seconds"
                    >
                      <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Volume Control */}
                    <button
                      onClick={toggleMute}
                      className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Right side controls */}
                  <div className="flex items-center gap-2">
                    {/* Fullscreen Button */}
                    <button
                      onClick={handleFullscreen}
                      className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                      title="Fullscreen"
                    >
                      <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Watch Next Sidebar - Epic Kids Style */}
        <div className="lg:w-96 flex flex-col">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full lg:h-auto lg:max-h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
              <h3 className="text-2xl font-superclarendon-black text-white">
                Watch Next!
              </h3>
            </div>

            {/* Scrollable Video List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-gray-100">
              {watchNextVideos.map((video) => (
                <div
                  key={video.id}
                  className="group cursor-pointer"
                >
                  <div className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                    {/* Thumbnail */}
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full aspect-video object-cover"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
                        <Play className="w-7 h-7 text-purple-600 ml-1" />
                      </div>
                    </div>
                    
                    {/* Duration Badge */}
                    <div className="absolute top-3 right-3 bg-black/80 text-white text-sm font-bold px-3 py-1 rounded-full">
                      {video.duration}
                    </div>
                    
                    {/* Title Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="font-superclarendon-bold text-white text-base leading-tight drop-shadow-lg">
                        {video.title}
                      </h4>
                      <p className="text-white/80 text-xs mt-1 font-medium">Educational Video</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Fun Stats Footer */}
            <div className="border-t border-gray-200 p-4 bg-gradient-to-br from-yellow-50 to-pink-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-superclarendon-black text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <span>Fun Facts!</span>
                </h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-superclarendon-black text-purple-600">12</div>
                  <div className="text-xs text-gray-600 font-medium mt-1">Videos</div>
                </div>
                <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-superclarendon-black text-pink-600">K2</div>
                  <div className="text-xs text-gray-600 font-medium mt-1">Level</div>
                </div>
                <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-lg font-superclarendon-black text-blue-600">🦄</div>
                  <div className="text-xs text-gray-600 font-medium mt-1">Fantasy</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}