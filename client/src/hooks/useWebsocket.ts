import { useState, useEffect, useCallback } from "react";
import { initializeWebSocket, closeWebSocket, addMessageHandler, removeMessageHandler } from "@/lib/ws";
import { WebSocketMessage } from "@/lib/types";
import { useAuth } from "./useAuth";

export function useWebSocket() {
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
  
  return {
    isConnected,
    error,
    registerMessageHandler
  };
}
