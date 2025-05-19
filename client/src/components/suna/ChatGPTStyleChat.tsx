import React, { useState, useRef, useEffect } from 'react';
import { useSuna, type LLMModel } from '@/hooks/useSuna';
import { useDeerflow } from '@/hooks/useDeerflow';
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
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { DeepResearch } from '@/components/research/DeepResearch';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Research progress component to show current search/analysis stage
interface ResearchProgressProps {
  stage: number; // 0: not started, 1: searching, 2: analyzing, 3: synthesizing
  progress: number; // 0-100 percentage for the current stage
}

const ResearchProgress: React.FC<ResearchProgressProps & { query?: string }> = ({ stage, progress, query }) => {
  // Generate dynamic topics based on the query
  const getDynamicTopics = () => {
    const searchQuery = query || '';
    console.log("Current search query for topics:", searchQuery);
    
    // Extract main entities from the query with enhanced detection
    const extractMainEntity = (query: string) => {
      // More precise forex pair detection using common patterns
      const forexPairMatch = query.match(/([A-Z]{3}\/[A-Z]{3}|[A-Z]{6}|EUR\/USD|GBP\/USD|USD\/JPY|AUD\/USD|EUR\/GBP)/i);
      if (forexPairMatch) {
        // Format currency pair consistently
        const pair = forexPairMatch[0].toUpperCase();
        // If it's in XXXYYY format, add a slash for better readability
        if (pair.length === 6 && !pair.includes('/')) {
          return `${pair.slice(0,3)}/${pair.slice(3,6)}`;
        }
        return pair;
      }
      
      // Check for individual currencies when part of a question about exchange rates
      if (/exchange rate|forex|currency|trading|strength|weak|strong|convert/i.test(query)) {
        const currencyMatch = query.match(/(euro|dollar|pound|sterling|yen|franc|aussie|kiwi|loonie|EUR|USD|GBP|JPY|AUD|CAD|CHF|NZD)/i);
        if (currencyMatch) return currencyMatch[0].toUpperCase();
      }
      
      // Check for cryptocurrencies
      const cryptoMatch = query.match(/(bitcoin|btc|ethereum|eth|xrp|ripple|litecoin|ltc|dogecoin|doge)/i);
      if (cryptoMatch) return cryptoMatch[0];
      
      // Check for stocks or indices
      const stockMatch = query.match(/(nasdaq|dow jones|s&p 500|s&p500|sp500|ftse|nikkei|dax|apple|google|microsoft|amazon|tesla)/i);
      if (stockMatch) return stockMatch[0];
      
      // Check for commodities
      const commodityMatch = query.match(/(gold|xau|silver|xag|oil|crude|brent|wti|gas|natural gas|commodity)/i);
      if (commodityMatch) return commodityMatch[0];
      
      return '';
    };
    
    const mainEntity = extractMainEntity(searchQuery);
    console.log("Extracted main entity:", mainEntity);
    
    // Currency pair specific topics (GBPUSD, EURUSD, etc.)
    if (/GBP.*USD|GBPUSD|GBP\/USD/i.test(searchQuery) || mainEntity === 'GBP/USD') {
      return [
        [
          "GBP/USD Price Action - Trading Economics",
          "Bank of England Policy Impact - Financial Times",
          "US Dollar Strength vs Pound - Reuters"
        ],
        [
          "Technical Support/Resistance Levels for GBP/USD",
          "UK Economic Data Impact on Pound",
          "Fed Policy Implications for the Pair"
        ],
        [
          "GBP/USD Forecast for Coming Weeks",
          "Brexit Factors on Pound Valuation",
          "Interest Rate Differential Analysis"
        ]
      ];
    }
    // Bitcoin specific topics
    else if (/bitcoin|btc/i.test(searchQuery)) {
      return [
        [
          "Bitcoin Price Trends - CoinDesk Analysis",
          "Institutional Adoption Metrics - Glassnode",
          "Market Sentiment Indicators - CryptoQuant"
        ],
        [
          "On-chain Transaction Volume Analysis",
          "Hash Rate and Network Security",
          "Exchange Inflow/Outflow Metrics"
        ],
        [
          "Bitcoin Halving Cycle Analysis",
          "Regulatory Environment Impact",
          "Correlation with Traditional Markets"
        ]
      ];
    }
    // General financial topics
    else if (/forex|currency|dollar|pound|yen|euro|usd|eur|jpy|gbp|exchange rate|fx|trading/i.test(searchQuery)) {
      return [
        [
          "Current Exchange Rate Analysis - Financial Times",
          "Central Bank Policy Impact - Bloomberg",
          "Economic Indicator Effects - Reuters"
        ],
        [
          "Technical Support/Resistance Levels",
          "Market Sentiment and Positioning Data",
          "Cross-Currency Correlation Patterns"
        ],
        [
          "Short-term Price Forecast",
          "Long-term Currency Trend Analysis",
          "Risk Management Considerations"
        ]
      ];
    }
    // Technology topics
    else if (/software|hardware|ai|programming|computer|website|app|technology|tech|digital/i.test(searchQuery)) {
      return [
        [
          "Latest Technology Developments - Tech Report",
          "Industry Leaders and Market Share - Analysis",
          "User Adoption Rates and Trends - Research Data"
        ],
        [
          "Feature Comparison and Benchmarks",
          "Implementation Challenges and Solutions",
          "Technical Specifications and Requirements"
        ],
        [
          "Future Development Roadmap",
          "Integration with Existing Systems",
          "Impact on User Experience and Workflow"
        ]
      ];
    } else if (/health|medical|disease|symptoms|treatment|doctor|medicine|therapy|diet|nutrition/i.test(searchQuery)) {
      return [
        [
          "Recent Medical Research Findings - Journal Publication",
          "Treatment Approaches and Effectiveness - Clinical Study",
          "Health Statistics and Trends - Public Health Data"
        ],
        [
          "Prevention Strategies and Best Practices",
          "Risk Factors and Early Detection",
          "Patient Outcomes and Quality of Life"
        ],
        [
          "Healthcare Provider Recommendations",
          "Lifestyle and Environmental Considerations",
          "Long-term Management and Support Resources"
        ]
      ];
    } else {
      // Default topics for general queries
      return [
        [
          "Primary Information Sources - Research Database",
          "Recent Developments and Updates - Current Analysis",
          "Historical Context and Background - Expert Overview"
        ],
        [
          "Key Concepts and Definitions",
          "Comparative Analysis of Perspectives",
          "Evidence Quality Assessment"
        ],
        [
          "Synthesis of Primary Findings",
          "Practical Applications and Implications",
          "Further Questions and Considerations"
        ]
      ];
    }
  };
  
  const topicsData = getDynamicTopics();
  
  const stages = [
    { 
      label: "Searching", 
      description: "Finding relevant sources",
      topics: topicsData[0]
    },
    { 
      label: "Analyzing", 
      description: "Evaluating information",
      topics: topicsData[1]
    },
    { 
      label: "Synthesizing", 
      description: "Creating comprehensive response",
      topics: topicsData[2]
    }
  ];
  
  return (
    <div className="flex flex-col bg-gray-50 rounded-lg p-3 my-2 border border-gray-200">
      <div className="flex items-center space-x-2 mb-2">
        <BookOpen className="text-blue-500 w-4 h-4" />
        <span className="text-sm font-medium">Research in Progress</span>
      </div>
      
      <div className="space-y-3">
        {stages.map((s, i) => {
          const stageNumber = i + 1;
          const isActive = stageNumber === stage;
          const isComplete = stageNumber < stage;
          
          return (
            <div key={i} className="flex flex-col space-y-1">
              <div className="flex items-center">
                <div 
                  className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center text-xs
                    ${isComplete ? 'bg-green-500 text-white' : 
                      isActive ? 'bg-blue-500 text-white' : 
                      'bg-gray-200 text-gray-500'}`}
                >
                  {isComplete ? '✓' : stageNumber}
                </div>
                <span className={`text-sm ${isActive ? 'font-medium text-blue-700' : 
                  isComplete ? 'text-green-700' : 'text-gray-500'}`}>
                  {s.label}
                </span>
              </div>
              
              {isActive && (
                <div className="ml-7">
                  <div className="text-xs text-gray-500 mb-1">{s.description}</div>
                  
                  {/* Discovered topics section */}
                  <div className="mb-2">
                    {s.topics.map((topic: string, idx: number) => (
                      <div 
                        key={idx} 
                        className={`text-xs text-left mb-1 flex items-center
                          ${idx < Math.ceil(progress * s.topics.length / 100) ? 'text-blue-600' : 'text-gray-400'}`}
                      >
                        {idx < Math.ceil(progress * s.topics.length / 100) ? (
                          <span className="inline-flex items-center">
                            <span className="mr-1 text-blue-500">•</span> {topic}
                          </span>
                        ) : (
                          <span className="opacity-50">...</span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Show completed topics for completed stages */}
              {isComplete && (
                <div className="ml-7">
                  <div className="text-xs text-gray-500 mb-1">
                    <span className="text-green-600 font-medium">✓ Completed</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
  const [researchStage, setResearchStage] = useState(0); // 0: not started, 1: searching, 2: analyzing, 3: synthesizing
  // DeerFlow deep research integration
  const [showResearchPanel, setShowResearchPanel] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  
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
  
  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Define the DeerFlow hook
  const deerflow = useDeerflow();

  // Extract sources from message metadata or content for research display
  const getSourcesFromMetadata = (message: any): Source[] => {
    // Return empty array if no search was used (unless deep research was used)
    if (!message.webSearchUsed && !message.searchMetadata?.deepResearchUsed) return [];
    
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
    
    // Convert UI research depth to the proper research depth string
    let researchDepthSetting: 'basic' | 'standard' | 'deep' = 'standard';
    if (researchMode) {
      if (researchDepth === 1) researchDepthSetting = 'basic';
      else if (researchDepth === 2) researchDepthSetting = 'standard'; 
      else if (researchDepth === 3) researchDepthSetting = 'deep';
    }
    
    // Prepare search preferences based on research mode and depth
    const customSearchPrefs = {
      useDeepResearch: researchMode,
      researchDepth: researchDepthSetting
    };
    
    // Start research stage progress animation if in research mode
    if (researchMode) {
      setResearchStage(1); // Start at searching stage
    }
    
    sendMessage({ 
      message, 
      model: currentModel,
      customSearchPrefs
    });
    
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
                        {/* Display with research component when in research mode or deep research used */}
                        {!isUserMessage && (researchMode || msg.searchMetadata?.deepResearchUsed) ? (
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
                            Model: {msg.modelUsed} 
                            {msg.searchMetadata?.deepResearchUsed ? 
                              ' • Deep research used' : 
                              msg.webSearchUsed ? ' • Web search used' : ''}
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
                      {researchMode || message.startsWith('/research') || message.startsWith('/deepresearch') ? (
                        <div className="flex flex-col">
                          <ResearchProgress 
                            stage={researchStage || 1} 
                            progress={75}
                            query={message} // Pass the current query for context-aware topics 
                          />
                          <div className="text-xs text-gray-500 mt-1 flex items-center">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {researchDepth === 1 ? 'Basic research' : 
                             researchDepth === 2 ? 'Standard research' : 
                             'Deep research'} in progress...
                          </div>
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
            {/* Research depth controls - only shown in research mode */}
            {researchMode && (
              <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs font-medium text-gray-700 mr-2">Research Depth:</span>
                  <div className="flex border rounded-md overflow-hidden">
                    {[1, 2, 3].map((level) => (
                      <button
                        key={level}
                        className={`px-3 py-1 text-xs ${researchDepth === level ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                        onClick={() => setResearchDepth(level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-gray-500 ml-3">
                  {researchDepth === 1 && "Basic facts and quick overview"}
                  {researchDepth === 2 && "Balanced depth and analysis"}
                  {researchDepth === 3 && "Comprehensive with more sources"}
                </div>
              </div>
            )}
            
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
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                  <SelectItem value="gemini-1.0-pro">Gemini 1.5 Pro</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Mode toggle - Quick vs Research vs Deep Research */}
              <div className="flex items-center border rounded-md overflow-hidden h-7">
                <button 
                  className={`px-2 py-1 text-xs ${!researchMode && !showResearchPanel ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => {
                    setResearchMode(false);
                    setShowResearchPanel(false);
                  }}
                >
                  <div className="flex items-center">
                    <Zap className="w-3 h-3 mr-1" />
                    Quick
                  </div>
                </button>
                <button 
                  className={`px-2 py-1 text-xs ${researchMode && !showResearchPanel ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => {
                    setResearchMode(true);
                    setShowResearchPanel(false);
                  }}
                >
                  <div className="flex items-center">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Research
                  </div>
                </button>
                <button 
                  className={`px-2 py-1 text-xs ${showResearchPanel ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => {
                    setShowResearchPanel(true);
                    setResearchMode(false);
                    setResearchQuery(message);
                  }}
                >
                  <div className="flex items-center">
                    <Search className="w-3 h-3 mr-1" />
                    Deep
                  </div>
                </button>
              </div>
              
              {/* Research depth selector (only shown in research mode) */}
              {researchMode && (
                <Select 
                  value={String(researchDepth)} 
                  onValueChange={(value) => setResearchDepth(parseInt(value))}
                >
                  <SelectTrigger className="h-7 text-xs w-28 ml-2">
                    <SelectValue placeholder="Depth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Basic</SelectItem>
                    <SelectItem value="2">Standard</SelectItem>
                    <SelectItem value="3">Deep</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-[10px] text-gray-500">
              {researchMode 
                ? researchDepth === 1 
                  ? "Basic research with quick source analysis"
                  : researchDepth === 2
                  ? "Standard research with thorough source analysis"
                  : "Deep research with comprehensive source analysis and insights" 
                : "Uses web search for real-time information"}
            </p>
          </div>
          
          {/* Deep Research Panel */}
          {showResearchPanel && (
            <div className="max-w-3xl mx-auto px-4 py-4 border-t border-gray-200">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-800 flex items-center">
                  <Search className="h-4 w-4 mr-2 text-blue-500" />
                  Deep Research
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowResearchPanel(false)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
              
              <DeepResearch 
                initialQuery={message}
                onResearchComplete={(results) => {
                  // Add the research results to the chat
                  setShowResearchPanel(false);
                  
                  // Create a custom search preferences object for deep research
                  const deepResearchPrefs = {
                    useDeepResearch: true,
                    researchDepth: 'deep',
                    useCustomResponse: true,
                    customResponse: results
                  };
                  
                  // Send the message to Suna with the custom response
                  sendMessage({
                    message: `/deepresearch ${message}`,
                    model: currentModel,
                    customSearchPrefs: deepResearchPrefs
                  });
                  
                  setMessage(''); // Clear the input
                  
                  // Scroll to bottom after a short delay to ensure messages are rendered
                  setTimeout(scrollToBottom, 100);
                }}
                isEmbedded={true}
              />
            </div>
          )}
          
          {/* Add extra padding at bottom to ensure content isn't hidden behind input */}
          <div className="h-2"></div>
        </div>
      </div>
    </div>
  );
}