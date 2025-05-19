import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";
import { useState, useEffect } from "react";

type SunaMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
};

type SunaConversation = {
  id: string;
  title: string;
  messages: SunaMessage[];
  createdAt: string;
};

/**
 * Hook for interacting with the Suna AI Agent
 */
export function useSuna(initialConversationId?: string) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<SunaMessage[]>([]);
  
  // Query for existing conversation data
  const { data: conversation, isLoading: isLoadingConversation } = useQuery({
    queryKey: ['/api/suna/conversations', conversationId],
    enabled: !!conversationId && isAuthenticated,
  });

  // Update messages when conversation data changes
  useEffect(() => {
    if (conversation?.messages) {
      setMessages(conversation.messages);
    }
  }, [conversation]);

  // Send a message to Suna
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to use Suna');
      }
      
      // Add the user message immediately for a responsive UI
      const tempUserMessage: SunaMessage = {
        id: `temp-${Date.now()}`,
        content: message,
        role: 'user',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempUserMessage]);
      
      const response = await apiRequest(
        'POST',
        '/api/suna/message',
        {
          message,
          conversationId
        }
      );
      
      const data = await response.json();
      
      // Set the conversation ID if this is a new conversation
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      
      // Add the assistant message
      if (data.message) {
        setMessages(prev => {
          // Remove the temporary message and add both the real user message and assistant message
          // This assumes the API returns only the assistant's message
          const filteredMessages = prev.filter(m => m.id !== tempUserMessage.id);
          return [...filteredMessages, 
            // This would come from the API in a real implementation
            {
              id: `user-${Date.now()}`,
              content: message,
              role: 'user',
              timestamp: new Date(Date.now() - 1000).toISOString()
            },
            data.message
          ];
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Invalidate the conversation to get fresh data
      if (data.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/suna/conversations', data.conversationId] });
      }
    }
  });

  return {
    conversation,
    conversationId,
    messages,
    isLoadingConversation,
    sendMessage,
    isSending,
  };
}