
// services/search-engines/brave.ts
import { SearchEngine } from './base';
import { SearchResult, SearchOptions } from '../../../types/search.types';

export class BraveEngine extends SearchEngine {
  private readonly freshnessMap: Record<string, string> = {
    'day': 'pd',
    'week': 'pw',
    'month': 'pm',
    'year': 'py'
  };

  constructor(apiKey: string) {
    super('Brave', apiKey, 3, 15000);
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.isAvailable()) return [];

    try {
      const response = await this.client.get('https://api.search.brave.com/res/v1/web/search', {
        params: {
          q: query,
          count: options.maxResults,
          search_lang: options.filters?.language || 'en',
          freshness: this.freshnessMap[options.freshness || 'week'] || 'pw',
          safesearch: options.filters?.safeSearch || 'moderate',
          ...(options.filters?.country && { country: options.filters.country })
        },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.apiKey
        }
      });

      const results = response.data.web?.results || [];
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
      content: result.description || '',
      score: 1.0 - (index * 0.1),
      source: this.name,
      domain: this.extractDomain(result.url),
      thumbnail: result.thumbnail?.src
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
