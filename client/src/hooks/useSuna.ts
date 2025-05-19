import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";

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
export function useSuna(conversationId?: string) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  
  const { data: conversation, isLoading: isLoadingConversation } = useQuery({
    queryKey: ['/api/suna/conversations', conversationId],
    enabled: !!conversationId && isAuthenticated,
  });

  // Send a message to Suna
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to use Suna');
      }
      
      const response = await apiRequest(
        'POST',
        '/api/suna/message',
        {
          message,
          conversationId
        }
      );
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the conversation to get fresh data
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/suna/conversations', conversationId] });
      }
    }
  });

  return {
    conversation,
    isLoadingConversation,
    sendMessage,
    isSending,
  };
}