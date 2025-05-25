import axios from 'axios';

interface ResearchResult {
  content: string;
  sources: string[];
  success: boolean;
}

export class EnhancedResearchFallback {
  private braveApiKey: string;
  private tavilyApiKey: string;

  constructor() {
    this.braveApiKey = process.env.BRAVE_API_KEY || '';
    this.tavilyApiKey = process.env.TAVILY_API_KEY || '';
  }

  async performResearch(query: string): Promise<ResearchResult> {
    console.log(`🔍 Starting enhanced research with authentic data sources for: ${query}`);
    
    try {
      // Use Brave Search for comprehensive web results
      const braveResults = await this.searchWithBrave(query);
      
      // Use Tavily for additional research context
      const tavilyResults = await this.searchWithTavily(query);
      
      // Combine results for comprehensive analysis
      const combinedContent = this.analyzeResults(query, braveResults, tavilyResults);
      
      return {
        content: combinedContent,
        sources: [...braveResults.sources, ...tavilyResults.sources],
        success: true
      };
      
    } catch (error) {
      console.error('Enhanced research error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: `I encountered an error while performing research: ${errorMessage}`,
        sources: [],
        success: false
      };
    }
  }

  private async searchWithBrave(query: string) {
    if (!this.braveApiKey) {
      throw new Error('Brave API key not configured');
    }

    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count: 10,
        search_lang: 'en',
        freshness: 'pd3', // Past 3 days for current data
        safesearch: 'moderate'
      },
      headers: {
        'X-Subscription-Token': this.braveApiKey,
        'Accept': 'application/json'
      }
    });

    const results = response.data.web?.results || [];
    return {
      results: results.slice(0, 5),
      sources: results.slice(0, 5).map((r: any) => r.url)
    };
  }

  private async searchWithTavily(query: string) {
    if (!this.tavilyApiKey) {
      throw new Error('Tavily API key not configured');
    }

    const response = await axios.post('https://api.tavily.com/search', {
      api_key: this.tavilyApiKey,
      query: query,
      search_depth: 'advanced',
      include_answer: true,
      include_domains: [],
      exclude_domains: [],
      max_results: 5
    });

    const results = response.data.results || [];
    return {
      results: results,
      sources: results.map((r: any) => r.url)
    };
  }

  private analyzeResults(query: string, braveResults: any, tavilyResults: any): string {
    const currentDate = new Date().toLocaleDateString();
    
    let analysis = `# Market Analysis Research Report\n`;
    analysis += `**Query:** ${query}\n`;
    analysis += `**Date:** ${currentDate}\n`;
    analysis += `**Data Sources:** Brave Search API, Tavily Research API\n\n`;

    // Brave Search Analysis
    if (braveResults.results.length > 0) {
      analysis += `## Current Market Information\n\n`;
      braveResults.results.forEach((result: any, index: number) => {
        analysis += `### ${index + 1}. ${result.title}\n`;
        analysis += `${result.description}\n`;
        analysis += `**Source:** [${result.url}](${result.url})\n\n`;
      });
    }

    // Tavily Research Analysis  
    if (tavilyResults.results.length > 0) {
      analysis += `## Advanced Research Insights\n\n`;
      tavilyResults.results.forEach((result: any, index: number) => {
        analysis += `### Research Finding ${index + 1}\n`;
        analysis += `**Title:** ${result.title}\n`;
        analysis += `**Content:** ${result.content}\n`;
        analysis += `**Source:** [${result.url}](${result.url})\n\n`;
      });
    }

    analysis += `## Summary\n\n`;
    analysis += `Based on the latest data from multiple authentic sources, this analysis provides current market insights for ${query}. `;
    analysis += `All information is sourced from real-time web data and verified research APIs.\n\n`;
    
    analysis += `**Research completed:** ${new Date().toLocaleString()}\n`;
    analysis += `**Total sources analyzed:** ${braveResults.sources.length + tavilyResults.sources.length}`;

    return analysis;
  }
}