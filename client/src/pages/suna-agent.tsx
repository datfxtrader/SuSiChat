import React, { useState } from 'react';
import { ChatGPTStyleChat } from '@/components/suna/ChatGPTStyleChat';
import { TrendingUp, BookOpen } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function SunaAgentPage() {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20">
      {/* Header Section - Matching Research Blog Style */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-700/60 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                Suna Agent Research
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1 text-lg">
                Advanced AI research platform with institutional-grade analysis and real-time market intelligence
              </p>
            </div>
            <Link to="/research-blog">
              <Button variant="outline" className="gap-2 bg-white/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                <BookOpen className="w-4 h-4" />
                View Research Blog
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Chat Interface with Enhanced Styling */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/20 dark:shadow-slate-950/20 overflow-hidden min-h-[calc(100vh-200px)]">
          <ChatGPTStyleChat threadId={activeThreadId} />
        </div>
      </div>
    </div>
  );
}