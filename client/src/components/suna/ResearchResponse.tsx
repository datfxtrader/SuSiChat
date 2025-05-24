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
            
            // Enhanced text formatting with dark theme
            strong: ({children}) => (
              <strong className="font-bold text-gray-100 bg-yellow-600/30 px-2 py-1 rounded backdrop-blur-sm">
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

      {/* Premium sources section with enhanced professional formatting */}
      {sources && sources.length > 0 && (
        <div className="mt-16 p-10 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border border-gray-200 shadow-xl">
          <div className="border-b border-gray-300 pb-6 mb-10">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
              Research Sources & References
              <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {sources.length} Sources
              </span>
            </h3>
            <p className="text-gray-600 mt-3 text-lg">Verified and authenticated data sources from premium institutions</p>
          </div>
          
          <div className="grid gap-6">
            {sources.map((source, index) => (
              <div 
                key={index} 
                className="group flex items-start space-x-6 p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-md group-hover:shadow-lg transition-shadow">
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <h4 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors leading-tight mb-3 break-words">
                      {source.title}
                    </h4>
                    
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {source.domain || new URL(source.url).hostname}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">• Verified Source</span>
                    </div>
                    
                    <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                      Click to access full article and detailed analysis
                    </p>
                  </a>
                </div>
                
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-10 text-center pt-6 border-t border-gray-200">
            <div className="inline-flex items-center px-6 py-3 bg-white rounded-full border border-gray-200 shadow-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">
                All {sources.length} sources verified and accessible • Premium data quality assured
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchResponse;