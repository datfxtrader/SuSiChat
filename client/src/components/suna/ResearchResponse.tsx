import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, BookOpen } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

interface ResearchResponseProps {
  content: string;
  sources?: Array<{
    title: string;
    url: string;
    domain?: string;
  }>;
}

const ResearchResponse: React.FC<ResearchResponseProps> = ({ content, sources = [] }) => {
  // Transform content to make inline citations clickable and numbered
  const processedContent = content.replace(/\[Source (\d+)\]/g, (match, sourceNumber) => {
    const index = parseInt(sourceNumber) - 1;
    if (sources[index]) {
      return `<a href="#source-${sourceNumber}" class="inline-citation text-cyan-400 text-xs font-mono hover:text-cyan-300 transition-colors">[${sourceNumber}]</a>`;
    }
    return `[${sourceNumber}]`;
  });

  return (
    <div className="space-y-8 max-w-none">
      {/* Blog View Link */}
      <div className="flex justify-end mb-4">
        <Link to="/research-blog">
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="w-4 h-4" />
            View in Blog Format
          </Button>
        </Link>
      </div>
      {/* Premium research content with dark theme formatting */}
      <div className="prose prose-lg max-w-none text-gray-100">
        <ReactMarkdown
          components={{
            // Premium headers with dark theme styling
            h1: ({children}) => (
              <h1 className="text-3xl font-bold mt-12 mb-8 text-gray-100 border-b-4 border-blue-400 pb-4 tracking-tight">
                {children}
              </h1>
            ),
            h2: ({children}) => (
              <h2 className="text-2xl font-semibold mt-12 mb-8 text-gray-200 border-l-4 border-blue-400 pl-6 bg-gradient-to-r from-slate-800/60 to-transparent py-4 rounded-r-lg shadow-sm backdrop-blur-sm">
                {children}
              </h2>
            ),
            h3: ({children}) => (
              <h3 className="text-xl font-medium mt-10 mb-6 text-gray-300 border-l-3 border-slate-500 pl-5 bg-slate-800/40 py-3 rounded-r-md backdrop-blur-sm">
                {children}
              </h3>
            ),
            h4: ({children}) => (
              <h4 className="text-lg font-medium mt-8 mb-5 text-gray-300 pl-4 border-l-2 border-slate-600">
                {children}
              </h4>
            ),
            
            // Enhanced paragraph spacing and typography with dark theme
            p: ({children}) => (
              <p className="mb-8 text-gray-300 leading-loose text-base tracking-wide font-normal">
                {children}
              </p>
            ),
            
            // Clean list formatting without vertical lines
            ul: ({children}) => (
              <ul className="mb-8 space-y-3 bg-slate-800/20 pl-6 py-4 rounded-lg">
                {children}
              </ul>
            ),
            ol: ({children}) => (
              <ol className="mb-8 space-y-3 bg-slate-800/20 pl-6 py-4 rounded-lg list-decimal">
                {children}
              </ol>
            ),
            li: ({children}) => (
              <li className="text-gray-300 leading-relaxed text-base relative">
                <span className="absolute -left-4 top-1 text-cyan-400 font-bold text-sm">•</span>
                {children}
              </li>
            ),
            
            // Premium blockquote styling with dark theme
            blockquote: ({children}) => (
              <blockquote className="border-l-4 border-blue-400 bg-gradient-to-r from-slate-800/50 to-slate-700/30 pl-8 pr-6 py-6 italic my-10 text-gray-300 rounded-r-lg shadow-md backdrop-blur-sm">
                {children}
              </blockquote>
            ),
            
            // Professional table formatting with dark theme
            table: ({children}) => (
              <div className="overflow-x-auto my-12 shadow-xl rounded-xl border border-slate-600">
                <table className="min-w-full border-collapse bg-slate-800/50 backdrop-blur-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({children}) => (
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                {children}
              </thead>
            ),
            th: ({children}) => (
              <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider border-b border-blue-500">
                {children}
              </th>
            ),
            td: ({children}) => (
              <td className="px-6 py-4 text-gray-300 border-b border-slate-600 text-sm">
                {children}
              </td>
            ),
            
            // Enhanced text formatting with high contrast highlighting
            strong: ({children}) => (
              <strong className="font-bold text-white bg-cyan-500/40 px-2 py-1 rounded shadow-sm border border-cyan-400/30">
                {children}
              </strong>
            ),
            em: ({children}) => (
              <em className="italic text-blue-400 font-medium">
                {children}
              </em>
            ),
            
            // Premium link styling
            a: ({href, children}) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 hover:decoration-blue-800 transition-all duration-200 font-medium"
              >
                {children}
                <ExternalLink className="inline w-3 h-3 ml-1" />
              </a>
            ),
            
            // Code formatting
            code: ({children}) => (
              <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono border">
                {children}
              </code>
            ),
            pre: ({children}) => (
              <pre className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto my-8 shadow-lg">
                {children}
              </pre>
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Clean sources section with minimal design */}
      {sources && sources.length > 0 && (
        <div className="mt-12 p-6 bg-slate-800/20 rounded-lg border border-slate-700/30">
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
            <ExternalLink className="w-4 h-4 mr-2" />
            sources used
          </h3>
          
          <div className="space-y-3">
            {sources.map((source, index) => {
              // Extract timestamp if available, otherwise use current date
              const getTimestamp = (url: string) => {
                // Try to extract date from URL patterns common in news sites
                const dateMatch = url.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
                if (dateMatch) {
                  const [, year, month, day] = dateMatch;
                  return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
                }
                // Default to current date if no date found
                return "may 24, 2025";
              };
              
              const domain = source.domain || new URL(source.url).hostname.replace('www.', '');
              const timestamp = getTimestamp(source.url);
              
              return (
                <div key={index} className="flex items-start space-x-3 text-sm">
                  <span className="text-cyan-400 font-mono text-xs mt-0.5">[{index + 1}]</span>
                  <div className="flex-1">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-cyan-400 transition-colors lowercase font-normal"
                    >
                      {source.title.toLowerCase()}
                    </a>
                    <span className="text-gray-500 ml-2">
                      • {domain} • {timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchResponse;