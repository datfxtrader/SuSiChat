import React, { useState, useRef, useEffect } from 'react';
import { useSuna, type LLMModel } from '@/hooks/useSuna';
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
  UserIcon,
  Settings,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChatGPTStyleChatProps {
  threadId?: string;
}

export function ChatGPTStyleChat({ threadId }: ChatGPTStyleChatProps) {
  const [message, setMessage] = useState('');
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { 
    messages = [], 
    allConversations = [] as any[],
    threadId: currentThreadId,
    isLoadingConversation,
    isLoadingConversations, 
    sendMessage, 
    isSending,
    selectConversation,
    createNewChat,
    currentModel,
    changeModel
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
    
    sendMessage({ message, model: currentModel });
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
    createNewChat();
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
    <div className="flex h-full bg-white text-gray-800">
      {/* Mobile sidebar toggle */}
      <button 
        className={cn(
          "md:hidden fixed z-50 top-3 left-3 p-2 bg-gray-100 rounded-md text-gray-600",
          isSidebarOpen ? "left-[260px]" : "left-3"
        )}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
      </button>

      {/* Sidebar */}
      <div 
        className={cn(
          "w-[260px] bg-gray-50 border-r border-gray-200 h-full flex flex-col transition-all duration-300 fixed md:static z-40",
          isSidebarOpen ? "left-0" : "-left-[260px]",
          "md:left-0" // Always visible on desktop
        )}
      >
        <div className="p-2 border-b border-gray-200 space-y-2">
          <Button 
            variant="outline" 
            className="w-full bg-white border border-gray-200 hover:bg-gray-100 text-gray-700" 
            onClick={handleNewConversation}
          >
            <PlusIcon className="mr-2 h-4 w-4" /> New chat
          </Button>
          
          {/* Model selection removed from sidebar */}
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 space-y-0">
          {allConversations.length > 0 ? (
            allConversations.map((conv: any) => (
              <button
                key={conv.id}
                className={cn(
                  "w-full text-left px-3 py-3 transition-colors text-sm flex items-center",
                  currentThreadId === conv.id 
                    ? "bg-gray-100 hover:bg-gray-100" 
                    : "hover:bg-gray-100"
                )}
                onClick={() => {
                  selectConversation(conv.id);
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
              >
                <MessageSquareIcon className="mr-3 h-4 w-4 shrink-0 text-gray-500" />
                <span className="truncate text-gray-600">{conv.title || 'New chat'}</span>
              </button>
            ))
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              No previous chats
            </div>
          )}
        </div>
        
        <div className="p-2 border-t border-gray-200 mt-auto">
          {/* Removed home button to focus on Suna functionality */}
        </div>
      </div>

      {/* Chat area */}
      <div className={cn(
        "flex flex-col flex-1 h-full relative",
        !isSidebarOpen && "md:ml-0"
      )}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-40">
          {isLoadingConversation ? (
            <div className="flex justify-center items-center h-full">
              <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length > 0 ? (
            <div className="pb-20">
              {messages.map((msg: any, index: number) => {
                const isUserMessage = msg.role === 'user';
                
                return (
                  <div
                    key={msg.id || index}
                    className="px-4 md:px-[10%] py-6 flex w-full items-start bg-white"
                  >
                    <div className="flex-shrink-0 mr-4">
                      {isUserMessage ? (
                        <div className="rounded-full bg-gray-300 w-8 h-8 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-gray-700" />
                        </div>
                      ) : (
                        <div className="rounded-full bg-blue-500 w-8 h-8 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow max-w-[90%] sm:max-w-3xl overflow-hidden">
                      <div className={cn(
                        "text-[15px] leading-relaxed prose max-w-none prose-headings:my-2 prose-p:my-1 text-gray-800 rounded-lg p-3",
                        isUserMessage 
                          ? "bg-blue-100 border border-blue-200" 
                          : "bg-white border border-gray-200 shadow-sm"
                      )}>
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                        {/* Show model and search info if it's an assistant message */}
                        {!isUserMessage && msg.modelUsed && (
                          <div className="text-xs text-gray-400 mt-2 italic">
                            Model: {msg.modelUsed} {msg.webSearchUsed ? '• Web search used' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {isSending && (
                <div className="px-4 md:px-[10%] py-6 flex w-full items-start bg-white">
                  <div className="flex-shrink-0 mr-4">
                    <div className="rounded-full bg-blue-500 w-8 h-8 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-grow max-w-[90%] sm:max-w-3xl">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <h2 className="text-3xl font-semibold mb-10 text-gray-800">Hello Dat, where should we begin?</h2>
              <div className="grid gap-4 md:grid-cols-2 max-w-3xl w-full">
                <button
                  className="bg-transparent hover:bg-gray-100 text-left p-6 rounded-xl transition-colors border border-gray-200"
                  onClick={() => {
                    setMessage("What can you help me with?");
                    handleSendMessage();
                  }}
                >
                  <div className="font-medium mb-1 text-gray-800">What can you help me with?</div>
                  <div className="text-sm text-gray-500">Learn about my capabilities</div>
                </button>
                <button
                  className="bg-transparent hover:bg-gray-100 text-left p-6 rounded-xl transition-colors border border-gray-200"
                  onClick={() => {
                    setMessage("Write a short story about a robot learning to feel emotions");
                    handleSendMessage();
                  }}
                >
                  <div className="font-medium mb-1 text-gray-800">Write a short story</div>
                  <div className="text-sm text-gray-500">About a robot learning to feel emotions</div>
                </button>
                <button
                  className="bg-transparent hover:bg-gray-100 text-left p-6 rounded-xl transition-colors border border-gray-200"
                  onClick={() => {
                    setMessage("How do I create a family room in Tongkeeper?");
                    handleSendMessage();
                  }}
                >
                  <div className="font-medium mb-1 text-gray-800">How do I create a family room?</div>
                  <div className="text-sm text-gray-500">Learn about Tongkeeper features</div>
                </button>
                <button
                  className="bg-transparent hover:bg-gray-100 text-left p-6 rounded-xl transition-colors border border-gray-200"
                  onClick={() => {
                    setMessage("Explain AI in simple terms a child would understand");
                    handleSendMessage();
                  }}
                >
                  <div className="font-medium mb-1 text-gray-800">Explain AI to me</div>
                  <div className="text-sm text-gray-500">In simple terms a child would understand</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-2 sm:px-4 pb-4 pt-4 absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md">
          <div className="relative max-w-3xl mx-auto">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsTextareaFocused(true)}
              onBlur={() => setIsTextareaFocused(false)}
              placeholder="Ask anything..."
              className={cn(
                "min-h-[56px] max-h-[200px] p-4 pr-24 w-full rounded-2xl border border-gray-300 shadow-sm",
                "bg-white focus:border-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder-gray-500 resize-none text-gray-800 text-sm transition-all"
              )}
              disabled={isSending}
              rows={1}
            />
            <div className="absolute right-3 bottom-3 flex gap-2 items-center">
              <Button 
                onClick={handleSendMessage} 
                disabled={!message.trim() || isSending}
                className={cn(
                  "h-8 w-8 p-0 rounded-full bg-black transition-opacity",
                  !message.trim() && "opacity-40"
                )}
                variant="default"
              >
                {isSending ? 
                  <Loader2Icon className="h-4 w-4 animate-spin text-white" /> : 
                  <SendIcon className="h-4 w-4 text-white" />
                }
              </Button>
            </div>
          </div>
          <div className="max-w-3xl mx-auto flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
              <Select 
                value={currentModel} 
                onValueChange={(value) => changeModel(value as LLMModel)}
              >
                <SelectTrigger className="h-7 text-xs px-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
                  <div className="flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center mr-1 text-[10px] font-bold">AI</span>
                    <SelectValue placeholder="Select model" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek-chat">DeepSeek</SelectItem>
                  <SelectItem value="gemini-1.5-flash">Gemini Flash 2.0</SelectItem>
                  <SelectItem value="gemini-1.0-pro">Gemini 1.5 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-gray-500">
              Uses Tavily & Brave Search for real-time information
            </p>
          </div>
          {/* Add extra padding at bottom to ensure content isn't hidden behind input */}
          <div className="h-2"></div>
        </div>
      </div>
    </div>
  );
}