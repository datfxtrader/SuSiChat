import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/api';

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
}

/**
 * Custom hook for performing research at different depth levels
 */
export function useResearch() {
  const [currentResearch, setCurrentResearch] = useState<ResearchResult | null>(null);
  
  // Mutation for performing research
  const mutation = useMutation({
    mutationFn: async (params: ResearchParams): Promise<ResearchResult> => {
      const response = await apiRequest<ResearchResult>('/api/research', {
        method: 'POST',
        data: params,
      });
      return response;
    },
    onSuccess: (data) => {
      setCurrentResearch(data);
      queryClient.invalidateQueries({ queryKey: ['/api/research'] });
    },
  });

  return {
    performResearch: mutation.mutate,
    resetResearch: () => setCurrentResearch(null),
    result: currentResearch,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}