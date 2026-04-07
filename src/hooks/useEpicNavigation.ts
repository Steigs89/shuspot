import { useState, useEffect, useCallback, useRef } from 'react';
import { UseEpicNavigationProps, UseEpicNavigationReturn, DEFAULT_EPIC_CONFIG } from '../types/epicNavigation';

/**
 * Custom hook for managing Epic navigation state and scroll behavior
 * Handles hover detection, scroll position tracking, and navigation actions
 */
export function useEpicNavigation({
  scrollContainerId,
  scrollAmount = DEFAULT_EPIC_CONFIG.scrollAmount,
  hoverDelay = DEFAULT_EPIC_CONFIG.hoverDelay,
  fadeDelay = DEFAULT_EPIC_CONFIG.fadeDelay
}: UseEpicNavigationProps): UseEpicNavigationReturn {
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Update scroll button states based on container scroll position
   */
  const updateScrollButtons = useCallback((container: HTMLElement) => {
    if (!container) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  /**
   * Get scroll container element
   */
  const getScrollContainer = useCallback((): HTMLElement | null => {
    return document.getElementById(scrollContainerId);
  }, [scrollContainerId]);

  /**
   * Handle scroll events to update button states
   */
  const handleScroll = useCallback(() => {
    const container = getScrollContainer();
    if (container) {
      updateScrollButtons(container);
    }
  }, [getScrollContainer, updateScrollButtons]);

  /**
   * Initialize scroll button states
   */
  useEffect(() => {
    const container = getScrollContainer();
    if (container) {
      updateScrollButtons(container);
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      // Also listen for resize events that might affect scroll state
      const handleResize = () => updateScrollButtons(container);
      window.addEventListener('resize', handleResize);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [scrollContainerId, handleScroll, getScrollContainer, updateScrollButtons]);

  /**
   * Scroll left action
   */
  const scrollLeft = useCallback(() => {
    const container = getScrollContainer();
    if (container) {
      container.scrollBy({ 
        left: -scrollAmount, 
        behavior: 'smooth' 
      });
      
      // Update button states after scroll animation
      setTimeout(() => updateScrollButtons(container), 300);
    }
  }, [getScrollContainer, scrollAmount, updateScrollButtons]);

  /**
   * Scroll right action
   */
  const scrollRight = useCallback(() => {
    const container = getScrollContainer();
    if (container) {
      container.scrollBy({ 
        left: scrollAmount, 
        behavior: 'smooth' 
      });
      
      // Update button states after scroll animation
      setTimeout(() => updateScrollButtons(container), 300);
    }
  }, [getScrollContainer, scrollAmount, updateScrollButtons]);

  /**
   * Handle mouse enter with delay
   */
  const handleMouseEnter = useCallback(() => {
    // Clear any existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    // Set hover state with delay
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, hoverDelay);
  }, [hoverDelay]);

  /**
   * Handle mouse leave with fade delay
   */
  const handleMouseLeave = useCallback(() => {
    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set fade timeout
    fadeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, fadeDelay);
  }, [fadeDelay]);

  /**
   * Handle focus events to show navigation for keyboard users
   */
  const handleFocus = useCallback(() => {
    // Clear any existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    
    // Show immediately for keyboard users
    setIsHovered(true);
  }, []);

  /**
   * Handle blur events to hide navigation when focus leaves
   */
  const handleBlur = useCallback(() => {
    // Use a short delay to allow focus to move to navigation buttons
    fadeTimeoutRef.current = setTimeout(() => {
      const container = getScrollContainer();
      if (container && !container.contains(document.activeElement)) {
        setIsHovered(false);
      }
    }, 100);
  }, [getScrollContainer]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  return {
    isHovered,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur
  };
}