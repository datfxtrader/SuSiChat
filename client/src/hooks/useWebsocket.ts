import { useState, useEffect, useCallback } from "react";
import { initializeWebSocket, closeWebSocket, addMessageHandler, removeMessageHandler } from "@/lib/ws";
import { WebSocketMessage } from "@/lib/types";
import { useAuth } from "./useAuth";

export function useWebsocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { user } = useAuth();

  const handleConnection = useCallback(() => {
    setIsConnected(true);
    setError(null);
    setReconnectAttempts(0);
    setIsReconnecting(false);
    console.log("WebSocket connection established");
  }, []);

  const handleDisconnection = useCallback(() => {
    setIsConnected(false);
    console.log("WebSocket connection closed");
    
    // Start reconnection attempts
    if (reconnectAttempts < 5) {
      setIsReconnecting(true);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log(`Attempting to reconnect in ${delay}ms (${reconnectAttempts + 1}/5)`);
      
      setTimeout(() => {
        if (user?.id) {
          initializeWebSocket(user.id);
          setReconnectAttempts(prev => prev + 1);
        }
      }, delay);
    } else {
      setIsReconnecting(false);
      setError("Failed to reconnect after 5 attempts");
    }
  }, [reconnectAttempts, user?.id]);

  const handleError = useCallback((err: Event) => {
    console.log("WebSocket error:", err);
    setError("WebSocket connection error");
  }, []);

  useEffect(() => {
    if (user?.id) {
      initializeWebSocket(user.id);
      
      addMessageHandler('connection', handleConnection);
      addMessageHandler('disconnection', handleDisconnection);
      addMessageHandler('error', handleError);
      
      return () => {
        removeMessageHandler('connection', handleConnection);
        removeMessageHandler('disconnection', handleDisconnection);
        removeMessageHandler('error', handleError);
        closeWebSocket();
      };
    }
  }, [user?.id, handleConnection, handleDisconnection, handleError]);

  const registerMessageHandler = useCallback((type: string, handler: (message: WebSocketMessage) => void) => {
    addMessageHandler(type, handler);
    return () => removeMessageHandler(type, handler);
  }, []);

  return {
    isConnected,
    isReconnecting,
    reconnectAttempts,
    error,
    registerMessageHandler
  };
}