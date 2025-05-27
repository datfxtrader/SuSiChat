
import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export function useAuth() {
  const { data: user, error, isLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async (): Promise<User | null> => {
      try {
        const response = await fetch('/__replauthuser');
        
        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.warn('useAuth fetch error:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const login = () => {
    try {
      window.location.href = '/api/login';
    } catch (error) {
      console.error('Login redirect error:', error);
    }
  };

  const logout = () => {
    try {
      window.location.href = '/api/logout';
    } catch (error) {
      console.error('Logout redirect error:', error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && user !== null,
    error: error || null,
    login,
    logout,
  };
}
