import { useState, useEffect, useRef, useCallback } from 'react';

export interface ResearchState {
  isInProgress: boolean;
  query: string;
  progress: number;
  stage: number;
  startTime: number;
  estimatedDuration: number;
}

const STORAGE_KEYS = {
  RESEARCH_STATE: 'research_state',
  RESEARCH_PROGRESS: 'research_progress',
  RESEARCH_QUERY: 'research_query',
  RESEARCH_TIMESTAMP: 'research_timestamp'
};

export const useResearchState = () => {
  const [isResearchInProgress, setIsResearchInProgress] = useState(false);
  const [ongoingResearchQuery, setOngoingResearchQuery] = useState('');
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStage, setResearchStage] = useState(1);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<ResearchState | null>(null);

  // Save state to localStorage with error handling
  const saveResearchState = useCallback((state: ResearchState) => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESEARCH_STATE, JSON.stringify(state));
      localStorage.setItem(STORAGE_KEYS.RESEARCH_PROGRESS, state.progress.toString());
      localStorage.setItem(STORAGE_KEYS.RESEARCH_QUERY, state.query);
      localStorage.setItem(STORAGE_KEYS.RESEARCH_TIMESTAMP, state.startTime.toString());
      stateRef.current = state;
    } catch (error) {
      console.warn('Failed to save research state:', error);
    }
  }, []);

  // Load state from localStorage with error handling
  const loadResearchState = useCallback((): ResearchState | null => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEYS.RESEARCH_STATE);
      if (savedState) {
        const state = JSON.parse(savedState) as ResearchState;
        // Check if state is still valid (not too old)
        const maxAge = 30 * 60 * 1000; // 30 minutes
        if (Date.now() - state.startTime < maxAge && state.isInProgress) {
          return state;
        }
      }
    } catch (error) {
      console.warn('Failed to load research state:', error);
    }
    return null;
  }, []);

  // Clear state from localStorage
  const clearResearchState = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      stateRef.current = null;
    } catch (error) {
      console.warn('Failed to clear research state:', error);
    }
  }, []);

  // Start research with state persistence
  const startResearch = useCallback((query: string) => {
    console.log('Starting research with query:', query);
    
    const newState: ResearchState = {
      isInProgress: true,
      query,
      progress: 0,
      stage: 1,
      startTime: Date.now(),
      estimatedDuration: 60000 // 60 seconds estimate
    };

    setIsResearchInProgress(true);
    setOngoingResearchQuery(query);
    setResearchProgress(0);
    setResearchStage(1);
    saveResearchState(newState);
    
    console.log('Research state set:', newState);

    // Start progress simulation
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setResearchProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 3, 95);
        
        // Update state in storage
        const currentState = stateRef.current;
        if (currentState) {
          const updatedState = { ...currentState, progress: newProgress };
          saveResearchState(updatedState);
        }
        
        return newProgress;
      });
    }, 2000);
  }, [saveResearchState]);

  // Complete research with cleanup
  const completeResearch = useCallback(() => {
    setIsResearchInProgress(false);
    setOngoingResearchQuery('');
    setResearchProgress(0);
    setResearchStage(1);
    clearResearchState();
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, [clearResearchState]);

  // Restore state on mount and when tab becomes visible
  const restoreState = useCallback(() => {
    const savedState = loadResearchState();
    if (savedState) {
      setIsResearchInProgress(savedState.isInProgress);
      setOngoingResearchQuery(savedState.query);
      setResearchProgress(savedState.progress);
      setResearchStage(savedState.stage);
      
      // Continue progress simulation if research is in progress
      if (savedState.isInProgress) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        progressIntervalRef.current = setInterval(() => {
          setResearchProgress(prev => {
            const newProgress = Math.min(prev + Math.random() * 2, 95);
            
            // Update state in storage
            const currentState = stateRef.current;
            if (currentState) {
              const updatedState = { ...currentState, progress: newProgress };
              saveResearchState(updatedState);
            }
            
            return newProgress;
          });
        }, 3000);
      }
    }
  }, [loadResearchState, saveResearchState]);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - save current state
        if (isResearchInProgress) {
          const currentState: ResearchState = {
            isInProgress: isResearchInProgress,
            query: ongoingResearchQuery,
            progress: researchProgress,
            stage: researchStage,
            startTime: stateRef.current?.startTime || Date.now(),
            estimatedDuration: stateRef.current?.estimatedDuration || 60000
          };
          saveResearchState(currentState);
        }
      } else {
        // Tab is visible - restore state
        restoreState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isResearchInProgress, ongoingResearchQuery, researchProgress, researchStage, saveResearchState, restoreState]);

  // Initial state restoration on mount
  useEffect(() => {
    restoreState();
  }, [restoreState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return {
    isResearchInProgress,
    ongoingResearchQuery,
    researchProgress,
    researchStage,
    startResearch,
    completeResearch,
    clearResearchState
  };
};