import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, error, isLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
          timeout: 10000, // 10 second timeout
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null; // Not authenticated, don't throw
          }
          throw new Error(`Auth error: ${response.status}`);
        }

        return response.json();
      } catch (error) {
        console.log('useAuth query error:', error);
        return null; // Return null instead of throwing
      }
    },
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  if (error) {
    console.error("useAuth query error:", error);
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}