export interface ProgressBarProps {
  progress: number; // 0-100
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  className?: string;
}

/**
 * Reusable progress bar component for displaying reading progress
 * 
 * Features:
 * - Smooth animations
 * - Multiple sizes
 * - Optional percentage display
 * - Gradient styling
 * - Accessible
 */
export default function ProgressBar({
  progress,
  showPercentage = false,
  size = 'medium',
  animated = true,
  className = ''
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Size configurations
  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Progress bar container */}
      <div 
        className={`
          relative w-full ${sizeClasses[size]} 
          bg-gray-200 rounded-full overflow-hidden
        `}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Reading progress: ${clampedProgress.toFixed(0)}%`}
      >
        {/* Progress fill */}
        <div
          className={`
            h-full rounded-full
            bg-gradient-to-r from-purple-500 to-pink-500
            ${animated ? 'transition-all duration-500 ease-out' : ''}
          `}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Optional percentage text */}
      {showPercentage && (
        <div className={`
          mt-1 text-gray-600 font-medium ${textSizeClasses[size]}
        `}>
          {clampedProgress.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

/**
 * Compact progress bar with inline percentage
 */
export function ProgressBarInline({
  progress,
  size = 'small',
  className = ''
}: Omit<ProgressBarProps, 'showPercentage' | 'animated'>) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1">
        <ProgressBar progress={clampedProgress} size={size} animated={true} />
      </div>
      <span className="text-xs text-gray-600 font-medium min-w-[3ch]">
        {clampedProgress.toFixed(0)}%
      </span>
    </div>
  );
}

/**
 * Progress bar with label
 */
export function ProgressBarWithLabel({
  progress,
  label = 'Progress',
  size = 'medium',
  className = ''
}: ProgressBarProps & { label?: string }) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 font-medium">{label}</span>
        <span className="text-sm text-gray-600 font-medium">
          {clampedProgress.toFixed(0)}%
        </span>
      </div>
      <ProgressBar progress={clampedProgress} size={size} animated={true} />
    </div>
  );
}

/**
 * Circular progress indicator (for compact displays)
 */
export function CircularProgress({
  progress,
  size = 48,
  strokeWidth = 4,
  className = ''
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      {/* Percentage text */}
      <span className="absolute text-xs font-semibold text-gray-700">
        {clampedProgress.toFixed(0)}%
      </span>
    </div>
  );
}
