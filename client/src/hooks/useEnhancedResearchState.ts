import { useState, useEffect, useRef, useCallback } from 'react';

export interface EnhancedResearchState {
  isInProgress: boolean;
  query: string;
  progress: number;
  stage: number;
  stageLabel: string;
  startTime: number;
  estimatedDuration: number;
  errors: string[];
  warnings: string[];
  apiCallCount: number;
  lastApiCall: number;
}

interface ApiQueueItem {
  priority: number;
  query: string;
  callback: (result: any) => void;
  timestamp: number;
}

const STORAGE_KEYS = {
  RESEARCH_STATE: 'enhanced_research_state',
  API_CACHE: 'research_api_cache',
  RATE_LIMIT_INFO: 'api_rate_limit_info'
};

const STAGE_LABELS = [
  'Initializing research...',
  'Gathering market data...',
  'Analyzing trends...',
  'Processing financial data...',
  'Generating insights...',
  'Finalizing report...'
];

export const useEnhancedResearchState = () => {
  const [isResearchInProgress, setIsResearchInProgress] = useState(false);
  const [ongoingResearchQuery, setOngoingResearchQuery] = useState('');
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStage, setResearchStage] = useState(1);
  const [stageLabel, setStageLabel] = useState(STAGE_LABELS[0]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const stateRef = useRef<EnhancedResearchState | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiQueueRef = useRef<ApiQueueItem[]>([]);
  const isProcessingQueueRef = useRef(false);

  // Rate limiting management
  const checkRateLimit = useCallback(() => {
    try {
      const rateLimitInfo = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT_INFO);
      if (rateLimitInfo) {
        const info = JSON.parse(rateLimitInfo);
        const now = Date.now();
        const timeSinceLastCall = now - (info.lastCall || 0);
        const callsInLastMinute = info.calls?.filter((call: number) => now - call < 60000).length || 0;
        
        // Implement intelligent delay based on call frequency
        if (callsInLastMinute >= 5) {
          return Math.max(2000, 60000 - timeSinceLastCall); // Wait longer if many calls
        } else if (timeSinceLastCall < 1500) {
          return 1500 - timeSinceLastCall; // Standard delay
        }
      }
      return 0;
    } catch (error) {
      console.warn('Rate limit check failed:', error);
      return 1500; // Default delay
    }
  }, []);

  // Update rate limit info
  const updateRateLimit = useCallback(() => {
    try {
      const now = Date.now();
      const rateLimitInfo = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT_INFO);
      const info = rateLimitInfo ? JSON.parse(rateLimitInfo) : { calls: [], lastCall: 0 };
      
      info.calls = [...(info.calls || []), now].filter((call: number) => now - call < 60000);
      info.lastCall = now;
      
      localStorage.setItem(STORAGE_KEYS.RATE_LIMIT_INFO, JSON.stringify(info));
    } catch (error) {
      console.warn('Failed to update rate limit info:', error);
    }
  }, []);

  // Enhanced state persistence
  const saveEnhancedState = useCallback((state: EnhancedResearchState) => {
    try {
      const stateToSave = {
        ...state,
        timestamp: Date.now()
      };
      
      // Atomic save operation
      localStorage.setItem(STORAGE_KEYS.RESEARCH_STATE, JSON.stringify(stateToSave));
      localStorage.setItem('research_state', JSON.stringify(stateToSave)); // Backup key
      stateRef.current = state;
      
      console.log('Enhanced state saved:', stateToSave);
    } catch (error) {
      console.warn('Failed to save enhanced state:', error);
      setWarnings(prev => [...prev, 'State persistence temporarily unavailable']);
    }
  }, []);

  // Load enhanced state with validation
  const loadEnhancedState = useCallback((): EnhancedResearchState | null => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEYS.RESEARCH_STATE) || 
                        localStorage.getItem('research_state');
      
      if (savedState) {
        const state = JSON.parse(savedState);
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        // Validate state structure and age
        if (state.isInProgress && 
            Date.now() - state.startTime < maxAge &&
            typeof state.query === 'string' &&
            typeof state.progress === 'number') {
          return state;
        }
      }
    } catch (error) {
      console.warn('Failed to load enhanced state:', error);
    }
    return null;
  }, []);

  // Advanced progress simulation with stages
  const simulateProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    let currentStage = 1;
    let currentProgress = 0;

    progressIntervalRef.current = setInterval(() => {
      setResearchProgress(prev => {
        const increment = Math.random() * 2 + 0.5; // Slower, more realistic progress
        const newProgress = Math.min(prev + increment, 95);
        
        // Update stage based on progress
        const newStage = Math.min(Math.floor(newProgress / 16) + 1, STAGE_LABELS.length);
        if (newStage !== currentStage) {
          currentStage = newStage;
          setResearchStage(newStage);
          setStageLabel(STAGE_LABELS[newStage - 1] || 'Completing research...');
        }
        
        // Update enhanced state
        const currentState = stateRef.current;
        if (currentState) {
          const updatedState = { 
            ...currentState, 
            progress: newProgress, 
            stage: newStage,
            stageLabel: STAGE_LABELS[newStage - 1] || 'Completing research...'
          };
          saveEnhancedState(updatedState);
        }
        
        return newProgress;
      });
    }, 3000); // Slower update rate
  }, [saveEnhancedState]);

  // Enhanced research start with queue management
  const startEnhancedResearch = useCallback((query: string) => {
    console.log('Starting enhanced research with query:', query);
    
    const delay = checkRateLimit();
    if (delay > 0) {
      setWarnings(prev => [...prev, `Waiting ${Math.ceil(delay/1000)}s to respect API limits...`]);
      setTimeout(() => startEnhancedResearch(query), delay);
      return;
    }
    
    const newState: EnhancedResearchState = {
      isInProgress: true,
      query,
      progress: 0,
      stage: 1,
      stageLabel: STAGE_LABELS[0],
      startTime: Date.now(),
      estimatedDuration: 90000, // More realistic 90 seconds
      errors: [],
      warnings: [],
      apiCallCount: 0,
      lastApiCall: 0
    };

    setIsResearchInProgress(true);
    setOngoingResearchQuery(query);
    setResearchProgress(0);
    setResearchStage(1);
    setStageLabel(STAGE_LABELS[0]);
    setErrors([]);
    setWarnings([]);
    
    saveEnhancedState(newState);
    simulateProgress();
    updateRateLimit();
    
    console.log('Enhanced research state initialized:', newState);
  }, [checkRateLimit, saveEnhancedState, simulateProgress, updateRateLimit]);

  // Complete research with cleanup
  const completeEnhancedResearch = useCallback(() => {
    console.log('Completing enhanced research');
    
    setIsResearchInProgress(false);
    setOngoingResearchQuery('');
    setResearchProgress(100);
    setStageLabel('Research completed');
    
    // Clear persistent state after delay
    setTimeout(() => {
      setResearchProgress(0);
      setResearchStage(1);
      setStageLabel(STAGE_LABELS[0]);
      setErrors([]);
      setWarnings([]);
      
      try {
        localStorage.removeItem(STORAGE_KEYS.RESEARCH_STATE);
        localStorage.removeItem('research_state');
      } catch (error) {
        console.warn('Failed to clear state:', error);
      }
    }, 2000);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Restore enhanced state
  const restoreEnhancedState = useCallback(() => {
    console.log('Attempting to restore enhanced state...');
    const savedState = loadEnhancedState();
    
    if (savedState) {
      console.log('Restoring enhanced state:', savedState);
      setIsResearchInProgress(savedState.isInProgress);
      setOngoingResearchQuery(savedState.query);
      setResearchProgress(savedState.progress);
      setResearchStage(savedState.stage);
      setStageLabel(savedState.stageLabel || STAGE_LABELS[savedState.stage - 1]);
      setErrors(savedState.errors || []);
      setWarnings(savedState.warnings || []);
      
      if (savedState.isInProgress) {
        simulateProgress();
      }
    }
  }, [loadEnhancedState, simulateProgress]);

  // Stable visibility change detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('Enhanced visibility change. Hidden:', document.hidden);
      
      if (document.hidden) {
        const currentState = stateRef.current;
        if (currentState?.isInProgress) {
          console.log('Saving enhanced state on tab hide');
          saveEnhancedState(currentState);
        }
      } else {
        console.log('Tab visible - restoring enhanced state');
        restoreEnhancedState();
      }
    };

    console.log('Setting up enhanced visibility listener');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      console.log('Removing enhanced visibility listener');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Completely stable

  // Initial state restoration
  useEffect(() => {
    restoreEnhancedState();
  }, [restoreEnhancedState]);

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
    stageLabel,
    errors,
    warnings,
    startResearch: startEnhancedResearch,
    completeResearch: completeEnhancedResearch,
    restoreState: restoreEnhancedState
  };
};

// Enhanced CSS styles for the research system
export const enhancedResearchStyles = `
  .research-progress-enhanced {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 12px;
    padding: 16px;
    margin: 12px 0;
  }
  
  .research-stage-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .research-progress-bar-enhanced {
    width: 100%;
    height: 6px;
    background: rgba(148, 163, 184, 0.2);
    border-radius: 3px;
    overflow: hidden;
    margin: 8px 0;
  }
  
  .research-progress-fill-enhanced {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
    border-radius: 3px;
    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  .research-warning {
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    color: rgb(251, 191, 36);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    margin: 4px 0;
  }
  
  .research-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: rgb(239, 68, 68);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    margin: 4px 0;
  }
`;