import React, { useState, useRef, useEffect } from 'react';
import { useSuna } from '@/hooks/useSuna';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime } from '@/lib/utils';
import { MessageSquare, Plus, Send, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleModernChatProps {
  threadId?: string;
}

export function SimpleModernChat({ threadId }: SimpleModernChatProps) {
  const [message, setMessage] = useState('');
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages = [], 
    allConversations = [],
    threadId: currentThreadId,
    isLoadingConversation,
    isLoadingConversations, 
    sendMessage, 
    isSending,
    selectConversation
  } = useSuna(threadId);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full bg-gradient-to-b from-background to-muted">
        <div className="w-full max-w-md p-8 rounded-lg shadow-lg bg-card">
          <h2 className="text-2xl font-bold mb-4 text-center">Welcome to Tongkeeper</h2>
          <p className="text-muted-foreground mb-8 text-center">
            Please log in to access the AI Assistant.
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

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      {allConversations.length > 0 && (
        <div className="border-r w-64 h-full hidden md:flex flex-col">
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
                  onClick={() => selectConversation(conv.id)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span className="truncate">{conv.title || 'New Conversation'}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Chat area */}
      <div className="flex flex-col flex-1 h-full">
        {/* Header */}
        <div className="border-b px-4 py-3 flex justify-between items-center bg-muted/30">
          <h2 className="font-semibold">
            {currentThreadId 
              ? allConversations.find((c: any) => c.id === currentThreadId)?.title || 'Conversation' 
              : 'New Conversation'}
          </h2>
          {allConversations.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNewConversation}
              className="md:hidden"
            >
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingConversation ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <p>Loading conversation...</p>
            </div>
          ) : messages.length > 0 ? (
            <>
              {messages.map((msg: any, index: number) => {
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
                        "max-w-[80%] rounded-2xl p-4",
                        isUserMessage 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted text-foreground rounded-tl-none shadow-sm"
                      )}
                    >
                      {!isUserMessage && (
                        <div className="flex items-center mb-2">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                            <Sparkles className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-xs font-medium">AI Assistant</span>
                        </div>
                      )}
                      
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                      
                      <div className="text-xs opacity-70 mt-2 text-right">
                        {formatRelativeTime(new Date(msg.timestamp))}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {isSending && (
                <div className="flex w-full mb-4 justify-start">
                  <div className="max-w-[80%] rounded-2xl p-4 bg-muted/60 text-foreground rounded-tl-none shadow-sm">
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>AI assistant is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="bg-primary/10 rounded-full p-4 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Welcome to AI Assistant</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Ask me anything and I'll do my best to help you.
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
              placeholder="Message AI Assistant..."
              className="min-h-[60px] resize-none pr-12 rounded-lg border-muted-foreground/20"
              disabled={isSending}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!message.trim() || isSending}
              className="absolute right-2 bottom-2 h-9 w-9 p-0 rounded-lg"
              size="icon"
            >
              {isSending ? 
                <Loader2 className="h-4 w-4 animate-spin" /> : 
                <Send className="h-4 w-4" />
              }
            </Button>
          </div>
          <p className="text-xs text-center mt-2 text-muted-foreground">
            AI Assistant may occasionally produce inaccurate information.
          </p>
        </div>
      </div>
    </div>
  );
}