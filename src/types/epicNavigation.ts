// Epic Navigation Types and Interfaces

export interface EpicNavigationConfig {
  arrowSize: 'small' | 'medium' | 'large';
  arrowColor: string;
  backgroundColor: string;
  hoverDelay: number;
  fadeDelay: number;
  scrollAmount: number;
  animationDuration: number;
}

export interface NavigationState {
  isHovered: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollPosition: number;
  isScrolling: boolean;
}

export interface EpicNavigationWrapperProps {
  children: React.ReactNode;
  scrollContainerId: string;
  className?: string;
  arrowSize?: 'small' | 'medium' | 'large';
  arrowColor?: string;
  hoverDelay?: number;
  fadeDelay?: number;
  scrollAmount?: number;
}

export interface NavigationArrowProps {
  direction: 'left' | 'right';
  onClick: () => void;
  disabled: boolean;
  size: 'small' | 'medium' | 'large';
  color: string;
  visible: boolean;
  className?: string;
}

export interface HoverDetectorProps {
  onHoverStart: () => void;
  onHoverEnd: () => void;
  children: React.ReactNode;
  hoverDelay?: number;
  className?: string;
}

export interface UseEpicNavigationProps {
  scrollContainerId: string;
  scrollAmount?: number;
  hoverDelay?: number;
  fadeDelay?: number;
}

export interface UseEpicNavigationReturn {
  isHovered: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollLeft: () => void;
  scrollRight: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handleFocus: () => void;
  handleBlur: () => void;
}

// Default configuration values - Epic Games Store Style with ShuSpot Branding
export const DEFAULT_EPIC_CONFIG: EpicNavigationConfig = {
  arrowSize: 'large',
  arrowColor: '#a2cfd2', // ShuSpot teal green
  backgroundColor: '#ffffff', // Pure white background
  hoverDelay: 100,
  fadeDelay: 200, // Faster fade for Epic style
  scrollAmount: 400,
  animationDuration: 200
};

// Size mappings for arrows
export const ARROW_SIZE_MAP = {
  small: {
    width: 'w-8 h-8',
    icon: 'w-4 h-4',
    padding: 'p-2'
  },
  medium: {
    width: 'w-10 h-10',
    icon: 'w-5 h-5',
    padding: 'p-2.5'
  },
  large: {
    width: 'w-12 h-12',
    icon: 'w-6 h-6',
    padding: 'p-3'
  }
} as const;