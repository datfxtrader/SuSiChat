import { useState, useEffect, useRef, useCallback } from 'react';
import { WEBSOCKET_URL } from '@/lib/ws';
import { useWebSocket } from './useWebsocket';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  messages: Message[];
  isSending: boolean;
}

// Research state hook implementation
export const useSuna = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isResearchInProgress, setIsResearchInProgress] = useState(false);
  const [ongoingResearchQuery, setOngoingResearchQuery] = useState('');
  const [researchProgress, setResearchProgress] = useState(0);

  // Refs for state consistency
  const researchStateRef = useRef({
    inProgress: false,
    query: '',
    startTime: null as number | null
  });

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Storage keys
  const STORAGE_KEYS = {
    IN_PROGRESS: 'research-in-progress',
    QUERY: 'ongoing-research-query',
    START_TIME: 'research-start-time',
    PROGRESS: 'research-progress'
  };

  // WebSocket connection
  const { sendMessage } = useWebSocket({
    url: WEBSOCKET_URL,
    onMessage: (data) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.role === 'assistant') {
          setMessages(prev => [...prev, parsed]);
          setIsSending(false);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  });

  // Save state to localStorage
  const saveStateToStorage = useCallback((state: typeof researchStateRef.current & { progress?: number }) => {
    try {
      localStorage.setItem(STORAGE_KEYS.IN_PROGRESS, state.inProgress.toString());
      localStorage.setItem(STORAGE_KEYS.QUERY, state.query || '');
      localStorage.setItem(STORAGE_KEYS.START_TIME, state.startTime?.toString() || '');
      localStorage.setItem(STORAGE_KEYS.PROGRESS, state.progress?.toString() || '0');
    } catch (error) {
      console.warn('Failed to save research state:', error);
    }
  }, []);

  // Load state from localStorage
  const loadStateFromStorage = useCallback(() => {
    try {
      const inProgress = localStorage.getItem(STORAGE_KEYS.IN_PROGRESS) === 'true';
      const query = localStorage.getItem(STORAGE_KEYS.QUERY) || '';
      const startTime = localStorage.getItem(STORAGE_KEYS.START_TIME);
      const progress = parseFloat(localStorage.getItem(STORAGE_KEYS.PROGRESS) || '0');

      return {
        inProgress,
        query,
        startTime: startTime ? parseInt(startTime) : null,
        progress
      };
    } catch (error) {
      console.warn('Failed to load research state:', error);
      return {
        inProgress: false,
        query: '',
        startTime: null,
        progress: 0
      };
    }
  }, []);

  // Clear state from localStorage
  const clearStateFromStorage = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear research state:', error);
    }
  }, []);

  // Progress simulation
  const startProgressSimulation = useCallback((startTime: number) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const estimatedDuration = 30000;
      const newProgress = Math.min((elapsed / estimatedDuration) * 100, 95);

      setResearchProgress(newProgress);
      saveStateToStorage({
        ...researchStateRef.current,
        progress: newProgress
      });
    }, 500);
  }, [saveStateToStorage]);

  // Handle sending messages
  const send = useCallback((message: string) => {
    if (!message.trim() || isSending) return;

    const startTime = Date.now();
    setIsSending(true);
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    sendMessage(message);

    // Update research state
    setIsResearchInProgress(true);
    setOngoingResearchQuery(message);
    setResearchProgress(0);

    const newState = {
      inProgress: true,
      query: message,
      startTime
    };
    researchStateRef.current = newState;
    saveStateToStorage(newState);
    startProgressSimulation(startTime);
  }, [isSending, sendMessage, saveStateToStorage, startProgressSimulation]);

  // Handle research completion
  useEffect(() => {
    if (!isSending && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.role === 'assistant' && isResearchInProgress) {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
        }

        setIsResearchInProgress(false);
        setOngoingResearchQuery('');
        setResearchProgress(100);

        researchStateRef.current = {
          inProgress: false,
          query: '',
          startTime: null
        };

        setTimeout(() => {
          clearStateFromStorage();
          setResearchProgress(0);
        }, 1000);
      }
    }
  }, [isSending, messages, isResearchInProgress, clearStateFromStorage]);

  // Initialize state
  useEffect(() => {
    const storedInProgress = localStorage.getItem('research-in-progress') === 'true';
    const storedQuery = localStorage.getItem('ongoing-research-query');

    if (storedInProgress && storedQuery) {
      setIsResearchInProgress(true);
      setOngoingResearchQuery(storedQuery);
      setResearchProgress(0);
      startProgressSimulation(Date.now());
    } else {
      setIsResearchInProgress(false);
      setOngoingResearchQuery('');
      setResearchProgress(0);
    }
  }, [startProgressSimulation]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (researchStateRef.current.inProgress) {
          saveStateToStorage({
            ...researchStateRef.current,
            progress: researchProgress
          });
        }
      } else {
        const storedState = loadStateFromStorage();

        if (storedState.inProgress && storedState.query) {
          if (!isResearchInProgress || ongoingResearchQuery !== storedState.query) {
            setIsResearchInProgress(true);
            setOngoingResearchQuery(storedState.query);
            setResearchProgress(storedState.progress);

            researchStateRef.current = {
              inProgress: true,
              query: storedState.query,
              startTime: storedState.startTime
            };

            if (storedState.startTime) {
              startProgressSimulation(storedState.startTime);
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isResearchInProgress, ongoingResearchQuery, researchProgress, saveStateToStorage, loadStateFromStorage, startProgressSimulation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  return {
    messages,
    isSending,
    isResearchInProgress,
    ongoingResearchQuery,
    researchProgress,
    send
  };
};