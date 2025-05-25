import axios from 'axios';
import { log } from './utils/logger';
import { apiRateManager } from './apiRateManager';

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

  // Run DuckDuckGo, Brave, Tavily, and Yahoo searches in parallel for maximum efficiency
  const searchPromises = [];
  let yahooResults = null;

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

  // Smart Brave search with caching and intelligent fallbacks
  if (BRAVE_API_KEY) {
    searchPromises.push(
      (async () => {
        try {
          console.log('Starting smart Brave search with caching...');
          
          // Generate cache key for this specific query
          const cacheKey = `brave_search_${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          
          // Check cache first (5-minute cache)
          const cachedResult = apiRateManager.getCachedResponse(cacheKey);
          if (cachedResult) {
            console.log('Using cached Brave search results');
            braveResults = cachedResult;
            for (const result of cachedResult.web?.results || []) {
              results.push({
                title: result.title || 'Untitled',
                content: result.description || '',
                url: result.url || '',
                score: 1.0,
                source: 'Brave (cached)'
              });
            }
            return;
          }

          // Check if Brave is currently rate limited
          const delay = apiRateManager.shouldDelay('brave');
          if (delay > 30000) { // If delay is more than 30 seconds, skip Brave
            console.log(`Brave rate limited for ${delay}ms, skipping to fallback sources`);
            braveResults = { error: 'Rate limited - using alternative sources' };
            return;
          }

          if (delay > 0) {
            console.log(`Waiting ${delay}ms for Brave rate limit...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Create precise date range for search freshness
          const today = new Date();
          const threeDaysAgo = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000));
          const dateRange = `after:${threeDaysAgo.toISOString().split('T')[0]}`;
          
          const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
            params: {
              q: `${query} ${dateRange} 2025 current latest`,
              count: maxResults,
              search_lang: 'en',
              freshness: 'pd3', // Past 3 days only
              safesearch: 'moderate',
              text_decorations: false,
              spellcheck: true
            },
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': BRAVE_API_KEY
            },
            timeout: 10000 // 10 second timeout
          });

          if (response.data?.web?.results) {
            braveResults = response.data;
            
            // Cache successful results for 5 minutes
            apiRateManager.cacheResponse(cacheKey, response.data, 5 * 60 * 1000);
            apiRateManager.recordSuccess('brave');
            
            for (const result of response.data.web.results) {
              results.push({
                title: result.title || 'Untitled',
                content: result.description || '',
                url: result.url || '',
                score: 1.0,
                source: 'Brave'
              });
            }
            console.log(`Brave search successful: ${response.data.web.results.length} results`);
          }
        } catch (error: any) {
          if (error.response?.status === 429) {
            console.log('Brave search rate limited - recording for intelligent backoff');
            apiRateManager.recordRateLimit('brave');
            braveResults = { error: 'Rate limited - enhanced fallback active' };
          } else {
            console.error('Brave search error:', error.message);
            braveResults = { error: 'Brave search failed - using alternatives' };
          }
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

  // Add Yahoo search to parallel execution with retries
  searchPromises.push(
    (async () => {
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`Starting Yahoo search (attempt ${attempt + 1})...`);
          const yahooResponse = await axios.get('https://search.yahoo.com/finance/search', {
            params: {
              p: query,
              n: Math.ceil(maxResults / 3),
              property: "finance_intl"
            },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 15000
        });

        if (yahooResponse.data) {
          yahooResults = yahooResponse.data;
          // Parse Yahoo search results
          const matches = yahooResponse.data.match(/<h3 class="title"><a href="([^"]+)"[^>]*>([^<]+)<\/a>/g);
          if (matches) {
            for (const match of matches.slice(0, Math.ceil(maxResults / 3))) {
              const urlMatch = match.match(/href="([^"]+)"/);
              const titleMatch = match.match(/>([^<]+)</);
              if (urlMatch && titleMatch) {
                results.push({
                  title: titleMatch[1],
                  url: urlMatch[1],
                  score: 0.9,
                  source: 'Yahoo'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Yahoo search error:', error);
        yahooResults = { error: 'Yahoo search failed' };
      }
    })()
  );

  // Wait for all searches to complete in parallel
  await Promise.allSettled(searchPromises);
  console.log(`Parallel search completed. Found ${results.length} total results from multiple engines`);

  // Enhanced fallback system when primary sources fail
  if (results.length < 3) {
    console.log('Low result count detected - activating enhanced fallback search...');
    
    // Try additional DuckDuckGo search with different terms
    try {
      const fallbackQuery = `${query} news updates market analysis`;
      const fallbackResponse = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(fallbackQuery)}&format=json&no_html=1&skip_disambig=1`);
      
      if (fallbackResponse.data?.RelatedTopics) {
        for (const topic of fallbackResponse.data.RelatedTopics.slice(0, 3)) {
          if (topic.FirstURL && topic.Text) {
            results.push({
              title: topic.Text.substring(0, 100) + '...',
              content: topic.Text,
              url: topic.FirstURL,
              score: 0.7,
              source: 'DuckDuckGo Fallback'
            });
          }
        }
      }
    } catch (error) {
      console.log('Fallback search failed, but continuing with available results');
    }
  }

  // Intelligent result optimization with source diversity
  const seen = new Set();
  const sourceCount = new Map();
  
  const uniqueResults = results.reduce((acc, result) => {
    if (!result.url || seen.has(result.url)) return acc;
    seen.add(result.url);
    
    // Ensure source diversity (max 3 from same source)
    const sourceKey = result.source?.split(' ')[0] || 'Unknown';
    const currentCount = sourceCount.get(sourceKey) || 0;
    if (currentCount >= 3) return acc;
    
    sourceCount.set(sourceKey, currentCount + 1);
    acc.push(result);
    return acc;
  }, [])
  .sort((a, b) => {
    // Prioritize by score but boost fresh sources
    const scoreA = (a.score || 0) + (a.source?.includes('cached') ? -0.1 : 0);
    const scoreB = (b.score || 0) + (b.source?.includes('cached') ? -0.1 : 0);
    return scoreB - scoreA;
  })
  .slice(0, maxResults);

  // Add metadata about search success and fallbacks used
  const searchMetadata = {
    totalSources: Array.from(sourceCount.keys()).length,
    sourceBreakdown: Object.fromEntries(sourceCount),
    braveSuccess: !braveResults?.error,
    tavilySuccess: !tavilyResults?.error,
    yahooSuccess: !yahooResults?.error,
    fallbackUsed: results.some(r => r.source?.includes('Fallback'))
  };

  return {
    results: uniqueResults,
    tavilyResults,
    braveResults,
    query,
    timestamp: new Date().toISOString(),
    metadata: searchMetadata
  };
}