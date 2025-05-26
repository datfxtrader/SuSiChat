import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketWithRetryOptions {
  url: string;
  maxRetries?: number;
  retryDelay?: number;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocketWithRetry({
  url,
  maxRetries = 10,
  retryDelay = 1000,
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: UseWebSocketWithRetryOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectingRef = useRef(false);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send ping
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

        // Set pong timeout
        pongTimeoutRef.current = setTimeout(() => {
          console.log('WebSocket ping timeout - reconnecting...');
          wsRef.current?.close();
        }, 5000);
      }
    }, 30000); // Ping every 30 seconds
  }, []);

  const stopPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      console.log('🔌 Attempting WebSocket connection to:', url);
      const ws = new WebSocket(url);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          console.log('⏰ WebSocket connection timeout');
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        setRetryCount(0);
        startPing();
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle pong responses
          if (data.type === 'pong') {
            if (pongTimeoutRef.current) {
              clearTimeout(pongTimeoutRef.current);
              pongTimeoutRef.current = null;
            }
            return;
          }

          onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        setIsConnected(false);
        stopPing();
        onDisconnect?.();

        // Only reconnect if it wasn't a manual close (code 1000) and we haven't exceeded max retries
        if (!reconnectingRef.current && event.code !== 1000 && retryCount < maxRetries) {
          reconnectingRef.current = true;
          const delay = Math.min(retryDelay * Math.pow(1.5, retryCount), 30000); // Cap at 30 seconds
          console.log(`Attempting to reconnect in ${delay}ms (${retryCount + 1}/${maxRetries})`);

          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            reconnectingRef.current = false;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      onError?.(error as Event);
    }
  }, [url, maxRetries, retryDelay, retryCount, onMessage, onConnect, onDisconnect, onError, startPing, stopPing]);

  const disconnect = useCallback(() => {
    reconnectingRef.current = false;
    stopPing();

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setRetryCount(0);
  }, [stopPing]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    console.warn('WebSocket not connected, message not sent:', message);
    return false;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url]); // Only reconnect when URL changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    sendMessage,
    disconnect,
    retryCount,
    reconnect: connect
  };
}