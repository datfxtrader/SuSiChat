
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypewriterOptions {
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  skipAnimation?: boolean;
}

export const useTypewriter = (
  text: string,
  options: UseTypewriterOptions = {}
) => {
  const {
    speed = 30, // ms per character (Claude-like speed)
    delay = 0,
    onComplete,
    skipAnimation = false
  } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const skipToEnd = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDisplayedText(text);
    setIsTyping(false);
    setIsComplete(true);
    onComplete?.();
  }, [text, onComplete]);

  useEffect(() => {
    if (skipAnimation) {
      skipToEnd();
      return;
    }

    setDisplayedText('');
    setIsTyping(false);
    setIsComplete(false);

    timeoutRef.current = setTimeout(() => {
      let currentIndex = 0;
      setIsTyping(true);

      intervalRef.current = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsTyping(false);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);
    }, delay);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, speed, delay, onComplete, skipAnimation, skipToEnd]);

  return {
    displayedText,
    isTyping,
    isComplete,
    skipToEnd
  };
};
