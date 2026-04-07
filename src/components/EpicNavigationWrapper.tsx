import React, { useEffect, useRef } from 'react';
import { EpicNavigationWrapperProps, DEFAULT_EPIC_CONFIG } from '../types/epicNavigation';
import { useEpicNavigation } from '../hooks/useEpicNavigation';
import NavigationArrow from './NavigationArrow';
import HoverDetector from './HoverDetector';

/**
 * Epic Navigation Wrapper Component
 * 
 * Wraps any horizontal scrolling container with Epic-style navigation arrows
 * that are hidden by default and only appear on hover.
 * 
 * Features:
 * - Hidden by default, shown on hover
 * - Smooth fade-in/fade-out animations
 * - Full keyboard accessibility with logical tab order
 * - Configurable appearance and behavior
 * - Maintains hover state when moving between content and arrows
 * - Proper positioning without content overlap
 * - Screen reader support with ARIA labels
 * - Respects prefers-reduced-motion settings
 */
export default function EpicNavigationWrapper({
  children,
  scrollContainerId,
  className = '',
  arrowSize = DEFAULT_EPIC_CONFIG.arrowSize,
  arrowColor = DEFAULT_EPIC_CONFIG.arrowColor,
  hoverDelay = DEFAULT_EPIC_CONFIG.hoverDelay,
  fadeDelay = DEFAULT_EPIC_CONFIG.fadeDelay,
  scrollAmount = DEFAULT_EPIC_CONFIG.scrollAmount
}: EpicNavigationWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const {
    isHovered,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur
  } = useEpicNavigation({
    scrollContainerId,
    scrollAmount,
    hoverDelay,
    fadeDelay
  });

  // Handle keyboard navigation at the wrapper level
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle if focus is within our wrapper
      if (!wrapperRef.current?.contains(document.activeElement)) {
        return;
      }

      // Handle arrow keys for navigation
      if (e.key === 'ArrowLeft' && canScrollLeft) {
        e.preventDefault();
        scrollLeft();
        // Announce to screen readers
        announceToScreenReader('Scrolled left through books');
      } else if (e.key === 'ArrowRight' && canScrollRight) {
        e.preventDefault();
        scrollRight();
        // Announce to screen readers
        announceToScreenReader('Scrolled right through books');
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [canScrollLeft, canScrollRight, scrollLeft, scrollRight]);

  // Function to announce actions to screen readers
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  return (
    <HoverDetector
      onHoverStart={handleMouseEnter}
      onHoverEnd={handleMouseLeave}
      className={`epic-navigation-container ${className}`}
    >
      <div 
        ref={wrapperRef}
        className="relative"
        role="group"
        aria-label="Book collection with navigation"
        aria-describedby="epic-nav-help"
      >
        {/* Left Arrow - Always show when hovered, like Epic Games Store */}
        <div className="epic-navigation-left-container">
          <NavigationArrow
            direction="left"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            size={arrowSize}
            color={arrowColor}
            visible={isHovered} // Always show when hovered, regardless of scroll state
            className="shadow-lg"
          />
        </div>

        {/* Right Arrow - Always show when hovered, like Epic Games Store */}
        <div className="epic-navigation-right-container">
          <NavigationArrow
            direction="right"
            onClick={scrollRight}
            disabled={!canScrollRight}
            size={arrowSize}
            color={arrowColor}
            visible={isHovered} // Always show when hovered, regardless of scroll state
            className="shadow-lg"
          />
        </div>

        {/* Content with proper spacing and accessibility */}
        <div 
          className="epic-navigation-content"
          role="region"
          aria-label="Book collection"
        >
          {children}
        </div>

        {/* Hidden help text for screen readers */}
        <div 
          id="epic-nav-help" 
          className="sr-only"
        >
          Navigate through books using arrow keys, tab key, or hover to reveal navigation buttons. 
          {canScrollLeft && 'Press left arrow or left navigation button to see previous books. '}
          {canScrollRight && 'Press right arrow or right navigation button to see more books.'}
          {!canScrollLeft && !canScrollRight && 'All books in this collection are currently visible.'}
        </div>
      </div>
    </HoverDetector>
  );
}