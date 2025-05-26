
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useTypewriterWithSound } from '@/hooks/useTypewriterWithSound';
import { useRobustTypewriter } from '@/hooks/useRobustTypewriter';
import { TypewriterErrorBoundary } from './TypewriterErrorBoundary';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  renderMarkdown?: boolean;
  showCursor?: boolean;
  enableSound?: boolean;
  robust?: boolean;
  showProgress?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 30,
  className = '',
  onComplete,
  renderMarkdown = false,
  showCursor = true,
  enableSound = false,
  robust = false,
  showProgress = false
}) => {
  // Choose appropriate hook based on options
  const typewriterHook = robust 
    ? useRobustTypewriter 
    : enableSound 
      ? useTypewriterWithSound 
      : useTypewriter;

  const result = typewriterHook(text, {
    speed,
    onComplete,
    ...(enableSound && { enableSound: true })
  });

  const { displayedText, isTyping, skipToEnd, error, retry, progress } = result;

  const content = useMemo(() => {
    if (renderMarkdown) {
      return (
        <ReactMarkdown
          className="prose prose-sm max-w-none prose-invert"
          components={{
            // Custom components to handle links, code blocks, etc.
            a: ({ children, href }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                {children}
              </a>
            ),
            code: ({ inline, children }) => (
              inline ? 
                <code className="px-1 py-0.5 bg-zinc-800 rounded text-sm text-zinc-200">{children}</code> :
                <pre className="bg-zinc-800 p-3 rounded-lg overflow-x-auto">
                  <code className="text-zinc-200">{children}</code>
                </pre>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-zinc-100">{children}</strong>
            ),
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-zinc-100 mb-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold text-zinc-100 mb-3">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-medium text-zinc-100 mb-2">{children}</h3>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-1 text-zinc-200">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-1 text-zinc-200">{children}</ol>
            ),
            p: ({ children }) => (
              <p className="text-zinc-200 leading-relaxed mb-3">{children}</p>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-zinc-600 pl-4 my-4 italic text-zinc-300">
                {children}
              </blockquote>
            )
          }}
        >
          {displayedText}
        </ReactMarkdown>
      );
    }
    return <span className="text-zinc-200">{displayedText}</span>;
  }, [displayedText, renderMarkdown]);

  // Handle errors for robust mode
  if (robust && error) {
    return (
      <div className={`relative ${className}`}>
        <div className="text-zinc-200">{text}</div>
        <button
          onClick={retry}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
        >
          Retry Animation
        </button>
      </div>
    );
  }

  return (
    <TypewriterErrorBoundary fallbackComponent={<div className={className}>{text}</div>}>
      <div className={`relative ${className}`}>
        <div onDoubleClick={skipToEnd} className="cursor-text">
          {content}
          {showCursor && isTyping && (
            <motion.span
              className="inline-block w-0.5 h-5 bg-zinc-200 ml-0.5"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
        
        {/* Progress indicator for long texts */}
        {showProgress && text.length > 1000 && isTyping && progress !== undefined && (
          <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
        
        {/* Skip hint for long content */}
        {isTyping && text.length > 500 && (
          <div className="absolute -bottom-6 left-0 text-xs text-gray-500 opacity-0 hover:opacity-100 transition-opacity">
            Double-click to skip animation
          </div>
        )}
      </div>
    </TypewriterErrorBoundary>
  );
};
