/**
 * Enhanced Research Service with Multiple Data Providers
 * Integrates NewsAPI, Wikipedia API, and arXiv API for comprehensive research
 */

import axios from 'axios';

export interface ResearchSource {
  title: string;
  url: string;
  domain: string;
  content?: string;
  type: 'web' | 'news' | 'wikipedia' | 'academic';
  publishedAt?: string;
  summary?: string;
}

export interface EnhancedResearchResult {
  report: string;
  sources: ResearchSource[];
  processingTime: number;
  sourceBreakdown: {
    web: number;
    news: number;
    wikipedia: number;
    academic: number;
  };
}

export class EnhancedFreeResearchService {
  private newsApiKey: string | undefined;

  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY;
  }

  /**
   * Perform comprehensive research using multiple data providers
   */
  async performResearch(query: string): Promise<EnhancedResearchResult> {
    const startTime = Date.now();
    
    console.log(`🔍 Starting enhanced research for: "${query}"`);

    try {
      // Execute searches in parallel for better performance
      const [webResults, newsResults, wikiResults, academicResults] = await Promise.allSettled([
        this.braveSearch(query),
        this.newsSearch(query),
        this.wikipediaSearch(query),
        this.academicSearch(query)
      ]);

      const results = {
        web: webResults.status === 'fulfilled' ? webResults.value : [],
        news: newsResults.status === 'fulfilled' ? newsResults.value : [],
        wiki: wikiResults.status === 'fulfilled' ? wikiResults.value : [],
        academic: academicResults.status === 'fulfilled' ? academicResults.value : []
      };

      return this.synthesizeResults(results, query, startTime);
    } catch (error) {
      console.error('Enhanced research error:', error);
      return {
        report: `# Research Results\n\nI encountered an issue while performing comprehensive research for "${query}". Please try refining your query or check if the necessary API keys are configured.`,
        sources: [],
        processingTime: Date.now() - startTime,
        sourceBreakdown: { web: 0, news: 0, wikipedia: 0, academic: 0 }
      };
    }
  }

  /**
   * Perform Brave web search
   */
  private async braveSearch(query: string): Promise<ResearchSource[]> {
    try {
      // This will integrate with existing Brave search functionality
      // For now, return placeholder structure that can be filled by existing search
      console.log('🌐 Performing Brave web search...');
      return [];
    } catch (error) {
      console.error('Brave search error:', error);
      return [];
    }
  }

  /**
   * Search current news using NewsAPI
   */
  private async newsSearch(query: string): Promise<ResearchSource[]> {
    if (!this.newsApiKey) {
      console.log('📰 NewsAPI key not available, skipping news search');
      return [];
    }

    try {
      console.log('📰 Searching current news...');
      
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          sortBy: 'relevancy',
          language: 'en',
          pageSize: 10,
          apiKey: this.newsApiKey
        },
        timeout: 10000
      });

      if (response.data?.articles) {
        return response.data.articles.map((article: any) => ({
          title: article.title || 'Untitled',
          url: article.url || '',
          domain: this.extractDomain(article.url || ''),
          content: article.description || article.content || '',
          type: 'news' as const,
          publishedAt: article.publishedAt,
          summary: article.description
        })).filter((source: ResearchSource) => source.url);
      }

      return [];
    } catch (error) {
      console.error('NewsAPI search error:', error);
      return [];
    }
  }

  /**
   * Search Wikipedia for background information
   */
  private async wikipediaSearch(query: string): Promise<ResearchSource[]> {
    try {
      console.log('📚 Searching Wikipedia...');
      
      // First, search for relevant articles
      const searchResponse = await axios.get('https://en.wikipedia.org/api/rest_v1/page/opensearch', {
        params: {
          search: query,
          limit: 5
        },
        timeout: 10000
      });

      if (!searchResponse.data || !Array.isArray(searchResponse.data) || searchResponse.data.length < 4) {
        return [];
      }

      const titles = searchResponse.data[1] as string[];
      const descriptions = searchResponse.data[2] as string[];
      const urls = searchResponse.data[3] as string[];

      const results: ResearchSource[] = [];

      // Get content for top 3 articles
      for (let i = 0; i < Math.min(3, titles.length); i++) {
        try {
          const title = titles[i];
          const extractResponse = await axios.get('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title), {
            timeout: 5000
          });

          if (extractResponse.data) {
            results.push({
              title: title,
              url: urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
              domain: 'wikipedia.org',
              content: extractResponse.data.extract || descriptions[i] || '',
              type: 'wikipedia',
              summary: descriptions[i] || extractResponse.data.extract?.substring(0, 200) + '...'
            });
          }
        } catch (extractError) {
          console.error(`Error fetching Wikipedia extract for ${titles[i]}:`, extractError);
        }
      }

      return results;
    } catch (error) {
      console.error('Wikipedia search error:', error);
      return [];
    }
  }

  /**
   * Search academic papers using arXiv API
   */
  private async academicSearch(query: string): Promise<ResearchSource[]> {
    try {
      console.log('🎓 Searching academic papers...');
      
      const response = await axios.get('http://export.arxiv.org/api/query', {
        params: {
          search_query: `all:${query}`,
          start: 0,
          max_results: 5,
          sortBy: 'relevance',
          sortOrder: 'descending'
        },
        timeout: 10000
      });

      if (!response.data) {
        return [];
      }

      // Parse XML response
      const xml = response.data;
      const entries = this.parseArXivXML(xml);

      return entries.map((entry: any) => ({
        title: entry.title || 'Untitled',
        url: entry.id || '',
        domain: 'arxiv.org',
        content: entry.summary || '',
        type: 'academic' as const,
        publishedAt: entry.published,
        summary: entry.summary?.substring(0, 200) + '...'
      }));
    } catch (error) {
      console.error('arXiv search error:', error);
      return [];
    }
  }

  /**
   * Parse arXiv XML response
   */
  private parseArXivXML(xml: string): any[] {
    try {
      // Simple XML parsing for arXiv entries
      const entries: any[] = [];
      const entryMatches = xml.match(/<entry>(.*?)<\/entry>/gs);

      if (entryMatches) {
        entryMatches.forEach(entry => {
          const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
          const idMatch = entry.match(/<id>(.*?)<\/id>/s);
          const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);
          const publishedMatch = entry.match(/<published>(.*?)<\/published>/s);

          entries.push({
            title: titleMatch?.[1]?.trim().replace(/\s+/g, ' '),
            id: idMatch?.[1]?.trim(),
            summary: summaryMatch?.[1]?.trim().replace(/\s+/g, ' '),
            published: publishedMatch?.[1]?.trim()
          });
        });
      }

      return entries;
    } catch (error) {
      console.error('Error parsing arXiv XML:', error);
      return [];
    }
  }

  /**
   * Synthesize results from multiple sources
   */
  private async synthesizeResults(
    results: {
      web: ResearchSource[];
      news: ResearchSource[];
      wiki: ResearchSource[];
      academic: ResearchSource[];
    },
    query: string,
    startTime: number
  ): Promise<EnhancedResearchResult> {
    
    // Combine and prioritize sources
    const sources: ResearchSource[] = [
      ...results.web.slice(0, 5),
      ...results.news.slice(0, 3),
      ...results.wiki.slice(0, 2),
      ...results.academic.slice(0, 2)
    ];

    const sourceBreakdown = {
      web: results.web.length,
      news: results.news.length,
      wikipedia: results.wiki.length,
      academic: results.academic.length
    };

    const report = await this.generateReport(sources, query, sourceBreakdown);

    return {
      report,
      sources,
      processingTime: Date.now() - startTime,
      sourceBreakdown
    };
  }

  /**
   * Generate comprehensive report from multiple sources
   */
  private async generateReport(
    sources: ResearchSource[],
    query: string,
    breakdown: { web: number; news: number; wikipedia: number; academic: number }
  ): Promise<string> {
    
    let report = `# Comprehensive Research: ${query}\n\n`;

    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `Research conducted across ${sources.length} sources from multiple data providers:\n`;
    report += `- **Web Sources**: ${breakdown.web} results\n`;
    report += `- **News Sources**: ${breakdown.news} current articles\n`;
    report += `- **Wikipedia**: ${breakdown.wikipedia} reference articles\n`;
    report += `- **Academic**: ${breakdown.academic} scholarly papers\n\n`;

    // Current News Section
    const newsItems = sources.filter(s => s.type === 'news');
    if (newsItems.length > 0) {
      report += `## Latest News & Developments\n\n`;
      newsItems.forEach((item, index) => {
        report += `### ${index + 1}. ${item.title}\n`;
        report += `${item.summary || item.content}\n`;
        if (item.publishedAt) {
          report += `*Published: ${new Date(item.publishedAt).toLocaleDateString()}*\n\n`;
        }
      });
    }

    // Background Information
    const wikiItems = sources.filter(s => s.type === 'wikipedia');
    if (wikiItems.length > 0) {
      report += `## Background Information\n\n`;
      wikiItems.forEach((item, index) => {
        report += `### ${item.title}\n`;
        report += `${item.content}\n\n`;
      });
    }

    // Academic Research
    const academicItems = sources.filter(s => s.type === 'academic');
    if (academicItems.length > 0) {
      report += `## Academic Research\n\n`;
      academicItems.forEach((item, index) => {
        report += `### ${index + 1}. ${item.title}\n`;
        report += `${item.summary || item.content}\n\n`;
      });
    }

    // Additional Web Sources
    const webItems = sources.filter(s => s.type === 'web');
    if (webItems.length > 0) {
      report += `## Additional Sources\n\n`;
      webItems.slice(0, 3).forEach((item, index) => {
        report += `### ${index + 1}. ${item.title}\n`;
        report += `${item.content || item.summary || 'No description available'}\n\n`;
      });
    }

    // Sources List
    report += `## Sources\n\n`;
    sources.forEach((source, index) => {
      const typeIcon = {
        'news': '📰',
        'wikipedia': '📚',
        'academic': '🎓',
        'web': '🌐'
      }[source.type] || '🔗';
      
      report += `${index + 1}. ${typeIcon} [${source.title}](${source.url}) - ${source.domain}\n`;
    });

    return report;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }
}

export const enhancedResearchService = new EnhancedFreeResearchService();