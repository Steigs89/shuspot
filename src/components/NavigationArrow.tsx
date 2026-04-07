import React from 'react';
import { NavigationArrowProps } from '../types/epicNavigation';

/**
 * Navigation Arrow Component - Epic Games Store Style with ShuSpot Branding
 * 
 * MUCH LARGER teal green half-OVAL arrows (less circular, more elongated horizontally)
 * Completely clean design without any weird highlighting
 * Both arrows always appear on hover, regardless of scroll state
 */
export default function NavigationArrow({
  direction,
  onClick,
  disabled,
  size = 'large',
  color = '#a2cfd2', // ShuSpot teal green
  visible,
  className = ''
}: NavigationArrowProps) {
  // Keep background size the same, use medium icon to avoid white background
  const sizeClasses = ''; // Size handled by CSS (80px × 100px - keep this)
  const iconSize = 'w-14 h-14'; // Medium icon size to avoid white background issues
  
  // Use size parameter to avoid warning (even though CSS handles the actual sizing)
  void size;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        epic-navigation-arrow
        ${sizeClasses}
        ${visible ? 'visible' : 'hidden'}
        ${disabled ? 'opacity-30' : 'opacity-100'}
        ${className}
        flex items-center justify-center
        transition-all duration-200 ease-out
        z-20
        border-0
        hover:scale-105
        active:scale-95
        epic-half-moon
        ${direction === 'left' ? 'epic-half-moon-left' : 'epic-half-moon-right'}
      `}
      style={{ 
        color: disabled ? '#cccccc' : color,
        opacity: visible ? (disabled ? 0.3 : 1) : 0,
        pointerEvents: visible ? 'auto' : 'none',
        cursor: disabled ? 'default' : 'pointer',
        background: 'white',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        appearance: 'none'
      }}
      aria-label={`Navigate ${direction}`}
      tabIndex={visible ? 0 : -1}
    >
      {direction === 'left' ? (
        <svg 
          className={iconSize} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      ) : (
        <svg 
          className={iconSize} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      )}
    </button>
  );
}