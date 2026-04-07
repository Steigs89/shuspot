import { motion } from "motion/react";
import { Channel } from "../../lib/videoMockData";
import { Heart } from "lucide-react";
import { useState } from "react";

interface ChannelCardProps {
  channel: Channel;
  onClick: () => void;
}

export function VideoChannelCard({ channel, onClick }: ChannelCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsFavorite(!isFavorite);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-shadow hover:shadow-2xl relative">
        {/* Banner Image */}
        <div className="relative h-40 bg-gradient-to-br from-[#24BFE6] to-[#003546]">
          <img
            src={channel.banner}
            alt={channel.name}
            className="w-full h-full object-cover"
          />
          {/* Channel Logo - overlaid at bottom-left */}
          <div className="absolute -bottom-8 left-6">
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
              <img
                src={channel.logo}
                alt={`${channel.name} logo`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Channel Info */}
        <div className="pt-12 pb-6 px-6">
          <h3 className="mb-2 text-[#003546] font-bold">{channel.name}</h3>
          <p className="text-gray-600">{channel.description}</p>
        </div>

        {/* Favorite Heart Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleFavoriteClick}
          className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow z-10"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite
                ? "fill-red-500 text-red-500"
                : "text-gray-400 hover:text-red-500"
            }`}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}