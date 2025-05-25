
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Database, Search, FileText, Settings, Zap, Loader2, MessageSquare, User, TrendingUp, AlertCircle, Copy, Share2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResearchProgress } from './ResearchProgress';

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

export const ResearchAgent = () => {
  const [message, setMessage] = useState('');
  const [researchDepth, setResearchDepth] = useState('3');
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [isSending, setIsSending] = useState(false);
  const [isResearchInProgress, setIsResearchInProgress] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStage, setResearchStage] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSendMessage = () => {
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    setIsResearchInProgress(true);
    setResearchProgress(0);
    setResearchStage(1);
    
    const interval = setInterval(() => {
      setResearchProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSending(false);
          setIsResearchInProgress(false);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
    
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

  const predefinedPrompts = [
    {
      title: "Market Analysis Research",
      description: "Deep dive into current market trends, opportunities, and risk assessment",
      prompt: "Analyze current market trends and identify emerging investment opportunities with detailed financial data and forecasts",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Financial Data Analysis",
      description: "Comprehensive financial metrics, ratios, and performance evaluation",
      prompt: "Generate a comprehensive financial analysis including key metrics, ratios, and performance indicators with latest quarterly data",
      icon: Database,
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      title: "Competitive Intelligence",
      description: "Research competitors, market positioning, and strategic advantages",
      prompt: "Research competitive landscape, market positioning, and strategic advantages with detailed competitor analysis",
      icon: Search,
      gradient: "from-purple-500 to-pink-600"
    },
    {
      title: "Risk Assessment Report",
      description: "Evaluate investment risks, opportunities, and risk-adjusted returns",
      prompt: "Assess investment risks, market volatility, and potential opportunities with risk-adjusted return analysis",
      icon: AlertCircle,
      gradient: "from-orange-500 to-red-600"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Research Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {isResearchInProgress && (
          <ResearchProgress 
            stage={researchStage}
            progress={researchProgress}
            query={message}
            isActive={true}
          />
        )}

        {/* Welcome Screen */}
        {!isResearchInProgress && (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-4xl mx-auto px-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Bot className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-zinc-100 mb-3">
                Welcome to Research Agent
              </h1>
              <p className="text-lg text-zinc-400 mb-12">
                Get comprehensive, AI-powered research on any topic with real-time data and expert analysis
              </p>
              
              {/* Predefined Prompt Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {predefinedPrompts.map((card, idx) => (
                  <div
                    key={idx}
                    onClick={() => setMessage(card.prompt)}
                    className="group p-6 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl hover:bg-zinc-800/70 hover:border-zinc-700/70 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed">
                      {card.description}
                    </p>
                    
                    <div className="flex items-center mt-4 text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                      <Sparkles className="w-3 h-3 mr-1" />
                      <span>AI-Powered Research</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-zinc-500 mt-8 flex items-center justify-center">
                <Zap className="w-4 h-4 mr-2" />
                Click any card above or type your own research question below
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur-xl p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-4">
            <Select value={researchDepth} onValueChange={setResearchDepth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Research Depth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Quick Analysis</SelectItem>
                <SelectItem value="2">Standard Research</SelectItem>
                <SelectItem value="3">Deep Research</SelectItem>
                <SelectItem value="4">Comprehensive Study</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="AI Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-select</SelectItem>
                <SelectItem value="gpt4">GPT-4</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
              </SelectContent>
            </Select>
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
              disabled={!message.trim() || isSending}
              className="absolute bottom-4 right-4"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between mt-4 text-xs text-zinc-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <Database className="w-3 h-3 mr-1" />
                Real-time data
              </span>
              <span className="flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-enhanced
              </span>
              <span className="flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                Multi-source
              </span>
            </div>
            <div className="flex items-center">
              <Settings className="w-3 h-3 mr-1" />
              Advanced settings
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
