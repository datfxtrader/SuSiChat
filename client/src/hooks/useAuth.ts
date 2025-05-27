import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, error, isLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('/api/auth/user', {
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            return null; // Not authenticated, don't throw
          }
          console.warn(`Auth response not ok: ${response.status}`);
          return null;
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.warn('Auth request timed out');
          } else {
            console.warn('useAuth fetch error:', error.message);
          }
        }
        return null; // Always return null instead of throwing
      }
    },
    retry: false, // Disable retries to prevent loops
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && user !== null,
    error: null, // Don't expose errors to prevent UI issues
  };
}