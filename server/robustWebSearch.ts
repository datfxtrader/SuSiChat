/**
 * Robust web search implementation to handle errors gracefully
 */

import axios from 'axios';

// Environment variables for API keys
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

/**
 * Perform a web search with robust error handling
 */
export async function robustWebSearch(query: string, maxResults: number = 20) {
  console.log(`Performing robust web search for: "${query}"`);
  
  const results: any[] = [];
  let tavilyResults = null;
  let braveResults = null;
  
  // Try Tavily first if API key is available
  if (TAVILY_API_KEY) {
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
            title: result.title || 'Untitled',
            content: result.description || '',
            url: result.url || '',
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
    if (result.url && !uniqueUrls.has(result.url)) {
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
}

// Make the function available globally
(global as any).robustWebSearch = robustWebSearch;