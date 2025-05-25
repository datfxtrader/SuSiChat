import React from 'react';
import { Search, Clock, Copy, Badge } from 'lucide-react';
import { Button } from '../ui/button';

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
  return (
    <div className="group bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 p-6 rounded-2xl hover:border-zinc-700/60 transition-all duration-200 shadow-lg">
      <div className="prose prose-invert max-w-none">
        <div className="space-y-6 text-zinc-200">
          {content.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('# ')) {
              return (
                <h1 key={idx} className="text-2xl font-bold text-zinc-100 mb-4 pb-3 border-b border-zinc-700/50">
                  {paragraph.replace('# ', '')}
                </h1>
              );
            }
            return <p key={idx} className="text-zinc-200 leading-relaxed">{paragraph}</p>;
          })}
        </div>
      </div>

      {sources && sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-zinc-800/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-zinc-300 flex items-center">
              <Search className="w-4 h-4 mr-2 text-blue-400" />
              Research Sources ({sources.length})
            </h4>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1" />
              Verified
            </div>
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