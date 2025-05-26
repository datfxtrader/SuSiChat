
import { useState, useEffect, useCallback } from 'react';

interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  autoplayMedia: boolean;
}

interface AccessibilityContextType {
  preferences: AccessibilityPreferences;
  updatePreference: (key: keyof AccessibilityPreferences, value: boolean) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  focusElement: (elementId: string) => void;
  skipToContent: () => void;
}

const defaultPreferences: AccessibilityPreferences = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  screenReaderMode: false,
  keyboardNavigation: false,
  autoplayMedia: true
};

export const useAccessibility = (): AccessibilityContextType => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [announceRegion, setAnnounceRegion] = useState<HTMLElement | null>(null);

  // Initialize accessibility preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('accessibility-preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.warn('Failed to parse accessibility preferences:', error);
      }
    }

    // Detect system preferences
    const detectSystemPreferences = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      
      setPreferences(prev => ({
        ...prev,
        reducedMotion: mediaQuery.matches,
        highContrast: highContrastQuery.matches
      }));
    };

    detectSystemPreferences();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    mediaQuery.addEventListener('change', detectSystemPreferences);
    highContrastQuery.addEventListener('change', detectSystemPreferences);

    // Setup screen reader announcement region
    const region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.id = 'accessibility-announcements';
    document.body.appendChild(region);
    setAnnounceRegion(region);

    return () => {
      mediaQuery.removeEventListener('change', detectSystemPreferences);
      highContrastQuery.removeEventListener('change', detectSystemPreferences);
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    };
  }, []);

  // Apply accessibility preferences to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply CSS classes based on preferences
    root.classList.toggle('reduce-motion', preferences.reducedMotion);
    root.classList.toggle('high-contrast', preferences.highContrast);
    root.classList.toggle('large-text', preferences.largeText);
    root.classList.toggle('keyboard-nav', preferences.keyboardNavigation);

    // Save to localStorage
    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Keyboard navigation detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setPreferences(prev => ({ ...prev, keyboardNavigation: true }));
        document.body.classList.add('keyboard-nav');
      }
    };

    const handleMouseDown = () => {
      setPreferences(prev => ({ ...prev, keyboardNavigation: false }));
      document.body.classList.remove('keyboard-nav');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const updatePreference = useCallback((key: keyof AccessibilityPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRegion) {
      announceRegion.setAttribute('aria-live', priority);
      announceRegion.textContent = message;
      
      // Clear after a short delay to allow for re-announcements
      setTimeout(() => {
        announceRegion.textContent = '';
      }, 1000);
    }
  }, [announceRegion]);

  const focusElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      // Announce focus change for screen readers
      const elementLabel = element.getAttribute('aria-label') || 
                          element.getAttribute('title') || 
                          element.textContent || 
                          'Interactive element';
      announceToScreenReader(`Focused on ${elementLabel}`);
    }
  }, [announceToScreenReader]);

  const skipToContent = useCallback(() => {
    const mainContent = document.getElementById('main-content') || 
                       document.querySelector('main') || 
                       document.querySelector('[role="main"]');
    if (mainContent) {
      mainContent.focus();
      announceToScreenReader('Skipped to main content');
    }
  }, [announceToScreenReader]);

  return {
    preferences,
    updatePreference,
    announceToScreenReader,
    focusElement,
    skipToContent
  };
};

export default useAccessibility;
