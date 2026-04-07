import { motion } from "motion/react";
import { X, Maximize2 } from "lucide-react";
import { Episode } from "../../lib/videoMockData";

interface MiniPlayerProps {
  episode: Episode;
  currentTime: number;
  duration: number;
  onClose: () => void;
  onMaximize: () => void;
}

export function VideoMiniPlayer({ episode, currentTime, duration, onClose, onMaximize }: MiniPlayerProps) {
  const progress = (currentTime / duration) * 100;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 right-4 z-40 w-80"
    >
      <div className="bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-[#24BFE6]">
        {/* Video thumbnail with overlay */}
        <div 
          className="relative aspect-video bg-gradient-to-br from-[#003546] to-[#24BFE6] cursor-pointer group"
          onClick={onMaximize}
        >
          <img 
            src={episode.thumbnail}
            alt={episode.title}
            className="w-full h-full object-cover"
          />
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-12 h-12 text-white" />
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div 
              className="h-full bg-[#24BFE6]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#003546] p-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate font-bold">
              {episode.title}
            </p>
            <p className="text-white/70 text-xs">
              S{episode.seasonNumber} E{episode.episodeNumber}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-2">
            {/* Fullscreen button */}
            <button
              onClick={onMaximize}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
