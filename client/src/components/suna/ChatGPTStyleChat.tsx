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
  Bot,
  Zap, 
  BookOpen,
  ChevronDown,
  ChevronUp,
  Search,
  Database,
  Sparkles,
  Paperclip,
  File,
  Heart as HeartIcon,
  Coffee
} from 'lucide-react';
import { ResearchProgress } from './ResearchProgress';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResearchDepthSelector } from '@/components/research/ResearchDepthSelector';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock source structure for research mode responses
interface Source {
  title: string;
  url: string;
  domain: string;
  content?: string;
  publishedDate?: string;
}

// Debug source display issues
function logSourceInfo(source: Source) {
  console.log(`Source: ${source.title}`);
  console.log(`URL: ${source.url}`);
  console.log(`Domain: ${source.domain}`);
  return source;
}

// Note: ResearchProgress component is now imported from ./ResearchProgress.tsx
// This provides dynamic, real-time progress tracking instead of static values

// Research response component
interface ResearchResponseProps {
  content: string;
  sources: Source[];
}

const ResearchResponse: React.FC<ResearchResponseProps> = ({ content, sources }) => {
  const [expandedSources, setExpandedSources] = useState(false);
  
  // Improved function to process content and highlight citations [1], [2], etc.
  const renderContentWithCitations = (text: string) => {
    // Extract the main content (everything before "Sources:" section)
    // Preserve all content before any sources section
    const contentSplit = text.split(/Sources:/i);
    const mainContent = contentSplit[0];
    
    // Only process the main content for citations, completely removing the sources section from response
    const contentToProcess = mainContent || text;
    
    // Improved regex to find citation markers [1], [2], etc. that aren't part of URLs
    const parts = contentToProcess.split(/(\[\d+\](?!\)))/g);
    
    if (parts.length <= 1) return <ReactMarkdown>{contentToProcess}</ReactMarkdown>;
    
    return (
      <>
        {parts.map((part, i) => {
          // Check if this part is a citation marker
          const citationMatch = part.match(/\[(\d+)\](?!\))/);
          if (citationMatch) {
            const sourceIndex = parseInt(citationMatch[1]) - 1;
            if (sourceIndex >= 0 && sourceIndex < sources.length) {
              return (
                <span key={i} className="inline-flex items-center">
                  <a 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      // Open in a new window to prevent navigation issues
                      window.open(sources[sourceIndex]?.url, '_blank', 'noopener,noreferrer');
                      return false;
                    }}
                    className="text-blue-600 bg-blue-50 rounded px-1 text-xs font-medium hover:bg-blue-100"
                  >
                    {part}
                  </a>
                </span>
              );
            }
          }
          
          // Otherwise render as regular markdown
          return (
            <span key={i}>
              {part.length > 0 ? <ReactMarkdown>{part}</ReactMarkdown> : null}
            </span>
          );
        })}
      </>
    );
  };
  
  return (
    <div className="flex flex-col">
      {/* Main response content */}
      <div className="prose prose-blue max-w-none">
        {renderContentWithCitations(content)}
      </div>
      
      {/* Sources section */}
      {sources.length > 0 && (
        <div className="mt-3">
          <button 
            onClick={() => setExpandedSources(!expandedSources)}
            className="flex items-center text-xs text-gray-500 hover:text-gray-700"
          >
            {expandedSources ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expandedSources ? "Hide Sources" : `View ${sources.length} Sources`}
          </button>
          
          {expandedSources && (
            <div className="mt-2 border-t pt-2">
              <h4 className="text-sm font-medium text-gray-700">Sources</h4>
              <div className="space-y-2 mt-1">
                {sources.map((source, index) => (
                  <div key={index} className="text-xs flex">
                    <span className="font-medium mr-2">[{index + 1}]</span>
                    <div>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {source.title}
                      </a>
                      <p className="text-gray-500">{source.domain}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
  const [researchMode, setResearchMode] = useState(false);
  const [researchDepth, setResearchDepth] = useState(1); // 1-3 scale for research depth
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [researchStage, setResearchStage] = useState(0); // 0: not started, 1: searching, 2: analyzing, 3: synthesizing
  
  const { 
    messages = [], 
    allConversations = [] as { id: string; title: string; createdAt: string }[],
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

  // Extract sources from message metadata or content for research display
  const getSourcesFromMetadata = (message: any): Source[] => {
    if (!message.webSearchUsed) return [];
    
    // Enhanced source extraction - three-step approach 
    const sources: Source[] = [];
    
    // Debug logs to understand what data we're receiving
    console.log("Source metadata:", JSON.stringify(message.searchMetadata, null, 2));
    
    // 1. First priority: Extract sources directly from the content "Sources:" section
    // This pattern matches structured listings like:
    // [1] Title
    // https://example.com/article
    const content = message.content || '';
    
    // Look for a "Sources:" section at the end of the message
    const sourcesSection = content.match(/Sources:\s*([\s\S]+)$/i);
    if (sourcesSection && sourcesSection[1]) {
      console.log("Found sources section:", sourcesSection[1]);
      
      // Extract structured sources with format: [index] title + URL on separate line
      const sourceSectionRegex = /\[(\d+)\]\s+([^\n]+)\s*\n\s*(https?:\/\/[^\s\n]+)/g;
      const sourceSectionMatches = [...sourcesSection[1].matchAll(sourceSectionRegex)];
      
      if (sourceSectionMatches.length > 0) {
        console.log("Found structured sources in sources section:", sourceSectionMatches);
        
        const extractedSources = sourceSectionMatches.map((match) => {
          try {
            const url = match[3];
            const domain = new URL(url).hostname;
            
            const sourceObj: Source = {
              title: match[2].trim(),
              url: url,
              domain: domain,
              publishedDate: new Date().toLocaleDateString()
            };
            
            return logSourceInfo(sourceObj);
          } catch (e) {
            console.error("Error parsing source URL:", e);
            return null;
          }
        }).filter((source): source is Source => source !== null);
        
        if (extractedSources.length > 0) {
          console.log(`Successfully extracted ${extractedSources.length} sources from sources section`);
          return extractedSources;
        }
      }
    }
    
    // 2. Second priority: Look for structured sources throughout the content
    const sourceRegex = /\[(\d+)\]\s+([^\n]+)\s*\n\s*(https?:\/\/[^\s\n]+)/g;
    const sourceMatches = [...content.matchAll(sourceRegex)];
    
    if (sourceMatches.length > 0) {
      console.log("Found structured sources throughout content:", sourceMatches);
      
      const extractedSources = sourceMatches.map((match) => {
        try {
          const url = match[3];
          const domain = new URL(url).hostname;
          
          const sourceObj: Source = {
            title: match[2].trim(),
            url: url,
            domain: domain,
            publishedDate: new Date().toLocaleDateString()
          };
          
          return logSourceInfo(sourceObj);
        } catch (e) {
          console.error("Error parsing source URL:", e);
          return null;
        }
      }).filter((source): source is Source => source !== null);
      
      if (extractedSources.length > 0) {
        console.log(`Successfully extracted ${extractedSources.length} structured sources from content`);
        return extractedSources;
      }
    }
    
    // 3. Third priority: Use source details from metadata if available
    if (message.searchMetadata?.sourceDetails && Array.isArray(message.searchMetadata.sourceDetails) 
        && message.searchMetadata.sourceDetails.length > 0) {
      console.log("Using sourceDetails from metadata:", message.searchMetadata.sourceDetails);
      
      type SourceDetail = {
        title?: string;
        url?: string;
        domain?: string;
      };
      
      const extractedSources = message.searchMetadata.sourceDetails
        .map((source: SourceDetail, index: number) => {
          if (!source.url) return null;
          
          try {
            // Create properly formatted source object with guaranteed URL
            const sourceObj: Source = {
              title: source.title || `Source ${index + 1}`,
              url: source.url, // This should be the full article URL
              domain: source.domain || new URL(source.url).hostname,
              publishedDate: new Date().toLocaleDateString()
            };
            
            // Log source info for debugging
            return logSourceInfo(sourceObj);
          } catch (e) {
            console.error("Error parsing metadata source:", e);
            return null;
          }
        })
        .filter((source): source is Source => source !== null);
      
      if (extractedSources.length > 0) {
        console.log(`Successfully extracted ${extractedSources.length} sources from metadata`);
        return extractedSources;
      }
    }
    
    // 4. Fourth priority: Fallback to any URLs found in the content
    const urlRegex = /(https?:\/\/[^\s\n]+)/g;
    const urlMatches = [...content.matchAll(urlRegex)];
    
    if (urlMatches.length > 0) {
      console.log("Falling back to simple URL extraction:", urlMatches);
      
      const extractedSources = urlMatches.map((match, index) => {
        try {
          const url = match[1];
          const domain = new URL(url).hostname;
          
          const sourceObj: Source = {
            title: `Source ${index + 1}`,
            url: url,
            domain: domain,
            publishedDate: new Date().toLocaleDateString()
          };
          
          return logSourceInfo(sourceObj);
        } catch (e) {
          console.error("Error parsing URL:", e);
          return null;
        }
      }).filter((source): source is Source => source !== null);
      
      if (extractedSources.length > 0) {
        console.log(`Extracted ${extractedSources.length} URLs from content`);
        return extractedSources;
      }
    }
    
    // Fallback to basic domain information
    if (message.searchMetadata?.sources) {
      console.log("Falling back to basic source domains:", message.searchMetadata.sources);
      message.searchMetadata.sources.forEach((domain: string, index: number) => {
        sources.push({
          title: `Source ${index + 1} from ${domain}`,
          url: `https://${domain}`,
          domain: domain,
          publishedDate: new Date().toLocaleDateString()
        });
      });
    }
    
    // If we have search results but no sources in metadata
    if (sources.length === 0 && message.webSearchUsed) {
      // Use the actual response to extract potential sources
      const content = message.content || '';
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = content.match(urlRegex) || [];
      
      matches.forEach((url: string, index: number) => {
        try {
          const domain = new URL(url).hostname;
          sources.push({
            title: `Referenced Source ${index + 1}`,
            url: url,
            domain: domain
          });
        } catch (e) {
          // Invalid URL, skip
        }
      });
    }
    
    return sources;
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Include research depth if research mode is enabled
    if (researchMode) {
      console.log(`Sending message with research depth: ${researchDepth}`);
      sendMessage({ 
        message, 
        model: currentModel,
        researchDepth: researchDepth 
      });
    } else {
      sendMessage({ message, model: currentModel });
    }
    
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
            [...allConversations]
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((conv: any) => (
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
                        {/* Display with research component when in research mode and not a user message */}
                        {!isUserMessage && researchMode ? (
                          <ResearchResponse 
                            content={msg.content}
                            sources={getSourcesFromMetadata(msg)}
                          />
                        ) : (
                          <ReactMarkdown>
                            {msg.content}
                          </ReactMarkdown>
                        )}
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
                      {researchMode ? (
                        <div className="flex flex-col">
                          <ResearchProgress 
                            stage={1} 
                            progress={0}
                            query={message}
                            isActive={isSending}
                          />
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
                        </div>
                      )}
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
            {/* Research depth controls removed from here to avoid duplication */}
            
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsTextareaFocused(true)}
              onBlur={() => setIsTextareaFocused(false)}
              placeholder={researchMode ? "Ask a research question..." : "Ask anything..."}
              className={cn(
                "min-h-[56px] max-h-[200px] p-4 pr-24 w-full rounded-2xl border border-gray-300 shadow-sm",
                "bg-white focus:border-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder-gray-500 resize-none text-gray-800 text-sm transition-all"
              )}
              disabled={isSending}
              rows={1}
            />
            <div className="absolute right-3 bottom-3 flex gap-2 items-center">
              {/* File attachment button */}
              <Button
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="h-8 w-8 p-0 rounded-full bg-transparent hover:bg-gray-100 text-gray-500"
                variant="ghost"
                type="button"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              {/* Send button */}
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
            
            {/* File upload area (can be expanded later) */}
            {showFileUpload && (
              <div className="absolute bottom-14 right-3 bg-white border rounded-lg shadow-lg p-3 w-64">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium">Attach Files</h4>
                  <Button
                    onClick={() => setShowFileUpload(false)}
                    className="h-6 w-6 p-0 rounded-full"
                    variant="ghost"
                    size="sm"
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
                <div className="border-2 border-dashed rounded-md p-4 text-center">
                  <File className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">Drag and drop files here or click to browse</p>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Supported formats: PDF, DOC, TXT, images
                </div>
              </div>
            )}
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
                  <SelectItem value="auto">🎯 Auto (Smart Routing)</SelectItem>
                  <SelectItem value="deepseek-chat">DeepSeek</SelectItem>
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                  <SelectItem value="gemini-1.0-pro">Gemini 1.5 Pro</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Simple mode toggle */}
              <div className="flex items-center">
                {/* Quick toggle */}
                <div 
                  className="flex items-center rounded-md overflow-hidden h-7 border cursor-pointer mr-2"
                  onClick={() => setResearchMode(false)}
                >
                  <div className="py-1 text-xs flex items-center justify-center w-20"
                    style={{ 
                      backgroundColor: !researchMode ? '#3b82f6' : 'white',
                      color: !researchMode ? 'white' : '#374151'
                    }}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Quick
                  </div>
                </div>
                
                {/* Research toggle - matched to reference image */}
                <div 
                  className="flex items-center rounded-md overflow-hidden h-7 border cursor-pointer mr-2"
                  onClick={() => setResearchMode(true)}
                >
                  <div className="py-1 text-xs flex items-center justify-center w-28"
                    style={{ 
                      backgroundColor: researchMode ? '#3b82f6' : 'white',
                      color: researchMode ? 'white' : '#374151'
                    }}
                  >
                    <BookOpen className="w-3 h-3 mr-1" />
                    Research
                  </div>
                </div>
                
                {/* Research Depth selector - only shown when Research mode is active */}
                {researchMode && (
                  <div className="flex items-center ml-2">
                    <div className="flex border rounded-md overflow-hidden h-7">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`px-2 py-0 ${researchDepth === 1 ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                              onClick={() => setResearchDepth(1)}
                            >
                              <div className="flex items-center justify-center">
                                <Search className="w-3 h-3 mr-1" />1
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Basic research (5-15s)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`px-2 py-0 ${researchDepth === 2 ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                              onClick={() => setResearchDepth(2)}
                            >
                              <div className="flex items-center justify-center">
                                <Sparkles className="w-3 h-3 mr-1" />2
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Enhanced research (15-30s)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`px-2 py-0 ${researchDepth === 3 ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                              onClick={() => setResearchDepth(3)}
                            >
                              <div className="flex items-center justify-center">
                                <Database className="w-3 h-3 mr-1" />3
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Deep research with DeerFlow (1-2m)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 flex items-center justify-center">
              Made with <span className="mx-1 text-red-500"><HeartIcon className="h-3 w-3 inline" /></span> and <span className="mx-1"><Coffee className="h-3 w-3 inline text-amber-700" /></span>
            </p>
          </div>
          {/* Add extra padding at bottom to ensure content isn't hidden behind input */}
          <div className="h-2"></div>
        </div>
      </div>
    </div>
  );
}