import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface ResearchRequest {
  query: string;
  depth?: 'basic' | 'standard' | 'deep';
  maxSources?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  useCache?: boolean;
  userContext?: string;
}

export interface Source {
  title: string;
  url: string;
  domain: string;
  contentSnippet?: string;
  relevanceScore?: number;
}

export interface ResearchResponse {
  id: string;
  query: string;
  summary?: string;
  sources: Source[];
  insights: string[];
  relatedTopics?: string[];
  status: 'completed' | 'in_progress' | 'analyzing' | 'synthesizing' | 'failed';
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

/**
 * Custom hook for interacting with the DeerFlow research service
 */
export function useDeerflow() {
  const queryClient = useQueryClient();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  /**
   * Check if the DeerFlow service is available
   */
  const useServiceHealth = () => {
    return useQuery({
      queryKey: ['/api/deerflow/health'],
      retry: 2,
      refetchOnWindowFocus: false,
      refetchInterval: 60000, // Refetch every minute
    });
  };

  /**
   * Start a new research task
   */
  const useStartResearch = () => {
    return useMutation({
      mutationFn: (request: ResearchRequest) => 
        apiRequest<{ id: string; status: string }>('/api/deerflow/research', {
          method: 'POST',
          body: JSON.stringify(request),
        }),
      onSuccess: (data) => {
        if (data.id) {
          setActiveTaskId(data.id);
        }
      }
    });
  };

  /**
   * Get the status of an ongoing research task
   */
  const useResearchStatus = (taskId: string | null) => {
    return useQuery({
      queryKey: ['/api/deerflow/research', taskId],
      enabled: !!taskId,
      refetchInterval: (data) => {
        // Refetch frequently while in progress, stop when completed or failed
        if (!data) return 1000;
        return data.status === 'completed' || data.status === 'failed' 
          ? false // Stop polling
          : 1000; // Poll every second while in progress
      }
    });
  };

  /**
   * Run a complete research task (blocks until completion)
   */
  const useCompleteResearch = () => {
    return useMutation({
      mutationFn: (request: ResearchRequest) => 
        apiRequest<ResearchResponse>('/api/deerflow/research/complete', {
          method: 'POST',
          body: JSON.stringify(request),
        })
    });
  };

  /**
   * Helper to cancel tracking of the current research task
   */
  const resetActiveTask = () => {
    setActiveTaskId(null);
  };

  return {
    useServiceHealth,
    useStartResearch,
    useResearchStatus,
    useCompleteResearch,
    activeTaskId,
    resetActiveTask,
  };
}

export default useDeerflow;