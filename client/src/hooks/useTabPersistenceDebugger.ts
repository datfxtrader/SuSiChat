import { useState, useEffect, useRef } from 'react';

interface DebugEvent {
  timestamp: number;
  event: string;
  data: any;
  uiState: any;
}

export const useTabPersistenceDebugger = () => {
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);
  const isRestoringRef = useRef(false);

  const logEvent = (event: string, data: any, uiState: any) => {
    if (!isDebugging) return;
    
    const debugEvent: DebugEvent = {
      timestamp: Date.now(),
      event,
      data,
      uiState
    };
    
    setDebugEvents(prev => [...prev.slice(-20), debugEvent]); // Keep last 20 events
    console.log(`[TAB DEBUG] ${event}:`, { data, uiState, timing: new Date().toISOString() });
  };

  const startDebugging = () => {
    setIsDebugging(true);
    setDebugEvents([]);
    console.log('[TAB DEBUG] Started debugging tab persistence');
  };

  const stopDebugging = () => {
    setIsDebugging(false);
    console.log('[TAB DEBUG] Stopped debugging');
  };

  const analyzeIssues = () => {
    const issues: string[] = [];
    
    // Check for rapid visibility changes
    const visibilityEvents = debugEvents.filter(e => e.event.includes('visibility'));
    if (visibilityEvents.length > 4) {
      issues.push('Multiple rapid visibility changes detected');
    }
    
    // Check for restore without save
    const restoreEvents = debugEvents.filter(e => e.event.includes('restore'));
    const saveEvents = debugEvents.filter(e => e.event.includes('save'));
    if (restoreEvents.length > saveEvents.length) {
      issues.push('More restore attempts than saves - possible race condition');
    }
    
    // Check for timing issues
    const timingIssues = debugEvents.filter((event, index) => {
      if (index === 0) return false;
      const prevEvent = debugEvents[index - 1];
      return event.timestamp - prevEvent.timestamp < 50; // Less than 50ms apart
    });
    
    if (timingIssues.length > 2) {
      issues.push('Rapid sequential events detected - timing race condition');
    }
    
    return issues;
  };

  // Enhanced visibility tracking with debugging
  useEffect(() => {
    if (!isDebugging) return;

    let saveTimeout: NodeJS.Timeout | null = null;
    let restoreTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      
      // Clear any pending operations
      if (saveTimeout) clearTimeout(saveTimeout);
      if (restoreTimeout) clearTimeout(restoreTimeout);
      
      logEvent('visibility_change', { isHidden }, { isRestoring: isRestoringRef.current });
      
      if (isHidden) {
        // Save with small delay to ensure state is current
        saveTimeout = setTimeout(() => {
          logEvent('save_triggered', {}, {});
        }, 10);
      } else {
        // Prevent multiple restore attempts
        if (isRestoringRef.current) {
          logEvent('restore_blocked', { reason: 'already_restoring' }, {});
          return;
        }
        
        isRestoringRef.current = true;
        
        // Restore with proper timing
        restoreTimeout = setTimeout(() => {
          logEvent('restore_triggered', {}, {});
          
          // Force UI update after restore
          setTimeout(() => {
            isRestoringRef.current = false;
            logEvent('restore_complete', {}, {});
          }, 100);
        }, 50);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (saveTimeout) clearTimeout(saveTimeout);
      if (restoreTimeout) clearTimeout(restoreTimeout);
    };
  }, [isDebugging]);

  return {
    debugEvents,
    isDebugging,
    startDebugging,
    stopDebugging,
    logEvent,
    analyzeIssues
  };
};