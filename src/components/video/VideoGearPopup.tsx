import { motion } from "motion/react";
import { X, AlertTriangle } from "lucide-react";
import { Switch } from "./ui/switch";

interface GearPopupProps {
  autoplay: boolean;
  speed: 1.0 | 0.75;
  captionsOn: boolean;
  onAutoplayChange: (value: boolean) => void;
  onSpeedChange: (value: 1.0 | 0.75) => void;
  onCaptionsChange: (value: boolean) => void;
  onClose: () => void;
}

export function VideoGearPopup({
  autoplay,
  speed,
  captionsOn,
  onAutoplayChange,
  onSpeedChange,
  onCaptionsChange,
  onClose,
}: GearPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#003546] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#24BFE6] p-6">
          <h2 className="text-white text-2xl text-center font-bold">⚙️ Settings</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Autoplay */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold mb-1">Autoplay</h3>
              <p className="text-white/70 text-sm">Play next episode automatically</p>
            </div>
            <Switch checked={autoplay} onCheckedChange={onAutoplayChange} />
          </div>

          {/* Speed */}
          <div>
            <h3 className="text-white font-bold mb-3">Playback Speed</h3>
            <div className="flex gap-3">
              <button
                onClick={() => onSpeedChange(1.0)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  speed === 1.0
                    ? "bg-[#24BFE6] text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Normal 1.0×
              </button>
              <button
                onClick={() => onSpeedChange(0.75)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  speed === 0.75
                    ? "bg-[#24BFE6] text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Slow 0.75×
              </button>
            </div>
          </div>

          {/* Captions */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold mb-1">Captions</h3>
              <p className="text-white/70 text-sm">Show subtitles</p>
            </div>
            <Switch checked={captionsOn} onCheckedChange={onCaptionsChange} />
          </div>

          {/* Report */}
          <button className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Report Video
          </button>
        </div>

        {/* Close Button */}
        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-full font-bold transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
