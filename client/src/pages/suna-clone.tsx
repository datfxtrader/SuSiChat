import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Database, Search, FileText, Settings, Zap, Loader2, MessageSquare, User, PlusIcon, MenuIcon, XIcon } from 'lucide-react';
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

const SunaClone = () => {
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSendMessage = () => {
    if (!message.trim() || isSending) return;
    
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
      title="Suna Agent Clone"
      description="Experience the same beautiful UI and design patterns"
    >
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
        {/* Sidebar - Conversations */}
        <div className="w-80 border-r border-slate-800/50 bg-slate-950/70 backdrop-blur-md">
          <div className="p-4 border-b border-slate-800/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-slate-800 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Suna Agent Clone</h2>
                <p className="text-sm text-gray-400">UI Experience Demo</p>
              </div>
            </div>
            
            <Button 
              onClick={handleNewConversation}
              className="w-full bg-slate-700 hover:bg-slate-600 hover:text-primary hover:shadow-lg transition-all duration-200 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              New Research Chat
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
                  <span className="text-xs text-gray-500">{formatRelativeTime(conv.createdAt)}</span>
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
          {/* Header */}
          <div className="p-4 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Research Assistant</h3>
                  <p className="text-sm text-gray-400">Advanced AI-powered market analysis</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-slate-800/50 text-gray-300 border-slate-700/50">
                  Online
                </Badge>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                      <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-800/40 p-6 rounded-2xl rounded-tl-sm">
                        <div className="prose prose-invert max-w-none">
                          <ReactMarkdown 
                            components={{
                              p: ({ children }) => <p className="text-gray-300 leading-relaxed mb-4 last:mb-0">{children}</p>,
                              h1: ({ children }) => <h1 className="text-xl font-bold text-gray-100 mb-3">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-semibold text-gray-100 mb-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-md font-medium text-gray-100 mb-2">{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc pl-6 mb-4 text-gray-300">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-gray-300">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-gray-200">{children}</strong>,
                              em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
                              code: ({ children }) => <code className="bg-slate-800/50 px-2 py-1 rounded text-gray-200 font-mono text-sm">{children}</code>,
                              pre: ({ children }) => <pre className="bg-slate-800/50 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        
                        {extractSources(msg.content).length > 0 && (
                          <div className="mt-6 pt-4 border-t border-slate-800/40">
                            <h4 className="text-sm font-medium text-gray-400 mb-3">Sources</h4>
                            <div className="space-y-2">
                              {extractSources(msg.content).map((source, idx) => (
                                <div key={idx} className="flex items-center space-x-2 text-sm">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                  <a 
                                    href={source.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-primary cursor-pointer transition-colors"
                                  >
                                    {source.title}
                                  </a>
                                  <span className="text-gray-500">• {source.domain}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{formatRelativeTime(msg.timestamp)}</div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Research Progress Demo */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-800/40 p-4 rounded-2xl rounded-tl-sm">
                  <div className="space-y-3">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse text-gray-400">
                          <Search className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-100">Web Search</div>
                          <div className="text-xs text-gray-400">Searching multiple sources for information</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">0:15</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-gray-400 h-2 rounded-full transition-all duration-300 ease-out w-3/4" />
                    </div>

                    {/* Stage Indicators */}
                    <div className="flex justify-between text-xs">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mb-1">
                          <Database className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-green-400">Analyzing</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center mb-1">
                          <Search className="w-3 h-3 text-white animate-pulse" />
                        </div>
                        <span className="text-gray-400">Web</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center mb-1">
                          <Sparkles className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-slate-500">AI</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center mb-1">
                          <FileText className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-slate-500">Finalizing</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="bg-slate-900/60 backdrop-blur-sm rounded-md py-3 px-4">
                      <div className="flex items-center justify-center space-x-1 text-xs text-gray-300 mb-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span>Researching in real-time...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-md">
            <div className="space-y-3">
              {/* Controls */}
              <div className="flex items-center space-x-3">
                <Select value={researchDepth} onValueChange={setResearchDepth}>
                  <SelectTrigger className="w-48 bg-slate-800/50 border-slate-700/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Quick Research (Depth 1)</SelectItem>
                    <SelectItem value="2">Standard Research (Depth 2)</SelectItem>
                    <SelectItem value="3">Deep Research (Depth 3)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedModel} onValueChange={(value: LLMModel) => setSelectedModel(value)}>
                  <SelectTrigger className="w-48 bg-slate-800/50 border-slate-700/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto Model</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="gemini">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-gray-400">Research Mode</span>
                </div>
              </div>

              {/* Message Input */}
              <div className="flex space-x-3">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me anything about markets, technology, economics..."
                  className="flex-1 bg-slate-900/70 border-slate-800/60 text-gray-100 placeholder-gray-500 resize-none"
                  rows={3}
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-slate-700 hover:bg-slate-600 px-6"
                  disabled={!message.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SunaClone;