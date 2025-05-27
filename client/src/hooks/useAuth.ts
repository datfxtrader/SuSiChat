import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    onError: (error) => {
      console.error("Error fetching user:", error);
    },
    onSuccess: (data) => {
      console.log("User data fetched successfully:", data);
    }
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