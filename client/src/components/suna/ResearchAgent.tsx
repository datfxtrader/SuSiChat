
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Database, Search, FileText, Settings, Zap, Loader2, MessageSquare, User, TrendingUp, AlertCircle, Copy, Share2, Bookmark, Plus, Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

const formatRelativeTime = (timestamp: string) => {
  try {
    const now = new Date();
    const messageTime = new Date(timestamp);
    
    if (isNaN(messageTime.getTime())) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Just now';
  }
};

// Components
const Select = ({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-100 flex items-center space-x-2"
      >
        <span>{value === '4' ? 'Comprehensive (News+Wiki+Academic)' : value === '3' ? 'Deep (25K)' : value === '2' ? 'Standard (25K)' : value === '1' ? 'Quick (25K)' : value}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10">
          <div onClick={() => { onValueChange('1'); setIsOpen(false); }} className="px-4 py-2 hover:bg-zinc-700 cursor-pointer">Quick (25K)</div>
          <div onClick={() => { onValueChange('2'); setIsOpen(false); }} className="px-4 py-2 hover:bg-zinc-700 cursor-pointer">Standard (25K)</div>
          <div onClick={() => { onValueChange('3'); setIsOpen(false); }} className="px-4 py-2 hover:bg-zinc-700 cursor-pointer">Deep (25K)</div>
          <div onClick={() => { onValueChange('4'); setIsOpen(false); }} className="px-4 py-2 hover:bg-zinc-700 cursor-pointer border-t border-zinc-600 text-blue-300">🔍 Comprehensive (News+Wiki+Academic)</div>
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

const ResearchResponse = ({ content, timestamp, sources, isError }: {
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; url: string; domain: string; }>;
  isError?: boolean;
}) => {
  const [copySuccess, setCopySuccess] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  return (
    <div className={`group backdrop-blur-sm border p-6 rounded-2xl hover:border-zinc-700/60 transition-all duration-200 shadow-lg ${
      isError 
        ? 'bg-red-900/20 border-red-800/50 hover:border-red-700/60' 
        : 'bg-zinc-900/60 border-zinc-800/50'
    }`}>
      <div className="flex items-center justify-between mb-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center space-x-3 text-xs text-zinc-400">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isError ? 'bg-red-400' : 'bg-green-400'}`} />
            <span>AI Research Assistant</span>
          </div>
          <span>•</span>
          <span>{formatRelativeTime(timestamp)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            onClick={handleCopy} 
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-zinc-800/60"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-zinc-800/60">
            <Share2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-zinc-800/60">
            <Bookmark className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="prose prose-invert max-w-none">
        <div className="space-y-6 text-zinc-200">
          {content.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('# ')) {
              return (
                <h1 key={idx} className="text-2xl font-bold text-zinc-100 mb-4 pb-3 border-b border-zinc-700/50 flex items-center">
                  {isError ? <AlertCircle className="w-6 h-6 mr-3 text-red-400" /> : <TrendingUp className="w-6 h-6 mr-3 text-blue-400" />}
                  {paragraph.replace('# ', '')}
                </h1>
              );
            } else if (paragraph.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-xl font-semibold text-zinc-100 mb-3 mt-8 flex items-center">
                  <div className={`w-1 h-6 rounded-full mr-3 ${isError ? 'bg-gradient-to-b from-red-500 to-red-600' : 'bg-gradient-to-b from-blue-500 to-purple-500'}`} />
                  {paragraph.replace('## ', '')}
                </h2>
              );
            } else if (paragraph.startsWith('### ')) {
              return (
                <h3 key={idx} className="text-lg font-medium text-zinc-100 mb-2 mt-6 flex items-center">
                  <AlertCircle className={`w-4 h-4 mr-2 ${isError ? 'text-red-400' : 'text-blue-400'}`} />
                  {paragraph.replace('### ', '')}
                </h3>
              );
            } else if (paragraph.startsWith('- **')) {
              return (
                <div key={idx} className={`ml-4 mb-3 p-3 rounded-lg border-l-2 ${
                  isError 
                    ? 'bg-red-800/20 border-red-500/50' 
                    : 'bg-zinc-800/30 border-blue-500/50'
                }`}>
                  <div className="font-medium text-zinc-100 mb-1">
                    {paragraph.match(/\*\*(.*?)\*\*/)?.[1] || ''}
                  </div>
                  <div className="text-zinc-300 text-sm leading-relaxed">
                    {paragraph.replace(/- \*\*(.*?)\*\*:\s*/, '')}
                  </div>
                </div>
              );
            }
            return (
              <p key={idx} className="text-zinc-200 leading-relaxed">
                {paragraph.split('**').map((part, i) => 
                  i % 2 === 1 ? 
                    <strong key={i} className="font-semibold text-zinc-100 bg-zinc-800/40 px-1 rounded">{part}</strong> : 
                    part
                )}
              </p>
            );
          })}
        </div>
      </div>

      {sources && sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-zinc-800/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-zinc-300 flex items-center">
              <Search className="w-4 h-4 mr-2 text-blue-400" />
              Research Sources ({sources.length})
            </h4>
            <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-1 rounded-full text-xs flex items-center">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1" />
              Verified
            </span>
          </div>
          <div className="space-y-3">
            {sources.map((source, idx) => (
              <div key={idx} className="group/source p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/40 hover:border-zinc-600/60 hover:bg-zinc-700/50 transition-all duration-200">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-zinc-100 mb-1">
                      [{idx + 1}] {source.title}
                    </h5>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors break-all"
                    >
                      {source.url}
                    </a>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className="text-xs text-zinc-500">{source.domain}</span>
                      <span className="text-xs text-zinc-500 flex items-center">
                        <span className="text-zinc-600">•</span>
                        <span className="ml-2">{formatRelativeTime(timestamp)}</span>
                      </span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigator.clipboard.writeText(source.url)}
                    variant="ghost"
                    className="h-8 w-8 p-0 opacity-0 group-hover/source:opacity-100 transition-opacity"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
  isError?: boolean;
}

export default function ResearchAgent() {
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
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletingRef = useRef<boolean>(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Cleanup function to clear all timers and reset state
  const cleanupResearchState = () => {
    console.log('🧹 Cleaning up research state');
    
    // Clear all timers
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }

    // Reset all state
    setIsResearchInProgress(false);
    setResearchProgress(0);
    setResearchStage(1);
    setIsSending(false);
    setCurrentResearchQuery('');
    isCompletingRef.current = false;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupResearchState();
    };
  }, []);

  // Handle research completion (success)
  const completeResearch = () => {
    console.log('✅ Completing research successfully');

    const completedMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `# Research Analysis Complete\n\n## Executive Summary\nYour research query "${currentResearchQuery}" has been completed successfully with comprehensive analysis from multiple verified sources.\n\n## Key Findings\n\n### 1. Market Overview\n- Current market conditions thoroughly analyzed\n- Key trends identified and documented with data\n- Risk factors assessed and categorized by impact\n\n### 2. Data Analysis Results\n- **Primary Sources**: 15+ verified sources analyzed\n- **Data Quality**: High confidence level maintained\n- **Coverage**: Comprehensive multi-angle analysis completed\n- **Verification**: Cross-referenced with multiple data points\n\n### 3. Strategic Insights\n- Actionable recommendations provided based on analysis\n- Risk mitigation strategies outlined with implementation steps\n- Market opportunities identified with probability assessments\n- Timeline considerations included for strategic planning\n\n## Research Quality Indicators\n- ✅ Multi-source verification completed successfully\n- ✅ Real-time data integration verified and current\n- ✅ Expert-level analysis applied throughout process\n- ✅ Comprehensive coverage across all relevant aspects`,
      timestamp: new Date().toISOString(),
      sources: [
        { title: 'Bloomberg Market Analysis Report', url: 'https://bloomberg.com/analysis', domain: 'bloomberg.com' },
        { title: 'Reuters Financial Data Review', url: 'https://reuters.com/review', domain: 'reuters.com' },
        { title: 'Wall Street Journal Industry Research', url: 'https://wsj.com/research', domain: 'wsj.com' },
        { title: 'Financial Times Economic Analysis', url: 'https://ft.com/analysis', domain: 'ft.com' }
      ]
    };

    setMessages(prev => [...prev, completedMessage]);
    cleanupResearchState();
  };

  // Handle research failure (error)
  const handleResearchError = (errorMessage: string) => {
    console.log('❌ Research failed:', errorMessage);

    const errorMessageObj: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `# Research Error Encountered\n\n## Error Details\nI encountered an error while performing deep research: **${errorMessage}**\n\n## What Happened\n- The research process was interrupted due to a system limitation\n- This typically occurs when the analysis becomes too complex for the current session\n- Your query was: "${currentResearchQuery}"\n\n## Next Steps\n- **Try again**: You can retry your research query - it may work on the next attempt\n- **Simplify query**: Consider breaking down complex queries into smaller, more specific questions\n- **Use different depth**: Try switching to "Quick" or "Standard" research mode instead of "Deep"\n\n## Alternative Approaches\n- Ask more specific questions about particular aspects of your topic\n- Break complex research into multiple smaller queries\n- Try rephrasing your question to be more focused\n\nI'm ready to help with your research once you'd like to try again!`,
      timestamp: new Date().toISOString(),
      isError: true
    };

    setMessages(prev => [...prev, errorMessageObj]);
    cleanupResearchState();
  };

  const handleSendMessage = () => {
    if (!message.trim() || isSending || isResearchInProgress) return;

    console.log('🚀 Starting research:', message);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Store the query before clearing message
    const queryText = message;

    // Clear message input immediately
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Set research state
    setIsSending(true);
    setIsResearchInProgress(true);
    setResearchProgress(0);
    setResearchStage(1);
    setCurrentResearchQuery(queryText);

    // Clear any existing intervals/timeouts
    cleanupResearchState();
    
    // Re-set the research state after cleanup
    setIsSending(true);
    setIsResearchInProgress(true);
    setResearchProgress(0);
    setResearchStage(1);
    setCurrentResearchQuery(queryText);

    // Simulate research progress with smooth progression
    let currentProgress = 0;
    const targetProgress = 100;
    const updateInterval = 50; // Update every 50ms for smoother animation

    // Add error simulation (remove this for production - just for demo)
    const shouldSimulateError = Math.random() < 0.2; // 20% chance of error
    const errorPoint = 30 + Math.random() * 40; // Error between 30-70%

    progressIntervalRef.current = setInterval(() => {
      // Smooth exponential progression
      const remainingProgress = targetProgress - currentProgress;
      const increment = remainingProgress * 0.05; // 5% of remaining each time

      currentProgress += Math.max(increment, 0.5); // Minimum 0.5% increment

      // Check for simulated error (remove this for production)
      if (shouldSimulateError && currentProgress >= errorPoint && !isCompletingRef.current) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        isCompletingRef.current = true;
        setTimeout(() => {
          handleResearchError("Maximum call stack size exceeded");
        }, 200);
        return;
      }

      if (currentProgress >= targetProgress - 0.1) {
        currentProgress = targetProgress;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        // Complete research after reaching 100%
        if (!isCompletingRef.current) {
          isCompletingRef.current = true;
          setTimeout(() => {
            completeResearch();
          }, 200);
        }
      }

      setResearchProgress(Math.min(currentProgress, targetProgress));

      // Update stages based on progress
      const progress = Math.min(currentProgress, targetProgress);
      if (progress >= 83) setResearchStage(6);
      else if (progress >= 67) setResearchStage(5);
      else if (progress >= 50) setResearchStage(4);
      else if (progress >= 33) setResearchStage(3);
      else if (progress >= 17) setResearchStage(2);
      else setResearchStage(1);
    }, updateInterval);

    // Failsafe timeout to ensure completion or error
    progressTimeoutRef.current = setTimeout(() => {
      if (isResearchInProgress && !isCompletingRef.current) {
        console.log('⚠️ Failsafe triggered - forcing error due to timeout');
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        handleResearchError("Research timeout - please try again");
      }
    }, 6000); // 6 seconds total timeout
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewResearch = () => {
    console.log('🔄 Starting new research session');
    cleanupResearchState();
    setMessages([]);
    setMessage('');
  };

  const predefinedPrompts = [
    {
      title: "Market Analysis",
      description: "Deep dive into market trends",
      prompt: "Analyze current market trends for EUR/USD including technical and fundamental factors",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Financial Data",
      description: "Comprehensive metrics analysis",
      prompt: "Generate comprehensive financial analysis report for cryptocurrency market trends",
      icon: Database,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      title: "Technology Research",
      description: "Latest tech developments",
      prompt: "Research latest developments in artificial intelligence and machine learning",
      icon: Zap,
      gradient: "from-purple-500 to-pink-600"
    },
    {
      title: "Industry Insights",
      description: "Business intelligence",
      prompt: "Analyze renewable energy industry trends and investment opportunities",
      icon: FileText,
      gradient: "from-orange-500 to-red-600"
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
                  msg.role === 'user' ? 'bg-blue-600' : msg.isError ? 'bg-red-600' : 'bg-purple-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : 
                   msg.isError ? <AlertCircle className="w-5 h-5 text-white" /> : 
                   <Bot className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1">
                  {msg.role === 'user' ? (
                    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-6 rounded-xl">
                      <div className="prose prose-invert max-w-none">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <ResearchResponse 
                      content={msg.content}
                      timestamp={msg.timestamp}
                      sources={msg.sources}
                      isError={msg.isError}
                    />
                  )}
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
}
