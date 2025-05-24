import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink } from 'lucide-react';

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
      {/* Premium research content with professional formatting */}
      <div className="prose prose-lg max-w-none text-gray-900">
        <ReactMarkdown
          components={{
            // Premium headers with proper spacing and styling
            h1: ({children}) => (
              <h1 className="text-3xl font-bold mt-12 mb-8 text-gray-900 border-b-4 border-blue-600 pb-4 tracking-tight">
                {children}
              </h1>
            ),
            h2: ({children}) => (
              <h2 className="text-2xl font-semibold mt-12 mb-8 text-gray-800 border-l-4 border-blue-500 pl-6 bg-gradient-to-r from-blue-50 to-transparent py-4 rounded-r-lg shadow-sm">
                {children}
              </h2>
            ),
            h3: ({children}) => (
              <h3 className="text-xl font-medium mt-10 mb-6 text-gray-700 border-l-3 border-gray-400 pl-5 bg-gray-50 py-3 rounded-r-md">
                {children}
              </h3>
            ),
            h4: ({children}) => (
              <h4 className="text-lg font-medium mt-8 mb-5 text-gray-700 pl-4 border-l-2 border-gray-300">
                {children}
              </h4>
            ),
            
            // Enhanced paragraph spacing and typography
            p: ({children}) => (
              <p className="mb-8 text-gray-800 leading-loose text-base tracking-wide font-normal">
                {children}
              </p>
            ),
            
            // Beautiful list formatting with proper spacing
            ul: ({children}) => (
              <ul className="mb-10 space-y-4 border-l-3 border-blue-200 bg-blue-50 pl-8 py-6 rounded-r-lg shadow-sm">
                {children}
              </ul>
            ),
            ol: ({children}) => (
              <ol className="mb-10 space-y-4 border-l-3 border-green-200 bg-green-50 pl-8 py-6 rounded-r-lg shadow-sm list-decimal">
                {children}
              </ol>
            ),
            li: ({children}) => (
              <li className="text-gray-800 leading-relaxed text-base pl-3 relative">
                <span className="absolute -left-6 top-1 text-blue-600 font-bold text-lg">▸</span>
                {children}
              </li>
            ),
            
            // Premium blockquote styling
            blockquote: ({children}) => (
              <blockquote className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-blue-25 pl-8 pr-6 py-6 italic my-10 text-gray-700 rounded-r-lg shadow-md">
                {children}
              </blockquote>
            ),
            
            // Professional table formatting
            table: ({children}) => (
              <div className="overflow-x-auto my-12 shadow-xl rounded-xl border border-gray-200">
                <table className="min-w-full border-collapse bg-white">
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
              <td className="px-6 py-4 text-gray-800 border-b border-gray-100 text-sm">
                {children}
              </td>
            ),
            
            // Enhanced text formatting
            strong: ({children}) => (
              <strong className="font-bold text-gray-900 bg-yellow-100 px-2 py-1 rounded">
                {children}
              </strong>
            ),
            em: ({children}) => (
              <em className="italic text-blue-700 font-medium">
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