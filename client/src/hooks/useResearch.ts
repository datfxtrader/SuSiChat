import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Research depth levels
export enum ResearchDepth {
  Basic = 1,
  Enhanced = 2,
  Deep = 3
}

// Research parameters
export interface ResearchParams {
  query: string;
  depth?: ResearchDepth;
  modelId?: string;
  includeMarketData?: boolean;
  includeNews?: boolean;
}

// Research result
export interface ResearchResult {
  report: string;
  sources: Array<{
    title: string;
    url: string;
    domain: string;
    content?: string;
  }>;
  depth: ResearchDepth;
  processingTime: number;
  timestamp?: string;
  searchQuery?: string;
}

/**
 * Custom hook for performing research at different depth levels
 */
export function useResearch() {
  const [currentResearch, setCurrentResearch] = useState<ResearchResult | null>(null);
  const [researchHistory, setResearchHistory] = useState<ResearchResult[]>([]);
  
  // Mutation for performing research
  const mutation = useMutation({
    mutationFn: async (params: ResearchParams): Promise<ResearchResult> => {
      try {
        const response = await apiRequest(
          'POST',
          '/api/research',
          params
        );
        const data = await response.json();
        
        // Add query info to the result for history tracking
        const resultWithQuery = {
          ...data,
          searchQuery: params.query,
          timestamp: data.timestamp || new Date().toISOString()
        } as ResearchResult;
        
        return resultWithQuery;
      } catch (error) {
        // If there's an error with the DeerFlow service, try with depth 2
        if (params.depth === ResearchDepth.Deep) {
          console.log('Falling back to depth 2 due to service error');
          return await mutation.mutateAsync({
            ...params,
            depth: ResearchDepth.Enhanced
          });
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update current research
      setCurrentResearch(data);
      
      // Add to history, keeping the most recent ones first
      setResearchHistory(prev => {
        // Add timestamp if not present
        const newData = {
          ...data,
          timestamp: data.timestamp || new Date().toISOString()
        };
        
        // Create new history array with new item at the beginning
        const newHistory = [newData, ...prev];
        
        // Limit history to 10 items
        return newHistory.slice(0, 10);
      });
      
      // Invalidate query cache
      queryClient.invalidateQueries({ queryKey: ['/api/research'] });
    },
  });

  return {
    performResearch: mutation.mutate,
    resetResearch: () => setCurrentResearch(null),
    result: currentResearch,
    researchHistory,
    clearHistory: () => setResearchHistory([]),
    selectFromHistory: (index: number) => {
      if (index >= 0 && index < researchHistory.length) {
        setCurrentResearch(researchHistory[index]);
      }
    },
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}