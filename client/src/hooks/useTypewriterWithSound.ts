
import { useEffect, useRef } from 'react';
import { useTypewriter } from './useTypewriter';
import { SoundManager } from '@/services/soundManager';

interface UseTypewriterWithSoundOptions {
  speed?: number;
  soundInterval?: number; // Play sound every N characters
  onComplete?: () => void;
  enableSound?: boolean;
}

export const useTypewriterWithSound = (
  text: string,
  options: UseTypewriterWithSoundOptions = {}
) => {
  const {
    speed = 30,
    soundInterval = 3, // Play sound every 3 characters
    onComplete,
    enableSound = true
  } = options;

  const soundManager = SoundManager.getInstance();
  const lastSoundIndexRef = useRef(0);
  const prevLengthRef = useRef(0);

  const typewriterResult = useTypewriter(text, {
    speed,
    onComplete: () => {
      if (enableSound && soundManager.isEnabled()) {
        soundManager.play('typewriter-bell');
      }
      onComplete?.();
    }
  });

  const { displayedText } = typewriterResult;

  useEffect(() => {
    if (!enableSound || !soundManager.isEnabled()) return;

    const currentLength = displayedText.length;
    
    // Play sound for new characters
    if (currentLength > prevLengthRef.current) {
      const newChars = currentLength - prevLengthRef.current;
      
      for (let i = 0; i < newChars; i++) {
        const charIndex = prevLengthRef.current + i;
        
        // Play sound at intervals
        if (charIndex - lastSoundIndexRef.current >= soundInterval) {
          // Slight delay for more realistic effect
          setTimeout(() => {
            soundManager.play('typewriter-key');
          }, i * 10);
          lastSoundIndexRef.current = charIndex;
        }
      }
    }
    
    prevLengthRef.current = currentLength;
  }, [displayedText, soundInterval, enableSound, soundManager]);

  return typewriterResult;
};
