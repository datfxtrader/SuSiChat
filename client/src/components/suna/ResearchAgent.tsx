
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
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isSending, setIsSending] = useState(false);
  const [isResearchInProgress, setIsResearchInProgress] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStage, setResearchStage] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
