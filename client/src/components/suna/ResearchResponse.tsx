import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, BookOpen, BarChart3, TrendingUp, Image as ImageIcon } from 'lucide-react';
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

// Helper functions for chart and image processing
const convertDataToChart = (title: string, data: string): string => {
  const lines = data.trim().split('\n').filter(line => line.trim());
  const dataPoints = lines.map(line => {
    const match = line.match(/([^:]+):\s*([0-9.,%-]+)/);
    if (match) {
      return { label: match[1].trim(), value: match[2].trim() };
    }
    return null;
  }).filter(Boolean);
  
  if (dataPoints.length === 0) return `**${title}**\n\n${data}`;
  
  return `
    <div class="my-8 p-6 bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl border border-slate-700/50 shadow-xl">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
          </svg>
        </div>
        <h4 class="text-lg font-semibold text-gray-200">${title}</h4>
      </div>
      <div class="space-y-4">
        ${dataPoints.map((point: any, index: number) => {
          const percentage = Math.min(100, (index + 1) * (100 / dataPoints.length));
          const isPositive = point.value.includes('+') || (!point.value.includes('-') && point.value.includes('%'));
          const barColor = isPositive ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600';
          
          return `
            <div class="flex items-center gap-4">
              <div class="w-24 text-sm text-gray-300 font-medium">${point.label}</div>
              <div class="flex-1 relative">
                <div class="h-8 bg-slate-700/50 rounded-lg overflow-hidden">
                  <div class="h-full bg-gradient-to-r ${barColor} rounded-lg transition-all duration-1000" 
                       style="width: ${percentage}%"></div>
                </div>
                <div class="absolute right-2 top-1 text-xs font-bold text-white">${point.value}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>`;
};

const createChartEmbed = (url: string): string => {
  return `
    <div class="my-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <span class="text-sm font-medium text-gray-300">Interactive Chart</span>
      </div>
      <a href="${url}" target="_blank" rel="noopener noreferrer" 
         class="block p-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-colors">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-blue-400 font-medium">View Chart</div>
            <div class="text-xs text-gray-400 mt-1">Click to open interactive chart</div>
          </div>
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </div>
      </a>
    </div>`;
};

const convertTableToVisualChart = (tableText: string): string => {
  const lines = tableText.split('\n').filter(line => line.includes('|'));
  if (lines.length < 3) return tableText;
  
  const headerRow = lines[0];
  const dataRows = lines.slice(1).filter(line => !line.match(/^[\s\-|]+$/));
  
  if (headerRow.toLowerCase().includes('price') || headerRow.toLowerCase().includes('level')) {
    const chartData = dataRows.map(row => {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      return cells;
    }).filter(row => row.length >= 2);
    
    return `
      <div class="my-8 p-6 bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl border border-slate-700/50 shadow-xl">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
          </div>
          <h4 class="text-lg font-semibold text-gray-200">Price Levels</h4>
        </div>
        <div class="space-y-3">
          ${chartData.map((row: any) => `
            <div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span class="text-gray-300 font-medium">${row[0]}</span>
              <span class="text-cyan-400 font-mono font-bold">${row[1]}</span>
              ${row[2] ? `<span class="text-sm text-gray-400">${row[2]}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>`;
  }
  
  return tableText;
};

const formatTrendIndicator = (indicator: string): string => {
  const isPositive = indicator.includes('↑') || indicator.includes('⬆') || indicator.includes('▲') || indicator.includes('+');
  const color = isPositive ? 'text-green-400' : 'text-red-400';
  const bgColor = isPositive ? 'bg-green-500/20' : 'bg-red-500/20';
  const borderColor = isPositive ? 'border-green-500/30' : 'border-red-500/30';
  
  return `<span class="inline-flex items-center px-2 py-1 rounded-md ${color} ${bgColor} border ${borderColor} text-sm font-bold">${indicator}</span>`;
};

const ResearchResponse: React.FC<ResearchResponseProps> = ({ content, sources = [] }) => {
  // FIXED: Enhanced content processing with chart/image support and proper source citation formatting
  const improveResearchFormatting = (content: string) => {
    let processed = content;
    
    console.log('🖼️ Processing content for charts and images...');
    
    // STEP 0: Enhanced image and chart processing
    // Convert various image formats to proper markdown
    processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      console.log('🖼️ Found image:', alt, src);
      const cleanSrc = src.trim();
      const cleanAlt = alt.trim() || 'Research Chart';
      return `![${cleanAlt}](${cleanSrc})`;
    });
    
    // Convert chart descriptions to visual representations
    processed = processed.replace(
      /(?:Chart|Graph|Figure)\s*\d*:?\s*([^\n]+)\n((?:[\w\s]+:\s*[\d.%$€£¥,]+\s*\n?){3,})/gi,
      (match, title, data) => {
        console.log('📊 Found chart data:', title);
        return convertDataToChart(title, data);
      }
    );
    
    // Handle chart URLs (TradingView, etc.)
    processed = processed.replace(
      /(https?:\/\/[^\s]+(?:tradingview|investing|yahoo|marketwatch)[^\s]*chart[^\s]*)/gi,
      (match, url) => {
        console.log('📈 Found chart URL:', url);
        return createChartEmbed(url);
      }
    );
    
    // Convert tabular data to visual charts
    processed = processed.replace(
      /\|\s*(?:Price|Level|Support|Resistance|Target)[^\n]+\|\s*\n(?:\|[^\n]+\|\s*\n?){3,}/gi,
      (match) => {
        if (match.includes('<table')) return match;
        console.log('📊 Converting table to visual chart');
        return convertTableToVisualChart(match);
      }
    );
    
    // Format trend indicators
    processed = processed.replace(
      /(↑|↓|⬆|⬇|▲|▼|\+\d+%|-\d+%)/g,
      (indicator) => formatTrendIndicator(indicator)
    );
    
    // STEP 1: Clean up messy source references first
    // Remove broken or malformed source patterns
    processed = processed.replace(/\[Source\s*[^\]]*\]\s*\[Source\s*[^\]]*\]/g, '');
    processed = processed.replace(/\[\s*\]/g, '');
    processed = processed.replace(/\[Source\s*\]/g, '');
    
    // STEP 2: Standardize source citations to clean format
    // Convert various source formats to standard [1], [2], etc.
    processed = processed.replace(/\[Source\s*(\d+)\]/gi, '[$1]');
    processed = processed.replace(/\(Source\s*(\d+)\)/gi, '[$1]');
    processed = processed.replace(/Source\s*(\d+):/gi, '[$1]');
    processed = processed.replace(/\[(\d+)\s*\]/g, '[$1]');
    
    // STEP 3: Create clean inline citations with proper styling
    processed = processed.replace(/\[(\d+)\]/g, (match, sourceNumber) => {
      const index = parseInt(sourceNumber) - 1;
      if (sources[index]) {
        return `<sup><a href="#source-${sourceNumber}" class="inline-citation bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-medium hover:bg-cyan-500/30 transition-colors border border-cyan-500/30 no-underline">${sourceNumber}</a></sup>`;
      }
      return `<sup><span class="text-slate-400 text-xs">${sourceNumber}</span></sup>`;
    });

    // STEP 4: Clean up multiple spaces and line breaks around citations
    processed = processed.replace(/\s+<sup>/g, '<sup>');
    processed = processed.replace(/<\/sup>\s+/g, '</sup> ');
    processed = processed.replace(/\.\s*<sup>/g, '.<sup>');
    processed = processed.replace(/,\s*<sup>/g, ',<sup>');

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

      {/* COMPLETELY REDESIGNED: Clean and organized sources section */}
      {sources && sources.length > 0 && (
        <div className="mt-16 border-t border-slate-700/50 pt-12">
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-200 mb-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-white" />
              </div>
              Research Sources
            </h3>
            <p className="text-sm text-slate-400">
              {sources.length} source{sources.length !== 1 ? 's' : ''} referenced in this analysis
            </p>
          </div>
          
          <div className="grid gap-4">
            {sources.map((source, index) => {
              // Clean up source title and URL
              const cleanTitle = source.title?.trim() || `Source ${index + 1}`;
              const cleanUrl = source.url?.trim() || '#';
              const domain = source.domain || (() => {
                try {
                  return new URL(cleanUrl).hostname.replace('www.', '');
                } catch {
                  return 'Unknown Source';
                }
              })();
              
              // Extract timestamp from URL
              const getArticleTimestamp = (url: string) => {
                const datePatterns = [
                  /\/(\d{4})\/(\d{1,2})\/(\d{1,2})/,
                  /\/(\d{4})-(\d{1,2})-(\d{1,2})/,
                  /-(\d{4})-(\d{1,2})-(\d{1,2})/,
                  /(\d{4})[-_](\d{1,2})[-_](\d{1,2})/,
                ];
                
                for (const pattern of datePatterns) {
                  const match = url.match(pattern);
                  if (match) {
                    const [, year, month, day] = match;
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    if (!isNaN(date.getTime()) && date.getFullYear() >= 2020) {
                      return date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      });
                    }
                  }
                }
                
                return 'May 24, 2025';
              };
              
              const timestamp = getArticleTimestamp(cleanUrl);
              
              return (
                <div key={index} id={`source-${index + 1}`} className="group">
                  <div className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-r from-slate-800/60 to-slate-700/40 hover:from-slate-700/70 hover:to-slate-600/50 transition-all duration-300 border border-slate-600/30 hover:border-cyan-500/40 shadow-lg hover:shadow-xl backdrop-blur-sm">
                    {/* Enhanced Source Number */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {index + 1}
                      </div>
                    </div>
                    
                    {/* Enhanced Source Content */}
                    <div className="flex-1 min-w-0">
                      {/* Clean Title with better typography */}
                      <a
                        href={cleanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-base font-semibold text-gray-100 hover:text-cyan-300 transition-colors mb-2 group-hover:underline leading-normal line-clamp-2"
                      >
                        {cleanTitle}
                      </a>
                      
                      {/* Enhanced Meta info */}
                      <div className="flex items-center gap-3 text-sm text-slate-300 mb-3">
                        <span className="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-xs font-medium">
                          {domain}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400">{timestamp}</span>
                      </div>
                      
                      {/* Clean URL with better styling */}
                      <div className="text-xs text-slate-500 font-mono bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50 truncate">
                        {cleanUrl}
                      </div>
                    </div>
                    
                    {/* Enhanced External link icon */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="p-2 rounded-lg bg-slate-700/40 group-hover:bg-cyan-500/20 transition-colors">
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                      </div>
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

export default ResearchResponse;