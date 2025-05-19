import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";
import { useState } from "react";

// Types for DeerFlow research
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
  summary: string;
  sources: Source[];
  insights: string[];
  relatedTopics?: string[];
  status: 'completed' | 'in_progress' | 'failed';
  error?: string;
}

/**
 * Hook for using DeerFlow deep research capabilities
 */
export function useDeerflow() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [activeResearchId, setActiveResearchId] = useState<string | null>(null);

  // Start a new research task
  const startResearch = useMutation({
    mutationFn: async (request: ResearchRequest) => {
      try {
        const response = await fetch('/api/deerflow/research', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });
        
        const data = await response.json();
        console.log("Research started:", data);
        return data.id;
      } catch (error) {
        console.error("Error starting research:", error);
        throw error;
      }
    },
    onSuccess: (researchId) => {
      console.log("Setting active research ID:", researchId);
      setActiveResearchId(researchId);
    },
  });

  // Get the status and results of a research task
  const getResearchStatus = useQuery({
    queryKey: ['/api/deerflow/research', activeResearchId],
    queryFn: async () => {
      if (!activeResearchId) return null;
      
      try {
        const response = await fetch(`/api/deerflow/research/${activeResearchId}`);
        const data = await response.json();
        console.log("Research status:", data);
        return data;
      } catch (error) {
        console.error("Error getting research status:", error);
        throw error;
      }
    },
    enabled: isAuthenticated && !!activeResearchId,
    refetchInterval: (data) => {
      // Poll more frequently when research is in progress
      if (data?.status === 'in_progress' || data?.status === 'analyzing' || data?.status === 'synthesizing') {
        return 2000; // 2 seconds
      }
      return false; // Stop polling when complete or failed
    },
  });

  // Run a complete research task (start and wait for completion)
  // This is a long-running operation and should be used with caution
  const runCompleteResearch = useMutation({
    mutationFn: async (request: ResearchRequest) => {
      try {
        const response = await fetch('/api/deerflow/research/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });
        
        const data = await response.json();
        console.log("Complete research results:", data);
        return data;
      } catch (error) {
        console.error("Error running complete research:", error);
        throw error;
      }
    },
  });

  // Check if DeerFlow service is available
  const checkHealth = useQuery({
    queryKey: ['/api/deerflow/health'],
    queryFn: async () => {
      return await apiRequest('/api/deerflow/health');
    },
    enabled: isAuthenticated,
    refetchInterval: 60000, // Check every minute
  });

  return {
    // Mutations
    startResearch,
    runCompleteResearch,
    
    // Queries
    researchStatus: getResearchStatus.data,
    isLoadingStatus: getResearchStatus.isLoading,
    
    // Service status
    // During development, set to true to allow testing even without a running server
    isServiceAvailable: true, // checkHealth.data?.status === 'ok'
    isLoadingServiceStatus: false, // checkHealth.isLoading
    
    // State
    activeResearchId,
    setActiveResearchId,
    
    // Helper function to check if research is complete
    isResearchComplete: getResearchStatus.data?.status === 'completed',
    isResearchInProgress: getResearchStatus.data?.status === 'in_progress',
    isResearchFailed: getResearchStatus.data?.status === 'failed',
  };
}

export default useDeerflow;