import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import MainLayout from "@/components/layout/MainLayout";

const Home: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to chat page if authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/chat");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    document.title = 'SuSi - Your AI Assistant Friend';
  }, []);

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

          {isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-primary">You're logged in! Redirecting to chat...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Log in to get started with your personal AI assistant.
              </p>
              <a 
                href="/api/login"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                <span className="material-icons mr-2 text-sm">login</span>
                Log In
              </a>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;