import axios from 'axios';
// Remove circular imports and use direct logging
const log = console.log;

// Environment variables for API keys
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;

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
 * RATE LIMITS DISABLED FOR 15 DAYS
 */
const SEARCH_TIMEOUT = 30000;
const MAX_SEARCH_RETRIES = 5;

export async function performWebSearch(
  query: string, 
  maxResults: number = 5,
  retries: number = MAX_SEARCH_RETRIES
): Promise<WebSearchResponse> {
  console.log(`Performing UNLIMITED web search for: "${query}" (rate limits disabled)`);

  try {
    // BYPASS rate limiting - try all search engines in parallel
    const results: SearchResult[] = [];
    let tavilyResults = null;
    let braveResults = null;
    let newsResults = null;
    let serpResults = null;
    let duckResults = null;

    const searchPromises = [];

    // 1. Tavily Search (no rate limit)
    if (TAVILY_API_KEY) {
      searchPromises.push(
        searchTavily(query, Math.ceil(maxResults / 2))
          .then(res => ({ type: 'tavily', results: res }))
          .catch(err => ({ type: 'tavily', error: err.message }))
      );
    }

    // 2. Brave Search (no rate limit)
    if (BRAVE_API_KEY) {
      searchPromises.push(
        searchBrave(query, Math.ceil(maxResults / 2))
          .then(res => ({ type: 'brave', results: res }))
          .catch(err => ({ type: 'brave', error: err.message }))
      );
    }

    // 3. NewsData Search (no rate limit)
    if (NEWSDATA_API_KEY) {
      searchPromises.push(
        searchNewsData(query, Math.ceil(maxResults / 3))
          .then(res => ({ type: 'news', results: res }))
          .catch(err => ({ type: 'news', error: err.message }))
      );
    }

    // 4. SERP API (no rate limit)
    if (SERP_API_KEY) {
      searchPromises.push(
        searchSerpApi(query, Math.ceil(maxResults / 3))
          .then(res => ({ type: 'serp', results: res }))
          .catch(err => ({ type: 'serp', error: err.message }))
      );
    }

    // 5. DuckDuckGo (always available, no rate limit)
    searchPromises.push(
      searchDuckDuckGo(query, Math.ceil(maxResults / 3))
        .then(res => ({ type: 'duck', results: res }))
        .catch(err => ({ type: 'duck', error: err.message }))
    );

    // Execute all searches in parallel
    const searchResults = await Promise.allSettled(searchPromises);

    // Process results
    searchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.results) {
        const searchData = result.value;
        
        if (searchData.type === 'tavily' && searchData.results) {
          tavilyResults = { results: searchData.results };
          results.push(...searchData.results);
        } else if (searchData.type === 'brave' && searchData.results) {
          braveResults = { web: { results: searchData.results } };
          results.push(...searchData.results);
        } else if (searchData.type === 'news' && searchData.results) {
          newsResults = { results: searchData.results };
          results.push(...searchData.results);
        } else if (searchData.type === 'serp' && searchData.results) {
          serpResults = { results: searchData.results };
          results.push(...searchData.results);
        } else if (searchData.type === 'duck' && searchData.results) {
          duckResults = { results: searchData.results };
          results.push(...searchData.results);
        }
      }
    });

    // Remove duplicates and sort by relevance
    const uniqueResults = removeDuplicatesAndSort(results, maxResults);

    console.log(`Search completed: ${uniqueResults.length} results from ${searchPromises.length} engines`);

    return {
      results: uniqueResults,
      tavilyResults,
      braveResults,
      query,
      timestamp: new Date().toISOString(),
      metadata: {
        totalSources: searchPromises.length,
        sourceBreakdown: {
          tavily: results.filter(r => r.source === 'Tavily').length,
          brave: results.filter(r => r.source === 'Brave').length,
          news: results.filter(r => r.source === 'NewsData').length,
          serp: results.filter(r => r.source === 'SERP').length,
          duck: results.filter(r => r.source === 'DuckDuckGo').length
        },
        searchEnginesUsed: searchPromises.length,
        rateLimitingDisabled: true
      }
    };

    // Convert to expected format
    const results: SearchResult[] = searchResult.results.map(result => ({
      title: result.title,
      content: result.content,
      url: result.url,
      score: result.score,
      publishedDate: result.publishedDate,
      source: result.source
    }));

    return {
      results,
      tavilyResults: { results: results.filter(r => r.source === 'Tavily') },
      braveResults: { web: { results: results.filter(r => r.source === 'Brave') } },
      query,
      timestamp: searchResult.timestamp,
      metadata: {
        totalSources: searchResult.searchEnginesUsed.length,
        sourceBreakdown: searchResult.searchEnginesUsed.reduce((acc, source) => {
          acc[source] = results.filter(r => r.source === source).length;
          return acc;
        }, {} as Record<string, number>),
        braveSuccess: searchResult.searchEnginesUsed.includes('Brave'),
        tavilySuccess: searchResult.searchEnginesUsed.includes('Tavily'),
        fallbackUsed: searchResult.searchEnginesUsed.includes('DuckDuckGo'),
        searchTime: searchResult.performance.searchTime
      }
    };
  } catch (error) {
    console.error('Intelligent search failed, using legacy fallback:', error);
    
    // Fallback to original logic with better rate limiting
    const results: SearchResult[] = [];
    let tavilyResults = null;
    let braveResults = null;
    let duckduckgoResults = null;

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

  // Wait for all searches to complete in parallel
  await Promise.allSettled(searchPromises);
  console.log(`Parallel search completed. Found ${results.length} total results.`);

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
  } catch (error) {
    console.error('All search engines failed, using emergency fallback:', error);
    
    // Emergency fallback - just use DuckDuckGo
    try {
      const emergencyResults = await searchDuckDuckGo(query, maxResults);
      return {
        results: emergencyResults,
        tavilyResults: null,
        braveResults: null,
        query,
        timestamp: new Date().toISOString(),
        metadata: { 
          totalSources: 1, 
          sourceBreakdown: { emergency: emergencyResults.length }, 
          emergencyMode: true,
          rateLimitingDisabled: true
        }
      };
    } catch (emergencyError) {
      console.error('Emergency search failed:', emergencyError);
      return {
        results: [],
        tavilyResults: null,
        braveResults: null,
        query,
        timestamp: new Date().toISOString(),
        metadata: { totalSources: 0, sourceBreakdown: {}, allSearchesFailed: true }
      };
    }
  }
}

/**
 * Search using NewsData API
 */
async function searchNewsData(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  if (!NEWSDATA_API_KEY) return [];
  
  try {
    const response = await axios.get('https://newsdata.io/api/1/news', {
      params: {
        apikey: NEWSDATA_API_KEY,
        q: query,
        language: 'en',
        size: maxResults
      },
      timeout: SEARCH_TIMEOUT
    });

    if (response.data?.results) {
      return response.data.results.map((item: any) => ({
        title: item.title || 'News Article',
        content: item.description || item.content || '',
        url: item.link || '',
        score: 1.0,
        source: 'NewsData',
        publishedDate: item.pubDate
      })).filter((result: SearchResult) => result.url);
    }
  } catch (error) {
    console.error('NewsData search error:', error);
  }
  
  return [];
}

/**
 * Search using SERP API
 */
async function searchSerpApi(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  if (!SERP_API_KEY) return [];
  
  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        api_key: SERP_API_KEY,
        q: query,
        engine: 'google',
        num: maxResults
      },
      timeout: SEARCH_TIMEOUT
    });

    if (response.data?.organic_results) {
      return response.data.organic_results.map((item: any) => ({
        title: item.title || 'Search Result',
        content: item.snippet || '',
        url: item.link || '',
        score: 1.0,
        source: 'SERP'
      })).filter((result: SearchResult) => result.url);
    }
  } catch (error) {
    console.error('SERP API search error:', error);
  }
  
  return [];
}

/**
 * Enhanced DuckDuckGo search
 */
async function searchDuckDuckGo(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  try {
    const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      timeout: SEARCH_TIMEOUT
    });

    const results: SearchResult[] = [];
    
    // Process RelatedTopics
    if (response.data.RelatedTopics) {
      response.data.RelatedTopics.slice(0, maxResults).forEach((topic: any) => {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'DuckDuckGo Result',
            content: topic.Text || '',
            url: topic.FirstURL || '',
            score: 0.8,
            source: 'DuckDuckGo'
          });
        }
      });
    }

    // Also try instant answer
    if (response.data.Answer && response.data.AbstractURL) {
      results.unshift({
        title: 'Direct Answer',
        content: response.data.Answer,
        url: response.data.AbstractURL,
        score: 1.0,
        source: 'DuckDuckGo'
      });
    }

    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

/**
 * Enhanced Tavily search (no rate limiting)
 */
async function searchTavily(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  if (!TAVILY_API_KEY) return [];
  
  try {
    const response = await axios.post('https://api.tavily.com/search', {
      query,
      search_depth: 'advanced',
      include_answer: true,
      max_results: maxResults,
      include_raw_content: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TAVILY_API_KEY
      },
      timeout: SEARCH_TIMEOUT
    });

    if (response.data?.results) {
      return response.data.results.map((item: any) => ({
        title: item.title || 'Tavily Result',
        content: item.content || '',
        url: item.url || '',
        score: item.relevance_score || 1.0,
        source: 'Tavily',
        publishedDate: item.published_date
      }));
    }
  } catch (error) {
    console.error('Tavily search error (continuing with other engines):', error);
  }
  
  return [];
}

/**
 * Enhanced Brave search (no rate limiting)
 */
async function searchBrave(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  if (!BRAVE_API_KEY) return [];
  
  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count: maxResults,
        search_lang: 'en',
        freshness: 'week',
        safesearch: 'moderate'
      },
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      },
      timeout: SEARCH_TIMEOUT
    });

    if (response.data?.web?.results) {
      return response.data.web.results.map((item: any) => ({
        title: item.title || 'Brave Result',
        content: item.description || '',
        url: item.url || '',
        score: 1.0,
        source: 'Brave'
      }));
    }
  } catch (error) {
    console.error('Brave search error (continuing with other engines):', error);
  }
  
  return [];
}

/**
 * Remove duplicates and sort results
 */
function removeDuplicatesAndSort(results: SearchResult[], maxResults: number): SearchResult[] {
  const seen = new Set<string>();
  const unique = results.filter(result => {
    if (!result.url || seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  });

  // Sort by score and source priority
  const sourcePriority: { [key: string]: number } = {
    'Tavily': 5,
    'Brave': 4,
    'NewsData': 3,
    'SERP': 3,
    'DuckDuckGo': 2
  };

  unique.sort((a, b) => {
    const priorityDiff = (sourcePriority[b.source] || 1) - (sourcePriority[a.source] || 1);
    if (priorityDiff !== 0) return priorityDiff;
    return (b.score || 0) - (a.score || 0);
  });

  return unique.slice(0, maxResults);
}