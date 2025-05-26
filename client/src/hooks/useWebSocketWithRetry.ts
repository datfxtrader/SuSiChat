import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketOptions {
  maxRetries?: number;
  retryDelay?: number;
  heartbeatInterval?: number;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

export const useWebSocketWithRetry = (url: string, options: WebSocketOptions = {}) => {
  const {
    maxRetries = 5,
    retryDelay = 1000,
    heartbeatInterval = 30000,
    onMessage,
    onError,
    onReconnect
  } = options;

  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [retryCount, setRetryCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const setupHeartbeat = useCallback(() => {
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const connect = useCallback(() => {
    try {
      clearTimers();

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        setRetryCount(0);
        setupHeartbeat();

        if (retryCount > 0) {
          onReconnect?.();
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Ignore pong messages
          if (data.type !== 'pong') {
            onMessage?.(data);
          }
        } catch (err) {
          console.error('Message parse error:', err);
          onError?.(new Error(`Failed to parse message: ${err}`));
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't reject immediately, let the close handler manage reconnection
        if (ws.readyState === WebSocket.CONNECTING) {
          //reject(error); // Removed reject as per instruction
        }
        setConnectionState('error');
        onError?.(new Error('WebSocket connection error'));
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        clearTimers();

        // Attempt reconnection
        if (retryCount < maxRetries) {
          const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff

          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setConnectionState('connecting');
            connect();
          }, delay);
        } else {
          setConnectionState('error');
          onError?.(new Error('Max reconnection attempts reached'));
        }
      };
    } catch (err) {
      console.error('Connection error:', err);
      setConnectionState('error');
      onError?.(err as Error);
    }
  }, [url, retryCount, maxRetries, retryDelay, setupHeartbeat, clearTimers, onMessage, onError, onReconnect]);

  useEffect(() => {
    connect();

    return () => {
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }, []);

  const reconnect = useCallback(() => {
    setRetryCount(0);
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  return {
    connectionState,
    sendMessage,
    reconnect,
    retryCount
  };
};