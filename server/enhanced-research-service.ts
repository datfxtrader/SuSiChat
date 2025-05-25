
import axios from 'axios';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
  timestamp?: string;
}

interface ResearchResults {
  web: SearchResult[];
  news: SearchResult[];
  wiki: SearchResult[];
  academic: SearchResult[];
}

export class EnhancedFreeResearchService {
  private BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  private NEWS_API_KEY = process.env.NEWS_API_KEY;

  async performResearch(query: string) {
    const results = {
      web: await this.braveSearch(query),
      news: await this.newsSearch(query),
      wiki: await this.wikipediaSearch(query),
      academic: await this.academicSearch(query)
    };
    
    return this.synthesizeResults(results, query);
  }

  private async braveSearch(query: string): Promise<SearchResult[]> {
    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.BRAVE_API_KEY
        },
        params: {
          q: query,
          count: 10
        }
      });

      return response.data.web.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description,
        source: 'brave'
      }));
    } catch (error) {
      console.error('Brave search error:', error);
      return [];
    }
  }

  private async newsSearch(query: string): Promise<SearchResult[]> {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        headers: {
          'X-Api-Key': this.NEWS_API_KEY
        },
        params: {
          q: query,
          pageSize: 10,
          language: 'en',
          sortBy: 'relevancy'
        }
      });

      return response.data.articles.map((article: any) => ({
        title: article.title,
        url: article.url,
        description: article.description,
        source: 'news',
        timestamp: article.publishedAt
      }));
    } catch (error) {
      console.error('News API error:', error);
      return [];
    }
  }

  private async wikipediaSearch(query: string): Promise<SearchResult[]> {
    try {
      const response = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          format: 'json',
          utf8: 1,
          origin: '*'
        }
      });

      return response.data.query.search.map((result: any) => ({
        title: result.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
        description: result.snippet.replace(/<\/?[^>]+(>|$)/g, ''),
        source: 'wikipedia'
      }));
    } catch (error) {
      console.error('Wikipedia API error:', error);
      return [];
    }
  }

  private async academicSearch(query: string): Promise<SearchResult[]> {
    try {
      const response = await axios.get('http://export.arxiv.org/api/query', {
        params: {
          search_query: query,
          start: 0,
          max_results: 10,
          sortBy: 'relevance'
        }
      });

      // Parse XML response
      const entries = response.data.match(/<entry>(.*?)<\/entry>/gs) || [];
      return entries.map((entry: string) => {
        const title = entry.match(/<title>(.*?)<\/title>/s)?.[1] || '';
        const url = entry.match(/<id>(.*?)<\/id>/s)?.[1] || '';
        const summary = entry.match(/<summary>(.*?)<\/summary>/s)?.[1] || '';
        
        return {
          title: title.trim(),
          url: url.trim(),
          description: summary.trim().replace(/<\/?[^>]+(>|$)/g, ''),
          source: 'arxiv'
        };
      });
    } catch (error) {
      console.error('arXiv API error:', error);
      return [];
    }
  }

  private async synthesizeResults(results: ResearchResults, query: string) {
    const sources = [
      ...results.web.slice(0, 5),
      ...results.news.slice(0, 3),
      ...results.wiki.slice(0, 2),
      ...results.academic.slice(0, 2)
    ];

    return {
      report: await this.generateReport(sources, query),
      sources: sources,
      processingTime: Date.now()
    };
  }

  private async generateReport(sources: SearchResult[], query: string): Promise<string> {
    // Organize sources by type
    const sourcesByType = sources.reduce((acc: any, source) => {
      if (!acc[source.source]) {
        acc[source.source] = [];
      }
      acc[source.source].push(source);
      return acc;
    }, {});

    // Generate report sections
    let report = `# Research Report: ${query}\n\n`;
    
    if (sourcesByType.news?.length) {
      report += '## Latest News\n\n';
      sourcesByType.news.forEach((source: SearchResult) => {
        report += `- ${source.title}\n  ${source.description}\n\n`;
      });
    }

    if (sourcesByType.wiki?.length) {
      report += '## Background Information\n\n';
      sourcesByType.wiki.forEach((source: SearchResult) => {
        report += `${source.description}\n\n`;
      });
    }

    if (sourcesByType.arxiv?.length) {
      report += '## Academic Research\n\n';
      sourcesByType.arxiv.forEach((source: SearchResult) => {
        report += `- ${source.title}\n  ${source.description}\n\n`;
      });
    }

    if (sourcesByType.brave?.length) {
      report += '## Additional Resources\n\n';
      sourcesByType.brave.forEach((source: SearchResult) => {
        report += `- [${source.title}](${source.url})\n  ${source.description}\n\n`;
      });
    }

    return report;
  }
}

export const enhancedResearchService = new EnhancedFreeResearchService();
