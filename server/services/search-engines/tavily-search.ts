
import { BaseSearchEngine } from './base-search-engine';
import { SearchOptions, SearchResult } from '../../../types/web-search.types';
import { SEARCH_ENGINE_CONFIGS } from '../../config/search-engines.config';

export class TavilySearchEngine extends BaseSearchEngine {
  constructor(apiKey: string) {
    super('Tavily', apiKey, SEARCH_ENGINE_CONFIGS.tavily);
  }

  async performSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const requestData = {
      api_key: this.apiKey,
      query,
      search_depth: options.searchDepth || 'advanced',
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || [],
      max_results: options.maxResults || 10,
      include_answer: true,
      include_images: false,
      include_raw_content: false
    };

    // Add freshness if specified
    if (options.freshness) {
      requestData.days = this.mapFreshnessToDays(options.freshness);
    }

    const response = await this.client.post(
      'https://api.tavily.com/search',
      requestData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.data?.results) {
      throw new Error('Invalid Tavily response');
    }

    return response.data.results.map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || '',
      description: item.content || '',
      snippet: this.extractSnippet(item.content),
      score: item.score || 0.5,
      publishedDate: item.published_date,
      domain: this.extractDomain(item.url)
    }));
  }

  private mapFreshnessToDays(freshness: string): number {
    const freshnessMap: Record<string, number> = {
      'day': 1,
      'week': 7,
      'month': 30,
      'year': 365
    };
    return freshnessMap[freshness] || 7;
  }

  private extractSnippet(content: string, maxLength = 200): string {
    if (!content) return '';
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }
}
