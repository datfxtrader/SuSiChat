
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Database, Search, FileText, Settings, Zap, Loader2, MessageSquare, User, TrendingUp, AlertCircle, Copy, Share2, Bookmark, Plus, Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
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
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isSending, setIsSending] = useState(false);
  const [isResearchInProgress, setIsResearchInProgress] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStage, setResearchStage] = useState(1);
  const [messages, setMessages] = useState([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  useEffect(() => {
    if (isResearchInProgress && !isSending && researchProgress >= 95) {
      console.log('✅ Research completed - clearing progress');
      setTimeout(() => {
        setIsResearchInProgress(false);
        setResearchProgress(0);
        setResearchStage(1);
        
        const completedMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `# Research Analysis Complete\n\n## Executive Summary\nYour research has been completed with comprehensive analysis.\n\n## Key Findings\n\n### Market Overview\n- Current trends analyzed\n- Key patterns identified\n- Risk factors assessed`,
          timestamp: new Date().toISOString(),
          sources: [
            { title: 'Market Analysis', url: '#', domain: 'example.com' }
          ]
        };
        
        setMessages(prev => [...prev, completedMessage]);
      }, 1000);
    }
  }, [isResearchInProgress, isSending, researchProgress]);

  const handleSendMessage = () => {
    if (!message.trim() || isSending) return;
    
    console.log('🚀 Starting research:', message);
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    setIsSending(true);
    setIsResearchInProgress(true);
    setResearchProgress(0);
    setResearchStage(1);
    
    const interval = setInterval(() => {
      setResearchProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSending(false);
          return 100;
        }
        const newProgress = prev + Math.random() * 12 + 3;
        if (newProgress >= 80) setResearchStage(6);
        else if (newProgress >= 65) setResearchStage(5);
        else if (newProgress >= 50) setResearchStage(4);
        else if (newProgress >= 30) setResearchStage(3);
        else if (newProgress >= 15) setResearchStage(2);
        return Math.min(newProgress, 100);
      });
    }, 800);
    
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
    setMessages([]);
    setIsResearchInProgress(false);
    setResearchProgress(0);
    setResearchStage(1);
    setIsSending(false);
    setMessage('');
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
                    {msg.content}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isResearchInProgress && (
            <ResearchProgress 
              stage={researchStage}
              progress={researchProgress}
              query={message}
              isActive={true}
            />
          )}
        </div>

        <div className="border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 mb-4">
              <Select value={researchDepth} onValueChange={setResearchDepth}>
                <SelectTrigger>
                  <SelectValue placeholder="Research Depth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Quick Analysis</SelectItem>
                  <SelectItem value="2">Standard Research</SelectItem>
                  <SelectItem value="3">Deep Research</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
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
          </div>
        </div>
      </div>
    </div>
  );
};
