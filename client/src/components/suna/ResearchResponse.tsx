import React from 'react';
import { Search, Clock, Copy, Share2, Bookmark, Bot, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import ReactMarkdown from 'react-markdown';

interface Source {
  title: string;
  url: string;
  domain: string;
}

interface ResearchResponseProps {
  content: string;
  timestamp: string;
  sources?: Source[];
}

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

const ResearchResponse: React.FC<ResearchResponseProps> = ({ content, timestamp, sources }) => {
  // Ensure content is a string and handle potential undefined
  const safeContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  return (
    <div className="group bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-6 rounded-2xl hover:border-zinc-700/60 transition-all duration-200 shadow-lg">
      <div className="flex items-center justify-between mb-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center space-x-3 text-xs text-zinc-400">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span>AI Research Assistant</span>
          </div>
          <span>•</span>
          <span>{formatRelativeTime(timestamp)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-zinc-800/60">
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-zinc-800/60">
            <Share2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-zinc-800/60">
            <Bookmark className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="prose prose-invert max-w-none">
          <ReactMarkdown 
            components={{
              p: ({ children }) => <p className="text-gray-300 leading-relaxed mb-4 last:mb-0 whitespace-pre-wrap">{children}</p>,
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-zinc-100 mb-4 pb-3 border-b border-zinc-700/50 flex items-center">
                  <TrendingUp className="w-6 h-6 mr-3 text-blue-400" />
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold text-zinc-100 mb-3 mt-8 flex items-center">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3" />
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-medium text-zinc-100 mb-2 mt-6 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-blue-400" />
                  {children}
                </h3>
              ),
              ul: ({ children }) => <ul className="list-disc list-inside text-gray-300">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300">{children}</ol>,
              li: ({ children }) => <li className="mb-2">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-zinc-100 bg-zinc-800/40 px-1 rounded">{children}</strong>,
              a: ({ children, href }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-blue-500/50 ml-4 mb-3 p-3 bg-zinc-800/30 rounded-lg">
                  {children}
                </blockquote>
              ),
              code: ({ children, className }) => {
                const language = className?.replace('language-', '');
                return (
                  <pre className="bg-zinc-800/40 rounded-md p-2 overflow-x-auto">
                    <code className={className}>{children}</code>
                  </pre>
                );
              },
            }}
          >
            {safeContent}
          </ReactMarkdown>
      </div>

      {sources && sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-zinc-800/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-zinc-300 flex items-center">
              <Search className="w-4 h-4 mr-2 text-blue-400" />
              Research Sources ({sources.length})
            </h4>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1" />
              Verified
            </Badge>
          </div>
          <div className="grid gap-3">
            {sources.map((source, idx) => (
              <div key={idx} className="group/source flex items-start space-x-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/40 hover:border-zinc-600/60 hover:bg-zinc-700/50 transition-all duration-200">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-zinc-200 hover:text-blue-400 cursor-pointer transition-colors font-medium text-sm block"
                  >
                    {source.title}
                  </a>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="text-xs text-zinc-500">{source.domain}</span>
                    <span className="text-xs text-zinc-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatRelativeTime(timestamp)}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 opacity-0 group-hover/source:opacity-100 transition-opacity"
                  onClick={() => navigator.clipboard.writeText(source.url)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchResponse;