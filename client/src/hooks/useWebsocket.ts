import { useState, useEffect, useCallback } from "react";
import { initializeWebSocket, closeWebSocket, addMessageHandler, removeMessageHandler } from "@/lib/ws";
import { WebSocketMessage } from "@/lib/types";
import { useAuth } from "./useAuth";

export function useWebsocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user) {
      initializeWebSocket(user.id)
        .then(() => {
          setIsConnected(true);
          setError(null);
        })
        .catch(err => {
          setIsConnected(false);
          setError(err.message || "Failed to connect to WebSocket");
        });

      return () => {
        closeWebSocket();
        setIsConnected(false);
      };
    }
  }, [user]);

  // Register a message handler
  const registerMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    addMessageHandler(handler);
    return () => removeMessageHandler(handler);
  }, []);

const reconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 30000); // Exponential backoff, max 30s
      console.log(`Attempting to reconnect in ${delay}ms (${reconnectAttempts.current}/${maxReconnectAttempts})`);
      setTimeout(() => {
        connect();
      }, delay);
    }
  }, [connect, maxReconnectAttempts]);

  const connectWebSocket = useCallback(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
        const wsUrl = `${protocol}//${host}:${port}/ws`;

        console.log('Connecting to WebSocket:', wsUrl);
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);
          reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            messageHandlers.forEach(handler => handler(message));
          } catch (e) {
            console.error('Failed to parse WebSocket message', event.data, e);
          }
        };

        wsRef.current.onclose = (event) => {
          if (event.wasClean) {
            console.log(`WebSocket closed cleanly, code=${event.code}, reason=${event.reason}`);
          } else {
            console.warn('WebSocket connection died');
            setIsConnected(false);
            setError('WebSocket connection lost. Reconnecting...');
            reconnect();
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          setError('WebSocket error. Reconnecting...');
        };

      } catch (err: any) {
        console.error("WebSocket connection error:", err);
        setIsConnected(false);
        setError(err.message || "Failed to connect to WebSocket");
      }
    }, [reconnect]);

  return {
    isConnected,
    error,
    registerMessageHandler
  };
}