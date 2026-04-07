import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { Episode } from "../../lib/videoMockData";
import {
  ArrowLeft,
  Lock,
  Settings,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  FastForward,
  Music,
  Moon,
  Film,
  Zap,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Slider } from "./ui/slider";
import { VideoGearPopup } from "./VideoGearPopup";
import Hls from "hls.js";
import { useLanguage } from "../../contexts/LanguageContext";
import "../../styles/VideoSubtitles.css";

interface FullScreenPlayerProps {
  episode: Episode;
  nextEpisode?: Episode;
  initialTime?: number;
  onClose: () => void;
  onPlayNext?: () => void;
  onRestart: () => void;
  onTimeUpdate?: (time: number) => void;
}

export function VideoFullScreenPlayer({
  episode,
  nextEpisode,
  initialTime = 0,
  onClose,
  onPlayNext,
  onRestart,
  onTimeUpdate,
}: FullScreenPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showTeachingOverlay, setShowTeachingOverlay] = useState(true);
  const [showGearPopup, setShowGearPopup] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [speed, setSpeed] = useState<1.0 | 0.75>(1.0);
  const [captionsOn, setCaptionsOn] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const overlayTimeoutRef = useRef<number | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const gearTimerRef = useRef<number | null>(null);
  const initializingRef = useRef<boolean>(false);
  const [lockHoldProgress, setLockHoldProgress] = useState(0);
  const [gearHoldProgress, setGearHoldProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);

  const duration = episode.duration;
  const isNearEnd = currentTime >= duration - 15;

  // Hide teaching overlay after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTeachingOverlay(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize HLS for m3u8 streams or use native video for MP4
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Prevent multiple simultaneous initializations
    if (initializingRef.current) {
      console.log('⏭️  Skipping initialization - already in progress');
      return;
    }

    const videoUrl = episode.videoUrl;
    const isHLS = videoUrl.endsWith('.m3u8');

    console.log('🎥 Initializing video player:', { videoUrl, isHLS });
    initializingRef.current = true;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Reset video element
    video.pause();
    video.removeAttribute('src');
    video.load();

    if (isHLS) {
      // Check if browser supports HLS natively (Safari)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('🍎 Using native HLS support (Safari)');
        video.src = videoUrl;
        
        const handleCanPlay = () => {
          if (initialTime > 0) {
            video.currentTime = initialTime;
          }
          video.play().then(() => {
            initializingRef.current = false;
          }).catch((error) => {
            console.error('Native HLS playback error:', error);
            setVideoError('Failed to load video');
            initializingRef.current = false;
          });
        };
        
        video.addEventListener('canplay', handleCanPlay, { once: true });
        video.load();
      } 
      // Use hls.js for other browsers
      else if (Hls.isSupported()) {
        console.log('📺 Using HLS.js');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });

        hlsRef.current = hls;

        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest parsed successfully');
          // Seek to initial time if provided
          if (initialTime > 0) {
            video.currentTime = initialTime;
          }
          video.play().then(() => {
            initializingRef.current = false;
          }).catch((error) => {
            console.error('HLS playback error:', error);
            setVideoError('Failed to start playback');
            initializingRef.current = false;
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Network error, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal error, cannot recover');
                setVideoError('Video playback failed');
                hls.destroy();
                break;
            }
          }
        });
      } else {
        console.error('HLS is not supported in this browser');
        setVideoError('Your browser does not support HLS streaming');
      }
    } else {
      // Standard MP4 or other formats
      console.log('🎬 Using standard video format');
      video.src = videoUrl;
      
      // Clear any previous errors when video loads successfully
      video.addEventListener('loadeddata', () => {
        setVideoError(null);
        // Seek to initial time if provided
        if (initialTime > 0) {
          video.currentTime = initialTime;
        }
      }, { once: true });
      
      video.load();
      video.play().then(() => {
        initializingRef.current = false;
      }).catch((error) => {
        console.error('Video playback error:', error);
        setVideoError('Failed to load video');
        initializingRef.current = false;
      });
    }

    return () => {
      initializingRef.current = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [episode.videoUrl]); // Only re-initialize when video URL changes

  // Video playback is now handled by the video element itself
  
  // Update playback speed when changed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Toggle subtitles when captionsOn changes
  useEffect(() => {
    if (videoRef.current && videoRef.current.textTracks.length > 0) {
      const textTrack = videoRef.current.textTracks[0];
      textTrack.mode = captionsOn ? 'showing' : 'hidden';
    }
  }, [captionsOn]);

  // Handle episode change - don't manually load/play, let the HLS effect handle it
  useEffect(() => {
    setIsPlaying(true);
    setCurrentTime(0);
  }, [episode.id]);

  // Handle overlay auto-hide
  useEffect(() => {
    if (showOverlay && isPlaying && !isNearEnd) {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = window.setTimeout(() => {
        setShowOverlay(false);
      }, 3000);
    }

    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    };
  }, [showOverlay, isPlaying, isNearEnd]);

  const handleScreenTap = () => {
    setShowOverlay(!showOverlay);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
      if (!isPlaying) {
        setShowOverlay(true);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle press and hold for Lock and Gear
  const handleLockMouseDown = () => {
    let progress = 0;
    lockTimerRef.current = window.setInterval(() => {
      progress += 5;
      setLockHoldProgress(progress);
      if (progress >= 100) {
        if (lockTimerRef.current) clearInterval(lockTimerRef.current);
        // TODO: Implement lock functionality
        setLockHoldProgress(0);
      }
    }, 100);
  };

  const handleLockMouseUp = () => {
    if (lockTimerRef.current) {
      clearInterval(lockTimerRef.current);
      setLockHoldProgress(0);
    }
  };

  const handleGearMouseDown = () => {
    let progress = 0;
    gearTimerRef.current = window.setInterval(() => {
      progress += 5;
      setGearHoldProgress(progress);
      if (progress >= 100) {
        if (gearTimerRef.current) clearInterval(gearTimerRef.current);
        setShowGearPopup(true);
        setGearHoldProgress(0);
      }
    }, 100);
  };

  const handleGearMouseUp = () => {
    if (gearTimerRef.current) {
      clearInterval(gearTimerRef.current);
      setGearHoldProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video Content */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={handleScreenTap}
      >
        {/* Actual Video Player */}
        <video
          ref={videoRef}
          poster={episode.thumbnail}
          className="w-full h-full object-contain bg-black"
          playsInline
          autoPlay
          crossOrigin="anonymous"
          onTimeUpdate={(e) => {
            const time = e.currentTarget.currentTime;
            setCurrentTime(time);
            onTimeUpdate?.(time);
          }}
          onLoadedMetadata={(e) => {
            // Update duration from actual video
            const videoDuration = e.currentTarget.duration;
            if (videoDuration && !isNaN(videoDuration)) {
              // Duration is already set from episode data
            }
            
            // Enable/disable text tracks based on captions setting
            const video = e.currentTarget;
            if (video.textTracks.length > 0) {
              video.textTracks[0].mode = captionsOn ? 'showing' : 'hidden';
            }
          }}
          onEnded={() => {
            if (autoplay && nextEpisode && onPlayNext) {
              onPlayNext();
            } else {
              setIsPlaying(false);
              setShowOverlay(true);
            }
          }}
          onError={(e) => {
            console.error('Video playback error:', e);
            setVideoError('Failed to load video');
          }}
          onPlaying={() => {
            // Clear error once video is actually playing
            setVideoError(null);
          }}
        >
          {/* Subtitle tracks */}
          {episode.subtitles && Object.entries(episode.subtitles).map(([lang, url]) => (
            <track
              key={lang}
              kind="subtitles"
              src={url}
              srcLang={lang}
              label={lang === 'en' ? 'English' : lang === 'zh' ? 'Chinese' : lang}
              default={lang === 'en'}
            />
          ))}
        </video>

        {/* Error Message Overlay */}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-8">
              <p className="text-white text-2xl mb-4">⚠️ {videoError}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setVideoError(null);
                  // Retry loading
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(console.error);
                  }
                }}
                className="bg-[#24BFE6] hover:bg-[#1da5c9] text-white px-8 py-3 rounded-full font-bold"
              >
                Retry
              </motion.button>
            </div>
          </div>
        )}

        {/* Teaching Overlay (shows for 2 seconds) */}
        <AnimatePresence>
          {showTeachingOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center">
                <p className="text-white text-2xl mb-4">👆 Tap anywhere to show controls</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Overlay Controls */}
        <AnimatePresence>
          {(showOverlay || !isPlaying) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Controls */}
              <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
                {/* Back Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="w-8 h-8 text-white" />
                </motion.button>

                {/* Lock and Gear */}
                <div className="flex items-center gap-4">
                  {/* Lock Button (Press & Hold) */}
                  <div className="relative">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onMouseDown={handleLockMouseDown}
                      onMouseUp={handleLockMouseUp}
                      onMouseLeave={handleLockMouseUp}
                      onTouchStart={handleLockMouseDown}
                      onTouchEnd={handleLockMouseUp}
                      className="bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/30 transition-colors relative overflow-hidden"
                    >
                      <Lock className="w-8 h-8 text-white relative z-10" />
                      {lockHoldProgress > 0 && (
                        <div
                          className="absolute inset-0 bg-[#24BFE6] transition-all"
                          style={{ clipPath: `inset(${100 - lockHoldProgress}% 0 0 0)` }}
                        />
                      )}
                    </motion.button>
                    <p className="text-white/70 text-xs text-center mt-1">Hold 2s</p>
                  </div>

                  {/* Gear Button (Press & Hold) */}
                  <div className="relative">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onMouseDown={handleGearMouseDown}
                      onMouseUp={handleGearMouseUp}
                      onMouseLeave={handleGearMouseUp}
                      onTouchStart={handleGearMouseDown}
                      onTouchEnd={handleGearMouseUp}
                      className="bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/30 transition-colors relative overflow-hidden"
                    >
                      <Settings className="w-8 h-8 text-white relative z-10" />
                      {gearHoldProgress > 0 && (
                        <div
                          className="absolute inset-0 bg-[#24BFE6] transition-all"
                          style={{ clipPath: `inset(${100 - gearHoldProgress}% 0 0 0)` }}
                        />
                      )}
                    </motion.button>
                    <p className="text-white/70 text-xs text-center mt-1">Hold 2s</p>
                  </div>
                </div>
              </div>

              {/* Episode Metadata Section */}
              <div className="absolute top-24 left-6 right-6 max-w-2xl">
                <h2 className="text-white text-2xl font-bold mb-2">
                  {episode.title}
                </h2>
                
                {/* Metadata Badges Row */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {/* AR Level Badge */}
                  {episode.arLevel !== undefined && (
                    <div className="bg-[#24BFE6] text-white text-sm font-bold px-3 py-1 rounded-full">
                      AR {episode.arLevel.toFixed(1)}
                    </div>
                  )}
                  
                  {/* Content Type Badge */}
                  {episode.isSong && (
                    <div className="flex items-center gap-1 bg-purple-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                      <Music className="w-4 h-4" />
                      <span>Song</span>
                    </div>
                  )}
                  {episode.isLullaby && (
                    <div className="flex items-center gap-1 bg-purple-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                      <Moon className="w-4 h-4" />
                      <span>Lullaby</span>
                    </div>
                  )}
                  {episode.isAnimation && (
                    <div className="flex items-center gap-1 bg-purple-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                      <Film className="w-4 h-4" />
                      <span>Animation</span>
                    </div>
                  )}
                  {episode.isDance && (
                    <div className="flex items-center gap-1 bg-purple-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                      <Zap className="w-4 h-4" />
                      <span>Dance</span>
                    </div>
                  )}
                  
                  {/* Educational/Entertainment Badge */}
                  {episode.isEducational && (
                    <div className="flex items-center gap-1 bg-green-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                      <GraduationCap className="w-4 h-4" />
                      <span>Educational</span>
                    </div>
                  )}
                  {episode.isEntertainment && (
                    <div className="flex items-center gap-1 bg-pink-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                      <Sparkles className="w-4 h-4" />
                      <span>Entertainment</span>
                    </div>
                  )}
                </div>
                
                {/* Genre Tags */}
                {episode.genres && episode.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {episode.genres.map((genre, idx) => (
                      <span
                        key={idx}
                        className="bg-white/20 backdrop-blur-sm text-white text-sm px-3 py-1 rounded"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Description */}
                {episode.description && (
                  <p className="text-white/90 text-sm mt-2 line-clamp-2">
                    {episode.description}
                  </p>
                )}
              </div>

              {/* Center Controls */}
              {!isNearEnd && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
                  {/* -10 seconds */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => skipTime(-10)}
                    className="bg-white/20 backdrop-blur-sm p-6 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <div className="relative">
                      <SkipBack className="w-10 h-10 text-white" />
                      <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold">
                        10
                      </span>
                    </div>
                  </motion.button>

                  {/* Play/Pause */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={togglePlayPause}
                    className="bg-white/20 backdrop-blur-sm p-8 rounded-full hover:bg-white/30 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-16 h-16 text-white fill-white" />
                    ) : (
                      <Play className="w-16 h-16 text-white fill-white" />
                    )}
                  </motion.button>

                  {/* +10 seconds */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => skipTime(10)}
                    className="bg-white/20 backdrop-blur-sm p-6 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <div className="relative">
                      <SkipForward className="w-10 h-10 text-white" />
                      <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold">
                        10
                      </span>
                    </div>
                  </motion.button>
                </div>
              )}

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                {/* Seek Bar */}
                <div className="mb-4">
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-white text-sm mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Restart and Next Video */}
                <div className="flex items-center justify-between">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play().catch(console.error);
                        setCurrentTime(0);
                        setIsPlaying(true);
                      }
                      onRestart();
                    }}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <RotateCcw className="w-5 h-5 text-white" />
                    <span className="text-white font-bold">Restart</span>
                  </motion.button>

                  {nextEpisode && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onPlayNext}
                      className="flex items-center gap-2 bg-[#24BFE6] hover:bg-[#1da5c9] px-6 py-3 rounded-full transition-colors"
                    >
                      <span className="text-white font-bold">Next Video</span>
                      <FastForward className="w-5 h-5 text-white" />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last 15 Seconds - Next Episode Preview */}
        <AnimatePresence>
          {isNearEnd && nextEpisode && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="absolute inset-0 flex items-center justify-center bg-black/90"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Current video shrunk to left */}
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-3/4 h-3/4">
                <img
                  src={episode.thumbnail}
                  alt={episode.title}
                  className="w-full h-full object-cover rounded-r-2xl"
                />
              </div>

              {/* Next episode preview on right */}
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1/2 h-full flex flex-col items-center justify-center p-8">
                <img
                  src={nextEpisode.thumbnail}
                  alt={nextEpisode.title}
                  className="w-full aspect-video object-cover rounded-2xl shadow-2xl mb-6"
                />
                <h3 className="text-white text-2xl mb-2">Up Next</h3>
                <p className="text-white text-xl mb-6">
                  S{nextEpisode.seasonNumber} E{nextEpisode.episodeNumber}: {nextEpisode.title}
                </p>

                {/* Large Play Next Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPlayNext}
                  className="bg-[#24BFE6] hover:bg-[#1da5c9] text-white px-12 py-4 rounded-full text-xl font-bold mb-4"
                >
                  ▶️ Play Next
                </motion.button>

                {/* Restart Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play().catch(console.error);
                      setCurrentTime(0);
                      setIsPlaying(true);
                    }
                    onRestart();
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white px-8 py-3 rounded-full font-bold"
                >
                  🔄 Restart
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gear Popup */}
      <AnimatePresence>
        {showGearPopup && (
          <VideoGearPopup
            autoplay={autoplay}
            speed={speed}
            captionsOn={captionsOn}
            onAutoplayChange={setAutoplay}
            onSpeedChange={setSpeed}
            onCaptionsChange={setCaptionsOn}
            onClose={() => setShowGearPopup(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
