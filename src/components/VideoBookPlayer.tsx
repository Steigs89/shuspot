import { useState, useRef } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Heart, X } from 'lucide-react';

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
  const [duration, setDuration] = useState(uploadedVideo ? uploadedVideo.duration : 245); // Use uploaded video duration or default
  const [hasTrackedCompletion, setHasTrackedCompletion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white hover:text-blue-200 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-2xl font-superclarendon-bold text-white text-center flex-1">
          {bookTitle}
        </h1>

        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleFavorite}
            className={`transition-colors ${isFavorited ? 'text-red-400' : 'text-white hover:text-red-400'}`}
          >
            <Heart className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={onBack}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* Main Video Player */}
        <div className="flex-1">
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
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
                          onProgressUpdate(uploadedVideo.id, 1, Math.round(duration / 60)); // 1 "page" for video completion, duration in minutes
                          console.log('Video completion tracked:', uploadedVideo.title);
                          
                          // Show completion message
                          setTimeout(() => {
                            alert(`🎉 Congratulations! You've watched "${uploadedVideo.title}"! Great job!`);
                          }, 1000);
                        }
                      }
                    }}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onEnded={() => {
                      setIsPlaying(false);
                      
                      // Track completion when video ends (if not already tracked)
                      if (!hasTrackedCompletion && uploadedVideo && onProgressUpdate) {
                        setHasTrackedCompletion(true);
                        onProgressUpdate(uploadedVideo.id, 1, Math.round(duration / 60)); // 1 "page" for video completion
                        console.log('Video completion tracked on end:', uploadedVideo.title);
                        
                        // Show completion message
                        setTimeout(() => {
                          alert(`🎉 Congratulations! You've watched "${uploadedVideo.title}"! Great job!`);
                        }, 500);
                      }
                    }}
                    onClick={togglePlay}
                    muted={isMuted}
                  />

                  {/* Play Button Overlay */}
                  {!isPlaying && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
                    >
                      <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Play className="w-8 h-8 text-gray-800 ml-1" />
                      </div>
                    </button>
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
                  {!isPlaying && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
                    >
                      <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Play className="w-8 h-8 text-gray-800 ml-1" />
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <div
                  className="w-full bg-white/30 rounded-full h-2 cursor-pointer"
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
                  <div
                    className="bg-gradient-to-r from-pink-400 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-pink-300 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-pink-300 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>

                  <span className="text-white text-sm font-medium">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <button className="text-white hover:text-pink-300 transition-colors">
                  <Maximize className="w-6 h-6" />
                </button>
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