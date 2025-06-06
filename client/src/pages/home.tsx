import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import MainLayout from "@/components/layout/MainLayout";
import { ReplitSignIn } from "@/components/auth/ReplitSignIn";

const Home: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Check for OAuth errors in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const description = urlParams.get('description');

    if (error) {
      const errorMap: Record<string, string> = {
        'access_denied': 'You denied access to the application.',
        'invalid_request': 'Invalid OAuth request.',
        'invalid_grant': 'Authorization code expired. Please try again.',
        'auth_failed': 'Authentication failed. Please try again.',
        'session_error': 'Session error. Please try again.'
      };

      setErrorMessage(errorMap[error] || description || 'Authentication failed. Please try again.');

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Redirect to chat page if authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/chat");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    document.title = 'SuSi - Your AI Assistant Friend';
  }, []);

  const handleLoginSuccess = () => {
    try {
      // Refresh the page or redirect to dashboard
      window.location.reload();
    } catch (error) {
      console.error('Reload error:', error);
      setErrorMessage('Failed to reload page. Please try refreshing manually.');
    }
  };

  const handleLoginError = (error: string) => {
    console.error('Login error:', error);
    setErrorMessage(error || 'Login failed. Please try again.');
  };

  return (
    <MainLayout showHeader={false}>
      <div className="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-icons text-white text-4xl">assistant</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to Tongkeeper</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Your personal AI assistant for the whole family. Schedule reminders, get homework help, 
            plan trips, and collaborate with your family - all through a natural conversation.
          </p>

          {errorMessage && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
              <p className="text-red-800 dark:text-red-200 text-sm">{errorMessage}</p>
            </div>
          )}

          {isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-primary">You're logged in! Redirecting to chat...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Log in to get started with your personal AI assistant.
              </p>
              <div className="space-y-3">

                <ReplitSignIn 
                  onSuccess={handleLoginSuccess}
                  onError={handleLoginError}
                />
                <div className="text-center text-sm text-neutral-500">
                  or use Google authentication (if configured)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;