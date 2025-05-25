import { useState, useEffect, useCallback, useRef } from "react";
import { WebSocketMessage } from "@/lib/types";
import { useAuth } from "./useAuth";

const MAX_RECONNECT_ATTEMPTS = 10;

interface WebSocketReturn {
  isConnected: boolean;
  error: string | null;
  registerMessageHandler: (handler: (message: WebSocketMessage) => void) => () => void;
}

export function useWebsocket(): WebSocketReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const messageHandlers = useRef<((message: WebSocketMessage) => void)[]>([]);
  const shouldReconnect = useRef(true);

  // Function to add message handlers
  const addMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    messageHandlers.current = [...messageHandlers.current, handler];
  }, []);

  // Function to remove message handlers
  const removeMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    messageHandlers.current = messageHandlers.current.filter(h => h !== handler);
  }, []);

  const reconnect = useCallback(() => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && shouldReconnect.current) {
      setReconnectAttempts(prev => prev + 1);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);

      console.log(`Attempting to reconnect in ${delay}ms (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

      setTimeout(() => {
        if (shouldReconnect.current) {
          connect();
        }
      }, delay);
    } else {
      console.log('Max reconnection attempts reached or reconnection disabled');
    }
  }, [reconnectAttempts]);

  const connect = useCallback(() => {
    if (!user || !shouldReconnect.current) {
      return;
    }

    console.log('Attempting to connect to WebSocket...');

    const wsUrl = `ws://localhost:5000/ws?userId=${user.id}`;
    const ws = new WebSocket(wsUrl);
    setSocket(ws);

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        messageHandlers.current.forEach(handler => handler(message));
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket error occurred');
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      setSocket(null);

      // Only reconnect if not a normal closure and we should reconnect
      if (shouldReconnect.current && event.code !== 1000 && event.code !== 1001) {
        setTimeout(() => {
          if (shouldReconnect.current) {
            reconnect();
          }
        }, 1000);
      }
    };
  }, [user, reconnect]);

  useEffect(() => {
    if (user) {
      shouldReconnect.current = true;
      connect();
    } else {
      shouldReconnect.current = false;
      if (socket) {
        socket.close(1000, 'User logged out');
        setSocket(null);
        setIsConnected(false);
      }
    }

    return () => {
      console.log('Closing WebSocket connection on unmount');
      shouldReconnect.current = false;
      if (socket) {
        socket.close(1000, 'Component unmounted');
      }
    };
  }, [user, connect, socket]);

  const registerMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    addMessageHandler(handler);
    return () => removeMessageHandler(handler);
  }, [addMessageHandler, removeMessageHandler]);

  return {
    isConnected,
    error,
    registerMessageHandler,
  };
}