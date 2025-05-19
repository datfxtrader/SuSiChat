import React, { useState, useRef, useEffect } from 'react';
import { useSuna } from '@/hooks/useSuna';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime } from '@/lib/utils';
import { 
  PlusIcon, 
  SendIcon, 
  MenuIcon,
  XIcon,
  Loader2Icon,
  MessageSquareIcon,
  UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatGPTStyleChatProps {
  threadId?: string;
}

export function ChatGPTStyleChat({ threadId }: ChatGPTStyleChatProps) {
  const [message, setMessage] = useState('');
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

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
    
    // Reset textarea height
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
    selectConversation('');
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full">
        <div className="w-full max-w-md p-8 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-center">Welcome to Tongkeeper</h2>
          <p className="text-muted-foreground mb-8 text-center">
            Please log in to access the AI Assistant.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'} 
            className="w-full"
          >
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#343541] text-white">
      {/* Mobile sidebar toggle */}
      <button 
        className={cn(
          "md:hidden fixed z-50 top-3 left-3 p-2 bg-[#202123] rounded-md text-gray-300",
          isSidebarOpen ? "left-[260px]" : "left-3"
        )}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
      </button>

      {/* Sidebar */}
      <div 
        className={cn(
          "w-[260px] bg-[#202123] h-full flex flex-col transition-all duration-300 fixed md:static z-40",
          isSidebarOpen ? "left-0" : "-left-[260px]",
          "md:left-0" // Always visible on desktop
        )}
      >
        <div className="p-3 border-b border-gray-700/50">
          <Button 
            variant="outline" 
            className="w-full bg-transparent border border-gray-700/50 hover:bg-gray-700/50 text-white" 
            onClick={handleNewConversation}
          >
            <PlusIcon className="mr-2 h-4 w-4" /> New chat
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {allConversations.length > 0 ? (
            allConversations.map((conv: any) => (
              <button
                key={conv.id}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md transition-colors text-sm flex items-center",
                  currentThreadId === conv.id 
                    ? "bg-gray-700/50" 
                    : "hover:bg-gray-700/30"
                )}
                onClick={() => {
                  selectConversation(conv.id);
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
              >
                <MessageSquareIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{conv.title || 'New chat'}</span>
              </button>
            ))
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              No previous chats
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-700/50 mt-auto">
          <button 
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-700/30 transition-colors text-sm flex items-center"
            onClick={() => window.location.href = '/'}
          >
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Home</span>
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className={cn(
        "flex flex-col flex-1 h-full relative",
        !isSidebarOpen && "md:ml-0"
      )}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversation ? (
            <div className="flex justify-center items-center h-full">
              <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length > 0 ? (
            <div>
              {messages.map((msg: any, index: number) => {
                const isUserMessage = msg.role === 'user';
                
                return (
                  <div
                    key={msg.id || index}
                    className={cn(
                      "px-4 md:px-8 py-6 flex items-start",
                      isUserMessage ? "bg-[#343541]" : "bg-[#444654]"
                    )}
                  >
                    <div className="flex-shrink-0 mr-4 rounded-full bg-[#5436DA] w-8 h-8 flex items-center justify-center">
                      {isUserMessage ? (
                        <UserIcon className="h-4 w-4 text-white" />
                      ) : (
                        <div className="font-bold text-white">AI</div>
                      )}
                    </div>
                    
                    <div className="max-w-4xl">
                      <div className="whitespace-pre-wrap text-sm">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {isSending && (
                <div className="px-4 md:px-8 py-6 flex items-start bg-[#444654]">
                  <div className="flex-shrink-0 mr-4 rounded-full bg-[#5436DA] w-8 h-8 flex items-center justify-center">
                    <div className="font-bold text-white">AI</div>
                  </div>
                  
                  <div className="flex items-center">
                    <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-gray-300">Thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <h2 className="text-2xl font-semibold mb-6">How can I help you today?</h2>
              <div className="grid gap-3 md:grid-cols-2 max-w-3xl w-full">
                <button
                  className="bg-[#3E3F4B] hover:bg-[#4A4B57] text-left p-4 rounded-md transition-colors"
                  onClick={() => setMessage("What can you help me with?")}
                >
                  <div className="font-medium mb-1">What can you help me with?</div>
                  <div className="text-sm text-gray-400">Learn about my capabilities</div>
                </button>
                <button
                  className="bg-[#3E3F4B] hover:bg-[#4A4B57] text-left p-4 rounded-md transition-colors"
                  onClick={() => setMessage("Write a short story about a robot learning to feel emotions")}
                >
                  <div className="font-medium mb-1">Write a short story</div>
                  <div className="text-sm text-gray-400">About a robot learning to feel emotions</div>
                </button>
                <button
                  className="bg-[#3E3F4B] hover:bg-[#4A4B57] text-left p-4 rounded-md transition-colors"
                  onClick={() => setMessage("How do I create a family room in Tongkeeper?")}
                >
                  <div className="font-medium mb-1">How do I create a family room?</div>
                  <div className="text-sm text-gray-400">Learn about Tongkeeper features</div>
                </button>
                <button
                  className="bg-[#3E3F4B] hover:bg-[#4A4B57] text-left p-4 rounded-md transition-colors"
                  onClick={() => setMessage("Explain artificial intelligence to me like I'm 5 years old")}
                >
                  <div className="font-medium mb-1">Explain AI to me</div>
                  <div className="text-sm text-gray-400">In simple terms a child would understand</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-3 md:p-4 border-t border-gray-700/50">
          <div className="max-w-3xl mx-auto relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Assistant..."
              className="min-h-[48px] max-h-[200px] px-3 py-3 pr-10 rounded-md bg-[#40414F] border-none focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder-gray-400 resize-none text-white"
              disabled={isSending}
              rows={1}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!message.trim() || isSending}
              className="absolute right-2 bottom-1 h-8 w-8 p-0 rounded-md bg-transparent hover:bg-gray-600/50"
              variant="ghost"
            >
              {isSending ? 
                <Loader2Icon className="h-4 w-4 animate-spin text-gray-400" /> : 
                <SendIcon className="h-4 w-4 text-gray-400" />
              }
            </Button>
          </div>
          <div className="max-w-3xl mx-auto">
            <p className="text-[10px] text-center mt-2 text-gray-400">
              AI Assistant may occasionally produce inaccurate information. Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}