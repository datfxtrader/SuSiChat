import { useMutation, useQuery, QueryClient } from "@tanstack/react-query";

// Create a utility function for API requests
const apiRequest = async (url: string, method: string, data?: any) => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

// Get the query client instance
const queryClient = new QueryClient();

interface ResearchRequest {
  query: string;
  conversation_id?: string;
  max_plan_iterations?: number;
  max_step_num?: number;
  enable_background_investigation?: boolean;
}

interface ResearchResponse {
  query: string;
  result: string;
  sources: any[];
  plan: any;
  observations: any[];
  conversation_id?: string;
  collected_messages?: any[];
  error?: string;
}

/**
 * Hook for using the DeerFlow enhanced research capabilities
 */
export function useDeerflowResearch() {
  // Check if the DeerFlow service is available
  const { data: serviceStatus, isLoading: checkingStatus } = useQuery({
    queryKey: ['/api/research/status'],
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 60000, // Recheck availability every minute
  });

  // Mutation for performing research
  const researchMutation = useMutation({
    mutationFn: (request: ResearchRequest) => 
      apiRequest('/api/research', 'POST', request),
    onSuccess: () => {
      // Invalidate relevant queries if needed
      queryClient.invalidateQueries({ queryKey: ['/api/research/history'] });
    },
  });

  // Determine if the service is available based on the query response
  const isServiceAvailable = serviceStatus?.available === true;

  return {
    // Research status
    isServiceAvailable,
    checkingStatus,
    
    // Research mutation
    performResearch: researchMutation.mutate,
    performResearchAsync: researchMutation.mutateAsync,
    isResearching: researchMutation.isPending,
    researchError: researchMutation.error,
    researchResult: researchMutation.data as ResearchResponse | undefined,
    
    // Reset the research state
    resetResearch: researchMutation.reset,
  };
}