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
    if (retryCount >= maxRetries) {
      setConnectionState('error');
      onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    try {
      clearTimers();
      setConnectionState('connecting');

      const ws = new WebSocket(url);
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          console.warn('WebSocket connection timeout');
        }
      }, 10000); // 10 second connection timeout

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
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
          // Don't close connection for parse errors
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        setConnectionState('disconnected');
        clearTimers();

        // Only attempt reconnection if not manually closed and under retry limit
        if (event.code !== 1000 && retryCount < maxRetries) {
          const delay = Math.min(retryDelay * Math.pow(1.5, retryCount), 10000); // Cap at 10 seconds

          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, delay);
        } else if (retryCount >= maxRetries) {
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