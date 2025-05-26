
// services/search-engines/newsdata.ts
import { SearchEngine } from './base';
import { SearchResult, SearchOptions } from '../../../types/search.types';

export class NewsDataEngine extends SearchEngine {
  constructor(apiKey: string) {
    super('NewsData', apiKey, 5, 15000);
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.isAvailable()) return [];

    try {
      const response = await this.client.get('https://newsdata.io/api/1/news', {
        params: {
          apikey: this.apiKey,
          q: query,
          language: options.filters?.language || 'en',
          size: options.maxResults,
          prioritydomain: 'top',
          ...(options.filters?.country && { country: options.filters.country })
        }
      });

      if (response.status !== 200) {
        throw new Error(`NewsData API error: ${response.status}`);
      }

      const articles = response.data.results || [];
      return articles.map((article: any) => this.mapResult(article));
    } catch (error) {
      console.error(`[${this.name}] Search error:`, error);
      return [];
    }
  }

  private mapResult(article: any): SearchResult {
    return {
      title: article.title || 'Untitled',
      url: article.link || '',
      content: article.description || '',
      score: 1.0,
      source: this.name,
      publishedDate: article.pubDate,
      domain: this.extractDomain(article.link),
      thumbnail: article.image_url,
      author: article.creator?.[0]
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
