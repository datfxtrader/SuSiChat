import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Sparkles, Search, Loader2, MessageSquare, Book, TrendingUp, Globe } from 'lucide-react';
import { useSuna } from '@/hooks/useSuna';

type LLMModel = 'auto' | 'deepseek' | 'gemini';
type ResearchDepth = 1 | 2 | 3;

const SunaClone: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState<LLMModel>('auto');
  const [researchDepth, setResearchDepth] = useState<ResearchDepth>(2);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    currentConversation,
    allConversations,
    isSending,
    sendMessage,
    selectConversation,
    createNewConversation
  } = useSuna();

  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;
    
    await sendMessage(message, selectedModel, researchDepth);
    setMessage('');
  };

  const handleNewConversation = () => {
    createNewConversation();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const promptCards = [
    {
      icon: TrendingUp,
      title: "Market Analysis",
      description: "Analyze current market trends and investment opportunities",
      prompt: "Provide a comprehensive analysis of current market trends and emerging investment opportunities for May 2025"
    },
    {
      icon: Search,
      title: "Company Research", 
      description: "Deep dive into company financials and competitive analysis",
      prompt: "Research and analyze the financial performance and market position of"
    },
    {
      icon: Globe,
      title: "Economic Outlook",
      description: "Examine macroeconomic factors and their market impact",
      prompt: "Analyze the current global economic outlook and its potential impact on financial markets"
    },
    {
      icon: Book,
      title: "Investment Strategy",
      description: "Develop data-driven investment strategies and recommendations",
      prompt: "Create a data-driven investment strategy based on current market conditions and economic indicators"
    }
  ];

  return (
    <MainLayout showHeader={false}>
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
        {/* Compact Sidebar */}
        <div className="w-60 border-r border-slate-800/50 bg-slate-950/70 backdrop-blur-md">
          <div className="p-3 border-b border-slate-800/50">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-slate-800 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-gray-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Research Agent</h2>
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

          <div className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Conversations</h3>
            {allConversations && Array.isArray(allConversations) && (allConversations as any[]).map((conv: any) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className="group p-3 rounded-lg bg-slate-900/60 backdrop-blur-sm border border-slate-800/40 hover:bg-slate-900/80 hover:border-primary/20 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {conversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-2xl mx-auto">
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-4">
                      Hello Dat! 👋
                    </h1>
                    <p className="text-xl text-gray-300 mb-8">
                      Ready to dive deep into research? Choose a prompt below or ask me anything.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {promptCards.map((card, index) => (
                      <div
                        key={index}
                        onClick={() => setMessage(card.prompt)}
                        className="group p-4 rounded-xl bg-slate-900/60 backdrop-blur-sm border border-slate-800/40 hover:bg-slate-900/80 hover:border-primary/20 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                            <card.icon className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-white group-hover:text-primary transition-colors mb-1">
                              {card.title}
                            </h3>
                            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                              {card.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation messages would go here */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Section */}
          <div className="border-t border-slate-800/50 bg-slate-950/70 backdrop-blur-md p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Select value={selectedModel} onValueChange={(value: LLMModel) => setSelectedModel(value)}>
                <SelectTrigger className="w-32 h-7 text-xs bg-slate-800/60 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>

              <Select value={researchDepth.toString()} onValueChange={(value) => setResearchDepth(parseInt(value) as ResearchDepth)}>
                <SelectTrigger className="w-32 h-7 text-xs bg-slate-800/60 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Depth 1</SelectItem>
                  <SelectItem value="2">Depth 2</SelectItem>
                  <SelectItem value="3">Depth 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 h-10 bg-slate-800/60 border-slate-700 text-white placeholder-gray-400 focus:border-primary"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                size="sm"
                className="h-10 px-4 bg-primary hover:bg-primary/80"
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
    </MainLayout>
  );
};

export default SunaClone;