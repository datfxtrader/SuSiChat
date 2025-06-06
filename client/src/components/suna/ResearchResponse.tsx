import React, { useState, useEffect, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Bot, Send, Sparkles, Database, Search, FileText, Settings, Zap, Loader2, MessageSquare, User, TrendingUp, AlertCircle, Copy, Share2, Bookmark, Plus, Menu, X, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { TypewriterText } from '@/components/shared/TypewriterText';
import { TypewriterConfig } from '@/config/typewriter.config';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui/badge';

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

const formatText = (text: string) => {
  return text.split('**').map((part, i) => 
    i % 2 === 1 ? 
      <strong key={i} className="font-semibold text-zinc-100 bg-zinc-800/40 px-1 rounded">{part}</strong> : 
      part
  );
};

// ============================================
// CONTENT RENDERER
// ============================================
const renderContent = (content: string) => {
  return content.split('\n\n').map((paragraph, idx) => {
    // Table rendering with enhanced styling
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

    // Enhanced numbered list rendering
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
                        <div className="text-zinc-300 leading-relaxed">
                          {boldMatch[2].split('\n').map((line, lineIdx) => {
                            // Handle bullet points within numbered items
                            if (line.trim().startsWith('•') || line.trim().startsWith('*')) {
                              const bulletText = line.replace(/^[\s•*]+/, '').trim();
                              return (
                                <div key={lineIdx} className="flex items-start space-x-2 ml-4 my-2">
                                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                                  <span>{bulletText}</span>
                                </div>
                              );
                            }
                            return line && <div key={lineIdx} className="mb-1">{line}</div>;
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-zinc-300 leading-relaxed">
                        {text.split('\n').map((line, lineIdx) => {
                          if (line.trim().startsWith('•') || line.trim().startsWith('*')) {
                            const bulletText = line.replace(/^[\s•*]+/, '').trim();
                            return (
                              <div key={lineIdx} className="flex items-start space-x-2 ml-4 my-2">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                                <span>{bulletText}</span>
                              </div>
                            );
                          }
                          return line && <div key={lineIdx} className="mb-1">{line}</div>;
                        })}
                      </div>
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

    // Enhanced headers with icons
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

    // Enhanced bullet points with bold titles
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
// MAIN COMPONENT
// ============================================
const ResearchResponse: React.FC<ResearchResponseProps> = ({ 
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
    console.log('🎬 Typewriter animation completed');
    setTypewriterComplete(true);
    setShowSources(true);
  }, []);

  // Reset typewriter state when isLatest changes
  useEffect(() => {
    if (isLatest && content && content.length > 0) {
      console.log('🎬 Starting typewriter animation for latest message', content.length, 'chars');
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
            <span>SuSi Research</span>
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
            speed={TypewriterConfig.responseTypes.research.speed}
            renderMarkdown={true}
            onComplete={handleTypewriterComplete}
            enableSound={true}
            robust={true}
            showProgress={content.length > 1500}
            className="space-y-6 text-zinc-200"
          />
        ) : (
          <div className="space-y-6 text-zinc-200 animate-fade-in">
            {renderContent(content)}
          </div>
        )}
      </div>

      {sources && sources.length > 0 && (
        <AnimatePresence>
          {showSources && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8 pt-6 border-t border-zinc-800/50"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ResearchResponse;