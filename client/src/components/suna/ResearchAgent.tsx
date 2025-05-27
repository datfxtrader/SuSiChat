import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Bot, Send, Sparkles, Database, Search, FileText, Settings, Zap, Loader2, MessageSquare, User, TrendingUp, AlertCircle, Copy, Share2, Bookmark, Plus, Menu, X, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ProgressDebugger } from '../debug/ProgressDebugger';
import { ModelConfig } from '@/config/models.config';
import ModelSelector from '@/components/shared/ModelSelector';

// ============================================
// CONSTANTS
// ============================================
const RESEARCH_TIMEOUT = 120000; // 2 minutes
const PROGRESS_INTERVAL = 1800;
const COMPLETION_DELAY = 3000;
const TYPEWRITER_SPEED = 30; // ms per character

const PREDEFINED_PROMPTS = [
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

const STAGE_MESSAGES = [
  "Initializing research...",
  "Searching databases...",
  "Analyzing sources...",
  "Cross-referencing data...",
  "Synthesizing insights...",
  "Finalizing report..."
];

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

// ============================================
// UI COMPONENTS
// ============================================
const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${className}`}>
    {children}
  </span>
);

// ============================================
// TYPEWRITER COMPONENT
// ============================================
interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  text, 
  speed = TYPEWRITER_SPEED, 
  onComplete,
  className = ''
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentIndex < text.length) {
      intervalRef.current = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
    } else if (onComplete) {
      onComplete();
    }

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [currentIndex, text, speed, onComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return <div className={className}>{renderContent(displayText)}</div>;
};

// ============================================
// CONTENT RENDERER
// ============================================
const renderContent = (content: string) => {
  return content.split('\n\n').map((paragraph, idx) => {
    // Table rendering
    if (paragraph.includes('|') && paragraph.split('|').length > 2) {
      const lines = paragraph.split('\n').filter(line => line.trim());
      const tableLines = lines.filter(line => line.includes('|') && line.split('|').length > 2);

      if (tableLines.length >= 2) {
        const contentLines = tableLines.filter(line => !line.match(/^\s*\|[\s\-|]+\|\s*$/));

        if (contentLines.length >= 2) {
          const [headerLine, ...dataLines] = contentLines;
          const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
          const rows = dataLines.map(line => 
            line.split('|').map(cell => cell.trim()).filter(cell => cell)
          );

          return (
            <div key={idx} className="my-6 overflow-x-auto rounded-xl shadow-xl">
              <table className="w-full border-collapse bg-zinc-800/40 overflow-hidden">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b-2 border-blue-500/30">
                    {headers.map((header, i) => (
                      <th key={i} className="px-6 py-4 text-left text-zinc-100 font-semibold text-sm uppercase tracking-wide">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-700/30 hover:bg-zinc-700/30 transition-colors">
                      {row.map((cell, j) => (
                        <td key={j} className="px-6 py-4 text-zinc-300 font-mono text-sm">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }
    }

    // Numbered list rendering
    if (/^\d+\.\s/.test(paragraph.trim())) {
      const lines = paragraph.split('\n').filter(line => line.trim());
      const listItems = [];
      let currentItem = '';

      for (const line of lines) {
        if (/^\d+\.\s/.test(line.trim())) {
          if (currentItem) listItems.push(currentItem);
          currentItem = line.trim();
        } else {
          currentItem += ' ' + line.trim();
        }
      }
      if (currentItem) listItems.push(currentItem);

      return (
        <ol key={idx} className="list-none space-y-4 ml-0">
          {listItems.map((item, i) => {
            const match = item.match(/^(\d+)\.\s*(.+)/);
            if (match) {
              const [, number, text] = match;
              const boldMatch = text.match(/^(.+?):\s*(.+)/);

              return (
                <li key={i} className="flex items-start space-x-4 p-4 bg-zinc-800/30 rounded-lg border-l-4 border-blue-500/60 hover:bg-zinc-800/40 transition-colors">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-md">
                    {number}
                  </span>
                  <div className="flex-1 space-y-2">
                    {boldMatch ? (
                      <>
                        <div className="font-semibold text-zinc-100 text-base">{boldMatch[1]}</div>
                        <div className="text-zinc-300 leading-relaxed">{boldMatch[2]}</div>
                      </>
                    ) : (
                      <div className="text-zinc-300 leading-relaxed">{text}</div>
                    )}
                  </div>
                </li>
              );
            }
            return null;
          })}
        </ol>
      );
    }

    // Headers
    if (paragraph.startsWith('# ')) {
      return (
        <h1 key={idx} className="text-2xl font-bold text-zinc-100 mb-4 pb-3 border-b border-zinc-700/50 flex items-center">
          <TrendingUp className="w-6 h-6 mr-3 text-blue-400" />
          {paragraph.replace('# ', '')}
        </h1>
      );
    } else if (paragraph.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-xl font-semibold text-zinc-100 mb-3 mt-8 flex items-center">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3" />
          {paragraph.replace('## ', '')}
        </h2>
      );
    } else if (paragraph.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-lg font-medium text-zinc-100 mb-2 mt-6 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 text-blue-400" />
          {paragraph.replace('### ', '')}
        </h3>
      );
    }

    // Bullet points with bold
    if (paragraph.startsWith('- **') || paragraph.match(/^\s*[-*•]\s*\*\*/)) {
      const titleMatch = paragraph.match(/\*\*(.*?)\*\*/);
      return (
        <div key={idx} className="mb-3 p-4 bg-zinc-800/30 rounded-lg border-l-3 border-blue-500/50 hover:bg-zinc-800/40 transition-colors">
          <div className="font-medium text-zinc-100 mb-2">
            {titleMatch?.[1] || ''}
          </div>
          <div className="text-zinc-300 leading-relaxed">
            {paragraph.replace(/^[\s\-*•]*\*\*(.*?)\*\*:\s*/, '')}
          </div>
        </div>
      );
    }

    // Regular bullet points
    if (paragraph.match(/^[\s]*[-*•]\s+/)) {
      const bulletText = paragraph.replace(/^[\s\-*•]+/, '').trim();
      return (
        <div key={idx} className="flex items-start space-x-3 mb-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
          <div className="text-zinc-300 leading-relaxed flex-1">
            {formatText(bulletText)}
          </div>
        </div>
      );
    }

    // Regular paragraphs
    return (
      <p key={idx} className="text-zinc-200 leading-relaxed">
        {formatText(paragraph)}
      </p>
    );
  });
};

const formatText = (text: string) => {
  return text.split('**').map((part, i) => 
    i % 2 === 1 ? 
      <strong key={i} className="font-semibold text-zinc-100 bg-zinc-800/40 px-1 rounded">{part}</strong> : 
      part
  );
};

// ============================================
// RESEARCH PROGRESS COMPONENT
// ============================================
interface ResearchProgressProps {
  stage: number;
  progress: number;
  query: string;
  isActive: boolean;
}

const ResearchProgress = React.memo<ResearchProgressProps>(({ stage, progress, query, isActive }) => {
  const stageMessage = useMemo(() => STAGE_MESSAGES[Math.min(stage - 1, STAGE_MESSAGES.length - 1)], [stage]);

  return (
    <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
          <Search className="w-4 h-4 text-white animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-100">Researching...</h3>
          <p className="text-xs text-zinc-400 truncate">{query}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-400 font-medium">Stage {stage}/6</span>
          <span className="text-xs text-zinc-400">{Math.round(progress)}%</span>
        </div>

        <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${Math.max(progress, 5)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {isActive && (
          <div className="flex items-center space-x-2 text-xs text-blue-400">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="animate-fade-in">{stageMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
});

// ============================================
// RESEARCH RESPONSE COMPONENT
// ============================================
interface Source {
  title: string;
  url: string;
  domain: string;
}

interface ResearchResponseProps {
  content: string;
  timestamp: string;
  sources?: Source[];
  isLatest?: boolean;
}

const ResearchResponse = React.memo<ResearchResponseProps>(({ 
  content, 
  timestamp, 
  sources, 
  isLatest = false 
}) => {
  const [copySuccess, setCopySuccess] = useState('');
  const [typewriterComplete, setTypewriterComplete] = useState(!isLatest);
  const [showSources, setShowSources] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  }, [content]);

  const handleTypewriterComplete = useCallback(() => {
    setTypewriterComplete(true);
    setShowSources(true);
  }, []);

  useEffect(() => {
    if (isLatest && content && content.length > 0) {
      setTypewriterComplete(false);
      setShowSources(false);
    } else {
      setTypewriterComplete(true);
      setShowSources(true);
    }
  }, [isLatest, content]);

  const contentLength = useMemo(() => content.length, [content]);
  const estimatedReadTime = useMemo(() => Math.ceil(contentLength / 1000), [contentLength]);

  return (
    <div className="group bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-6 rounded-2xl hover:border-zinc-700/60 transition-all duration-200 shadow-lg">
      <div className="flex items-center justify-between mb-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center space-x-3 text-xs text-zinc-400">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>AI Research Assistant</span>
          </div>
          <span>•</span>
          <span>{formatRelativeTime(timestamp)}</span>
          <span>•</span>
          <span>{estimatedReadTime} min read</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            onClick={handleCopy} 
            className="h-7 w-7 p-0 hover:bg-zinc-800/60 bg-transparent border-none text-zinc-400 hover:text-zinc-200"
          >
            {copySuccess ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </Button>
          <Button className="h-7 w-7 p-0 hover:bg-zinc-800/60 bg-transparent border-none text-zinc-400 hover:text-zinc-200">
            <Share2 className="w-3 h-3" />
          </Button>
          <Button className="h-7 w-7 p-0 hover:bg-zinc-800/60 bg-transparent border-none text-zinc-400 hover:text-zinc-200">
            <Bookmark className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="prose prose-invert max-w-none">
        {isLatest && !typewriterComplete ? (
          <TypewriterText
            text={content}
            speed={TYPEWRITER_SPEED}
            onComplete={handleTypewriterComplete}
            className="space-y-6 text-zinc-200"
          />
        ) : (
          <div className="space-y-6 text-zinc-200 animate-fade-in">
            {renderContent(content)}
          </div>
        )}
      </div>

      {sources && sources.length > 0 && showSources && (
        <div className="mt-8 pt-6 border-t border-zinc-800/50 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-zinc-300 flex items-center">
              <Search className="w-4 h-4 mr-2 text-blue-400" />
              Research Sources ({sources.length})
            </h4>
            <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse" />
              Verified
            </Badge>
          </div>
          <div className="grid gap-3">
            {sources.map((source, idx) => (
              <SourceItem key={idx} source={source} index={idx} timestamp={timestamp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================
// SOURCE ITEM COMPONENT
// ============================================
const SourceItem = React.memo(({ source, index, timestamp }: { 
  source: Source; 
  index: number; 
  timestamp: string; 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(source.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [source.url]);

  return (
    <div className="group/source flex items-start space-x-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/40 hover:border-zinc-600/60 hover:bg-zinc-700/50 transition-all duration-200">
      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <a 
          href={source.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-zinc-200 hover:text-blue-400 cursor-pointer transition-colors font-medium text-sm block mb-1"
        >
          [{index + 1}] {source.title}
        </a>
        <div className="flex items-center space-x-3 text-xs text-zinc-500">
          <span>{source.domain}</span>
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatRelativeTime(timestamp)}
          </span>
        </div>
      </div>
      <Button 
        className="h-8 w-8 p-0 opacity-0 group-hover/source:opacity-100 transition-opacity bg-transparent border-none text-zinc-400 hover:text-zinc-200"
        onClick={handleCopyUrl}
      >
        {copied ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </Button>
    </div>
  );
});

// ============================================
// SELECT COMPONENT
// ============================================
const Select = React.memo(({ value, onValueChange }: { 
  value: string; 
  onValueChange: (value: string) => void; 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(() => [
    { value: '1', label: 'Quick (25K)', icon: Zap, color: 'text-yellow-400' },
    { value: '2', label: 'Standard (25K)', icon: Search, color: 'text-blue-400' },
    { value: '3', label: 'Deep (25K)', icon: Database, color: 'text-purple-400' }
  ], []);

  const selectedOption = useMemo(() => 
    options.find(opt => opt.value === value) || options[2]
  , [value, options]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-100 flex items-center space-x-2 hover:bg-zinc-800/70 transition-colors"
      >
        <selectedOption.icon className={`w-4 h-4 ${selectedOption.color}`} />
        <span>{selectedOption.label}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden">
          {options.map(option => (
            <div 
              key={option.value}
              onClick={() => { onValueChange(option.value); setIsOpen(false); }} 
              className="px-4 py-3 hover:bg-zinc-700 cursor-pointer flex items-center space-x-2 transition-colors"
            >
              <option.icon className={`w-4 h-4 ${option.color}`} />
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
  }>;
}

// BelgaCatIcon component (New component)
const BelgaCatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 6 12ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12 6C10.34 6 9 7.34 9 9C9 10.66 10.34 12 12 12C13.66 12 15 10.66 15 9C15 7.34 13.66 6 12 6ZM6 14H18V15H6V14Z" fill="currentColor"/>
  </svg>
);

type LLMModel =
  | "auto"
  | "deepseek-chat"
  | "gemini-1.5-flash"
  | "openrouter/openai/gpt-4o-mini"
  | "openrouter/deepseek/deepseek-r1-distill-llama-70b"
  | "bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0";

export const ResearchAgent = () => {
  const [message, setMessage] = useState('');
  const [researchDepth, setResearchDepth] = useState('3');
  const [selectedModel, setSelectedModel] = useState<LLMModel>('auto');
  const [isSending, setIsSending] = useState(false);
  const [isResearchInProgress, setIsResearchInProgress] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStage, setResearchStage] = useState(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResearchQuery, setCurrentResearchQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Check for stuck research state
  const checkStuckState = useCallback(() => {
    const now = Date.now();
    const savedTimestamp = localStorage.getItem('research_timestamp');

    if (savedTimestamp) {
      const timeDiff = now - parseInt(savedTimestamp);
      if (timeDiff > RESEARCH_TIMEOUT) {
        console.log('🧹 Cleaning up stuck research state');
        localStorage.removeItem('research_state');
        localStorage.removeItem('research_progress');
        localStorage.removeItem('research_query');
        localStorage.removeItem('research_timestamp');
        setIsResearchInProgress(false);
        setResearchProgress(0);
        setCurrentResearchQuery('');
      }
    }
  }, []);

  // Initialize and check stuck state
  useEffect(() => {
    setIsResearchInProgress(false);
    setResearchProgress(0);
    setResearchStage(1);
    setIsSending(false);
    checkStuckState();
  }, [checkStuckState]);

  // Calculate progress stage based on progress
  const calculateStage = useCallback((progress: number) => {
    if (progress >= 85) return 6;
    if (progress >= 70) return 5;
    if (progress >= 50) return 4;
    if (progress >= 30) return 3;
    if (progress >= 15) return 2;
    return 1;
  }, []);

  // Handle progress simulation
  const startProgressSimulation = useCallback(() => {
    progressIntervalRef.current = setInterval(() => {
      setResearchProgress(prev => {
        const baseIncrement = prev < 30 ? Math.random() * 1.2 : 
                             prev < 60 ? Math.random() * 0.8 : 
                             prev < 85 ? Math.random() * 0.5 : 
                             Math.random() * 0.2;

        const newProgress = Math.min(prev + baseIncrement, 95);
        setResearchStage(calculateStage(newProgress));
        return newProgress;
      });
    }, PROGRESS_INTERVAL);
  }, [calculateStage]);

  // Reset research state
  const resetResearchState = useCallback(() => {
    cleanup();
    setIsResearchInProgress(false);
    setResearchProgress(0);
    setResearchStage(1);
    setIsSending(false);
    setCurrentResearchQuery('');
  }, [cleanup]);

  // Create error message
  const createErrorMessage = useCallback((query: string, error: any): Message => ({
    id: Date.now().toString(),
    role: 'assistant' as const,
    content: `# Research Error

I encountered an issue while researching "${query}":

**Error:** ${error.message}

**What you can try:**
1. Check that the backend service is running
2. Verify your internet connection
3. Try a simpler or more specific query
4. Wait a moment and try again

The research service logs show it's working, so this might be a temporary connection issue.`,
    timestamp: new Date().toISOString(),
    sources: []
  }), []);

  // Create fallback message
  const createFallbackMessage = useCallback((query: string): Message => ({
    id: Date.now().toString(),
    role: 'assistant' as const,
    content: `# Research Service Unavailable

I wasn't able to complete research on "${query}" at this time. This might be due to:

- **Backend service issues** - The research service may be starting up
- **Network connectivity problems** - Connection to research APIs failed  
- **Query processing errors** - Try rephrasing your question

**Troubleshooting:**
1. Wait a moment and try again
2. Check that the backend service is running
3. Try a simpler, more specific query
4. Refresh the page if issues persist`,
    timestamp: new Date().toISOString(),
    sources: []
  }), []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isSending || isResearchInProgress) return;

    console.log('🚀 Starting research:', message);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    const queryText = message;
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Set research state
    setIsSending(true);
    setIsResearchInProgress(true);
    setResearchProgress(5);
    setResearchStage(1);
    setCurrentResearchQuery(queryText);

    cleanup();
    startProgressSimulation();

    try {
      console.log('📡 Sending research request to backend...');
      setIsSending(false);

      const response = await fetch('/api/suna-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryText,
          depth: parseInt(researchDepth),
          model: selectedModel
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      console.log('✅ Research API call completed! Report length:', data.report?.length || 0);

      if (data.report && data.report.trim()) {
        console.log('✅ Adding research report to messages');
        const completedMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content: data.report,
          timestamp: new Date().toISOString(),
          sources: data.sources || []
        };

        setMessages(prev => [...prev, completedMessage]);
      } else {
        console.log('⚠️ Empty or missing report, adding fallback message');
        resetResearchState();
        setMessages(prev => [...prev, createFallbackMessage(queryText)]);
      }

    } catch (error) {
      console.error('❌ Research failed:', error);
      resetResearchState();
      setMessages(prev => [...prev, createErrorMessage(queryText, error)]);
    }
  }, [message, isSending, isResearchInProgress, researchDepth, selectedModel, cleanup, startProgressSimulation, resetResearchState, createErrorMessage, createFallbackMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleNewResearch = useCallback(() => {
    console.log('🔄 Starting new research session');
    cleanup();
    setMessages([]);
    resetResearchState();
    setMessage('');
  }, [cleanup, resetResearchState]);

  // Handle research completion
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const hasNewAssistantMessage = lastMessage?.role === 'assistant';
    const hasResearchContent = lastMessage?.content && lastMessage.content.length > 500;
    const isActualResearchReport = hasResearchContent && 
      (lastMessage?.content.includes('# ') || lastMessage?.content.includes('## ') || lastMessage?.sources);

    if (isResearchInProgress && hasNewAssistantMessage && isActualResearchReport && !isSending) {
      console.log(`✅ Research completed - found research report (${lastMessage.content.length} chars)`);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      setResearchProgress(100);
      setResearchStage(6);

      setTimeout(() => {
        resetResearchState();
      }, COMPLETION_DELAY);
    }
  }, [messages, isResearchInProgress, isSending, resetResearchState]);

  // Memoize predefined prompt handler
  const handlePromptSelect = useCallback((prompt: string) => {
    setMessage(prompt);
  }, []);

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
          {messages.length === 0 && !isResearchInProgress && (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-4xl mx-auto px-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <BelgaCatIcon className="w-8 h-8 text-white" />
                </div>

                <h1 className="text-3xl font-bold text-zinc-100 mb-3">
                  Welcome to SuSi Research
                </h1>
                <p className="text-lg text-zinc-400 mb-12">
                  Get comprehensive, AI-powered research on any topic with real-time data
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {PREDEFINED_PROMPTS.map((card, idx) => (
                    <div
                      key={idx}
                      onClick={() => handlePromptSelect(card.prompt)}
                      className="group p-6 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl hover:bg-zinc-800/70 hover:border-zinc-700/70 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                        <card.icon className="w-6 h-6 text-white" />
                      </div>

                      <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                        {card.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={msg.id} className="mb-4">
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <BelgaCatIcon className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1">
                  {msg.role === 'user' ? (
                    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-6 rounded-xl">
                      <div className="prose prose-invert max-w-none">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <ResearchResponse 
                      content={msg.content}
                      timestamp={msg.timestamp}
                      sources={msg.sources}
                      isLatest={index === messages.length - 1}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {isResearchInProgress && (
            <div className="mb-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <BelgaCatIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <ResearchProgress 
                    stage={researchStage}
                    progress={researchProgress}
                    query={currentResearchQuery || "Analyzing..."}
                    isActive={true}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 mb-4">
              <Select value={researchDepth} onValueChange={setResearchDepth} />
              {/* Model Selector */}
                    <ModelSelector
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      category="research"
                      context="research"
                      size="sm"
                      variant="compact"
                      className="w-32"
                    />
            </div>
            <div className="flex items-center space-x-4">
              <Textarea
                ref={textareaRef}
                placeholder="Enter your research query..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-200 placeholder:text-zinc-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-transparent"
                rows={1}
                maxRows={4}
                style={{ height: 'auto', overflowY: 'hidden' }}
              />
              <Button onClick={handleSendMessage} disabled={isSending || isResearchInProgress}>
                {isSending || isResearchInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    <span>Send</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};