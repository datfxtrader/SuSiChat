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

// Enhanced Research Response Component
const ResearchResponse = ({ content, timestamp, sources }: {
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; url: string; domain: string; }>;
}) => {
  const [copySuccess, setCopySuccess] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  return (
    <div className="group bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-6 rounded-2xl hover:border-zinc-700/60 transition-all duration-200 shadow-lg">
      <div className="flex items-center justify-between mb-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center space-x-3 text-xs text-zinc-400">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span>AI Research Assistant</span>
          </div>
          <span>•</span>
          <span>{formatRelativeTime(timestamp)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            onClick={handleCopy} 
            className="h-7 w-7 p-0 hover:bg-zinc-800/60 bg-transparent border-none text-zinc-400 hover:text-zinc-200"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button className="h-7 w-7 p-0 hover:bg-zinc-800/60 bg-transparent border-none text-zinc-400 hover:text-zinc-200">
            <Share2 className="w-3 h-3" />
          </Button>
          <Button className="h-7 w-7 p-0 hover:bg-zinc-800/60 bg-transparent border-none text-zinc-400 hover:text-zinc-200">
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
                  <TrendingUp className="w-6 h-6 mr-3 text-blue-400" />
                  {paragraph.replace('# ', '')}
                </h1>
              );
            } else if (paragraph.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-xl font-semibold text-zinc-100 mb-3 mt-8 flex items-center">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3" />
                  {paragraph.replace('## ', '')}
                </h2>
              );
            } else if (paragraph.startsWith('### ')) {
              return (
                <h3 key={idx} className="text-lg font-medium text-zinc-100 mb-2 mt-6 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-blue-400" />
                  {paragraph.replace('### ', '')}
                </h3>
              );
            } else if (paragraph.startsWith('- **')) {
              return (
                <div key={idx} className="ml-4 mb-3 p-3 bg-zinc-800/30 rounded-lg border-l-2 border-blue-500/50">
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
                    className="h-8 w-8 p-0 opacity-0 group-hover/source:opacity-100 transition-opacity bg-transparent border-none text-zinc-400 hover:text-zinc-200"
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
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    };
  }, []);

  // Ensure progress is reset on mount and handle reconnection
  useEffect(() => {
    // Reset state on mount
    setIsResearchInProgress(false);
    setResearchProgress(0);
    setResearchStage(1);
    setIsSending(false);
    
    // Check for any stuck research state and clean it up
    const checkStuckState = () => {
      const now = Date.now();
      const savedTimestamp = localStorage.getItem('research_timestamp');
      
      if (savedTimestamp) {
        const timeDiff = now - parseInt(savedTimestamp);
        // If research has been "running" for more than 2 minutes, clear it
        if (timeDiff > 120000) {
          console.log('🧹 Cleaning up stuck research state');
          localStorage.removeItem('research_state');
          localStorage.removeItem('research_progress');
          localStorage.removeItem('research_query');
          localStorage.removeItem('research_timestamp');
          setIsResearchInProgress(false);
          setResearchProgress(0);
          setCurrentResearchQuery('');
        }
      }
    };
    
    checkStuckState();
  }, []);

  

  const handleSendMessage = async () => {
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
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
    }
    
    // Start progress simulation while research is happening
    let currentProgress = 0;
    const updateInterval = 800; // Update every 800ms
    
    progressIntervalRef.current = setInterval(() => {
      // Smooth exponential progression but cap at 95% until real completion
      const remainingProgress = 95 - currentProgress;
      const increment = remainingProgress * 0.08; // 8% of remaining each time
      
      currentProgress += Math.max(increment, 0.5); // Minimum 0.5% increment
      currentProgress = Math.min(currentProgress, 95); // Cap at 95%
      
      setResearchProgress(currentProgress);
      
      // Update stages based on progress
      if (currentProgress >= 80) setResearchStage(6);
      else if (currentProgress >= 65) setResearchStage(5);
      else if (currentProgress >= 50) setResearchStage(4);
      else if (currentProgress >= 33) setResearchStage(3);
      else if (currentProgress >= 17) setResearchStage(2);
      else setResearchStage(1);
    }, updateInterval);
    
    // Start the actual research request in parallel
    try {
      console.log('📡 Sending research request to backend...');
      setIsSending(false); // Allow progress to continue but research is no longer "sending"
      
      const response = await fetch('/api/suna-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryText,
          depth: parseInt(researchDepth),
          model: selectedModel
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      console.log('📊 Research API response received:', {
        status: data.status,
        hasReport: !!data.report,
        reportLength: data.report?.length || 0,
        sourcesCount: data.sources?.length || 0
      });

      // Clear progress interval immediately when we get real data
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Set progress to 100% immediately
      setResearchProgress(100);
      setResearchStage(6);
      
      // Process and display results immediately - no delays
      if (data.report) {
        const completedMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content: data.report,
          timestamp: new Date().toISOString(),
          sources: data.sources || []
        };
        
        setMessages(prev => [...prev, completedMessage]);
        console.log('✅ Research results added to messages');
      } else {
        console.log('⚠️ No report content in response');
        const fallbackMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content: `# Research Complete

Research for "${queryText}" has been completed, but no content was returned from the backend service.

Please try your query again or check if the backend service is running properly.`,
          timestamp: new Date().toISOString(),
          sources: []
        };
        
        setMessages(prev => [...prev, fallbackMessage]);
      }
      
      // Clean up state immediately
      setIsResearchInProgress(false);
      setCurrentResearchQuery('');
      
      // Reset progress after a short delay for visual feedback
      setTimeout(() => {
        setResearchProgress(0);
        setResearchStage(1);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Research request failed:', error);
      
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Show error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: `# Research Request Failed

I encountered an error while processing your research query: "${queryText}"

**Error Details:**
${error.message}

**Troubleshooting Steps:**
1. Check your internet connection
2. Verify the backend service is running
3. Try submitting a simpler query
4. Contact support if the issue persists

Please try again or rephrase your research question.`,
        timestamp: new Date().toISOString(),
        sources: []
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Clear research state
      setIsResearchInProgress(false);
      setResearchProgress(0);
      setResearchStage(1);
      setIsSending(false);
      setCurrentResearchQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewResearch = () => {
    console.log('🔄 Starting new research session');
    
    // Clear all intervals and timeouts first
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
    
    // Then reset all state
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
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Show research progress in main chat area instead of duplicating */}
          {isResearchInProgress && (
            <div className="mb-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <ResearchProgress 
                    stage={researchStage}
                    progress={researchProgress}
                    query={currentResearchQuery || "Analyzing..."}
                    isActive={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Research progress is now only shown in the main chat area */}
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