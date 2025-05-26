
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRobustTypewriterOptions {
  speed?: number;
  maxRetries?: number;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export const useRobustTypewriter = (
  text: string,
  options: UseRobustTypewriterOptions = {}
) => {
  const {
    speed = 30,
    maxRetries = 3,
    onError,
    onComplete
  } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const animationRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setDisplayedText('');
    setIsTyping(false);
    indexRef.current = 0;
    startTimeRef.current = null;
  }, [cleanup]);

  const animate = useCallback((timestamp: number) => {
    try {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const targetIndex = Math.floor(elapsed / speed);

      if (targetIndex > indexRef.current && indexRef.current < text.length) {
        indexRef.current = Math.min(targetIndex, text.length);
        
        // Validate text slicing
        if (indexRef.current < 0 || indexRef.current > text.length) {
          throw new Error(`Invalid index: ${indexRef.current} for text length: ${text.length}`);
        }
        
        setDisplayedText(text.slice(0, indexRef.current));

        if (indexRef.current < text.length) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsTyping(false);
          onComplete?.();
        }
      } else if (indexRef.current < text.length) {
        animationRef.current = requestAnimationFrame(animate);
      }
    } catch (err) {
      const error = err as Error;
      console.error('Animation error:', error);
      setError(error);
      setIsTyping(false);
      
      // Attempt recovery
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          reset();
          setError(null);
        }, 1000);
      } else {
        // Fallback: show full text
        setDisplayedText(text);
        onError?.(error);
      }
    }
  }, [text, speed, onComplete, onError, reset, retryCount, maxRetries]);

  useEffect(() => {
    // Validate input
    if (typeof text !== 'string') {
      const error = new Error(`Invalid text type: ${typeof text}`);
      setError(error);
      onError?.(error);
      return;
    }

    if (text.length === 0) {
      setDisplayedText('');
      return;
    }

    // Reset and start animation
    reset();
    setIsTyping(true);
    setError(null);
    
    // Start with a small delay to ensure proper initialization
    const timeoutId = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, [text, animate, reset, cleanup, onError]);

  const skipToEnd = useCallback(() => {
    cleanup();
    setDisplayedText(text);
    setIsTyping(false);
    indexRef.current = text.length;
    onComplete?.();
  }, [text, cleanup, onComplete]);

  const retry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    reset();
  }, [reset]);

  return {
    displayedText,
    isTyping,
    error,
    skipToEnd,
    retry,
    progress: text.length > 0 ? (displayedText.length / text.length) : 0
  };
};
