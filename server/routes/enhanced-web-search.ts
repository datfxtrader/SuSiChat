
export interface EnhancedSearchRequest {
  query: string;
  maxResults?: number;
  searchType?: 'web' | 'news' | 'all';
  freshness?: 'day' | 'week' | 'month' | 'year';
  sources?: string[];
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  source: string;
  publishedDate?: string;
  domain?: string;
}

export interface EnhancedSearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchEnginesUsed: string[];
  query: string;
  searchType: string;
  timestamp: string;
}

import express from 'express';
import axios from 'axios';
import { performance } from 'perf_hooks';

const router = express.Router();

// Environment variables
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;

// Enhanced web search endpoint
router.post('/search', async (req, res) => {
  try {
    const { 
      query, 
      maxResults = 10, 
      searchType = 'all',
      freshness = 'week',
      sources = []
    }: EnhancedSearchRequest = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    console.log(`Enhanced web search: "${query}" (type: ${searchType}, max: ${maxResults})`);
    const startTime = performance.now();
    
    const results = await performEnhancedSearch(query, maxResults, searchType, freshness, sources);
    
    const endTime = performance.now();
    console.log(`Search completed in ${Math.round(endTime - startTime)}ms`);
    
    return res.json({
      ...results,
      performance: {
        searchTime: Math.round(endTime - startTime),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Enhanced search error:', error);
    return res.status(500).json({
      error: 'Failed to perform enhanced search',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

async function performEnhancedSearch(
  query: string, 
  maxResults: number, 
  searchType: string,
  freshness: string,
  preferredSources: string[]
): Promise<EnhancedSearchResponse> {
  const allResults: SearchResult[] = [];
  const searchEnginesUsed: string[] = [];
  
  // News search for current events
  if (searchType === 'news' || searchType === 'all') {
    if (NEWSDATA_API_KEY) {
      try {
        const newsResults = await searchNewsData(query, Math.ceil(maxResults / 3));
        allResults.push(...newsResults);
        if (newsResults.length > 0) searchEnginesUsed.push('NewsData');
      } catch (error) {
        console.error('NewsData search error:', error);
      }
    }
  }
  
  // Web search engines
  if (searchType === 'web' || searchType === 'all') {
    // Tavily search (comprehensive)
    if (TAVILY_API_KEY && (preferredSources.length === 0 || preferredSources.includes('tavily'))) {
      try {
        const tavilyResults = await searchTavily(query, Math.ceil(maxResults / 2));
        allResults.push(...tavilyResults);
        if (tavilyResults.length > 0) searchEnginesUsed.push('Tavily');
      } catch (error) {
        console.error('Tavily search error:', error);
      }
    }
    
    // Brave search (fresh results)
    if (BRAVE_API_KEY && allResults.length < maxResults && 
        (preferredSources.length === 0 || preferredSources.includes('brave'))) {
      try {
        const braveResults = await searchBrave(query, maxResults - allResults.length, freshness);
        allResults.push(...braveResults);
        if (braveResults.length > 0) searchEnginesUsed.push('Brave');
      } catch (error) {
        console.error('Brave search error:', error);
      }
    }
    
    // DuckDuckGo fallback
    if (allResults.length < maxResults && 
        (preferredSources.length === 0 || preferredSources.includes('duckduckgo'))) {
      try {
        const ddgResults = await searchDuckDuckGo(query, maxResults - allResults.length);
        allResults.push(...ddgResults);
        if (ddgResults.length > 0) searchEnginesUsed.push('DuckDuckGo');
      } catch (error) {
        console.error('DuckDuckGo search error:', error);
      }
    }
  }
  
  // Remove duplicates and rank results
  const uniqueResults = removeDuplicatesAndRank(allResults, maxResults);
  
  return {
    results: uniqueResults,
    totalResults: uniqueResults.length,
    searchEnginesUsed,
    query,
    searchType,
    timestamp: new Date().toISOString()
  };
}

async function searchNewsData(query: string, maxResults: number): Promise<SearchResult[]> {
  const response = await axios.get('https://newsdata.io/api/1/news', {
    params: {
      apikey: NEWSDATA_API_KEY,
      q: query,
      language: 'en',
      size: maxResults,
      prioritydomain: 'top'
    },
    timeout: 15000
  });
  
  const articles = response.data.results || [];
  return articles.map((article: any) => ({
    title: article.title || 'Untitled',
    url: article.link || '',
    content: article.description || '',
    score: 1.0,
    source: 'NewsData',
    publishedDate: article.pubDate,
    domain: extractDomain(article.link)
  })).filter((result: SearchResult) => result.url);
}

async function searchTavily(query: string, maxResults: number): Promise<SearchResult[]> {
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
    timeout: 20000
  });
  
  const results = response.data.results || [];
  return results.map((result: any, index: number) => ({
    title: result.title || 'Untitled',
    url: result.url || '',
    content: result.content || '',
    score: result.relevance_score || (1.0 - index * 0.1),
    source: 'Tavily',
    publishedDate: result.published_date,
    domain: extractDomain(result.url)
  }));
}

async function searchBrave(query: string, maxResults: number, freshness: string): Promise<SearchResult[]> {
  const freshnessMap: { [key: string]: string } = {
    'day': 'pd',
    'week': 'pw',
    'month': 'pm',
    'year': 'py'
  };
  
  const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
    params: {
      q: query,
      count: maxResults,
      search_lang: 'en',
      freshness: freshnessMap[freshness] || 'pw',
      safesearch: 'moderate'
    },
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    },
    timeout: 15000
  });
  
  const results = response.data.web?.results || [];
  return results.map((result: any, index: number) => ({
    title: result.title || 'Untitled',
    url: result.url || '',
    content: result.description || '',
    score: 1.0 - (index * 0.1),
    source: 'Brave',
    domain: extractDomain(result.url)
  }));
}

async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const response = await axios.get(`https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`, {
    timeout: 10000
  });
  
  const topics = response.data.RelatedTopics || [];
  return topics.slice(0, maxResults).map((topic: any) => ({
    title: topic.Text?.substring(0, 100) + '...' || 'DuckDuckGo Result',
    url: topic.FirstURL || '',
    content: topic.Text || '',
    score: 0.8,
    source: 'DuckDuckGo',
    domain: extractDomain(topic.FirstURL)
  })).filter((result: SearchResult) => result.url);
}

function removeDuplicatesAndRank(results: SearchResult[], maxResults: number): SearchResult[] {
  const seen = new Set<string>();
  const unique = results.filter(result => {
    if (!result.url || seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  });
  
  // Sort by score and source priority
  const sourcePriority: { [key: string]: number } = {
    'NewsData': 5,
    'Tavily': 4,
    'Brave': 3,
    'DuckDuckGo': 2
  };
  
  unique.sort((a, b) => {
    const priorityDiff = (sourcePriority[b.source] || 1) - (sourcePriority[a.source] || 1);
    if (priorityDiff !== 0) return priorityDiff;
    return b.score - a.score;
  });
  
  return unique.slice(0, maxResults);
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

export default router;
