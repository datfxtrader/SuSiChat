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

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { WebSocketMessage } from "@/lib/types";
import { useAuth } from "./useAuth";

const MAX_RECONNECT_ATTEMPTS = 10;

interface WebSocketReturn {
  isConnected: boolean;
  error: string | null;
  registerMessageHandler: (handler: (message: WebSocketMessage) => void) => () => void;
}

export function useWebsocket(wsURL: string): WebSocketReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
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


  const connect = useCallback(() => {
    if (!user || !shouldReconnect.current) {
      return;
    }

    setConnectionState('connecting');
    console.log('Attempting to connect to WebSocket...');

    const ws = new WebSocket(`${wsURL}?userId=${user.id}`);
    setSocket(ws);

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
      setConnectionState('connected');
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
      setConnectionState('disconnected');
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed', event);
      setConnectionState('disconnected');
      setSocket(null);

      // Only reconnect if not a normal closure and we should reconnect
      if (shouldReconnect.current && event.code !== 1000 && event.code !== 1001) {
        // Add a small delay before attempting reconnection
        setTimeout(() => {
          if (shouldReconnect.current) {
            reconnect();
          }
        }, 1000);
      }
    };

  }, [user, wsURL, reconnect]);

  const reconnect = useCallback(() => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && shouldReconnect.current) {
      setReconnectAttempts(prev => prev + 1);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Reduced max delay

      console.log(`Attempting to reconnect in ${delay}ms (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

      setTimeout(() => {
        if (shouldReconnect.current) { // Check again before reconnecting
          connect();
        }
      }, delay);
    } else {
      console.log('Max reconnection attempts reached or reconnection disabled');
      setConnectionState('disconnected');
    }
  }, [reconnectAttempts, connect]);



  useEffect(() => {
    if (user) {
      shouldReconnect.current = true; // Enable reconnection when user is available
      connect();
    } else {
      shouldReconnect.current = false; // Disable reconnection when user is not available

      if (socket) {
        socket.close(1000, 'User logged out'); // Normal closure
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
```import { useState, useEffect, useCallback } from "react";
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

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { WebSocketMessage } from "@/lib/types";
import { useAuth } from "./useAuth";

const MAX_RECONNECT_ATTEMPTS = 10;

interface WebSocketReturn {
  isConnected: boolean;
  error: string | null;
  registerMessageHandler: (handler: (message: WebSocketMessage) => void) => () => void;
}

export function useWebsocket(wsURL: string): WebSocketReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
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


  const connect = useCallback(() => {
    if (!user || !shouldReconnect.current) {
      return;
    }

    setConnectionState('connecting');
    console.log('Attempting to connect to WebSocket...');

    const ws = new WebSocket(`${wsURL}?userId=${user.id}`);
    setSocket(ws);

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
      setConnectionState('connected');
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
      setConnectionState('disconnected');
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed', event);
      setConnectionState('disconnected');
      setSocket(null);

      // Only reconnect if not a normal closure and we should reconnect
      if (shouldReconnect.current && event.code !== 1000 && event.code !== 1001) {
        // Add a small delay before attempting reconnection
        setTimeout(() => {
          if (shouldReconnect.current) {
            reconnect();
          }
        }, 1000);
      }
    };

  }, [user, wsURL, reconnect]);

  const reconnect = useCallback(() => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && shouldReconnect.current) {
      setReconnectAttempts(prev => prev + 1);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Reduced max delay

      console.log(`Attempting to reconnect in ${delay}ms (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

      setTimeout(() => {
        if (shouldReconnect.current) { // Check again before reconnecting
          connect();
        }
      }, delay);
    } else {
      console.log('Max reconnection attempts reached or reconnection disabled');
      setConnectionState('disconnected');
    }
  }, [reconnectAttempts, connect]);



  useEffect(() => {
    if (user) {
      shouldReconnect.current = true; // Enable reconnection when user is available
      connect();
    } else {
      shouldReconnect.current = false; // Disable reconnection when user is not available

      if (socket) {
        socket.close(1000, 'User logged out'); // Normal closure
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