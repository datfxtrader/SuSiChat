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

// Research depth level type
export type ResearchDepthLevel = 1 | 2 | 3; // 1=standard, 2=enhanced, 3=deep research with DeerFlow

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
  const [currentModel, setCurrentModel] = useState<LLMModel>('deepseek-chat');
  const [depthLevel, setDepthLevel] = useState<ResearchDepthLevel>(1); // Default to standard level
  const [searchPreferences, setSearchPreferences] = useState<SearchPreferences>({
    priority: 'relevance',
    maxResults: 5
  });
  
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
    mutationFn: async ({ 
      message, 
      model = currentModel,
      customSearchPrefs,
      researchDepth = depthLevel
    }: { 
      message: string, 
      model?: LLMModel,
      customSearchPrefs?: SearchPreferences,
      researchDepth?: ResearchDepthLevel
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
      
      // Use the direct DeerFlow research API for depth level 3
      let response;
      
      if (researchDepth === 3) {
        console.log("Using direct DeerFlow research API for depth level 3");
        
        // First try the dedicated DeerFlow endpoint
        try {
          const deerflowResponse = await apiRequest(
            'POST',
            '/api/deerflow/research',
            {
              query: processedMessage,
              threadId: threadId
            }
          );
          
          if (deerflowResponse.ok) {
            const deerflowData = await deerflowResponse.json();
            
            if (deerflowData.success && deerflowData.research) {
              // Format the response to match what the standard endpoint would return
              // but with clear indication it's from DeerFlow
              
              const research = deerflowData.research;
              
              // Create a special message format for DeerFlow research
              let formattedContent = `## Advanced Research: ${research.query}\n\n`;
              formattedContent += research.result;
              
              // Add sources if available
              if (research.sources && research.sources.length > 0) {
                formattedContent += "\n\n### Sources\n";
                research.sources.forEach((source: any, index: number) => {
                  formattedContent += `${index + 1}. [${source.title || 'Source'}](${source.url})\n`;
                });
              }
              
              // Create a response structure that matches what the standard API returns
              return {
                ok: true,
                json: async () => ({
                  threadId: threadId || research.conversation_id,
                  message: {
                    id: `assistant-${Date.now()}`,
                    content: formattedContent,
                    role: 'assistant',
                    timestamp: new Date().toISOString(),
                    modelUsed: "DeerFlow Advanced Research",
                    webSearchUsed: true
                  }
                })
              };
            }
          }
        } catch (error) {
          console.error("Error with DeerFlow research, falling back to standard API:", error);
          // Continue with standard API as fallback
        }
      }
      
      // For normal queries or as fallback for depth level 3
      response = await apiRequest(
        'POST',
        '/api/suna/message',
        {
          message: processedMessage, // Send processed message without command prefixes
          threadId: threadId, // Always pass the current threadId, even if undefined
          model: model, // Pass the selected model to the API
          depthLevel: researchDepth, // Pass the research depth level
          searchPreferences: activeSearchPrefs // Pass search preferences
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
  
  // Function to set the research depth level
  const setResearchDepth = (level: ResearchDepthLevel) => {
    setDepthLevel(level);
  };

  return {
    conversation,
    allConversations,
    threadId,
    messages,
    currentModel,
    depthLevel,
    searchPreferences,
    isLoadingConversation,
    isLoadingConversations,
    sendMessage,
    isSending,
    selectConversation,
    createNewChat,
    changeModel,
    setResearchDepth,
    updateSearchPreferences,
    toggleForceSearch,
    toggleDisableSearch
  };
}