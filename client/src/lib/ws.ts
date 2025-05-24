import { WebSocketMessage } from "./types";

const getWebSocketBaseUrl = () => {
  const port = 5000;
  return `ws://0.0.0.0:${port}`;
};

export const WEBSOCKET_URL = `${getWebSocketBaseUrl()}/ws`;

export const getWebSocketURL = (threadId?: string) => {
  const url = new URL(WEBSOCKET_URL);
  if (threadId) {
    url.searchParams.set('threadId', threadId);
  }
  return url.toString();
};

let socket: WebSocket | null = null;
let messageHandlers: ((message: WebSocketMessage) => void)[] = [];
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectTimeout: NodeJS.Timeout | null = null;

export function initializeWebSocket(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const wsUrl = getWebSocketURL();

      // Close existing socket if any
      if (socket) {
        socket.close();
      }

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connection established");
        reconnectAttempts = 0;

        // Authenticate the connection
        sendMessage({
          type: 'auth',
          userId
        });

        resolve();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;

          // Notify all registered handlers
          messageHandlers.forEach(handler => handler(data));

          // Handle auth confirmation specially
          if (data.type === 'auth_success') {
            console.log("WebSocket authentication successful");
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed");

        // Try to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * reconnectAttempts, 10000);

          console.log(`Attempting to reconnect in ${delay}ms (${reconnectAttempts}/${maxReconnectAttempts})`);

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }

          reconnectTimeout = setTimeout(() => {
            initializeWebSocket(userId)
              .catch(err => console.error("Reconnection failed:", err));
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };
    } catch (error) {
      console.error("Error initializing WebSocket:", error);
      reject(error);
    }
  });
}

export function closeWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  messageHandlers = [];
}

export function sendMessage(message: WebSocketMessage) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.error("WebSocket is not connected");
  }
}

export function addMessageHandler(handler: (message: WebSocketMessage) => void) {
  messageHandlers.push(handler);
}

export function removeMessageHandler(handler: (message: WebSocketMessage) => void) {
  const index = messageHandlers.indexOf(handler);
  if (index !== -1) {
    messageHandlers.splice(index, 1);
  }
}

export function joinFamilyRoom(roomId: number) {
  sendMessage({
    type: 'join_family_room',
    roomId
  });
}

export function leaveFamilyRoom() {
  sendMessage({
    type: 'leave_family_room'
  });
}

export function sendChatMessage(content: string, familyRoomId?: number) {
  sendMessage({
    type: 'message',
    content
  });
}

export function initWebSocket() {
  const ws = new WebSocket(getWebSocketURL());
  ws.onopen = () => console.log('WebSocket connected');
  ws.onerror = (error) => console.error('WebSocket error:', error);
  return ws;
}