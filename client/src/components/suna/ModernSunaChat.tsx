import React, { useState, useRef, useEffect } from 'react';
import { useSuna } from '@/hooks/useSuna';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime } from '@/lib/utils';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Zap, 
  Menu,
  ChevronRight,
  X,
  Loader2,
  Sparkles,
  MessageCircle,
  Filter,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
// Fix type definitions
import type { Message } from '@shared/schema';
import ReactMarkdown from 'react-markdown';

interface SunaMessage {
  id?: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

interface SunaConversation {
  id: string;
  title: string;
  messages: SunaMessage[];
  createdAt: string;
}

interface ModernSunaChatProps {
  threadId?: string;
}

export function ModernSunaChat({ threadId }: ModernSunaChatProps) {
  const [message, setMessage] = useState('');
  const { user, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  
  const { 
    messages = [], 
    allConversations = [] as SunaConversation[],
    threadId: currentThreadId,
    isLoadingConversation,
    isLoadingConversations, 
    sendMessage, 
    isSending,
    selectConversation
  } = useSuna(threadId);

  const showConversationSelector = !isLoadingConversations && Array.isArray(allConversations) && allConversations.length > 0;

  // Simulate agent thinking steps when sending a message
  useEffect(() => {
    if (isSending) {
      setShowThinking(true);
      const steps = [
        "Reading your message...",
        "Thinking about the best response...",
        "Analyzing available context...",
        "Generating comprehensive answer..."
      ];
      
      const interval = 700; // ms between thinking steps
      steps.forEach((step, index) => {
        setTimeout(() => {
          setThinkingSteps(prev => [...prev, step]);
        }, index * interval);
      });
    } else {
      // Reset thinking state after response
      setTimeout(() => {
        setShowThinking(false);
        setThinkingSteps([]);
      }, 500);
    }
  }, [isSending]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, thinkingSteps]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    sendMessage({ message });
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    selectConversation('');
    setIsMobileDrawerOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full bg-gradient-to-b from-background to-muted">
        <div className="w-full max-w-md p-8 rounded-lg shadow-lg bg-card">
          <h2 className="text-2xl font-bold mb-4 text-center">Welcome to Tongkeeper</h2>
          <p className="text-muted-foreground mb-8 text-center">
            Please log in to access the Suna AI Assistant.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'} 
            className="w-full py-6"
            size="lg"
          >
            Log In to Continue
          </Button>
        </div>
      </div>
    );
  }

  const renderMessage = (msg: { id?: string; role: string; content: string; timestamp: string }, index: number) => {
    const isUserMessage = msg.role === 'user';
    
    return (
      <div
        key={msg.id || index}
        className={cn(
          "flex w-full mb-4",
          isUserMessage ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "flex flex-col max-w-[80%] rounded-2xl p-4",
            isUserMessage 
              ? "bg-primary text-primary-foreground rounded-tr-none" 
              : "bg-muted text-card-foreground rounded-tl-none shadow-sm",
            isUserMessage && "ml-12",
            !isUserMessage && "mr-12"
          )}
        >
          {!isUserMessage && (
            <div className="flex items-center mb-1">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mr-2">
                <Sparkles className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-xs font-medium">Suna AI</span>
            </div>
          )}
          
          <div className="whitespace-pre-wrap break-words">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                a: ({ node, ...props }) => (
                  <a className="text-primary underline hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />
                ),
                code: ({ node, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return (
                    <div className="my-2 bg-muted-foreground/10 rounded-md p-1">
                      <pre className="overflow-auto">
                        <code className={match ? `language-${match[1]}` : ''} {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
                ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-2" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-2 mt-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2 mt-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-md font-bold mb-1 mt-2" {...props} />,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
          
          <span className="text-xs opacity-70 mt-2 self-end">
            {formatRelativeTime(new Date(msg.timestamp))}
          </span>
        </div>
      </div>
    );
  };

  const renderThinkingIndicator = () => {
    if (!showThinking || !isSending) return null;
    
    return (
      <div className="flex w-full mb-4 justify-start">
        <div className="flex flex-col max-w-[80%] rounded-2xl p-4 bg-muted/60 text-card-foreground rounded-tl-none shadow-sm">
          <div className="flex items-center mb-1">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mr-2">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-xs font-medium">Suna AI is thinking</span>
          </div>
          
          <div className="whitespace-pre-wrap break-words">
            {thinkingSteps.map((step, idx) => (
              <div key={idx} className="flex items-center mb-1 opacity-90">
                <span className="text-xs mr-2">•</span>
                <span className="text-sm">{step}</span>
              </div>
            ))}
            
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Processing...</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ConversationsList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleNewConversation}
        >
          <Plus className="mr-2 h-4 w-4" /> New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {allConversations.map((conv: any) => (
            <Button
              key={conv.id}
              variant={currentThreadId === conv.id ? "secondary" : "ghost"}
              className="w-full justify-start text-left truncate"
              onClick={() => {
                selectConversation(conv.id);
                setIsMobileDrawerOpen(false);
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              <span className="truncate">{conv.title || 'New Conversation'}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-full bg-background">
      {/* Desktop sidebar */}
      {showConversationSelector && (
        <div className="border-r w-64 h-full hidden md:flex flex-col">
          <ConversationsList />
        </div>
      )}

      {/* Mobile drawer */}
      {showConversationSelector && (
        <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-2 top-2 md:hidden z-10"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <ConversationsList />
          </SheetContent>
        </Sheet>
      )}

      {/* Chat area */}
      <div className="flex flex-col flex-1 h-full relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 h-14">
          <div className="flex items-center">
            <h1 className="font-semibold ml-8 md:ml-0">
              {currentThreadId 
                ? allConversations.find((c: {id: string, title?: string}) => c.id === currentThreadId)?.title || 'Conversation' 
                : 'New Conversation'}
            </h1>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleNewConversation}>
                <Plus className="mr-2 h-4 w-4" />
                New Conversation
              </DropdownMenuItem>
              <DropdownMenuItem>
                <History className="mr-2 h-4 w-4" />
                View History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoadingConversation ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <p>Loading conversation...</p>
            </div>
          ) : messages?.length ? (
            <>
              {messages.map(renderMessage)}
              {renderThinkingIndicator()}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="bg-primary/10 rounded-full p-3 mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Welcome to Suna AI</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                I'm your personal AI assistant that can help with a wide range of tasks.
                What would you like to know?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                <Button 
                  variant="outline" 
                  className="justify-start text-left"
                  onClick={() => setMessage("What can you help me with?")}
                >
                  What can you help me with?
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start text-left"
                  onClick={() => setMessage("Tell me about your capabilities")}
                >
                  Tell me about your capabilities
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start text-left"
                  onClick={() => setMessage("How do I create a family room?")}
                >
                  How do I create a family room?
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start text-left"
                  onClick={() => setMessage("Set a reminder for tomorrow")}
                >
                  Set a reminder for tomorrow
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 bg-background/80 backdrop-blur-sm border-t">
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Suna..."
              className="min-h-[60px] resize-none pr-12 rounded-2xl border-muted-foreground/20"
              disabled={isSending}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!message.trim() || isSending}
              className="absolute right-2 bottom-2 h-9 w-9 p-0 rounded-full"
              size="icon"
            >
              {isSending ? 
                <Loader2 className="h-4 w-4 animate-spin" /> : 
                <Send className="h-4 w-4" />
              }
            </Button>
          </div>
          <p className="text-xs text-center mt-2 text-muted-foreground">
            Suna AI may produce inaccurate information about people, places, or facts.
          </p>
        </div>
      </div>
    </div>
  );
}