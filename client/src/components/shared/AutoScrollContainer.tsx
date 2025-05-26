import React, { useEffect, useRef, ReactNode, useCallback } from 'react';

interface AutoScrollContainerProps {
  children: ReactNode;
  className?: string;
  shouldScroll?: boolean;
  scrollBehavior?: 'smooth' | 'auto';
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

export const AutoScrollContainer: React.FC<AutoScrollContainerProps> = ({
  children,
  className = '',
  shouldScroll = true,
  scrollBehavior = 'smooth',
  onScroll
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (shouldScroll && containerRef.current && !isUserScrollingRef.current) {
      const container = containerRef.current;

      if (scrollBehavior === 'smooth') {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [shouldScroll, scrollBehavior]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;

    // Update user scrolling state
    isUserScrollingRef.current = !isNearBottom;

    // Call external scroll handler if provided
    if (onScroll) {
      onScroll(event);
    }
  }, [onScroll]);

  useEffect(() => {
    // Debounce scroll to bottom to avoid excessive scrolling
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [children, scrollToBottom]);

  // Reset user scrolling state when new content arrives
  useEffect(() => {
    isUserScrollingRef.current = false;
  }, [children]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      onScroll={handleScroll}
      style={{ 
        overflowY: 'auto',
        scrollBehavior: scrollBehavior === 'smooth' ? 'smooth' : 'auto'
      }}
    >
      {children}
    </div>
  );
};