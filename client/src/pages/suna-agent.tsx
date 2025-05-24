import React, { useState } from 'react';
import { ChatGPTStyleChat } from '@/components/suna/ChatGPTStyleChat';
import { TrendingUp, BookOpen } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function SunaAgentPage() {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header Section - Matching Research Blog Style */}
      <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary-foreground" />
                </div>
                Suna Agent Research
              </h1>
              <p className="text-muted-foreground mt-1">
                Advanced AI research platform with institutional-grade analysis and real-time market intelligence
              </p>
            </div>
            <Link to="/research-blog">
              <Button variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                View Research Blog
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Chat Interface with Enhanced Styling */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-background/50 backdrop-blur-sm rounded-xl border shadow-lg overflow-hidden min-h-[calc(100vh-200px)]">
          <ChatGPTStyleChat threadId={activeThreadId} />
        </div>
      </div>
    </div>
  );
}