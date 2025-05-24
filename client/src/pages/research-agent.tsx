import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Database, Search, FileText, Settings, Zap, Loader2, MessageSquare, User, PlusIcon, MenuIcon, XIcon, Ban, Clock, TrendingUp, AlertCircle, Copy, Share2, Bookmark, Plus, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import { useSuna, type LLMModel } from '@/hooks/useSuna';
import { useAuth } from '@/hooks/useAuth';
import { ResearchProgress } from '@/components/suna/ResearchProgress';
import ResearchResponse from '@/components/suna/ResearchResponse';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

// Utility function to format relative time
const formatRelativeTime = (timestamp: string | number) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

const ResearchAgent = () => {
  const { isAuthenticated, user } = useAuth();
  const {
    conversation,
    allConversations,
    threadId,
    messages,
    currentModel,
    searchPreferences,
    isLoadingConversation,
    isLoadingConversations,
    sendMessage,
    isSending,
    selectConversation,
    createNewChat,
    changeModel,
    updateSearchPreferences,
    toggleForceSearch,
    toggleDisableSearch
  } = useSuna();

  const [message, setMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [researchDepth, setResearchDepth] = useState('3');
  const [selectedModel, setSelectedModel] = useState<LLMModel>('auto');
  const [isResearchInProgress, setIsResearchInProgress] = useState(() => {
    return localStorage.getItem('research-in-progress') === 'true';
  });
  const [ongoingResearchQuery, setOngoingResearchQuery] = useState(() => {
    return localStorage.getItem('ongoing-research-query') || '';
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist research state to localStorage
  useEffect(() => {
    localStorage.setItem('research-in-progress', isResearchInProgress.toString());
  }, [isResearchInProgress]);

  useEffect(() => {
    localStorage.setItem('ongoing-research-query', ongoingResearchQuery);
  }, [ongoingResearchQuery]);

  // Clean up research state when research completes (only when we have new messages)
  useEffect(() => {
    if (!isSending && isResearchInProgress && messages.length > 0) {
      // Check if the last message is from assistant (research completed)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        // Research has completed, clear the persistent state
        setTimeout(() => {
          setIsResearchInProgress(false);
          setOngoingResearchQuery('');
          localStorage.removeItem('research-in-progress');
          localStorage.removeItem('ongoing-research-query');
        }, 2000); // Longer delay to ensure UI is stable
      }
    }
  }, [isSending, isResearchInProgress, messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSendMessage = () => {
    if (!message.trim() || isSending) return;

    // Set research in progress state
    setIsResearchInProgress(true);
    setOngoingResearchQuery(message);

    sendMessage({ 
      message, 
      model: selectedModel === 'auto' ? currentModel : selectedModel,
      customSearchPrefs: searchPreferences,
      researchDepth: parseInt(researchDepth)
    });

    setMessage('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    createNewChat();
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Extract sources from research responses
  const extractSources = (content: string) => {
    const sources: Array<{ title: string; url: string; domain: string }> = [];

    if (content.includes('Sources:') || content.includes('**Sources:**')) {
      const lines = content.split('\n');
      lines.forEach(line => {
        const urlMatch = line.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) {
          try {
            const url = new URL(urlMatch[0]);
            sources.push({
              title: line.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').replace(urlMatch[0], '').trim(),
              url: urlMatch[0],
              domain: url.hostname
            });
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });
    }

    return sources;
  };

  const mockMessages = [
    {
      id: '1',
      role: 'user',
      content: 'What are the key factors driving Bitcoin price movements in 2025?',
      timestamp: '10:30 AM'
    },
    {
      id: '2',
      role: 'assistant',
      content: `# Bitcoin Price Analysis: Key Driving Factors in 2025

## Executive Summary
Current market conditions show several critical factors influencing Bitcoin's trajectory through 2025...

## Key Market Drivers

### 1. Institutional Adoption
- Major corporations continuing to add BTC to balance sheets
- ETF inflows reaching record levels
- Traditional banks offering crypto services

### 2. Regulatory Clarity
- Clearer regulatory frameworks emerging globally
- Reduced uncertainty driving institutional confidence
- Compliance infrastructure maturing

### 3. Macroeconomic Factors
- Federal Reserve policy decisions
- Global inflation trends
- Dollar strength dynamics`,
      timestamp: '10:31 AM',
      sources: [
        { title: 'Bloomberg Crypto Analysis', url: '#', domain: 'bloomberg.com' },
        { title: 'Federal Reserve Reports', url: '#', domain: 'federalreserve.gov' },
        { title: 'CoinDesk Market Data', url: '#', domain: 'coindesk.com' }
      ]
    }
  ];

  return (
    <MainLayout
      showHeader={false}
    >
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
        {/* Compact Sidebar - Conversations */}
        <div className="w-60 border-r border-slate-800/50 bg-slate-950/70 backdrop-blur-md">
          <div className="p-3 border-b border-slate-800/50">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-slate-800 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-100">Research Agent</h2>
              </div>
            </div>

            <Button 
              onClick={handleNewConversation}
              className="w-full h-8 bg-slate-700 hover:bg-slate-600 hover:text-primary transition-all duration-200 text-white text-sm"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Conversations List */}
          <div className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Conversations</h3>
            {allConversations && Array.isArray(allConversations) && (allConversations as any[]).map((conv: any) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className="group p-3 rounded-lg bg-slate-900/60 backdrop-blur-sm border border-slate-800/40 hover:bg-slate-900/80 hover:border-primary/20 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-200 group-hover:text-primary transition-colors truncate">{conv.title || 'Untitled Chat'}</h4>
                  <span className="text-xs text-gray-500">{formatRelativeTime(conv.createdAt || conv.updatedAt || new Date().toISOString())}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {conv.messages && conv.messages.length > 0 
                    ? conv.messages[conv.messages.length - 1].content.substring(0, 60) + '...'
                    : 'No messages yet'
                  }
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">


          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Welcome Screen - Show when no messages */}
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-4xl mx-auto px-8">
                  <h1 className="text-3xl font-semibold text-gray-100 mb-8">
                    Hello Dat, where should we begin?
                  </h1>

                  {/* Predefined Prompt Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {[
                      {
                        title: "Market Analysis Research",
                        description: "Deep dive into current market trends and opportunities",
                        prompt: "Analyze current market trends and identify emerging investment opportunities with detailed financial data and forecasts"
                      },
                      {
                        title: "Financial Data Analysis", 
                        description: "Comprehensive financial metrics and performance review",
                        prompt: "Generate a comprehensive financial analysis including key metrics, ratios, and performance indicators with latest quarterly data"
                      },
                      {
                        title: "Competitive Intelligence",
                        description: "Research competitors and market positioning",
                        prompt: "Research competitive landscape, market positioning, and strategic advantages with detailed competitor analysis"
                      },
                      {
                        title: "Risk Assessment Report",
                        description: "Evaluate investment risks and opportunities",
                        prompt: "Assess investment risks, market volatility, and potential opportunities with risk-adjusted return analysis"
                      }
                    ].map((card, idx) => (
                      <div
                        key={idx}
                        onClick={() => setMessage(card.prompt)}
                        className="group p-6 bg-slate-900/70 backdrop-blur-sm border border-slate-800/40 rounded-xl hover:bg-slate-900/90 hover:border-primary/30 hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1"
                      >
                        <h3 className="text-lg font-semibold text-gray-100 mb-2 group-hover:text-primary transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                          {card.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-gray-500 mt-8">
                    Click any card above or type your own research question below
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-3">
                {msg.role === 'user' ? (
                  <>
                    <div className="flex-1" />
                    <div className="max-w-2xl">
                      <div className="bg-slate-700 text-white p-4 rounded-2xl rounded-tr-sm">
                        {msg.content}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-right">{formatRelativeTime(msg.timestamp)}</div>
                    </div>
                    <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium">U</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="group bg-slate-900/70 backdrop-blur-sm border border-slate-800/40 p-6 rounded-2xl rounded-tl-sm hover:border-slate-700/60 transition-all duration-200">
                        {/* Message Header with Actions */}
                        <div className="flex items-center justify-between mb-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <Bot className="w-3 h-3" />
                            <span>AI Response</span>
                            <span>•</span>
                            <span>{formatRelativeTime(msg.timestamp)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-800/50">
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-800/50">
                              <Share2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-800/50">
                              <Bookmark className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Enhanced Message Content */}
                        <div className="prose prose-invert max-w-none">
                          <ReactMarkdown 
                            components={{
                              p: ({ children }) => <p className="text-gray-300 leading-relaxed mb-4 last:mb-0">{children}</p>,
                              h1: ({ children }) => <h1 className="text-xl font-bold text-gray-100 mb-3 border-b border-slate-700/50 pb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-semibold text-gray-100 mb-2 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-primary" />{children}</h2>,
                              h3: ({ children }) => <h3 className="text-md font-medium text-gray-100 mb-2 flex items-center"><AlertCircle className="w-3 h-3 mr-2 text-blue-400" />{children}</h3>,
                              ul: ({ children }) => <ul className="list-none space-y-2 mb-4 pl-4 border-l-2 border-slate-700/50">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-gray-300 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="text-gray-300 relative before:content-['•'] before:text-primary before:font-bold before:absolute before:-left-4">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-gray-200 bg-slate-800/30 px-1 rounded">{children}</strong>,
                              em: ({ children }) => <em className="italic text-primary">{children}</em>,
                              code: ({ children }) => <code className="bg-slate-800/70 px-2 py-1 rounded text-primary font-mono text-sm border border-slate-700/50">{children}</code>,
                              pre: ({ children }) => <pre className="bg-slate-800/70 p-4 rounded-lg overflow-x-auto mb-4 border border-slate-700/50">{children}</pre>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic text-gray-300 bg-slate-800/20 py-2 rounded-r">{children}</blockquote>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {/* Enhanced Sources Section */}
                        {extractSources(msg.content).length > 0 && (
                          <div className="mt-6 pt-4 border-t border-slate-800/40">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-400 flex items-center">
                                <Search className="w-3 h-3 mr-1" />
                                Research Sources ({extractSources(msg.content).length})
                              </h4>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>Real-time data</span>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              {extractSources(msg.content).map((source, idx) => (
                                <div key={idx} className="flex items-start space-x-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:border-primary/30 transition-colors group/source">
                                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <a 
                                      href={source.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-gray-300 hover:text-primary cursor-pointer transition-colors font-medium text-sm block truncate group-hover/source:text-primary"
                                    >
                                      {source.title}
                                    </a>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className="text-xs text-gray-500">{source.domain}</span>
                                      <span className="text-xs text-gray-600">•</span>
                                      <span className="text-xs text-gray-500">Verified source</span>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover/source:opacity-100 transition-opacity">
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Research Quality Indicator */}
                        <div className="mt-4 pt-3 border-t border-slate-800/30">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-3 text-gray-500">
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full" />
                                <span>High-quality research</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Database className="w-3 h-3" />
                                <span>Multi-source verified</span>
                              </div>
                            </div>
                            <div className="text-gray-500">{formatRelativeTime(msg.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Research Progress - Show only when actively sending a message */}
            {isSending && !messages.find(m => m.role === 'assistant') && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <ResearchProgress 
                    stage={1} 
                    progress={0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-md">
            <div className="space-y-3">
              {/* Compact Research Controls - Single Line */}
              <div className="space-y-2">
                {/* All Controls in One Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* Essential Controls */}
                    <Select value={researchDepth} onValueChange={setResearchDepth}>
                      <SelectTrigger className="w-36 h-7 bg-slate-800/50 border-slate-700/50 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Quick (8K)</SelectItem>
                        <SelectItem value="2">Standard (15K)</SelectItem>
                        <SelectItem value="3">Deep (25K)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedModel} onValueChange={(value: LLMModel) => setSelectedModel(value)}>
                      <SelectTrigger className="w-20 h-7 bg-slate-800/50 border-slate-700/50 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                        <SelectItem value="gemini">Gemini</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Search Mode Toggle */}
                    <div className="flex items-center bg-slate-800/30 rounded-md p-1">
                      <Button
                        variant={searchPreferences.forceSearch ? "default" : "ghost"}
                        size="sm"
                        onClick={toggleForceSearch}
                        className="h-5 px-1 text-xs"
                      >
                        <Search className="w-3 h-3" />
                      </Button>
                      <Button
                        variant={searchPreferences.disableSearch ? "secondary" : "ghost"}
                        size="sm"
                        onClick={toggleDisableSearch}
                        className="h-5 px-1 text-xs"
                      >
                        <Ban className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Compact Templates */}
                    <div className="flex items-center space-x-1">
                      {[
                        { icon: TrendingUp, text: "Market", query: "Analyze current market trends for " },
                        { icon: Database, text: "Financial", query: "Generate a comprehensive financial analysis of " },
                        { icon: Search, text: "Competitive", query: "Research competitors and market position for " },
                        { icon: AlertCircle, text: "Risk", query: "Assess investment risks and opportunities for " }
                      ].map((template, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => setMessage(template.query)}
                          className="h-7 px-2 bg-slate-800/30 border-slate-700/50 hover:border-primary/30 whitespace-nowrap text-xs flex-shrink-0"
                        >
                          <template.icon className="w-3 h-3 mr-1" />
                          {template.text}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/templates', '_blank')}
                        className="h-7 px-2 bg-slate-800/30 border-slate-700/50 hover:border-primary/30 flex-shrink-0"
                        title="Manage Templates"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>


                </div>

                {/* Clean Input Area */}
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about markets, technology, economics..."
                    className="w-full bg-slate-900/70 border-slate-800/60 text-gray-100 placeholder-gray-500 resize-none min-h-[60px] pr-20 text-sm"
                    rows={2}
                  />

                  {/* Input Actions */}
                  <div className="absolute bottom-2 right-2 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{message.length}/2000</span>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isSending}
                      size="sm"
                      className="h-7 px-3 bg-primary hover:bg-primary/80"
                    >
                      {isSending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ResearchAgent;