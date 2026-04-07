import React, { useRef, useEffect } from 'react';
import { HoverDetectorProps } from '../types/epicNavigation';

/**
 * Invisible overlay component that detects mouse enter/leave events
 * for the entire book row area, including the navigation arrows
 * 
 * Features:
 * - Covers the entire container area
 * - Maintains hover state when moving between children and arrows
 * - Configurable hover delay
 * - Accessible to screen readers but invisible visually
 * - Keyboard navigation support with focus management
 * - Logical tab order through navigation elements
 */
export default function HoverDetector({
  onHoverStart,
  onHoverEnd,
  children,
  className = ''
}: Omit<HoverDetectorProps, 'hoverDelay'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleMouseEnter = (e: React.MouseEvent) => {
    // Only trigger if we're entering from outside the container
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !(relatedTarget instanceof Node) || !e.currentTarget.contains(relatedTarget)) {
      onHoverStart();
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Only trigger if we're leaving to outside the container
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !(relatedTarget instanceof Node) || !e.currentTarget.contains(relatedTarget)) {
      onHoverEnd();
    }
  };

  const handleFocus = (e: React.FocusEvent) => {
    // Show navigation when any child element receives focus
    if (containerRef.current?.contains(e.target as Node)) {
      onHoverStart();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Hide navigation when focus leaves the container entirely
    // Use setTimeout to allow focus to move to another element first
    setTimeout(() => {
      if (containerRef.current && 
          !containerRef.current.contains(document.activeElement)) {
        onHoverEnd();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle arrow key navigation at the container level
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Let the navigation arrows handle their own arrow key events
      // This is just for container-level keyboard navigation
      const navigationButtons = containerRef.current?.querySelectorAll(
        '.epic-navigation-arrow:not([disabled])'
      );
      
      if (navigationButtons && navigationButtons.length > 0) {
        const currentFocus = document.activeElement;
        const currentIndex = Array.from(navigationButtons).indexOf(currentFocus as Element);
        
        if (currentIndex === -1) {
          // No navigation button is focused, focus the appropriate one
          if (e.key === 'ArrowLeft') {
            (navigationButtons[0] as HTMLElement).focus();
          } else {
            (navigationButtons[navigationButtons.length - 1] as HTMLElement).focus();
          }
          e.preventDefault();
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`relative ${className}`}
      role="region"
      aria-label="Book navigation area"
      aria-describedby="epic-nav-instructions"
    >
      {children}
      {/* Screen reader instructions */}
      <div 
        id="epic-nav-instructions" 
        className="sr-only"
        aria-live="polite"
      >
        Use arrow keys or tab to navigate between books. 
        Press Enter or Space to scroll through the collection.
      </div>
    </div>
  );
}