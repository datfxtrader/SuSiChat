import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";
import { useState, useEffect, useCallback } from "react";
import { toast } from './use-toast';
import { enhancedSearchClient, enhancedSearch, type EnhancedSearchResponse } from '../lib/enhancedSearch';

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

export type LLMModel = 'auto' | 'deepseek-chat' | 'gemini-1.5-flash' | 'gemini-1.0-pro';

export type SearchPreferences = {
  forceSearch?: boolean;          // Force web search even if not detected automatically
  disableSearch?: boolean;        // Disable web search for this query
  priority?: 'relevance' | 'freshness'; // Sort by relevance (default) or freshness
  maxResults?: number;            // Maximum number of results to return (default: 5)
};

/**
 * Hook for interacting with the Suna AI Agent
 */
export function useSuna(initialThreadId?: string) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [messages, setMessages] = useState<SunaMessage[]>([]);
  const [currentModel, setCurrentModel] = useState<LLMModel>('auto');
  const [searchPreferences, setSearchPreferences] = useState<SearchPreferences>({
    priority: 'relevance',
    maxResults: 5
  });
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const clearResults = () => {
    setResults(null);
  };

  const clearError = () => {
    setError(null);
  };

  const performResearch = useCallback(async (query: string, options = {}) => {
    if (!query.trim()) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/suna/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          ...options
        }),
      });

      if (!response.ok) {
        throw new Error(`Research request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Research Error",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const performEnhancedSearch = useCallback(async (
    query: string, 
    searchType: 'web' | 'news' | 'all' = 'all',
    maxResults = 10
  ): Promise<EnhancedSearchResponse | null> => {
    if (!query.trim()) return null;

    try {
      const searchResults = await enhancedSearchClient.search({
        query: query.trim(),
        searchType,
        maxResults,
        freshness: 'week'
      });

      toast({
        title: "Search Complete",
        description: `Found ${searchResults.totalResults} results using ${searchResults.searchEnginesUsed.join(', ')}`,
      });

      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      toast({
        title: "Search Error",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    }
  }, []);

  const performNewsSearch = useCallback(async (query: string, maxResults = 5) => {
    return performEnhancedSearch(query, 'news', maxResults);
  }, [performEnhancedSearch]);

  const performWebSearch = useCallback(async (query: string, maxResults = 10) => {
    return performEnhancedSearch(query, 'web', maxResults);
  }, [performEnhancedSearch]);

  // Send a message to Suna
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async ({ 
      message, 
      model = currentModel,
      customSearchPrefs,
      researchDepth
    }: { 
      message: string, 
      model?: LLMModel,
      customSearchPrefs?: SearchPreferences,
      researchDepth?: number
    }) => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to use Suna');
      }

      // Check for explicit search commands
      let processedMessage = message;
      let activeSearchPrefs = {...searchPreferences};

      // Process special command prefixes
      if (message.startsWith('/search ')) {
        // Extract the actual query - remove "/search " prefix
        processedMessage = message.substring(8);
        activeSearchPrefs = {
          ...activeSearchPrefs,
          forceSearch: true
        };
      } else if (message.startsWith('/nosearch ')) {
        // Extract the actual query - remove "/nosearch " prefix
        processedMessage = message.substring(10);
        activeSearchPrefs = {
          ...activeSearchPrefs,
          disableSearch: true
        };
      } else if (message.startsWith('/fresh ')) {
        // Extract the actual query - remove "/fresh " prefix
        processedMessage = message.substring(7);
        activeSearchPrefs = {
          ...activeSearchPrefs,
          priority: 'freshness',
          forceSearch: true
        };
      }

      // Apply any custom search preferences passed to the function
      if (customSearchPrefs) {
        activeSearchPrefs = {
          ...activeSearchPrefs,
          ...customSearchPrefs
        };
      }

      // Add the user message immediately for a responsive UI
      const tempUserMessage: SunaMessage = {
        id: `temp-${Date.now()}`,
        content: message, // Show original message with commands to user
        role: 'user',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, tempUserMessage]);

      // Use existing thread ID or null for a new conversation
      console.log(`Sending message with threadId: ${threadId || 'new conversation'} and model: ${model}`);

      const response = await apiRequest(
        'POST',
        '/api/suna/message',
        {
          message: processedMessage, // Send processed message without command prefixes
          threadId: threadId, // Always pass the current threadId, even if undefined
          model: model, // Pass the selected model to the API
          searchPreferences: activeSearchPrefs, // Pass search preferences
          researchDepth: researchDepth // Pass research depth level if provided
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

  // Function to update search preferences
  const updateSearchPreferences = (newPrefs: Partial<SearchPreferences>) => {
    setSearchPreferences(prev => ({
      ...prev,
      ...newPrefs
    }));
  };

  // Function to toggle search forcing
  const toggleForceSearch = () => {
    setSearchPreferences(prev => ({
      ...prev,
      forceSearch: !prev.forceSearch,
      disableSearch: false // Can't have both enabled
    }));
  };

  // Function to toggle search disabling
  const toggleDisableSearch = () => {
    setSearchPreferences(prev => ({
      ...prev,
      disableSearch: !prev.disableSearch,
      forceSearch: false // Can't have both enabled
    }));
  };

  return {
    conversation,
    allConversations,
    threadId,
    messages,
    currentModel,
    searchPreferences,
    isLoadingConversation,
    isLoadingConversations,
    sendMessage,
    isSending,
    selectConversation,
    createNewChat,
    changeModel,
    updateSearchPreferences,
    toggleForceSearch,
    toggleDisableSearch,
    performResearch,
    performEnhancedSearch,
    performNewsSearch,
    performWebSearch,
    results,
    isLoading,
    error,
    clearResults,
    clearError
  };
}