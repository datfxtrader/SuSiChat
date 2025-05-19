import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Define types that mirror the server-side interfaces
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
 * Custom hook for interacting with the DeerFlow research capabilities
 */
export function useDeerflow() {
  const queryClient = useQueryClient();
  const [activeResearchId, setActiveResearchId] = useState<string | null>(null);

  // Check if DeerFlow service is healthy
  const healthCheck = useQuery({
    queryKey: ['/api/deerflow/health'],
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Start a new research task
  const startResearch = useMutation({
    mutationFn: async (request: ResearchRequest) => {
      const response = await axios.post('/api/deerflow/research/start', request);
      return response.data;
    },
    onSuccess: (data) => {
      setActiveResearchId(data.id);
    },
  });

  // Get research status for a specific task
  const getResearchStatus = useQuery({
    queryKey: ['/api/deerflow/research', activeResearchId],
    enabled: !!activeResearchId,
    refetchInterval: (data) => {
      // Poll more frequently when in progress, stop polling when complete or failed
      if (!data) return 2000;
      if (data.status === 'completed' || data.status === 'failed') return false;
      return 2000; // Poll every 2 seconds while in progress
    },
  });

  // Run a complete research task (start and wait for completion)
  const runCompleteResearch = useMutation({
    mutationFn: async (request: ResearchRequest) => {
      const response = await axios.post('/api/deerflow/research/complete', request);
      return response.data;
    },
  });

  // Convenience function to clear the active research
  const clearActiveResearch = () => {
    setActiveResearchId(null);
  };

  return {
    isAvailable: healthCheck.data?.status === 'ok',
    isCheckingAvailability: healthCheck.isLoading,
    
    startResearch: startResearch.mutate,
    isStartingResearch: startResearch.isPending,
    startResearchError: startResearch.error,
    
    runCompleteResearch: runCompleteResearch.mutate,
    isRunningResearch: runCompleteResearch.isPending,
    completeResearchError: runCompleteResearch.error,
    completeResearchResult: runCompleteResearch.data,
    
    activeResearchId,
    setActiveResearchId,
    clearActiveResearch,
    
    researchStatus: getResearchStatus.data,
    isLoadingStatus: getResearchStatus.isLoading,
    statusError: getResearchStatus.error,
    
    // Helper function to format research results into a Markdown string
    formatResearchResults: (research: ResearchResponse): string => {
      if (!research) return '';
      
      let markdown = `# Research: ${research.query}\n\n`;
      
      if (research.summary) {
        markdown += `## Summary\n${research.summary}\n\n`;
      }
      
      if (research.insights && research.insights.length > 0) {
        markdown += `## Key Insights\n`;
        research.insights.forEach(insight => {
          markdown += `- ${insight}\n`;
        });
        markdown += '\n';
      }
      
      if (research.sources && research.sources.length > 0) {
        markdown += `## Sources\n`;
        research.sources.forEach((source, index) => {
          markdown += `### ${index + 1}. [${source.title}](${source.url})\n`;
          if (source.contentSnippet) {
            markdown += `${source.contentSnippet}\n\n`;
          }
        });
      }
      
      if (research.relatedTopics && research.relatedTopics.length > 0) {
        markdown += `## Related Topics\n`;
        research.relatedTopics.forEach(topic => {
          markdown += `- ${topic}\n`;
        });
      }
      
      return markdown;
    }
  };
}