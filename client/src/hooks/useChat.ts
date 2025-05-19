import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addMessageHandler, removeMessageHandler, sendChatMessage, joinFamilyRoom, leaveFamilyRoom } from "@/lib/ws";
import { ChatMessage, WebSocketMessage } from "@/lib/types";
import { useAuth } from "./useAuth";

export function useChat(familyRoomId?: number) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();
  
  // Query for loading message history
  const queryKey = familyRoomId 
    ? [`/api/family-rooms/${familyRoomId}/messages`]
    : ['/api/messages/personal'];
    
  const { data: messageHistory, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
  });
  
  // Set the initial messages from history
  useEffect(() => {
    if (messageHistory) {
      setMessages(messageHistory.reverse()); // Most recent last
    }
  }, [messageHistory]);
  
  // WebSocket handler for new messages
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    if (data.type === 'new_message' && data.message) {
      // If from the AI, show typing indicator first
      if (data.message.isAiResponse) {
        setIsTyping(true);
        
        // Simulate typing delay based on message length
        const typingDelay = Math.min(500 + data.message.content.length * 10, 3000);
        
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, data.message!]);
        }, typingDelay);
      } else {
        // For user messages, add immediately
        setMessages(prev => [...prev, data.message!]);
      }
    }
  }, []);
  
  // Add/remove WebSocket handler on mount/unmount
  useEffect(() => {
    addMessageHandler(handleWebSocketMessage);
    
    // Join family room if specified
    if (familyRoomId) {
      joinFamilyRoom(familyRoomId);
    }
    
    return () => {
      removeMessageHandler(handleWebSocketMessage);
      
      // Leave family room if specified
      if (familyRoomId) {
        leaveFamilyRoom();
      }
    };
  }, [handleWebSocketMessage, familyRoomId]);
  
  // Function to send a message
  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    
    sendChatMessage(content, familyRoomId);
    
    // Invalidate the query to refresh message history
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey, familyRoomId]);
  
  return {
    messages,
    isLoading,
    isTyping,
    sendMessage
  };
}
