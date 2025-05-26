
import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface AutoScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  scrollTrigger?: any; // Dependency to trigger scroll
}

export const AutoScrollContainer: React.FC<AutoScrollContainerProps> = ({
  children,
  className = '',
  scrollTrigger
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!containerRef.current || isUserScrolling) return;

    const container = containerRef.current;
    const shouldScroll = container.scrollHeight > container.clientHeight;

    if (shouldScroll) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [scrollTrigger, isUserScrolling]);

  const handleScroll = () => {
    setIsUserScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (container) {
        const isAtBottom = 
          container.scrollHeight - container.scrollTop <= 
          container.clientHeight + 50; // 50px threshold
        
        if (isAtBottom) {
          setIsUserScrolling(false);
        }
      }
    }, 1000);
  };

  const scrollToBottom = () => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth'
    });
    setIsUserScrolling(false);
  };

  const opacity = useTransform(scrollYProgress, [0.8, 1], [1, 0]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`overflow-y-auto scroll-smooth ${className}`}
      >
        {children}
      </div>
      
      {/* Scroll to bottom indicator */}
      <motion.div
        style={{ opacity }}
        className="absolute bottom-4 right-4 z-10"
      >
        <Button
          size="sm"
          variant="secondary"
          onClick={scrollToBottom}
          className="shadow-lg"
        >
          <ArrowDown className="w-4 h-4 mr-1" />
          Scroll to bottom
        </Button>
      </motion.div>
    </div>
  );
};
