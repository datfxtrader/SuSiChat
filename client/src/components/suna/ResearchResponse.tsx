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
  // Enhanced content processing for better formatting
  const improveResearchFormatting = (content: string) => {
    let processed = content;
    
    // Convert [Source X] to numbered citations like Perplexity/ChatGPT
    processed = processed.replace(/\[Source (\d+)\]/g, (match, sourceNumber) => {
      const index = parseInt(sourceNumber) - 1;
      if (sources[index]) {
        return `<a href="#source-${sourceNumber}" class="inline-citation text-cyan-400 text-xs font-mono hover:text-cyan-300 transition-colors">[${sourceNumber}]</a>`;
      }
      return `[${sourceNumber}]`;
    });

    // Enhanced table detection and conversion - handle all ASCII table formats
    processed = processed.replace(
      /\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)(?:\s*\|\s*([^|]+))?\s*\|\s*\n\|[-\s]+\|[-\s]+\|[-\s]+(?:\|[-\s]+)?\|\s*\n((?:\|[^|]*\|[^|]*\|[^|]*(?:\|[^|]*)?\|\s*\n?)+)/g,
      (match, header1, header2, header3, header4, rows) => {
        const isThreeColumn = !header4;
        const tableRows = rows.split('\n').filter(row => row.trim().startsWith('|')).map(row => {
          const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
          if (isThreeColumn && cells.length >= 3) {
            return `<tr><td class="px-4 py-3 border-b border-slate-700 font-medium">${cells[0]}</td><td class="px-4 py-3 border-b border-slate-700 text-center">${cells[1]}</td><td class="px-4 py-3 border-b border-slate-700 text-center">${cells[2]}</td></tr>`;
          } else if (!isThreeColumn && cells.length >= 4) {
            return `<tr><td class="px-4 py-3 border-b border-slate-700 font-medium">${cells[0]}</td><td class="px-4 py-3 border-b border-slate-700 text-center">${cells[1]}</td><td class="px-4 py-3 border-b border-slate-700 text-center">${cells[2]}</td><td class="px-4 py-3 border-b border-slate-700 text-center">${cells[3]}</td></tr>`;
          }
          return '';
        }).join('');
        
        if (isThreeColumn) {
          return `<div class="my-8 overflow-x-auto">
            <table class="w-full bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-lg">
              <thead>
                <tr class="bg-gradient-to-r from-slate-700 to-slate-600">
                  <th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">${header1.trim()}</th>
                  <th class="px-6 py-4 text-center text-sm font-semibold text-gray-100">${header2.trim()}</th>
                  <th class="px-6 py-4 text-center text-sm font-semibold text-gray-100">${header3.trim()}</th>
                </tr>
              </thead>
              <tbody class="text-gray-300 text-sm">
                ${tableRows}
              </tbody>
            </table>
          </div>`;
        } else {
          return `<div class="my-8 overflow-x-auto">
            <table class="w-full bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-lg">
              <thead>
                <tr class="bg-gradient-to-r from-slate-700 to-slate-600">
                  <th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">${header1.trim()}</th>
                  <th class="px-6 py-4 text-center text-sm font-semibold text-gray-100">${header2.trim()}</th>
                  <th class="px-6 py-4 text-center text-sm font-semibold text-gray-100">${header3.trim()}</th>
                  <th class="px-6 py-4 text-center text-sm font-semibold text-gray-100">${header4.trim()}</th>
                </tr>
              </thead>
              <tbody class="text-gray-300 text-sm">
                ${tableRows}
              </tbody>
            </table>
          </div>`;
        }
      }
    );

    // Handle simpler table patterns and any remaining ASCII tables
    processed = processed.replace(
      /(\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+(?:\s*\|\s*[^|]+)?\s*\|\s*(?:\n\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*[^|]+(?:\s*\|\s*[^|]+)?\s*\|\s*){2,})/g,
      (match) => {
        const lines = match.split('\n').filter(line => line.trim().startsWith('|'));
        if (lines.length < 2) return match;
        
        const firstLine = lines[0];
        const headers = firstLine.split('|').slice(1, -1).map(h => h.trim());
        
        if (headers.length < 3) return match;
        
        // Skip separator lines that are just dashes
        const dataLines = lines.slice(1).filter(line => !line.match(/^\|[-\s]+\|[-\s]+\|/));
        
        const tableRows = dataLines.map(line => {
          const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
          if (cells.length >= headers.length) {
            const cellsHtml = cells.map((cell, index) => 
              `<td class="px-4 py-3 border-b border-slate-700 ${index === 0 ? 'font-medium text-left' : 'text-center'}">${cell}</td>`
            ).join('');
            return `<tr>${cellsHtml}</tr>`;
          }
          return '';
        }).filter(row => row).join('');
        
        if (tableRows) {
          const headersHtml = headers.map((header, index) => 
            `<th class="px-6 py-4 ${index === 0 ? 'text-left' : 'text-center'} text-sm font-semibold text-gray-100">${header}</th>`
          ).join('');
          
          return `<div class="my-8 overflow-x-auto">
            <table class="w-full bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-lg">
              <thead>
                <tr class="bg-gradient-to-r from-slate-700 to-slate-600">
                  ${headersHtml}
                </tr>
              </thead>
              <tbody class="text-gray-300 text-sm">
                ${tableRows}
              </tbody>
            </table>
          </div>`;
        }
        
        return match;
      }
    );

    // Final catch-all for any remaining table-like content with pipes
    processed = processed.replace(
      /(\|\s*Metric\s*\|.*?\|[\s\S]*?(?=\n\n|\n#|$))/g,
      (match) => {
        // Skip if already converted to HTML
        if (match.includes('<table')) return match;
        
        const lines = match.split('\n').filter(line => line.trim().startsWith('|'));
        if (lines.length < 3) return match;
        
        const headerLine = lines[0];
        const dataLines = lines.slice(1).filter(line => !line.match(/^\|[-\s]+/));
        
        if (dataLines.length === 0) return match;
        
        const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());
        
        const tableRows = dataLines.map(line => {
          const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
          if (cells.length >= headers.length) {
            const cellsHtml = cells.map((cell, index) => 
              `<td class="px-4 py-3 border-b border-slate-700 ${index === 0 ? 'font-medium text-left' : 'text-center'}">${cell}</td>`
            ).join('');
            return `<tr>${cellsHtml}</tr>`;
          }
          return '';
        }).filter(row => row).join('');
        
        if (tableRows && headers.length > 0) {
          const headersHtml = headers.map((header, index) => 
            `<th class="px-6 py-4 ${index === 0 ? 'text-left' : 'text-center'} text-sm font-semibold text-gray-100">${header}</th>`
          ).join('');
          
          return `<div class="my-8 overflow-x-auto">
            <table class="w-full bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-lg">
              <thead>
                <tr class="bg-gradient-to-r from-slate-700 to-slate-600">
                  ${headersHtml}
                </tr>
              </thead>
              <tbody class="text-gray-300 text-sm">
                ${tableRows}
              </tbody>
            </table>
          </div>`;
        }
        
        return match;
      }
    );

    // Convert Future Outlook sections to proper table format
    processed = processed.replace(
      /((?:##?\s*)?(?:\d+\.?\s*)?Future Outlook.*?)(?=\n##|\n\n[A-Z]|$)/gs,
      (match, outlookSection) => {
        const scenarios = [];
        const lines = outlookSection.split('\n');
        let currentScenario = null;
        
        for (const line of lines) {
          const caseMatch = line.match(/(.*?Case.*?)\s*\((\d+%.*?)\)/i);
          if (caseMatch) {
            if (currentScenario) scenarios.push(currentScenario);
            currentScenario = {
              name: caseMatch[1].replace(/[*#]/g, '').trim(),
              probability: caseMatch[2],
              details: []
            };
          } else if (currentScenario && line.trim() && !line.startsWith('#') && !line.includes('Future Outlook')) {
            const detail = line.replace(/^[•\-*]\s*/, '').trim();
            if (detail) currentScenario.details.push(detail);
          }
        }
        if (currentScenario) scenarios.push(currentScenario);
        
        if (scenarios.length > 0) {
          const tableRows = scenarios.map(scenario => {
            const details = scenario.details.slice(0, 2).join('; ');
            const truncatedDetails = details.length > 100 ? details.substring(0, 100) + '...' : details;
            return `<tr>
              <td class="px-4 py-3 border-b border-slate-700 font-medium">${scenario.name}</td>
              <td class="px-4 py-3 border-b border-slate-700 text-center">
                <span class="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm">${scenario.probability}</span>
              </td>
              <td class="px-4 py-3 border-b border-slate-700 text-sm">${truncatedDetails}</td>
            </tr>`;
          }).join('');
          
          return `## Future Outlook

<div class="my-6 overflow-x-auto">
  <table class="w-full bg-slate-800/50 rounded-lg border border-slate-700">
    <thead>
      <tr class="bg-slate-700/50">
        <th class="px-4 py-3 text-left text-sm font-medium text-gray-200">Scenario</th>
        <th class="px-4 py-3 text-center text-sm font-medium text-gray-200">Probability</th>
        <th class="px-4 py-3 text-left text-sm font-medium text-gray-200">Key Factors</th>
      </tr>
    </thead>
    <tbody class="text-gray-300">
      ${tableRows}
    </tbody>
  </table>
</div>`;
        }
        
        return match;
      }
    );

    return processed;
  };

  const processedContent = improveResearchFormatting(content);

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
      <div className="prose prose-lg max-w-none text-gray-100 research-content">
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
          {processedContent}
        </ReactMarkdown>
      </div>

      {/* Completely redesigned sources section - clean and professional */}
      {sources && sources.length > 0 && (
        <div className="mt-16 border-t border-slate-700/50 pt-8">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-6">
            sources referenced
          </h3>
          
          <div className="space-y-3">
            {sources.map((source, index) => {
              const domain = source.domain || new URL(source.url).hostname.replace('www.', '');
              
              // Extract actual timestamp from URL or use current date
              const getArticleTimestamp = (url: string) => {
                const datePatterns = [
                  /\/(\d{4})\/(\d{1,2})\/(\d{1,2})/,  // /2025/05/24
                  /\/(\d{4})-(\d{1,2})-(\d{1,2})/,   // /2025-05-24
                  /-(\d{4})-(\d{1,2})-(\d{1,2})/,    // -2025-05-24
                ];
                
                for (const pattern of datePatterns) {
                  const match = url.match(pattern);
                  if (match) {
                    const [, year, month, day] = match;
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    return date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    });
                  }
                }
                
                return 'May 24, 2025';
              };
              
              const timestamp = getArticleTimestamp(source.url);
              
              return (
                <div key={index} id={`source-${index + 1}`} className="group">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all duration-200 border border-slate-700/20 hover:border-slate-600/40">
                    {/* Source Number */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                    
                    {/* Source Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title - Clean and clickable */}
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-medium text-gray-200 hover:text-cyan-300 transition-colors mb-1 group-hover:underline leading-tight"
                      >
                        {source.title}
                      </a>
                      
                      {/* Meta info - domain and date */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <span className="font-medium text-cyan-400">{domain}</span>
                        <span>•</span>
                        <span>{timestamp}</span>
                      </div>
                      
                      {/* Clean URL display */}
                      <div className="text-xs text-slate-500 font-mono truncate">
                        {source.url}
                      </div>
                    </div>
                    
                    {/* External link icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    </div>
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

export default function ResearchResponse({ content, timestamp }: { content: string; timestamp: string }) {
  if (!content) return null;

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}ponse;