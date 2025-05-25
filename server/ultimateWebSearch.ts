
/**
 * Ultimate Web Search Engine - All Sources, No Limits
 * Uses every available search engine with no rate limiting
 */

import axios from 'axios';

// All available API keys
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;
const BING_API_KEY = process.env.BING_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

interface UltimateSearchResult {
  title: string;
  content: string;
  url: string;
  score: number;
  source: string;
  publishedDate?: string;
  domain?: string;
}

interface UltimateSearchResponse {
  results: UltimateSearchResult[];
  totalResults: number;
  searchEnginesUsed: string[];
  searchTime: number;
  query: string;
  timestamp: string;
  sourceBreakdown: { [key: string]: number };
}

/**
 * Ultimate search using ALL available engines in parallel
 */
export async function ultimateWebSearch(
  query: string,
  maxResults: number = 10
): Promise<UltimateSearchResponse> {
  const startTime = Date.now();
  console.log(`🚀 ULTIMATE SEARCH: "${query}" (NO LIMITS)`);

  const allResults: UltimateSearchResult[] = [];
  const searchEnginesUsed: string[] = [];
  const searchPromises: Promise<any>[] = [];

  // 1. Tavily Search
  if (TAVILY_API_KEY) {
    searchPromises.push(
      searchTavilyUltimate(query, maxResults)
        .then(results => ({ engine: 'Tavily', results }))
        .catch(error => ({ engine: 'Tavily', error: error.message, results: [] }))
    );
  }

  // 2. Brave Search
  if (BRAVE_API_KEY) {
    searchPromises.push(
      searchBraveUltimate(query, maxResults)
        .then(results => ({ engine: 'Brave', results }))
        .catch(error => ({ engine: 'Brave', error: error.message, results: [] }))
    );
  }

  // 3. NewsData Search
  if (NEWSDATA_API_KEY) {
    searchPromises.push(
      searchNewsDataUltimate(query, Math.ceil(maxResults / 2))
        .then(results => ({ engine: 'NewsData', results }))
        .catch(error => ({ engine: 'NewsData', error: error.message, results: [] }))
    );
  }

  // 4. SERP API
  if (SERP_API_KEY) {
    searchPromises.push(
      searchSerpApiUltimate(query, maxResults)
        .then(results => ({ engine: 'SERP', results }))
        .catch(error => ({ engine: 'SERP', error: error.message, results: [] }))
    );
  }

  // 5. Bing Search
  if (BING_API_KEY) {
    searchPromises.push(
      searchBingUltimate(query, maxResults)
        .then(results => ({ engine: 'Bing', results }))
        .catch(error => ({ engine: 'Bing', error: error.message, results: [] }))
    );
  }

  // 6. Google Custom Search
  if (GOOGLE_API_KEY && GOOGLE_CSE_ID) {
    searchPromises.push(
      searchGoogleUltimate(query, maxResults)
        .then(results => ({ engine: 'Google', results }))
        .catch(error => ({ engine: 'Google', error: error.message, results: [] }))
    );
  }

  // 7. DuckDuckGo (always available)
  searchPromises.push(
    searchDuckDuckGoUltimate(query, maxResults)
      .then(results => ({ engine: 'DuckDuckGo', results }))
      .catch(error => ({ engine: 'DuckDuckGo', error: error.message, results: [] }))
  );

  // 8. Wikipedia API
  searchPromises.push(
    searchWikipediaUltimate(query, 3)
      .then(results => ({ engine: 'Wikipedia', results }))
      .catch(error => ({ engine: 'Wikipedia', error: error.message, results: [] }))
  );

  // Execute ALL searches in parallel
  const searchResults = await Promise.allSettled(searchPromises);

  // Process all results
  searchResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.results?.length > 0) {
      allResults.push(...result.value.results);
      searchEnginesUsed.push(result.value.engine);
      console.log(`✅ ${result.value.engine}: ${result.value.results.length} results`);
    } else if (result.status === 'fulfilled' && result.value.error) {
      console.log(`❌ ${result.value.engine}: ${result.value.error}`);
    }
  });

  // Remove duplicates and enhance ranking
  const finalResults = enhanceAndDeduplicate(allResults, maxResults);

  const searchTime = Date.now() - startTime;
  
  // Calculate source breakdown
  const sourceBreakdown: { [key: string]: number } = {};
  finalResults.forEach(result => {
    sourceBreakdown[result.source] = (sourceBreakdown[result.source] || 0) + 1;
  });

  console.log(`🎯 ULTIMATE SEARCH COMPLETE: ${finalResults.length} results from ${searchEnginesUsed.length} engines in ${searchTime}ms`);

  return {
    results: finalResults,
    totalResults: finalResults.length,
    searchEnginesUsed,
    searchTime,
    query,
    timestamp: new Date().toISOString(),
    sourceBreakdown
  };
}

// Individual search engine implementations

async function searchTavilyUltimate(query: string, maxResults: number): Promise<UltimateSearchResult[]> {
  const response = await axios.post('https://api.tavily.com/search', {
    query,
    search_depth: 'advanced',
    include_answer: true,
    max_results: maxResults,
    include_raw_content: false
  }, {
    headers: { 'Content-Type': 'application/json', 'x-api-key': TAVILY_API_KEY },
    timeout: 20000
  });

  return response.data?.results?.map((item: any) => ({
    title: item.title || 'Tavily Result',
    content: item.content || '',
    url: item.url || '',
    score: item.relevance_score || 1.0,
    source: 'Tavily',
    publishedDate: item.published_date,
    domain: extractDomain(item.url)
  })) || [];
}

async function searchBraveUltimate(query: string, maxResults: number): Promise<UltimateSearchResult[]> {
  const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
    params: { q: query, count: maxResults, search_lang: 'en', freshness: 'week' },
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': BRAVE_API_KEY },
    timeout: 15000
  });

  return response.data?.web?.results?.map((item: any) => ({
    title: item.title || 'Brave Result',
    content: item.description || '',
    url: item.url || '',
    score: 1.0,
    source: 'Brave',
    domain: extractDomain(item.url)
  })) || [];
}

async function searchNewsDataUltimate(query: string, maxResults: number): Promise<UltimateSearchResult[]> {
  const response = await axios.get('https://newsdata.io/api/1/news', {
    params: { apikey: NEWSDATA_API_KEY, q: query, language: 'en', size: maxResults },
    timeout: 15000
  });

  return response.data?.results?.map((item: any) => ({
    title: item.title || 'News Article',
    content: item.description || item.content || '',
    url: item.link || '',
    score: 1.0,
    source: 'NewsData',
    publishedDate: item.pubDate,
    domain: extractDomain(item.link)
  })).filter((result: UltimateSearchResult) => result.url) || [];
}

async function searchSerpApiUltimate(query: string, maxResults: number): Promise<UltimateSearchResult[]> {
  const response = await axios.get('https://serpapi.com/search', {
    params: { api_key: SERP_API_KEY, q: query, engine: 'google', num: maxResults },
    timeout: 15000
  });

  return response.data?.organic_results?.map((item: any) => ({
    title: item.title || 'SERP Result',
    content: item.snippet || '',
    url: item.link || '',
    score: 1.0,
    source: 'SERP',
    domain: extractDomain(item.link)
  })) || [];
}

async function searchBingUltimate(query: string, maxResults: number): Promise<UltimateSearchResult[]> {
  const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
    params: { q: query, count: maxResults },
    headers: { 'Ocp-Apim-Subscription-Key': BING_API_KEY },
    timeout: 15000
  });

  return response.data?.webPages?.value?.map((item: any) => ({
    title: item.name || 'Bing Result',
    content: item.snippet || '',
    url: item.url || '',
    score: 1.0,
    source: 'Bing',
    domain: extractDomain(item.url)
  })) || [];
}

async function searchGoogleUltimate(query: string, maxResults: number): Promise<UltimateSearchResult[]> {
  const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
    params: { key: GOOGLE_API_KEY, cx: GOOGLE_CSE_ID, q: query, num: Math.min(maxResults, 10) },
    timeout: 15000
  });

  return response.data?.items?.map((item: any) => ({
    title: item.title || 'Google Result',
    content: item.snippet || '',
    url: item.link || '',
    score: 1.0,
    source: 'Google',
    domain: extractDomain(item.link)
  })) || [];
}

async function searchDuckDuckGoUltimate(query: string, maxResults: number): Promise<UltimateSearchResult[]> {
  const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
    timeout: 10000
  });

  const results: UltimateSearchResult[] = [];
  
  if (response.data.RelatedTopics) {
    response.data.RelatedTopics.slice(0, maxResults).forEach((topic: any) => {
      if (topic.FirstURL && topic.Text) {
        results.push({
          title: topic.Text.split(' - ')[0] || 'DuckDuckGo Result',
          content: topic.Text || '',
          url: topic.FirstURL || '',
          score: 0.8,
          source: 'DuckDuckGo',
          domain: extractDomain(topic.FirstURL)
        });
      }
    });
  }

  return results;
}

async function searchWikipediaUltimate(query: string, maxResults: number): Promise<UltimateSearchResult[]> {
  const response = await axios.get('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(query), {
    timeout: 10000
  });

  if (response.data?.extract) {
    return [{
      title: response.data.title || 'Wikipedia Article',
      content: response.data.extract || '',
      url: response.data.content_urls?.desktop?.page || '',
      score: 1.0,
      source: 'Wikipedia',
      domain: 'wikipedia.org'
    }];
  }

  return [];
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

function enhanceAndDeduplicate(results: UltimateSearchResult[], maxResults: number): UltimateSearchResult[] {
  const seen = new Set<string>();
  const sourcePriority: { [key: string]: number } = {
    'Tavily': 10,
    'Google': 9,
    'Bing': 8,
    'Brave': 7,
    'SERP': 6,
    'NewsData': 5,
    'Wikipedia': 4,
    'DuckDuckGo': 3
  };

  const unique = results.filter(result => {
    if (!result.url || seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  });

  // Enhanced sorting with multiple factors
  unique.sort((a, b) => {
    // 1. Source priority
    const priorityDiff = (sourcePriority[b.source] || 1) - (sourcePriority[a.source] || 1);
    if (priorityDiff !== 0) return priorityDiff;
    
    // 2. Score
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    
    // 3. Content length (more content = better)
    return (b.content?.length || 0) - (a.content?.length || 0);
  });

  return unique.slice(0, maxResults);
}
