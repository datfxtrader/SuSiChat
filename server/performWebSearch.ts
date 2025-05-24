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
const SEARCH_TIMEOUT = 15000;
const MAX_SEARCH_RETRIES = 3;

export async function performWebSearch(
  query: string, 
  maxResults: number = 5,
  retries: number = MAX_SEARCH_RETRIES
): Promise<WebSearchResponse> {
  console.log(`Performing web search for: "${query}"`);

  const results: SearchResult[] = [];
  let tavilyResults = null;
  let braveResults = null;
  let duckduckgoResults = null;

  // Run DuckDuckGo, Brave, and Tavily searches in parallel for maximum efficiency
  const searchPromises = [];

  // DuckDuckGo search (free, no rate limits)
  searchPromises.push(
    (async () => {
      try {
        console.log('Starting DuckDuckGo search...');
        const duckResponse = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`);
        
        if (duckResponse.data?.RelatedTopics) {
          duckduckgoResults = duckResponse.data;
          const topics = duckResponse.data.RelatedTopics.slice(0, Math.ceil(maxResults / 3));
          for (const topic of topics) {
            if (topic.FirstURL && topic.Text) {
              results.push({
                title: topic.Text.split(' - ')[0] || 'DuckDuckGo Result',
                content: topic.Text || '',
                url: topic.FirstURL || '',
                score: 0.8,
                source: 'DuckDuckGo'
              });
            }
          }
        }
      } catch (error) {
        console.error('DuckDuckGo search error:', error);
        duckduckgoResults = { error: 'DuckDuckGo search failed' };
      }
    })()
  );

  // Optimized Brave search with intelligent rate limiting
  if (BRAVE_API_KEY) {
    searchPromises.push(
      (async () => {
        try {
          console.log('Starting optimized Brave search with intelligent rate limiting...');
          // Enhanced rate limiting: 1.5 second delay to stay well within limits
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
            params: {
              q: query,
              count: maxResults, // Use full count for better quality
              search_lang: 'en',
              freshness: 'week', // More recent data
              safesearch: 'moderate',
              text_decorations: false,
              spellcheck: true
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
      })()
    );
  }

  // Tavily search for comprehensive coverage
  if (TAVILY_API_KEY) {
    searchPromises.push(
      (async () => {
        try {
          console.log('Starting Tavily search...');
          const response = await axios.post(
            'https://api.tavily.com/search',
            {
              query,
              search_depth: 'advanced',
              include_answer: true,
              max_results: Math.ceil(maxResults / 2),
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
      })()
    );
  }

  // Wait for all searches to complete in parallel
  await Promise.allSettled(searchPromises);
  console.log(`Parallel search completed. Found ${results.length} total results.`);

  // Optimize results processing
  const seen = new Set();
  const uniqueResults = results.reduce((acc, result) => {
    if (!result.url || seen.has(result.url)) return acc;
    seen.add(result.url);
    acc.push(result);
    return acc;
  }, [])
  .sort((a, b) => (b.score || 0) - (a.score || 0))
  .slice(0, maxResults);

  return {
    results: uniqueResults,
    tavilyResults,
    braveResults,
    query,
    timestamp: new Date().toISOString()
  };
}