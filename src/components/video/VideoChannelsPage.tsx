import { motion } from "motion/react";
import { VideoChannelCard } from "./VideoChannelCard";
import { Channel } from "../../lib/videoMockData";
import { Tv, Sparkles, Star, Rocket } from "lucide-react";

interface ChannelsPageProps {
  channels: Channel[];
  onChannelClick: (channelId: string) => void;
}

export function VideoChannelsPage({ channels, onChannelClick }: ChannelsPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="w-full px-6 py-12">
        {/* Page Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-12 text-center relative"
        >
          {/* Floating Icons */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-4 left-1/4 hidden md:block"
          >
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
          </motion.div>
          
          <motion.div
            animate={{
              y: [0, -15, 0],
              rotate: [0, -10, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute top-0 right-1/4 hidden md:block"
          >
            <Sparkles className="w-7 h-7 text-[#24BFE6]" />
          </motion.div>

          <motion.div
            animate={{
              y: [0, -12, 0],
              x: [0, 5, 0],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute -top-2 right-1/3 hidden lg:block"
          >
            <Rocket className="w-6 h-6 text-orange-400" />
          </motion.div>

          {/* Main Title with Gradient Background */}
          <div className="inline-block mb-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 10 
              }}
              className="bg-gradient-to-r from-[#24BFE6] to-[#003546] p-8 rounded-3xl shadow-xl relative overflow-hidden"
            >
              {/* Animated Background Pattern */}
              <motion.div
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />
              
              <div className="relative">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Tv className="w-16 h-16 text-white" />
                  </motion.div>
                  <h1 className="text-white text-5xl md:text-6xl">
                    🎉 Explore Channels! 🎉
                  </h1>
                </div>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/95 text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed"
                >
                  ✨ Discover amazing shows and learning adventures! 🚀
                </motion.p>
              </div>
            </motion.div>
          </div>

          {/* Fun Sub-message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-yellow-100 border-4 border-yellow-300 rounded-2xl p-4 max-w-lg mx-auto shadow-lg"
          >
            <p className="text-[#003546] text-lg">
              🌟 Pick your favorite channel and start watching! 🌟
            </p>
          </motion.div>
        </motion.div>

        {/* Channel Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {channels.map((channel, index) => (
            <motion.div
              key={channel.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <VideoChannelCard
                channel={channel}
                onClick={() => onChannelClick(channel.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
