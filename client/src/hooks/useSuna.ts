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
export function useSuna(initialThreadId?: string) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [messages, setMessages] = useState<SunaMessage[]>([]);
  
  // Query for all user conversations
  const { data: allConversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['/api/suna/conversations'],
    enabled: isAuthenticated,
  });
  
  // Query for existing conversation data if we have a thread ID
  const { data: conversation, isLoading: isLoadingConversation } = useQuery({
    queryKey: ['/api/suna/conversations', threadId],
    enabled: !!threadId && isAuthenticated,
  });

  // Update messages when conversation data changes
  useEffect(() => {
    if (conversation?.messages && Array.isArray(conversation.messages)) {
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
          threadId
        }
      );
      
      const data = await response.json();
      
      // Set the thread ID if this is a new conversation
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }
      
      // Add the assistant message
      if (data.message) {
        setMessages(prev => {
          // Remove the temporary message and add both the real user message and assistant message
          const filteredMessages = prev.filter(m => m.id !== tempUserMessage.id);
          return [...filteredMessages, 
            // Add the real user message
            {
              id: `user-${Date.now()}`,
              content: message,
              role: 'user',
              timestamp: new Date(Date.now() - 1000).toISOString()
            },
            // Add the assistant message from the response
            data.message
          ];
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Invalidate the conversation to get fresh data
      if (data.threadId) {
        queryClient.invalidateQueries({ queryKey: ['/api/suna/conversations', data.threadId] });
      }
      // Also invalidate all conversations
      queryClient.invalidateQueries({ queryKey: ['/api/suna/conversations'] });
    }
  });

  // Function to select a conversation
  const selectConversation = (selectedThreadId: string) => {
    setThreadId(selectedThreadId);
  };

  return {
    conversation,
    allConversations,
    threadId,
    messages,
    isLoadingConversation,
    isLoadingConversations,
    sendMessage,
    isSending,
    selectConversation,
  };
}