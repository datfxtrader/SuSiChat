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

  return {
    isConnected,
    error,
    registerMessageHandler
  };
}
```

// text
The provided code already implements the base WebSocket functionality. The intention is to implement the WebSocket reconnection logic with exponential backoff. Since the original file doesn't include reconnect logic, I will add the reconnection within the initializeWebSocket function.
```

```typescript
import { useState, useEffect, useCallback } from "react";
import { initializeWebSocket, closeWebSocket, addMessageHandler, removeMessageHandler } from "@/lib/ws";
import { WebSocketMessage } from "@/lib/types";
import { useAuth } from "./useAuth";

export function useWebsocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWebSocket = useCallback(async (userId: string) => {
    try {
      await initializeWebSocket(userId);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setIsConnected(false);
      setError(err.message || "Failed to connect to WebSocket");
      throw err; // Re-throw to be caught by reconnect
    }
  }, []);

  const reconnect = useCallback(async (attempt = 1) => {
    if (attempt > 5) {
      console.log("Max reconnection attempts reached");
      return;
    }

    try {
      if (user) {
        await connectWebSocket(user.id);
      }
    } catch (error) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Attempting to reconnect in ${delay}ms (${attempt}/5)`);
      setTimeout(() => reconnect(attempt + 1), delay);
    }
  }, [connectWebSocket, user]);


  useEffect(() => {
    if (user) {
      connectWebSocket(user.id).catch(() => {
        reconnect(); // Initial call to reconnect if the first connection fails
      });

      return () => {
        closeWebSocket();
        setIsConnected(false);
      };
    }
  }, [user, connectWebSocket, reconnect]);

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