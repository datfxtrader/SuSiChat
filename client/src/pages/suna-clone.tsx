import React, { useState } from 'react';
import { Bot, Send, Sparkles, Database, Search, FileText, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';

const SunaClone = () => {
  const [message, setMessage] = useState('');
  const [researchDepth, setResearchDepth] = useState('3');
  const [selectedModel, setSelectedModel] = useState('auto');

  const handleSendMessage = () => {
    // This is just UI - no actual functionality
    console.log('Message sent (UI only):', message);
    setMessage('');
  };

  const mockConversations = [
    {
      id: '1',
      title: 'Market Analysis Research',
      lastMessage: '2 hours ago',
      preview: 'Bitcoin price trends and institutional adoption...'
    },
    {
      id: '2', 
      title: 'Economic Policy Impact',
      lastMessage: '1 day ago',
      preview: 'Federal Reserve decisions affecting crypto markets...'
    },
    {
      id: '3',
      title: 'Technology Forecast',
      lastMessage: '3 days ago',
      preview: 'AI development trends and market implications...'
    }
  ];

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
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Sidebar - Conversations */}
        <div className="w-80 border-r border-slate-700/50 bg-slate-900/50 backdrop-blur-md">
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Suna Agent Clone</h2>
                <p className="text-sm text-gray-400">UI Experience Demo</p>
              </div>
            </div>
            
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              New Research Chat
            </Button>
          </div>

          {/* Conversations List */}
          <div className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Conversations</h3>
            {mockConversations.map((conv) => (
              <div
                key={conv.id}
                className="p-3 rounded-lg bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-200 truncate">{conv.title}</h4>
                  <span className="text-xs text-gray-500">{conv.lastMessage}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">{conv.preview}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50 bg-slate-900/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">Research Assistant</h3>
                  <p className="text-sm text-gray-400">Advanced AI-powered market analysis</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30">
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
            {mockMessages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-3">
                {msg.role === 'user' ? (
                  <>
                    <div className="flex-1" />
                    <div className="max-w-2xl">
                      <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-sm">
                        {msg.content}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-right">{msg.timestamp}</div>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium">U</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-6 rounded-2xl rounded-tl-sm">
                        <div className="prose prose-invert max-w-none">
                          <div className="whitespace-pre-line text-gray-300 leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                        
                        {msg.sources && (
                          <div className="mt-6 pt-4 border-t border-slate-700/30">
                            <h4 className="text-sm font-medium text-gray-400 mb-3">Sources</h4>
                            <div className="space-y-2">
                              {msg.sources.map((source, idx) => (
                                <div key={idx} className="flex items-center space-x-2 text-sm">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                                  <span className="text-blue-400 hover:text-blue-300 cursor-pointer">
                                    {source.title}
                                  </span>
                                  <span className="text-gray-500">• {source.domain}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{msg.timestamp}</div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Research Progress Demo */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-4 rounded-2xl rounded-tl-sm">
                  <div className="space-y-3">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse text-blue-400">
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
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out w-3/4" />
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
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mb-1">
                          <Search className="w-3 h-3 text-white animate-pulse" />
                        </div>
                        <span className="text-blue-400">Web</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center mb-1">
                          <Sparkles className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-slate-400">AI</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center mb-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-slate-400">Finalizing</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-md py-3 px-4">
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
          <div className="p-4 border-t border-slate-700/50 bg-slate-900/30 backdrop-blur-md">
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

                <Select value={selectedModel} onValueChange={setSelectedModel}>
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
                  className="flex-1 bg-slate-800/50 border-slate-700/50 text-gray-100 placeholder-gray-500 resize-none"
                  rows={3}
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-blue-600 hover:bg-blue-700 px-6"
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