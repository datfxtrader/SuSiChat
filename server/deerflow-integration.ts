// Simplified deerflow integration for testing
export enum ResearchDepth {
  DEPTH_1 = 1,
  DEPTH_2 = 2,
  DEPTH_3 = 3
}

export class DeerFlowIntegration {
  async performDeepResearch(query: string, depth: number = 3) {
    console.log(`🎯 DeerFlow Deep Research called with query: "${query}", depth: ${depth}`);
    
    // Import the web search functionality
    const { performWebSearch } = await import('./performWebSearch');
    
    try {
      console.log('🔍 Starting parallel web search with DuckDuckGo, Brave, and Tavily...');
      const searchResults = await performWebSearch(query, 20);
      
      console.log(`✅ Search completed with ${searchResults.results.length} results`);
      
      // Format the search results into a comprehensive research report
      const report = this.formatSearchResults(query, searchResults, depth);
      const sources = this.extractSources(searchResults);
      
      return {
        report: report,
        sources: sources,
        visualizations: [],
        depth: depth,
        processingTime: Date.now(),
        enhancedWithSuna: true
      };
    } catch (error) {
      console.error('❌ DeerFlow research error:', error);
      return {
        report: `Research service encountered an error. Please try again.`,
        sources: [],
        visualizations: [],
        depth: depth,
        processingTime: 1000,
        enhancedWithSuna: false
      };
    }
  }

  private formatSearchResults(query: string, searchResults: any, depth: number): string {
    const { results } = searchResults;
    
    let report = `# Research Report: ${query}\n\n`;
    
    if (results.length === 0) {
      return report + "No search results found. Please try a different query.";
    }
    
    // Group results by source
    const groupedResults = results.reduce((acc: any, result: any) => {
      const source = result.source || 'Unknown';
      if (!acc[source]) acc[source] = [];
      acc[source].push(result);
      return acc;
    }, {});
    
    // Create comprehensive sections
    report += `## Key Findings\n\n`;
    
    const topResults = results.slice(0, Math.min(8, results.length));
    topResults.forEach((result: any, index: number) => {
      const domain = result.url ? new URL(result.url).hostname : 'Unknown';
      report += `### ${index + 1}. ${result.title}\n`;
      report += `**Source:** [${domain}](${result.url})\n`;
      if (result.content) {
        report += `${result.content.substring(0, 300)}...\n\n`;
      }
    });
    
    // Add source breakdown
    report += `## Sources Analyzed\n\n`;
    Object.keys(groupedResults).forEach(source => {
      report += `- **${source}**: ${groupedResults[source].length} results\n`;
    });
    
    report += `\n## Research Depth: ${depth}\n`;
    report += `**Total Sources:** ${results.length}\n`;
    report += `**Search APIs Used:** DuckDuckGo, Brave Search, Tavily\n`;
    
    return report;
  }

  private extractSources(searchResults: any): any[] {
    return searchResults.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      domain: result.url ? new URL(result.url).hostname : 'Unknown',
      content: result.content || '',
      source: result.source
    }));
  }
}

export const deerflowIntegration = new DeerFlowIntegration();
export const researchService = deerflowIntegration;