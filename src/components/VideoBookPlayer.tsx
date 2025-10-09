import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Heart, X, RotateCcw, SkipForward, Sparkles, Star } from 'lucide-react';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(uploadedVideo ? uploadedVideo.duration : 245);
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
                      
                      // Track completion when video reaches 90% or more
                      if (!hasTrackedCompletion && uploadedVideo && onProgressUpdate) {
                        const progressPercent = (newTime / duration) * 100;
                        if (progressPercent >= 90) {
                          setHasTrackedCompletion(true);
                          onProgressUpdate(uploadedVideo.id, 1, Math.round(duration / 60));
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
                      if (!hasTrackedCompletion && uploadedVideo && onProgressUpdate) {
                        setHasTrackedCompletion(true);
                        onProgressUpdate(uploadedVideo.id, 1, Math.round(duration / 60));
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
              <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 sm:p-6">
                {/* Fun Animated Progress Bar */}
                <div className="mb-6">
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
                  <div className="flex justify-between mt-2 px-1">
                    <span className="text-white text-xs sm:text-sm font-bold drop-shadow-lg">
                      {formatTime(currentTime)}
                    </span>
                    <span className="text-white text-xs sm:text-sm font-bold drop-shadow-lg">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Large Kid-Friendly Control Buttons */}
                <div className="flex items-center justify-center gap-3 sm:gap-4">
                  {/* Replay Button */}
                  <button
                    onClick={handleReplay}
                    className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
                    title="Start Over"
                  >
                    <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:rotate-180 transition-transform duration-500" />
                  </button>

                  {/* Play/Pause Button (Larger) */}
                  <button
                    onClick={togglePlay}
                    className="flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 group"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    ) : (
                      <Play className="w-10 h-10 sm:w-12 sm:h-12 text-white ml-1" />
                    )}
                  </button>

                  {/* Skip Forward Button */}
                  <button
                    onClick={handleSkipForward}
                    className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
                    title="Skip 10 seconds"
                  >
                    <SkipForward className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Secondary Controls Row */}
                <div className="flex items-center justify-between mt-4 px-2">
                  {/* Volume Control */}
                  <button
                    onClick={toggleMute}
                    className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/20 hover:bg-white/30 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    )}
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    onClick={handleFullscreen}
                    className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/20 hover:bg-white/30 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                    title="Fullscreen"
                  >
                    <Maximize className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Watch Next Sidebar */}
        <div className="lg:w-80">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-superclarendon-black text-gray-800 mb-4">
              Watch Next!
            </h3>

            <div className="space-y-4">
              {watchNextVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex space-x-3 p-3 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer group"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-20 h-14 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                      {video.duration}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-superclarendon-black text-gray-800 text-sm leading-tight mb-1 group-hover:text-purple-700 transition-colors">
                      {video.title}
                    </h4>
                    <p className="text-xs text-gray-500">Educational Video</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Fun Stats */}
            <div className="mt-6 p-4 bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl">
              <h4 className="font-superclarendon-black text-gray-800 mb-2">
                🌟 Fun Facts!
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Videos Watched:</span>
                  <span className="font-semibold">12</span>
                </div>
                <div className="flex justify-between">
                  <span>Reading Level:</span>
                  <span className="font-semibold">K2</span>
                </div>
                <div className="flex justify-between">
                  <span>Favorite Genre:</span>
                  <span className="font-semibold">Fantasy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}