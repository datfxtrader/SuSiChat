
// services/search-engines/tavily.ts
import { SearchEngine } from './base';
import { SearchResult, SearchOptions } from '../../../types/search.types';

export class TavilyEngine extends SearchEngine {
  constructor(apiKey: string) {
    super('Tavily', apiKey, 4, 20000);
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.isAvailable()) return [];

    try {
      const response = await this.client.post(
        'https://api.tavily.com/search',
        {
          query,
          search_depth: 'advanced',
          include_answer: true,
          max_results: options.maxResults,
          include_raw_content: false,
          ...(options.filters?.domains && { include_domains: options.filters.domains }),
          ...(options.filters?.excludeDomains && { exclude_domains: options.filters.excludeDomains })
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        }
      );

      const results = response.data.results || [];
      return results.map((result: any, index: number) => this.mapResult(result, index));
    } catch (error) {
      console.error(`[${this.name}] Search error:`, error);
      return [];
    }
  }

  private mapResult(result: any, index: number): SearchResult {
    return {
      title: result.title || 'Untitled',
      url: result.url || '',
      content: result.content || '',
      score: result.relevance_score || (1.0 - index * 0.1),
      source: this.name,
      publishedDate: result.published_date,
      domain: this.extractDomain(result.url),
      relevanceScore: result.relevance_score
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }
}
