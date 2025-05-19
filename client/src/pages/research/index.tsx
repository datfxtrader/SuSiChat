import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { DeepResearch } from '@/components/research/DeepResearch';

/**
 * Research page that provides access to the DeepResearch component
 * which offers comprehensive research capabilities powered by DeerFlow
 */
const ResearchPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-center mb-6">
          Please log in to access the research functionality.
        </p>
        <a 
          href="/api/login" 
          className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Log In
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto py-3 px-4">
          <nav className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Tongkeeper</h1>
            <div className="flex gap-4">
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</a>
              <a href="/suna-agent" className="text-muted-foreground hover:text-foreground transition-colors">Chat</a>
              <a href="/research" className="text-primary font-medium">Research</a>
            </div>
          </nav>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4">
        <DeepResearch />
      </main>
    </div>
  );
};

export default ResearchPage;