import { motion } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';

interface NewTierButtonProps {
  icon?: string;
  label: string;
  selected?: boolean;
  onClick: () => void;
  gradient?: string;
  bgColor?: string;
  borderColor?: string;
  type?: 'pill' | 'card' | 'topic';
  image?: string;
}

export default function NewTierButton({
  icon,
  label,
  selected = false,
  onClick,
  gradient = 'from-gray-200 to-gray-300',
  bgColor = 'bg-gray-100',
  borderColor = 'border-gray-400',
  type = 'pill',
  image,
}: NewTierButtonProps) {
  // Pill type (for levels)
  if (type === 'pill') {
    return (
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        className={`
          relative px-4 py-2 rounded-full font-black text-xs
          transition-all duration-200
          ${selected 
            ? `bg-white border-3 ${borderColor} shadow-lg scale-105 text-gray-900` 
            : `${bgColor} border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:scale-105`
          }
        `}
      >
        {label}
        
        {selected && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#e2d150] rounded-full flex items-center justify-center shadow-md border-2 border-white"
          >
            <Sparkles className="w-3 h-3 text-gray-900" fill="currentColor" />
          </motion.div>
        )}
      </motion.button>
    );
  }

  // Card type (for formats)
  if (type === 'card') {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="relative flex flex-col items-center gap-1.5 group"
        style={{ width: '90px' }}
      >
        {/* Image container with rounded shape */}
        <motion.div
          animate={{
            scale: selected ? 1.05 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`
            w-20 h-20 rounded-2xl overflow-hidden
            transition-all duration-200
            ${selected 
              ? `ring-4 ring-[#e2d150] shadow-2xl` 
              : `ring-2 ring-gray-300 group-hover:ring-gray-400 group-hover:shadow-xl shadow-md`
            }
          `}
        >
          {image ? (
            <img 
              src={image} 
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full ${bgColor} flex items-center justify-center`}>
              <div className="text-3xl">{icon}</div>
            </div>
          )}
        </motion.div>
        
        {/* Label below */}
        <div className={`
          text-xs font-black text-center leading-tight
          transition-colors duration-200
          ${selected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}
        `}>
          {label}
        </div>
        
        {/* Check mark for selected state */}
        {selected && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10"
          >
            <Check className="w-3.5 h-3.5 text-yellow-900 stroke-[3]" />
          </motion.div>
        )}
      </motion.button>
    );
  }

  // Topic type with floating images and varied curved shapes
  if (type === 'topic') {
    // Different curved shape variations for visual interest
    const shapeVariants = [
      'rounded-[45%_55%_50%_50%/55%_50%_50%_45%]', // blob 1
      'rounded-[50%_50%_45%_55%/50%_55%_45%_50%]', // blob 2
      'rounded-[55%_45%_50%_50%/50%_50%_55%_45%]', // blob 3
      'rounded-[50%_50%_50%_50%/60%_40%_60%_40%]', // blob 4
      'rounded-[45%_55%_55%_45%/50%_50%_50%_50%]', // blob 5
    ];
    
    // Use label to deterministically pick a shape
    const shapeIndex = label.length % shapeVariants.length;
    const blobShape = shapeVariants[shapeIndex];

    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="relative flex-shrink-0 flex flex-col items-center gap-2 group"
        style={{ width: '100px' }}
      >
        {/* Curved shape background with gradient */}
        <div className="relative">
          <motion.div
            animate={{
              scale: selected ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`
              w-20 h-20 ${blobShape}
              ${image ? '' : `bg-gradient-to-br ${gradient}`}
              shadow-lg
              transition-all duration-200 overflow-hidden
              ${selected ? 'ring-4 ring-[#e2d150] shadow-2xl' : 'ring-2 ring-white group-hover:ring-gray-300 group-hover:shadow-xl'}
            `}
          >
            {/* Image fills the entire blob shape */}
            {image ? (
              <img 
                src={image} 
                alt={label}
                className="w-full h-full object-cover"
              />
            ) : (
              /* Fallback to icon if no image */
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                  {icon}
                </div>
              </div>
            )}
          </motion.div>
          
          {/* Check mark for selected state */}
          {selected && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10"
            >
              <Check className="w-3.5 h-3.5 text-yellow-900 stroke-[3]" />
            </motion.div>
          )}
        </div>
        
        {/* Label below */}
        <div className={`
          text-xs font-black text-center leading-tight px-1
          transition-colors duration-200
          ${selected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}
        `}>
          {label}
        </div>
      </motion.button>
    );
  }

  return null;
}
