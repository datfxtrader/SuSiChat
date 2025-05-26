
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { useTypewriter } from '@/hooks/useTypewriter';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  renderMarkdown?: boolean;
  showCursor?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 30,
  className = '',
  onComplete,
  renderMarkdown = false,
  showCursor = true
}) => {
  const { displayedText, isTyping, skipToEnd } = useTypewriter(text, {
    speed,
    onComplete
  });

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

  return (
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
    </div>
  );
};
