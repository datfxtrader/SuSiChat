
import { BaseSearchEngine } from './base-search-engine';
import { SearchOptions, SearchResult } from '../../../types/web-search.types';
import { SEARCH_ENGINE_CONFIGS } from '../../config/search-engines.config';

export class BraveSearchEngine extends BaseSearchEngine {
  constructor(apiKey: string) {
    super('Brave', apiKey, SEARCH_ENGINE_CONFIGS.brave);
  }

  async performSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const params: any = {
      q: query,
      count: options.maxResults || 10,
      safesearch: options.safeSearch ? 'strict' : 'moderate'
    };

    if (options.country) params.country = options.country;
    if (options.language) params.search_lang = options.language;
    if (options.freshness) params.freshness = this.mapFreshness(options.freshness);

    const response = await this.client.get(
      'https://api.search.brave.com/res/v1/web/search',
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.apiKey
        },
        params
      }
    );

    if (!response.data?.web?.results) {
      throw new Error('Invalid Brave response');
    }

    return response.data.web.results.map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.description || '',
      description: item.description || '',
      snippet: this.extractSnippet(item.description),
      score: this.calculateScore(item),
      publishedDate: item.age,
      domain: this.extractDomain(item.url)
    }));
  }

  private mapFreshness(freshness: string): string {
    const freshnessMap: Record<string, string> = {
      'day': 'pd',
      'week': 'pw',
      'month': 'pm',
      'year': 'py'
    };
    return freshnessMap[freshness] || 'pw';
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

  private calculateScore(item: any): number {
    // Basic scoring algorithm for Brave results
    let score = 0.5; // Base score
    
    if (item.title && item.title.length > 10) score += 0.1;
    if (item.description && item.description.length > 50) score += 0.1;
    if (item.url && !item.url.includes('?')) score += 0.1; // Prefer direct URLs
    
    return Math.min(score, 1.0);
  }
}
