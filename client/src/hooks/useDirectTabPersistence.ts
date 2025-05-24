import { useState, useEffect, useCallback, useRef } from 'react';

interface DirectTabState {
  isInProgress: boolean;
  query: string;
  progress: number;
  stage: number;
  stageLabel: string;
  timestamp: number;
}

// Use multiple storage keys for maximum reliability
const STORAGE_KEYS = [
  'direct_tab_state_1',
  'direct_tab_state_2', 
  'direct_tab_state_backup'
];

export const useDirectTabPersistence = () => {
  const [isResearchInProgress, setIsResearchInProgress] = useState(false);
  const [ongoingResearchQuery, setOngoingResearchQuery] = useState('');
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStage, setResearchStage] = useState(1);
  const [stageLabel, setStageLabel] = useState('Ready');
  
  const stateRef = useRef<DirectTabState | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Force save state to multiple locations
  const forceSaveState = useCallback(() => {
    const currentState: DirectTabState = {
      isInProgress: isResearchInProgress,
      query: ongoingResearchQuery,
      progress: researchProgress,
      stage: researchStage,
      stageLabel,
      timestamp: Date.now()
    };

    if (currentState.isInProgress) {
      console.log('🔒 FORCE SAVING state to multiple locations:', currentState);
      
      // Save to multiple storage keys for redundancy
      STORAGE_KEYS.forEach(key => {
        try {
          localStorage.setItem(key, JSON.stringify(currentState));
        } catch (error) {
          console.warn(`Failed to save to ${key}:`, error);
        }
      });
      
      // Also save to sessionStorage as backup
      try {
        sessionStorage.setItem('tab_state_session', JSON.stringify(currentState));
      } catch (error) {
        console.warn('SessionStorage save failed:', error);
      }
      
      stateRef.current = currentState;
    }
  }, [isResearchInProgress, ongoingResearchQuery, researchProgress, researchStage, stageLabel]);

  // Force restore state from any available location
  const forceRestoreState = useCallback(() => {
    console.log('🔓 FORCE RESTORING state from storage...');
    
    let restoredState: DirectTabState | null = null;
    
    // Try all storage locations
    for (const key of STORAGE_KEYS) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.isInProgress && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            restoredState = parsed;
            console.log(`✅ Found valid state in ${key}:`, restoredState);
            break;
          }
        }
      } catch (error) {
        console.warn(`Failed to load from ${key}:`, error);
      }
    }
    
    // Try sessionStorage if localStorage failed
    if (!restoredState) {
      try {
        const sessionState = sessionStorage.getItem('tab_state_session');
        if (sessionState) {
          const parsed = JSON.parse(sessionState);
          if (parsed.isInProgress) {
            restoredState = parsed;
            console.log('✅ Found state in sessionStorage:', restoredState);
          }
        }
      } catch (error) {
        console.warn('SessionStorage restore failed:', error);
      }
    }
    
    if (restoredState) {
      console.log('🎯 RESTORING UI with state:', restoredState);
      
      // CRITICAL FIX: Clean the state to prevent completion triggers
      const cleanedState = {
        ...restoredState,
        isCompleting: false,
        shouldComplete: false,
        wasSaved: undefined
      };
      
      // Force immediate state updates with cleaned state
      setIsResearchInProgress(cleanedState.isInProgress);
      setOngoingResearchQuery(cleanedState.query);
      setResearchProgress(cleanedState.progress);
      setResearchStage(cleanedState.stage);
      setStageLabel(cleanedState.stageLabel);
      
      // Double-check with a second update to ensure reliability
      setTimeout(() => {
        setIsResearchInProgress(cleanedState.isInProgress);
        setResearchProgress(cleanedState.progress);
        console.log('🔥 SECOND UPDATE applied for reliability');
      }, 100);
      
      return true;
    } else {
      console.log('❌ No valid state found to restore');
      return false;
    }
  }, []);

  // Start research function
  const startDirectResearch = useCallback((query: string) => {
    console.log('🚀 Starting direct research:', query);
    setIsResearchInProgress(true);
    setOngoingResearchQuery(query);
    setResearchProgress(0);
    setResearchStage(1);
    setStageLabel('Initializing research...');
    
    // Force save immediately
    setTimeout(forceSaveState, 100);
  }, [forceSaveState]);

  // Complete research function
  const completeDirectResearch = useCallback(() => {
    console.log('✅ Completing direct research');
    setIsResearchInProgress(false);
    setOngoingResearchQuery('');
    setResearchProgress(0);
    setStageLabel('Complete');
    
    // Clean up all storage
    STORAGE_KEYS.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to clean ${key}:`, error);
      }
    });
    
    try {
      sessionStorage.removeItem('tab_state_session');
    } catch (error) {
      console.warn('SessionStorage cleanup failed:', error);
    }
  }, []);

  // Auto-save state whenever it changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      forceSaveState();
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isResearchInProgress, ongoingResearchQuery, researchProgress, researchStage, stageLabel, forceSaveState]);

  // Simple visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Tab hidden - force saving');
        forceSaveState();
      } else {
        console.log('👁️ Tab visible - force restoring');
        forceRestoreState();
      }
    };

    const handlePageShow = () => {
      console.log('📱 Page show event - force restoring');
      forceRestoreState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', forceRestoreState);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', forceRestoreState);
    };
  }, [forceSaveState, forceRestoreState]);

  // Progress simulation that can reach 100%
  useEffect(() => {
    if (!isResearchInProgress) return;
    
    const interval = setInterval(() => {
      setResearchProgress(prev => {
        // Allow progress to reach 100% for completion
        if (prev >= 100) return 100;
        
        // Calculate next progress increment
        const increment = Math.random() * 3 + 1;
        const newProgress = prev + increment;
        
        // Stage-based progress logic - allow reaching 100% in final stage
        const newStage = Math.min(Math.floor(newProgress / 20) + 1, 5);
        setResearchStage(newStage);
        setStageLabel(`Research stage ${newStage}/5`);
        
        if (newStage >= 5) {
          // In final stage, allow reaching 100%
          return Math.min(newProgress, 100);
        } else if (newStage >= 4) {
          // Stage 4: allow up to 95%
          return Math.min(newProgress, 95);
        } else if (newStage >= 3) {
          // Stage 3: allow up to 80%
          return Math.min(newProgress, 80);
        } else if (newStage >= 2) {
          // Stage 2: allow up to 60%
          return Math.min(newProgress, 60);
        } else {
          // Stage 1: allow up to 40%
          return Math.min(newProgress, 40);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isResearchInProgress]);

  // Initial restore on mount
  useEffect(() => {
    forceRestoreState();
  }, [forceRestoreState]);

  return {
    isResearchInProgress,
    ongoingResearchQuery,
    researchProgress,
    researchStage,
    stageLabel,
    startResearch: startDirectResearch,
    completeResearch: completeDirectResearch,
    forceSave: forceSaveState,
    forceRestore: forceRestoreState
  };
};