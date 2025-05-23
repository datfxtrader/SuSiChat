// server/performWebSearch.ts
// Shared web search functionality that can be imported by both suna-integration and deerflow-integration

import axios from 'axios';

// Environment variables for API keys
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

/**
 * Perform a web search using available search engines
 */
export async function performWebSearch(query: string, maxResults: number = 5) {
  console.log(`Performing web search for: "${query}"`);
  
  try {
    const results: any[] = [];
    let tavilyResults = null;
    let braveResults = null;
  
  // Try Brave first if API key is available
  if (BRAVE_API_KEY) {
    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY
        },
        params: {
          q: query,
          count: maxResults,
          search_lang: 'en'
        }
      });

      if (response.data && response.data.web && response.data.web.results) {
        braveResults = response.data;
        for (const result of response.data.web.results) {
          results.push({
            title: result.title,
            content: result.description,
            url: result.url,
            score: 1.0 - (results.length / maxResults),
            publishedDate: result.age,
            source: 'Brave'
          });
        }
      }
    } catch (error) {
      console.error('Brave search error:', error);
      braveResults = { error: 'Brave search failed' };
    }
  }

  // Backup: Try Tavily if Brave failed or unavailable
  if (TAVILY_API_KEY && results.length === 0) {
    try {
      const response = await axios.post(
        'https://api.tavily.com/search',
        {
          query,
          search_depth: 'advanced',
          include_answer: true,
          include_domains: [],
          exclude_domains: [],
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
      
      if (response.data && response.data.results) {
        tavilyResults = response.data;
        // Add all Tavily results to our collection
        for (const result of response.data.results) {
          results.push({
            title: result.title,
            content: result.content,
            url: result.url,
            score: result.relevance_score,
            publishedDate: result.published_date,
            source: 'Tavily'
          });
        }
      }
    } catch (error) {
      console.error('Tavily search error:', error);
      tavilyResults = { error: 'Tavily search failed' };
    }
  }
  
  // Also try Brave search if API key is available
  if (BRAVE_API_KEY) {
    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: {
          q: query,
          count: maxResults,
          freshness: 'month',
        },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY
        }
      });
      
      if (response.data && response.data.web && response.data.web.results) {
        braveResults = response.data;
        // Add all Brave results
        for (const result of response.data.web.results) {
          results.push({
            title: result.title,
            content: result.description,
            url: result.url,
            score: 1.0, // Brave doesn't provide a relevance score
            source: 'Brave'
          });
        }
      }
    } catch (error) {
      console.error('Brave search error:', error);
      braveResults = { error: 'Brave search failed' };
    }
  }
  
  // If no search engines worked, return an error
  if (results.length === 0) {
    if (!TAVILY_API_KEY && !BRAVE_API_KEY) {
      return { 
        error: 'No search API keys are configured. Web search is disabled.', 
        results: []
      };
    } else {
      return { 
        error: 'All search engines failed to return results.', 
        results: []
      };
    }
  }
  
  // Sort results by relevance score (if available)
  results.sort((a, b) => {
    if (a.score && b.score) {
      return b.score - a.score;
    }
    return 0;
  });
  
  // De-duplicate results by URL
  const uniqueUrls = new Set();
  const uniqueResults = [];
  
  for (const result of results) {
    if (!uniqueUrls.has(result.url)) {
      uniqueUrls.add(result.url);
      uniqueResults.push(result);
    }
  }
  
  // Limit to maxResults
  const limitedResults = uniqueResults.slice(0, maxResults);
  
  return {
    results: limitedResults,
    tavilyResults,
    braveResults
  };
  } catch (error) {
    console.error('Web search error:', error);
    return {
      error: 'Web search failed',
      results: []
    };
  }
}

// Make the function available globally to avoid circular imports
(global as any).performWebSearch = performWebSearch;

// Export the function directly to avoid errors with require
export { performWebSearch };