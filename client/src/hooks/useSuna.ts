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

export type LLMModel = 'deepseek-chat' | 'gemini-1.5-flash' | 'gemini-1.0-pro';

/**
 * Hook for interacting with the Suna AI Agent
 */
export function useSuna(initialThreadId?: string) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [messages, setMessages] = useState<SunaMessage[]>([]);
  const [currentModel, setCurrentModel] = useState<LLMModel>('deepseek-chat');
  
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
    if (conversation && typeof conversation === 'object' && 
        'messages' in conversation && Array.isArray(conversation.messages)) {
      setMessages(conversation.messages);
    }
  }, [conversation]);

  // Create a new chat (clear current thread and messages)
  const createNewChat = () => {
    setThreadId(undefined);
    setMessages([]);
  };

  // Send a message to Suna
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async ({ message, model = currentModel }: { message: string, model?: LLMModel }) => {
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
      
      // Use existing thread ID or null for a new conversation
      console.log(`Sending message with threadId: ${threadId || 'new conversation'}`);
      
      const response = await apiRequest(
        'POST',
        '/api/suna/message',
        {
          message,
          threadId: threadId, // Always pass the current threadId, even if undefined
          model: model // Pass the selected model
        }
      );
      
      const data = await response.json();
      
      // If we get a thread ID back and don't have one yet, save it
      if (data.threadId && !threadId) {
        console.log(`Setting new threadId: ${data.threadId}`);
        setThreadId(data.threadId);
      }
      
      // Add the assistant message
      if (data.message) {
        setMessages(prev => {
          // Remove the temporary message and add both the real user message and assistant message
          const filteredMessages = prev.filter(m => m.id !== tempUserMessage.id);
          
          // Create permanent user message with the same ID pattern as the server uses
          const userMessage: SunaMessage = {
            id: `user-${Date.now()}`,
            content: message,
            role: 'user',
            timestamp: new Date(Date.now() - 1000).toISOString()
          };
          
          // Add both messages to the conversation
          return [...filteredMessages, userMessage, data.message];
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

  // Function to change the current LLM model
  const changeModel = (model: LLMModel) => {
    setCurrentModel(model);
  };

  return {
    conversation,
    allConversations,
    threadId,
    messages,
    currentModel,
    isLoadingConversation,
    isLoadingConversations,
    sendMessage,
    isSending,
    selectConversation,
    createNewChat,
    changeModel
  };
}