import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, ChevronDown, ChevronUp, Globe, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Source {
  title: string;
  url: string;
  domain: string;
  publishedDate?: string;
}

interface ResearchResponseProps {
  content: string;
  sources: Source[];
}

export const ResearchResponse: React.FC<ResearchResponseProps> = ({ content, sources }) => {
  const [showAllSources, setShowAllSources] = useState(false);
  
  // Display first 6 sources, then show more button
  const displaySources = showAllSources ? sources : sources.slice(0, 6);
  const hasMoreSources = sources.length > 6;

  return (
    <div className="space-y-4">
      {/* Main research content with enhanced markdown formatting */}
      <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed space-y-4">
        <ReactMarkdown
          components={{
            h1: ({children}) => (
              <h1 className="text-xl font-bold mt-4 mb-3 text-gray-900 border-b-2 border-blue-500 pb-2">
                {children}
              </h1>
            ),
            h2: ({children}) => (
              <h2 className="text-lg font-semibold mt-6 mb-3 text-gray-900 border-l-4 border-blue-400 pl-3">
                {children}
              </h2>
            ),
            h3: ({children}) => (
              <h3 className="text-base font-semibold mt-4 mb-2 text-gray-900 bg-gray-50 px-3 py-1 rounded">
                {children}
              </h3>
            ),
            h4: ({children}) => (
              <h4 className="text-sm font-semibold mt-3 mb-2 text-gray-800">
                {children}
              </h4>
            ),
            strong: ({children}) => (
              <strong className="font-semibold text-gray-900 bg-yellow-100 px-1 rounded">
                {children}
              </strong>
            ),
            p: ({children}) => (
              <p className="my-2 leading-relaxed text-gray-800">
                {children}
              </p>
            ),
            ul: ({children}) => (
              <ul className="list-disc list-outside my-4 space-y-2 ml-6 text-gray-800">
                {children}
              </ul>
            ),
            ol: ({children}) => (
              <ol className="list-decimal list-outside my-4 space-y-2 ml-6 text-gray-800">
                {children}
              </ol>
            ),
            li: ({children}) => (
              <li className="mb-2 leading-relaxed pl-1">
                {children}
              </li>
            ),
            blockquote: ({children}) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-700 bg-blue-50 py-3 rounded-r">
                {children}
              </blockquote>
            ),
            code: ({children}) => (
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                {children}
              </code>
            ),
            pre: ({children}) => (
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4 text-sm">
                {children}
              </pre>
            ),
            table: ({children}) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  {children}
                </table>
              </div>
            ),
            thead: ({children}) => (
              <thead className="bg-gray-50">
                {children}
              </thead>
            ),
            th: ({children}) => (
              <th className="px-4 py-2 text-left font-semibold text-gray-900 border-b border-gray-200">
                {children}
              </th>
            ),
            td: ({children}) => (
              <td className="px-4 py-2 text-gray-800 border-b border-gray-100">
                {children}
              </td>
            ),
            // Enhanced link formatting to make URLs clickable
            a: ({href, children}) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {children}
                <ExternalLink className="inline w-3 h-3 ml-1" />
              </a>
            ),
            // Let ReactMarkdown handle all text formatting naturally
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Sources section */}
      {sources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              Sources ({sources.length})
            </h4>
          </div>
          
          <div className="grid gap-2">
            {displaySources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors no-underline"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600 mr-3 mt-0.5">
                  {index + 1}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                    {source.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center">
                    <span className="truncate">{source.domain}</span>
                    {source.publishedDate && (
                      <>
                        <Calendar className="w-3 h-3 mx-2" />
                        <span>{source.publishedDate}</span>
                      </>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 ml-2" />
              </a>
            ))}
          </div>

          {hasMoreSources && (
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
            >
              {showAllSources ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show fewer sources
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show {sources.length - 6} more sources
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};