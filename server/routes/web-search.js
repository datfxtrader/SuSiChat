/**
 * Web search routes for integration with DeerFlow
 * 
 * This module provides direct web search functionality to support financial research
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// API endpoint for web search
router.post('/', async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    console.log(`Processing web search request for: ${query}`);
    const results = await performCombinedWebSearch(query, maxResults);
    
    return res.json({
      results,
      query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing web search request:', error);
    return res.status(500).json({
      error: 'Failed to perform web search',
      message: error.message
    });
  }
});

/**
 * Perform web search using available search engines
 */
async function performCombinedWebSearch(query, maxResults = 10) {
  const results = [];
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  
  // Try Tavily search first if API key is available
  if (TAVILY_API_KEY) {
    try {
      const tavResults = await searchTavily(query, maxResults);
      if (tavResults && tavResults.length > 0) {
        results.push(...tavResults);
      }
    } catch (error) {
      console.error('Tavily search error:', error.message);
    }
  }
  
  // If we need more results, try Brave search
  if (results.length < maxResults && BRAVE_API_KEY) {
    try {
      const braveResults = await searchBrave(query, maxResults - results.length);
      if (braveResults && braveResults.length > 0) {
        results.push(...braveResults);
      }
    } catch (error) {
      console.error('Brave search error:', error.message);
    }
  }
  
  // Remove duplicates based on URL
  const uniqueUrls = new Set();
  const uniqueResults = [];
  
  for (const result of results) {
    if (result.url && !uniqueUrls.has(result.url)) {
      uniqueUrls.add(result.url);
      uniqueResults.push(result);
    }
  }
  
  // Limit results to maxResults
  return uniqueResults.slice(0, maxResults);
}

/**
 * Search using Tavily API
 */
async function searchTavily(query, maxResults = 10) {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_API_KEY) return [];
  
  const url = 'https://api.tavily.com/search';
  const headers = {
    'Content-Type': 'application/json'
  };
  const data = {
    api_key: TAVILY_API_KEY,
    query: query,
    search_depth: 'advanced',
    include_domains: [],
    exclude_domains: [],
    max_results: maxResults
  };
  
  const response = await axios.post(url, data, { headers });
  
  if (response.status === 200 && response.data && response.data.results) {
    return response.data.results.map(item => ({
      title: item.title,
      url: item.url,
      content: item.content,
      description: item.content,
      snippet: item.content
    }));
  }
  
  return [];
}

/**
 * Search using Brave API
 */
async function searchBrave(query, maxResults = 10) {
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  if (!BRAVE_API_KEY) return [];
  
  const url = 'https://api.search.brave.com/res/v1/web/search';
  const headers = {
    'Accept': 'application/json',
    'X-Subscription-Token': BRAVE_API_KEY
  };
  const params = {
    q: query,
    count: maxResults
  };
  
  const response = await axios.get(url, { headers, params });
  
  if (response.status === 200 && response.data && response.data.web && response.data.web.results) {
    return response.data.web.results.map(item => ({
      title: item.title,
      url: item.url,
      content: item.description,
      description: item.description,
      snippet: item.description
    }));
  }
  
  return [];
}

module.exports = router;