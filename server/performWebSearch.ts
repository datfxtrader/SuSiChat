
import axios from 'axios';
import { log } from './utils/logger';

// Environment variables for API keys
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

export interface SearchResult {
  title: string;
  content?: string;
  url: string;
  score?: number;
  publishedDate?: string;
  source: string;
}

export interface WebSearchResponse {
  results: SearchResult[];
  tavilyResults?: any;
  braveResults?: any;
  query: string;
  timestamp: string;
}

/**
 * Perform a web search with robust error handling and retries
 */
export async function performWebSearch(
  query: string, 
  maxResults: number = 5,
  retries: number = 3
): Promise<WebSearchResponse> {
  console.log(`Performing web search for: "${query}"`);

  const results: SearchResult[] = [];
  let tavilyResults = null;
  let braveResults = null;

  // Try Tavily first
  if (TAVILY_API_KEY) {
    try {
      const response = await axios.post(
        'https://api.tavily.com/search',
        {
          query,
          search_depth: 'advanced',
          include_answer: true,
          max_results: maxResults,
          include_raw_content: false,
          filters: {
            recency_days: 90
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': TAVILY_API_KEY
          }
        }
      );

      if (response.data?.results) {
        tavilyResults = response.data;
        for (const result of response.data.results) {
          results.push({
            title: result.title || 'Untitled',
            content: result.content || '',
            url: result.url || '',
            score: result.relevance_score || 1.0,
            publishedDate: result.published_date || '',
            source: 'Tavily'
          });
        }
      }
    } catch (error) {
      console.error('Tavily search error:', error);
      tavilyResults = { error: 'Tavily search failed' };
    }
  }

  // Try Brave as backup
  if (BRAVE_API_KEY && results.length < maxResults) {
    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: {
          q: query,
          count: maxResults,
          search_lang: 'en',
          freshness: 'month',
        },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY
        }
      });

      if (response.data?.web?.results) {
        braveResults = response.data;
        for (const result of response.data.web.results) {
          results.push({
            title: result.title || 'Untitled',
            content: result.description || '',
            url: result.url || '',
            score: 1.0,
            source: 'Brave'
          });
        }
      }
    } catch (error) {
      console.error('Brave search error:', error);
      braveResults = { error: 'Brave search failed' };
    }
  }

  // Sort and deduplicate results
  const uniqueUrls = new Set();
  const uniqueResults = results
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .filter(result => {
      if (!result.url || uniqueUrls.has(result.url)) return false;
      uniqueUrls.add(result.url);
      return true;
    })
    .slice(0, maxResults);

  return {
    results: uniqueResults,
    tavilyResults,
    braveResults,
    query,
    timestamp: new Date().toISOString()
  };
}
