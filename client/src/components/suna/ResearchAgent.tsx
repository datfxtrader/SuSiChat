import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Database, Search, FileText, Settings, Zap, Loader2, MessageSquare, User, TrendingUp, AlertCircle, Copy, Share2, Bookmark, Plus, Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

// Simple UI components
const Select = ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children?: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-100 flex items-center space-x-2"
      >
        <span>{value === '3' ? 'Deep (25K)' : value === '2' ? 'Standard (25K)' : value === '1' ? 'Quick (25K)' : value}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10">
          <div onClick={() => { onValueChange('1'); setIsOpen(false); }} className="px-4 py-2 hover:bg-zinc-700 cursor-pointer">Quick (25K)</div>
          <div onClick={() => { onValueChange('2'); setIsOpen(false); }} className="px-4 py-2 hover:bg-zinc-700 cursor-pointer">Standard (25K)</div>
          <div onClick={() => { onValueChange('3'); setIsOpen(false); }} className="px-4 py-2 hover:bg-zinc-700 cursor-pointer">Deep (25K)</div>
        </div>
      )}
    </div>
  );
};

const ResearchProgress = ({ stage, progress, query, isActive }: {
  stage: number;
  progress: number;
  query: string;
  isActive: boolean;
}) => (
  <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-6 backdrop-blur-sm">
    <div className="flex items-center space-x-3 mb-4">
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
        <Search className="w-4 h-4 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">Researching...</h3>
        <p className="text-xs text-zinc-400">{query}</p>
      </div>
    </div>
    
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-blue-400">Stage {stage}/6</span>
        <span className="text-xs text-zinc-400">{Math.round(progress)}%</span>
      </div>
      
      <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.max(progress, 5)}%` }}
        />
      </div>
      
      {isActive && (
        <div className="flex items-center space-x-2 text-xs text-blue-400">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          <span>Analyzing sources and generating insights...</span>
        </div>
      )}
    </div>
  </div>
);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
  }>;
}

export const ResearchAgent = () => {
  const [message, setMessage] = useState('');
  const [researchDepth, setResearchDepth] = useState('3');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isSending, setIsSending] = useState(false);
  const [isResearchInProgress, setIsResearchInProgress] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStage, setResearchStage] = useState(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResearchQuery, setCurrentResearchQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    };
  }, []);

  // Handle research completion
  const completeResearch = () => {
    console.log('✅ Completing research');
    
    const completedMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant' as const,
      content: `# Research Analysis Complete

## Executive Summary
Your research query "${currentResearchQuery}" has been completed successfully with comprehensive analysis from multiple verified sources.

## Key Findings

### 1. Market Overview
- Current market conditions thoroughly analyzed
- Key trends identified and documented with data
- Risk factors assessed and categorized by impact

### 2. Data Analysis Results
- **Primary Sources**: 15+ verified sources analyzed
- **Data Quality**: High confidence level maintained
- **Coverage**: Comprehensive multi-angle analysis completed
- **Verification**: Cross-referenced with multiple data points

### 3. Strategic Insights
- Actionable recommendations provided based on analysis
- Risk mitigation strategies outlined with implementation steps
- Market opportunities identified with probability assessments
- Timeline considerations included for strategic planning

## Research Quality Indicators
- ✅ Multi-source verification completed successfully
- ✅ Real-time data integration verified and current
- ✅ Expert-level analysis applied throughout process
- ✅ Comprehensive coverage across all relevant aspects`,
      timestamp: new Date().toISOString(),
      sources: [
        { title: 'Bloomberg Market Analysis Report', url: '#', domain: 'bloomberg.com' },
        { title: 'Reuters Financial Data Review', url: '#', domain: 'reuters.com' },
        { title: 'Wall Street Journal Industry Research', url: '#', domain: 'wsj.com' },
        { title: 'Financial Times Economic Analysis', url: '#', domain: 'ft.com' }
      ]
    };
    
    setMessages(prev => [...prev, completedMessage]);
    
    // Clear all research-related state
    setIsResearchInProgress(false);
    setResearchProgress(0);
    setResearchStage(1);
    setIsSending(false);
    setCurrentResearchQuery('');
    
    // Clear any running intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || isSending || isResearchInProgress) return;
    
    console.log('🚀 Starting research:', message);
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Set research state
    setIsSending(true);
    setIsResearchInProgress(true);
    setResearchProgress(0);
    setResearchStage(1);
    setCurrentResearchQuery(message);
    
    // Clear any existing intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Simulate research progress
    let currentProgress = 0;
    progressIntervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 8 + 4; // 4-12% increments
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        // Complete research after a short delay
        setTimeout(() => {
          completeResearch();
        }, 500);
      }
      
      setResearchProgress(currentProgress);
      
      // Update stages
      if (currentProgress >= 85) setResearchStage(6);
      else if (currentProgress >= 70) setResearchStage(5);
      else if (currentProgress >= 55) setResearchStage(4);
      else if (currentProgress >= 40) setResearchStage(3);
      else if (currentProgress >= 20) setResearchStage(2);
      else setResearchStage(1);
    }, 600);
    
    // Clear message input
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewResearch = () => {
    // Clear all intervals and timeouts
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    
    // Reset all state
    setMessages([]);
    setIsResearchInProgress(false);
    setResearchProgress(0);
    setResearchStage(1);
    setIsSending(false);
    setMessage('');
    setCurrentResearchQuery('');
  };

  const predefinedPrompts = [
    {
      title: "Market Analysis",
      description: "Deep dive into market trends",
      prompt: "Analyze current market trends",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Financial Data",
      description: "Comprehensive metrics analysis",
      prompt: "Generate financial analysis",
      icon: Database,
      gradient: "from-blue-500 to-indigo-600"
    }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="w-64 border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="p-4 border-b border-zinc-800/60">
          <Button onClick={handleNewResearch} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Research
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && !isResearchInProgress && (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-4xl mx-auto px-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <Bot className="w-8 h-8 text-white" />
                </div>

                <h1 className="text-3xl font-bold text-zinc-100 mb-3">
                  Welcome to Research Agent
                </h1>
                <p className="text-lg text-zinc-400 mb-12">
                  Get comprehensive, AI-powered research on any topic with real-time data
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {predefinedPrompts.map((card, idx) => (
                    <div
                      key={idx}
                      onClick={() => setMessage(card.prompt)}
                      className="group p-6 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl hover:bg-zinc-800/70 hover:border-zinc-700/70 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                        <card.icon className="w-6 h-6 text-white" />
                      </div>

                      <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                        {card.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="mb-4">
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-6 rounded-xl">
                    <div className="prose prose-invert max-w-none">
                      {msg.content.split('\n').map((line, i) => (
                        <div key={i}>{line || <br />}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isResearchInProgress && (
            <div className="mb-4">
              <ResearchProgress 
                stage={researchStage}
                progress={researchProgress}
                query={currentResearchQuery || "Analyzing..."}
                isActive={true}
              />
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 mb-4">
              <Select value={researchDepth} onValueChange={setResearchDepth} />
              <Select value={selectedModel} onValueChange={setSelectedModel} />
            </div>

            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a research question..."
                className="min-h-[100px] pr-24"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending || isResearchInProgress}
                className="absolute bottom-4 right-4"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};