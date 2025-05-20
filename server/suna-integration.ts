import axios from 'axios';
import { Request, Response } from 'express';
import { llmService } from './llm';
import { v4 as uuidv4 } from 'uuid';
import { researchService, ResearchDepth } from './deerflow-integration';

// Simple in-memory cache for web search results
interface CacheEntry {
  results: any;
  timestamp: number;
  queryUsed: string;
}

// Map of query hash -> cache entry
const searchCache = new Map<string, CacheEntry>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Maximum cache size (number of entries)
const MAX_CACHE_SIZE = 50;

// Simple hash function for queries
function hashQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Check if cache entry is still valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

// Clean expired entries from cache
function cleanupCache(): void {
  const now = Date.now();
  let expiredCount = 0;
  
  // Remove expired entries
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      searchCache.delete(key);
      expiredCount++;
    }
  }
  
  // If cache is still too large after removing expired entries,
  // remove oldest entries until we're under the limit
  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(searchCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
    const toRemove = entries.slice(0, searchCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => searchCache.delete(key));
    
    console.log(`Cache cleanup: removed ${expiredCount} expired entries and ${toRemove.length} old entries`);
  } else if (expiredCount > 0) {
    console.log(`Cache cleanup: removed ${expiredCount} expired entries`);
  }
}

// Run cache cleanup every minute
setInterval(cleanupCache, 60 * 1000);

// Web search functionality using multiple search engines
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Perform a web search using Tavily API
 * @param query Search query string
 * @returns Search results from Tavily
 */
async function performTavilySearch(query: string) {
  try {
    console.log('Performing Tavily web search for:', query);
    
    const response = await axios.post(
      TAVILY_SEARCH_URL,
      {
        query: query,
        search_depth: 'advanced',  // basic or advanced
        include_domains: [],        // optional specific domains to include
        exclude_domains: [],        // optional specific domains to exclude
        max_results: 5,             // number of results to return
        include_answer: true,       // include an AI generated answer
        include_raw_content: false, // include raw content of each search result
        max_tokens: 800,            // max tokens in the answer
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TAVILY_API_KEY}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error with Tavily web search:', error);
    return { error: 'Failed to perform Tavily web search' };
  }
}

/**
 * Perform a web search using Brave Search API
 * @param query Search query string
 * @returns Search results from Brave
 */
async function performBraveSearch(query: string) {
  try {
    console.log('Performing Brave web search for:', query);
    
    const response = await axios.get(
      BRAVE_SEARCH_URL,
      {
        params: {
          q: query,
          count: 5,
          search_lang: 'en',
          text_decorations: false,
          freshness: 'day'  // Search for recent content
        },
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error with Brave web search:', error);
    return { error: 'Failed to perform Brave web search' };
  }
}

/**
 * Perform a combined web search using multiple search engines
 * @param query Search query string
 * @returns Combined search results from multiple sources
 */
async function performWebSearch(query: string) {
  try {
    // Normalize query for caching
    const queryHash = hashQuery(query);
    
    // Check cache first
    if (searchCache.has(queryHash)) {
      const cacheEntry = searchCache.get(queryHash)!;
      
      // If cache is still valid, use it
      if (isCacheValid(cacheEntry)) {
        console.log(`Using cached search results for query: "${query}" (originally queried as: "${cacheEntry.queryUsed}")`);
        return cacheEntry.results;
      } else {
        // Remove expired cache entry
        searchCache.delete(queryHash);
        console.log(`Cache entry expired for query: "${query}"`);
      }
    }
    
    console.log('Performing combined web search for:', query);
    
    // Run both searches in parallel for faster response
    const [tavilyResults, braveResults] = await Promise.allSettled([
      performTavilySearch(query),
      BRAVE_API_KEY ? performBraveSearch(query) : Promise.resolve({ error: 'Brave API key not configured' })
    ]);
    
    // Process Tavily results
    const tavilyData = tavilyResults.status === 'fulfilled' ? tavilyResults.value : { error: 'Tavily search failed' };
    
    // Process Brave results
    const braveData = braveResults.status === 'fulfilled' ? braveResults.value : { error: 'Brave search failed' };
    
    // Combine the results
    const combinedResults = {
      tavilyResults: tavilyData,
      braveResults: braveData.error ? { error: braveData.error } : braveData,
      answer: tavilyData.answer || '',
      results: []
    };
    
    // Add Tavily results
    if (!tavilyData.error && tavilyData.results) {
      combinedResults.results = [...tavilyData.results];
    }
    
    // Add Brave results
    if (!braveData.error && braveData.web && braveData.web.results) {
      const braveWebResults = braveData.web.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.description,
        source: 'brave'
      }));
      combinedResults.results = [...combinedResults.results, ...braveWebResults];
    }
    
    // Store in cache
    searchCache.set(queryHash, {
      results: combinedResults,
      timestamp: Date.now(),
      queryUsed: query
    });
    
    console.log(`Web search completed. Cache now has ${searchCache.size} entries`);
    return combinedResults;
  } catch (error) {
    console.error('Error with combined web search:', error);
    return { error: 'Failed to perform web search' };
  }
}

// Configuration for LLM APIs (used for Suna agent functionality)
// DeepSeek
const DEEPSEEK_API_ENDPOINT = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const SUNA_API_URL = 'integrated'; // Using integrated approach with DeepSeek directly

// In-memory implementation for Suna features
const USE_MOCK_SUNA = false; // Always use direct integration

console.log('Using integrated DeepSeek API for Suna agent capabilities');

/**
 * Interface for Suna API requests
 */
interface SunaRequest {
  query: string;
  userId: string;
  conversationId?: string;
  tools?: string[];
  projectId?: string;
  threadId?: string;
  model?: string;
  researchDepth?: number;     // 1-3 scale for research depth level
  searchPreferences?: {
    forceSearch?: boolean;    // Force web search even if not detected automatically
    disableSearch?: boolean;  // Disable web search for this query
    priority?: 'relevance' | 'freshness'; // Sort by relevance (default) or freshness
    maxResults?: number;      // Maximum number of results to return
  };
}

/**
 * Message structure for Suna conversations
 */
interface SunaMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  modelUsed?: string;
  webSearchUsed?: boolean;
  searchMetadata?: {
    query?: string;         // The actual search query used
    sources?: string[];     // List of source domains used
    resultCount?: number;   // Number of results found
    searchEngines?: string[]; // Which search engines were used
    searchTime?: number;    // How long the search took in ms
    sourceDetails?: {       // Detailed source information
      title: string;        // Article title
      url: string;          // Full article URL
      domain: string;       // Domain name
    }[];
  };
}

/**
 * Conversation structure for Suna
 */
interface SunaConversation {
  id: string;
  title: string;
  messages: SunaMessage[];
  createdAt: string;
  userId: string;
}

/**
 * Agent run response structure
 */
interface AgentRunResponse {
  runId: string;
  status: string;
  output?: string;
  threadId: string;
  projectId: string;
}

// In-memory storage for mock mode
const mockConversations: Record<string, SunaConversation> = {};

/**
 * Suna integration service for communicating with the Suna backend
 */
export class SunaIntegrationService {
  private projectId: string;
  private apiKey: string | null = null;
  
  constructor() {
    // Default project ID for all users in Suna
    this.projectId = process.env.SUNA_PROJECT_ID || 'tongkeeper-default';
    this.apiKey = process.env.DEEPSEEK_API_KEY || null;
    
    if (!USE_MOCK_SUNA && !this.apiKey) {
      console.warn('No DeepSeek API key found. Some features may not work correctly.');
    } else if (this.apiKey) {
      console.log('DeepSeek API key detected for Suna integration');
    }
  }
  
  /**
   * Set the API key for Suna
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Determine if a query needs web search
   * Enhanced heuristic for context-aware search decisions and better query analysis
   */
  private needsWebSearch(query: string, messages: any[] = []): boolean {
    // Standard terms that often require up-to-date information
    const generalWebSearchTerms = [
      'current', 'latest', 'recent', 'news', 'today', 'yesterday', 'tonight',
      'this week', 'this month', 'this year', 'happening', 'live', 'trending',
      'right now', 'upcoming', 'schedule', 'next', 'previous'
    ];
    
    // Sports-related queries
    const sportsTerms = [
      'match', 'game', 'score', 'vs', 'versus', 'tournament', 'championship',
      'league', 'final', 'semifinal', 'quarterfinal', 'standings', 'ranking',
      'season', 'player', 'team', 'transfer', 'win', 'lose', 'draw', 'result',
      'playoff', 'sports', 'athlete', 'olympics', 'world cup'
    ];
    
    // News, politics, and events
    const newsTerms = [
      'election', 'politics', 'voted', 'presidential', 'government', 'congress',
      'senate', 'house', 'prime minister', 'minister', 'president', 'mayor',
      'governor', 'announced', 'conference', 'summit', 'meeting', 'speech',
      'passed away', 'died', 'arrested', 'controversy', 'scandal', 'protest'
    ];
    
    // Financial terms
    const financialTerms = [
      'stock', 'price', 'market', 'index', 'nasdaq', 'nyse', 'dow', 's&p',
      'investment', 'crypto', 'bitcoin', 'ethereum', 'currency', 'exchange rate',
      'interest rate', 'inflation', 'recession', 'fed', 'federal reserve',
      'economy', 'economic', 'quarterly', 'earnings', 'financial', 'trading'
    ];
    
    // Weather and natural events
    const weatherTerms = [
      'weather', 'forecast', 'temperature', 'rain', 'snow', 'storm', 'hurricane',
      'tornado', 'earthquake', 'climate', 'disaster', 'flooding', 'drought',
      'celsius', 'fahrenheit', 'conditions', 'sunny', 'cloudy', 'humid'
    ];
    
    // Technology and product releases
    const techTerms = [
      'released', 'announced', 'launch', 'update', 'version', 'upgrade',
      'device', 'phone', 'iphone', 'android', 'app', 'software', 'hardware',
      'release date', 'tech', 'technology', 'gadget', 'smartphone', 'computer',
      'laptop', 'tablet', 'ios', 'windows', 'macos', 'beta'
    ];
    
    // Common question formats that often need current data
    const questionPatterns = [
      'who won', 'what happened', 'when is', 'where is', 'how much is',
      'how many', 'why did', 'which', 'whose', 'what is the latest',
      'is there', 'will there be', 'what are', 'can you find', 'look up',
      'search for', 'tell me about', 'do you know', 'have you heard',
      'what does', 'where can', 'who is', 'show me', 'find information'
    ];
    
    // Explicitly indicates search needs
    const explicitSearchTerms = [
      'search', 'find', 'look up', 'google', 'search engine', 'browser',
      'internet', 'web', 'online', 'research', 'information about'
    ];
    
    // Year patterns that might indicate need for current information
    const yearPattern = /202[0-9]/;
    
    // Location/place patterns often requiring current info
    const locationPattern = /(in|at|near|around) [A-Z][a-z]+(,|\.| )/;
    
    // Patterns indicating comparison/stats that benefit from search
    const comparisonPattern = /(compare|versus|vs\.?|comparison|difference between|better than)/i;
    
    // Combine all the term lists
    const allTerms = [
      ...generalWebSearchTerms,
      ...sportsTerms,
      ...newsTerms, 
      ...financialTerms,
      ...weatherTerms,
      ...techTerms,
      ...questionPatterns,
      ...explicitSearchTerms
    ];
    
    const lowerQuery = query.toLowerCase();
    
    // Context awareness: Check if this appears to be a follow-up question that needs context
    const isLikelyFollowUp = messages.length > 0 && 
      (lowerQuery.includes('what about') || 
       lowerQuery.startsWith('and') || 
       lowerQuery.startsWith('what if') || 
       lowerQuery.startsWith('how about'));
       
    // If it's a follow-up, check the previous messages for search triggers
    if (isLikelyFollowUp && messages.length > 0) {
      // Get the last two messages to establish context
      const recentMessages = messages.slice(-2).map(m => 
        typeof m.content === 'string' ? m.content.toLowerCase() : '');
        
      // Check if previous messages had search terms
      const previousMessageHadSearchTerms = recentMessages.some(content => 
        allTerms.some(term => content.includes(term)));
        
      // If previous message triggered search, this follow-up probably needs it too
      if (previousMessageHadSearchTerms) {
        return true;
      }
    }
    
    // Check for year mentions (like 2023, 2024, 2025)
    if (yearPattern.test(query)) {
      return true;
    }
    
    // Check for location mentions that likely need current info
    if (locationPattern.test(query)) {
      return true;
    }
    
    // Check for comparison questions that benefit from search
    if (comparisonPattern.test(query)) {
      return true;
    }
    
    // Query refinement: Check if query explicitly asks for facts or details
    if (/\bfact(s|ual)?\b|\bdetail(s|ed)?\b|\bstatistic(s|al)?\b|\bdata\b|\binformation\b/i.test(query)) {
      return true;
    }
    
    // Check for explicit search requests
    if (explicitSearchTerms.some(term => lowerQuery.includes(term))) {
      return true;
    }
    
    // Check for any other term matches
    return allTerms.some(term => lowerQuery.includes(term));
  }

  /**
   * Call Gemini API to generate a response
   * @param messages Array of conversation messages
   * @param model Gemini model to use
   * @returns Generated response from Gemini
   */
  private async callGeminiAPI(messages: any[], model: string = 'gemini-1.5-flash') {
    try {
      console.log(`Calling Gemini API (${model}) for response`);
      
      // Convert messages to Gemini format
      const geminiMessages = messages.map(msg => {
        if (msg.role === 'system') {
          // Gemini doesn't support system messages directly, so we convert to user message
          return {
            role: 'user',
            parts: [{text: `${msg.content}\n\nPlease acknowledge these instructions.`}]
          };
        } else if (msg.role === 'assistant') {
          return {
            role: 'model',
            parts: [{text: msg.content}]
          };
        } else {
          return {
            role: 'user',
            parts: [{text: msg.content}]
          };
        }
      });
      
      // Remove the initial acknowledgment from the assistant if it exists
      if (geminiMessages.length > 1 && geminiMessages[1]?.role === 'model') {
        geminiMessages.splice(1, 1);
      }
      
      // Call the Gemini API
      const response = await axios.post(
        `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.9,
            topK: 40,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        }
      );
      
      // Extract and return the generated text
      if (response.data.candidates && response.data.candidates.length > 0) {
        return response.data.candidates[0].content.parts[0].text;
      }
      
      throw new Error('No valid response from Gemini API');
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }

  /**
   * Send a message to the Suna agent (using the selected LLM)
   */
  async sendMessage(data: SunaRequest): Promise<any> {
    try {
      const selectedModel = data.model || 'deepseek-chat';
      console.log(`Processing Suna agent message with model ${selectedModel}:`, data.query);
      
      // If no thread ID is provided, we need to create a new thread
      if (!data.threadId) {
        // Create a thread first
        const threadResponse = await this.createThread(data.userId);
        data.threadId = threadResponse.threadId;
      }

      // Ensure threadId is available
      if (!data.threadId) {
        data.threadId = `thread-${uuidv4()}`;
      }

      // Get conversation history
      let conversation;
      try {
        conversation = await this.getConversation(data.userId, data.threadId);
      } catch (e) {
        // Initialize new conversation if retrieval fails
        conversation = {
          id: data.threadId,
          title: 'New Conversation',
          messages: [],
          createdAt: new Date().toISOString(),
          userId: data.userId
        };
      }
      
      // Determine if web search is needed based on the query, context, and user preferences
      let webSearchResults: any = null;
      let webSearchContent = '';
      let searchMetadata: SunaMessage['searchMetadata'] = undefined;
      
      // Check for explicit search commands in the query (like /search)
      const explicitSearchCommand = data.query.match(/^\/search\s+(.*)/i);
      const forceSearch = explicitSearchCommand || (data.searchPreferences?.forceSearch === true);
      
      // Honor user preference to disable search if explicitly set
      const disableSearch = data.searchPreferences?.disableSearch === true;
      
      // Get max results from preferences or default to 5
      const maxResults = data.searchPreferences?.maxResults || 5;
      
      // Determine if we should perform web search
      const shouldSearch = !disableSearch && 
        ((TAVILY_API_KEY || BRAVE_API_KEY) && 
         (forceSearch || this.needsWebSearch(data.query, conversation.messages)));
      
      if (shouldSearch) {
        try {
          // Track search start time for metrics
          const searchStartTime = Date.now();
          
          // If this is an explicit search command, extract the actual query
          let refinedQuery = explicitSearchCommand ? 
            explicitSearchCommand[1] : // Use the query part after /search
            data.query;
            
          // Check if this is a follow-up question requiring context from previous conversation
          const isFollowUp = !explicitSearchCommand && conversation.messages.length > 0 && 
            (/^(what|how|when|where|who|why|can|could|would|is|are|was) about/i.test(refinedQuery) || 
             /^and/i.test(refinedQuery) || 
             /^what if/i.test(refinedQuery));
             
          if (isFollowUp && conversation.messages.length >= 2) {
            // Get previous user query to add context
            const previousUserMessages = conversation.messages
              .filter((msg: SunaMessage) => msg.role === 'user')
              .slice(-2);
              
            if (previousUserMessages.length > 0) {
              // Combine with previous query for more context
              const contextWords = previousUserMessages[0].content
                .split(' ')
                .filter((word: string) => word.length > 3) // Only use significant words
                .slice(0, 5); // Take up to 5 key words for context
              
              // Create a better search query with context
              refinedQuery = `${data.query} ${contextWords.join(' ')}`;
              console.log(`Enhanced follow-up query with context: ${refinedQuery}`);
            }
          }
          
          // Remove question words and focus on key terms for better search
          const finalQuery = refinedQuery
            .replace(/^(what|how|when|where|who|why|can you|could you|would you|tell me|do you know|i need to know|i want to know|please find|search for|look up)/i, '')
            .trim();
          
          // Get the research depth level (default to 1 if not specified)
          const researchDepth = data.researchDepth || 1;
          
          // For depth level 3, use DeerFlow research service
          if (researchDepth === 3) {
            console.log(`Using DeerFlow for deep research (level 3) on: "${finalQuery}"`);
            
            try {
              // Determine model ID based on the selected LLM
              const modelId = data.model === 'gemini-1.5-flash' ? 'gemini-1.5-flash' : 
                             data.model === 'gemini-1.0-pro' ? 'gemini-1.5-pro' : 'deepseek-v3';
              
              // Call DeerFlow research service via the research service
              const deerflowResult = await researchService.performResearch({
                query: finalQuery,
                depth: ResearchDepth.Deep,
                modelId: modelId
              });
              
              if (deerflowResult && deerflowResult.report) {
                // Use DeerFlow results directly
                webSearchContent = `I'll help answer your question based on deep research:\n\n${deerflowResult.report}`;
                
                // Format source metadata
                const searchEndTime = Date.now();
                const sourceDomains: string[] = [];
                const sourceDetails: any[] = [];
                
                if (deerflowResult.sources && deerflowResult.sources.length > 0) {
                  deerflowResult.sources.forEach((source: any) => {
                    if (source.domain) sourceDomains.push(source.domain);
                    sourceDetails.push({
                      title: source.title || 'Source',
                      url: source.url || '',
                      domain: source.domain || ''
                    });
                  });
                }
                
                searchMetadata = {
                  query: finalQuery,
                  sources: sourceDomains,
                  resultCount: sourceDetails.length,
                  searchEngines: ['DeerFlow'],
                  searchTime: searchEndTime - searchStartTime,
                  sourceDetails
                };
              } else {
                // Fall back to regular search if DeerFlow returns no results
                console.log('DeerFlow research returned no results, falling back to regular search');
                webSearchResults = await performWebSearch(finalQuery);
              }
            } catch (error) {
              console.error('Error using DeerFlow research:', error);
              // Fall back to regular search on error
              console.log('Falling back to regular web search due to DeerFlow error');
              webSearchResults = await performWebSearch(finalQuery);
            }
          } else {
            // Use regular web search for depth levels 1 and 2
            console.log(`Web search using refined query: ${finalQuery}`);
            webSearchResults = await performWebSearch(finalQuery);
          }
          
          // Format search results only if there's no error
          if (!webSearchResults.error) {
            const searchResults = webSearchResults.results || [];
            
            // Collect source information for metadata
            const sourceDomains: string[] = [];
            const sourceUrls: {title: string, url: string, domain: string}[] = [];
            const usedSearchEngines: string[] = [];
            
            // Track which search engines were used
            if (!webSearchResults.error) {
              if (webSearchResults.tavilyResults && !webSearchResults.tavilyResults.error) {
                usedSearchEngines.push('Tavily');
              }
              if (webSearchResults.braveResults && !webSearchResults.braveResults.error) {
                usedSearchEngines.push('Brave');
              }
            }
            
            // Extract source information from results
            searchResults.forEach((result: any) => {
              if (result.url) {
                try {
                  const domain = new URL(result.url).hostname;
                  const title = result.title || domain;
                  
                  // Add domain to list of unique domains
                  if (!sourceDomains.includes(domain)) {
                    sourceDomains.push(domain);
                  }
                  
                  // Add full source information
                  sourceUrls.push({
                    title: title,
                    url: result.url,
                    domain: domain
                  });
                } catch (e) {
                  // Skip invalid URLs
                }
              }
            });
            
            // Calculate search time
            const searchEndTime = Date.now();
            const searchTimeMs = searchEndTime - searchStartTime;
            
            // Create search metadata with detailed source information
            searchMetadata = {
              query: finalQuery,
              sources: sourceDomains,
              resultCount: searchResults.length,
              searchEngines: usedSearchEngines,
              searchTime: searchTimeMs,
              sourceDetails: sourceUrls.map(src => ({
                title: src.title,
                url: src.url,
                domain: src.domain
              }))
            } as SunaMessage['searchMetadata'];
            
            // Log full source details to confirm they're being included
            console.log("Source details being added to metadata:", 
              JSON.stringify(sourceUrls, null, 2));
            
            // Sort results by relevance or freshness based on user preference
            const sortingStrategy = data.searchPreferences?.priority || 'relevance';
            
            const sortedResults = [...searchResults].sort((a: any, b: any) => {
              if (sortingStrategy === 'freshness') {
                // Sort by date if available (newer first)
                if (a.publishedDate && b.publishedDate) {
                  return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
                }
              }
              
              // Default to relevance sorting
              if (a.score && b.score) return b.score - a.score;
              return 0;
            }).slice(0, maxResults); // Limit to max results from preferences
            
            // Format search results for the LLM with improved readability and transparency
            // PHASE 3: IMPROVED RESULT INTEGRATION - Categorize and group results by topic
            const domains = new Map(); // Track domains for diversity
            
            // Extract key topics from results to group related information
            const keyTopics = new Map();
            const keyPhrases = new Set();
            
            // Extract topics and categorize results
            sortedResults.forEach((result: any) => {
              // Extract domain for source tracking
              let domain = 'Unknown Source';
              if (result.url) {
                try {
                  domain = new URL(result.url).hostname;
                  // Track domains and limit results per domain for diversity
                  domains.set(domain, (domains.get(domain) || 0) + 1);
                } catch (e) {
                  // Keep default if URL parsing fails
                }
              }
              
              // Extract potential key phrases from titles (simplified NLP)
              const title = result.title || '';
              const words = title.split(/\s+/).filter((w: string) => w.length > 3);
              
              // Find 2-3 word combinations as potential topics
              for (let i = 0; i < words.length - 1; i++) {
                const phrase = `${words[i]} ${words[i+1]}`.toLowerCase();
                keyPhrases.add(phrase);
                
                if (i < words.length - 2) {
                  const phrase3 = `${words[i]} ${words[i+1]} ${words[i+2]}`.toLowerCase();
                  keyPhrases.add(phrase3);
                }
              }
            });
            
            // Group results by key topics where possible
            let organizedResults = '';
            
            // Identify contradictions or different perspectives
            const contradictions = [];
            let hasContradictoryInfo = false;
            
            // Look for conflicting dates/numbers across sources
            const numericalFacts = new Map();
            const dateFacts = new Map();
            
            sortedResults.forEach((result: any) => {
              const content = result.content || result.description || '';
              
              // Extract dates (simple regex pattern)
              const dateMatches = content.match(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi);
              
              if (dateMatches) {
                dateMatches.forEach((date: string) => {
                  if (!dateFacts.has(date)) {
                    dateFacts.set(date, []);
                  }
                  dateFacts.get(date).push(result.url);
                });
              }
              
              // Extract numerical facts (simple pattern)
              const numberMatches = content.match(/\$\d+(?:\.\d+)?|\d+(?:\.\d+)? (?:percent|million|billion|trillion)/gi);
              
              if (numberMatches) {
                numberMatches.forEach((num: string) => {
                  if (!numericalFacts.has(num)) {
                    numericalFacts.set(num, []);
                  }
                  numericalFacts.get(num).push(result.url);
                });
              }
            });
            
            // Check for contradictory information in dates and numbers
            let contradictionInfo = '';
            
            // Check dates for contradictions (simple approach)
            const dateContradictions: string[] = [];
            dateFacts.forEach((sources, date) => {
              if (sources.length > 1) {
                // Multiple sources mentioning the same date - likely important
                dateContradictions.push(`Date "${date}" mentioned by ${sources.length} sources`);
              }
            });
            
            // Check numerical facts for contradictions
            const numberContradictions: string[] = [];
            numericalFacts.forEach((sources, number) => {
              if (sources.length > 1) {
                // Multiple sources mentioning the same number - likely important
                numberContradictions.push(`Value "${number}" mentioned by ${sources.length} sources`);
              }
            });
            
            // Add contradiction information if found
            if (dateContradictions.length > 0 || numberContradictions.length > 0) {
              contradictionInfo = `
Key Facts:
${dateContradictions.join('\n')}
${numberContradictions.join('\n')}
`;
            }
            
            // Extract top domains for source diversity info
            const topDomains = Array.from(domains.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([domain, count]) => `${domain} (${count} results)`);
            
            // Generate domain diversity information
            const diversityInfo = topDomains.length > 0 ?
              `Main sources: ${topDomains.join(', ')}` : '';
              
            // Extract common phrases as potential topics
            const topPhrases = Array.from(keyPhrases)
              .slice(0, 5)
              .join(', ');
              
            const topicsInfo = keyPhrases.size > 0 ?
              `Key topics: ${topPhrases}` : '';
            
            // Format the search results with improved organization and analysis
            webSearchContent = `
Web Search Results (${new Date().toLocaleString()}) - Found ${searchResults.length} results in ${searchTimeMs}ms:
${usedSearchEngines.length > 0 ? `Search engines used: ${usedSearchEngines.join(', ')}` : ''}
Search query: "${finalQuery}"

${diversityInfo ? `${diversityInfo}\n` : ''}
${topicsInfo ? `${topicsInfo}\n` : ''}
${contradictionInfo}

${sortedResults.map((result: any, index: number) => {
  // Extract domain from URL for better source attribution
  let domain = 'Unknown Source';
  if (result.url) {
    try {
      domain = new URL(result.url).hostname;
    } catch (e) {
      // Keep default domain if URL parsing fails
    }
  }
  
  // Evaluate recency and credibility (simple heuristics)
  const recencyIndicator = result.publishedDate ? 
    `Published: ${result.publishedDate}` : 
    '';
  
  // Format the result with better attribution and organization
  return `[${index + 1}] "${result.title || 'Untitled'}" 
Source: ${domain} ${result.source ? `via ${result.source}` : ''}
${recencyIndicator}
URL: ${result.url || 'No URL available'}
Content: ${result.content || result.description || 'No content available'}`;
}).join('\n\n') || 'No results found'}

${webSearchResults.answer ? `Search Answer: ${webSearchResults.answer}` : ''}

Current Date: ${new Date().toISOString().split('T')[0]}
`;
            console.log('Successfully retrieved web search results');
          }
        } catch (error) {
          console.error('Error performing web search:', error);
        }
      }
      
      // Prepare messages array with system prompt and history
      const messages = [
        {
          role: 'system',
          content: `You are Suna, an advanced open-source generalist AI agent designed to help accomplish real-world tasks. 
You are currently running in Tongkeeper, a family-oriented assistant platform.

In your full implementation, you have several powerful capabilities:
1. Browser automation to navigate websites and extract information
2. File management for document creation and editing
3. Web crawling and search capabilities using Tavily and Brave Search
4. Command-line execution for system tasks
5. Integration with various APIs and services

When responding to users, be:
- Helpful and informative with detailed, accurate responses
- Capable of solving complex problems with step-by-step reasoning
- Knowledgeable about a wide range of topics
- Professional but conversational in tone

When using web search results:
- Clearly cite your sources with proper attribution (e.g., "According to [Source]...")
- Integrate information from multiple sources when possible to provide comprehensive answers
- Pay special attention to the Key Facts section which highlights important information
- When multiple sources mention the same date or number, it's likely significant and reliable
- Organize your answer by topics when responding to complex questions
- Combine information from different sources to create a more complete picture
- Indicate when sources contradict each other and present both perspectives
- Compare the freshness of information and prioritize more recent sources when appropriate

${webSearchContent ? 'I have performed a web search for you and found the following information:' : 'If you need real-time information, I can perform a web search for you.'}

${webSearchContent ? webSearchContent : ''}

Use the current date and web search information when responding about current events, sports, news, or other timely topics. The current date is ${new Date().toISOString().split('T')[0]}.`
        }
      ];
      
      // Add conversation history (up to 10 previous messages)
      const historyMessages = conversation.messages
        .slice(-10)
        .map((msg: SunaMessage) => ({
          role: msg.role,
          content: msg.content
        }));
        
      messages.push(...historyMessages);
      
      // Add the current user message
      messages.push({
        role: 'user',
        content: data.query
      });
      
      // Create a user message in the conversation
      const userMessageId = `msg-${uuidv4()}`;
      const userMessage: SunaMessage = {
        id: userMessageId,
        content: data.query,
        role: 'user',
        timestamp: new Date().toISOString()
      };
      
      conversation.messages.push(userMessage);
      
      // Get response based on selected model
      let aiResponse = '';
      // Map API model names to display names
      let modelUsed = selectedModel;
      if (selectedModel === 'gemini-1.5-flash') {
        modelUsed = 'Gemini 1.5 Flash';
      } else if (selectedModel === 'gemini-1.0-pro') {
        modelUsed = 'Gemini 1.5 Pro';
      } else if (selectedModel === 'deepseek-chat') {
        modelUsed = 'DeepSeek';
      }
      
      // Log which model we're actually using, for clarity
      console.log(`Using ${modelUsed} (${selectedModel}) to generate response`);
      
      // Try the selected model first
      try {
        if (selectedModel.startsWith('gemini')) {
          // Call Gemini API
          aiResponse = await this.callGeminiAPI(messages, selectedModel);
        } else {
          // Default to DeepSeek API
          const response = await axios.post(
            DEEPSEEK_API_ENDPOINT,
            {
              model: DEEPSEEK_MODEL,
              messages,
              temperature: 0.7,
              max_tokens: 2000
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
              }
            }
          );
          
          // Extract the AI response
          aiResponse = response.data.choices[0].message.content;
        }
      } catch (error) {
        console.error(`Error with ${selectedModel} API:`, error);
        
        // Fall back to DeepSeek if Gemini fails
        if (selectedModel.startsWith('gemini') && DEEPSEEK_API_KEY) {
          console.log('Falling back to DeepSeek API');
          try {
            const fallbackResponse = await axios.post(
              DEEPSEEK_API_ENDPOINT,
              {
                model: DEEPSEEK_MODEL,
                messages,
                temperature: 0.7,
                max_tokens: 2000
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                }
              }
            );
            
            aiResponse = fallbackResponse.data.choices[0].message.content;
            modelUsed = 'deepseek-chat (fallback)';
          } catch (fallbackError) {
            console.error('Error with fallback to DeepSeek API:', fallbackError);
            throw new Error('Failed to generate response with any available model');
          }
        } else {
          throw error;
        }
      }
      
      // Create an assistant message with enhanced metadata about model and search
      const runId = `run-${uuidv4()}`;
      
      // Add article URLs to response for better source attribution
      if (searchMetadata?.sourceDetails && searchMetadata.sourceDetails.length > 0) {
        console.log("Adding source details to message metadata:", 
          JSON.stringify(searchMetadata.sourceDetails, null, 2));
        
        // Format source information in a way that's better for the UI
        // Using a dedicated "Sources:" section at the end rather than inline citations
        const sourceList = searchMetadata.sourceDetails.map((source, index) => 
          `[${index + 1}] ${source.title}\n${source.url}`).join('\n\n');
        
        // Instruct the AI to use a cleaner citation style
        // Add this instruction to the prompt for better formatting
        const formattingInstruction = `
Format citations properly by using superscript numbers like [1] at the end of sentences rather than inserting raw URLs or citation markers in the middle of sentences. Put all sources in a dedicated "Sources" section at the end of your response.
`;
        
        // Append source URLs to the bottom of the response for transparency
        if (!aiResponse.includes('Sources:')) {
          aiResponse += `\n\nSources:\n${sourceList}`;
        }
        
        // Make sure sourceDetails is properly structured in the metadata
        // This is a defensive measure to ensure the data reaches the frontend correctly
        console.log("Final metadata structure:", JSON.stringify({
          ...searchMetadata,
          sourceDetails: searchMetadata.sourceDetails.map(s => ({
            title: s.title,
            url: s.url,
            domain: s.domain
          }))
        }, null, 2));
      }
      
      const assistantMessage: SunaMessage = {
        id: runId,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        modelUsed: modelUsed,
        webSearchUsed: !!webSearchContent,
        searchMetadata: searchMetadata
      };
      
      // Add to conversation
      conversation.messages.push(assistantMessage);
      
      // Update conversation title if it's the first exchange
      if (conversation.messages.length === 2) {
        const titleLimit = Math.min(data.query.length, 30);
        conversation.title = data.query.substring(0, titleLimit) + (data.query.length > 30 ? '...' : '');
      }
      
      // Store the updated conversation
      if (data.threadId) {
        this.storeConversation(data.userId, data.threadId, conversation);
      }
      
      return {
        message: assistantMessage,
        threadId: data.threadId,
        runId,
        status: 'completed',
        webSearchUsed: !!webSearchContent,
        modelUsed
      };
    } catch (error) {
      console.error('Error with LLM API for Suna agent:', error);
      throw new Error('Failed to generate Suna agent response');
    }
  }
  
  /**
   * Store a conversation in memory
   */
  private storeConversation(userId: string, threadId: string, conversation: SunaConversation) {
    // Store conversation in memory map keyed by threadId
    const key = `${userId}:${threadId}`;
    mockConversations[key] = conversation;
  }

  /**
   * Create a new thread in Suna (using integrated approach)
   */
  async createThread(userId: string): Promise<any> {
    try {
      console.log('Creating a new conversation thread for user:', userId);
      
      // Generate a unique thread ID
      const threadId = `thread-${uuidv4()}`;
      
      // Create new conversation object
      const conversation: SunaConversation = {
        id: threadId,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        userId
      };
      
      // Store the conversation
      this.storeConversation(userId, threadId, conversation);
      
      console.log('Created new conversation thread:', threadId);
      return { threadId };
    } catch (error) {
      console.error('Error creating thread:', error);
      // Create a fallback thread ID if there's an error
      const fallbackThreadId = `thread-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.log('Created fallback thread ID:', fallbackThreadId);
      return { threadId: fallbackThreadId };
    }
  }

  /**
   * Get conversation/thread history (from in-memory storage)
   */
  async getConversation(userId: string, threadId: string): Promise<any> {
    try {
      console.log('Fetching conversation:', threadId);
      
      // Get conversation from memory
      const key = `${userId}:${threadId}`;
      const conversation = mockConversations[key];
      
      if (!conversation) {
        console.log('Conversation not found, creating new empty conversation');
        
        // Return empty conversation if not found
        return {
          id: threadId,
          title: 'Conversation',
          messages: [],
          createdAt: new Date().toISOString(),
          userId
        };
      }
      
      return conversation;
    } catch (error) {
      console.error('Error retrieving conversation:', error);
      // Return an empty conversation if retrieval fails
      return {
        id: threadId,
        title: 'Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        userId
      };
    }
  }

  /**
   * Get all conversations/threads for a user (from in-memory storage)
   */
  async getUserConversations(userId: string): Promise<any[]> {
    try {
      console.log('Getting all conversations for user:', userId);
      
      // Filter conversations by user ID
      return Object.values(mockConversations)
        .filter(conv => conv.userId === userId)
        .map(conv => ({
          id: conv.id,
          title: conv.title,
          createdAt: conv.createdAt,
          userId: conv.userId
        }));
    } catch (error) {
      console.error('Error retrieving user conversations:', error);
      // Return an empty array if retrieval fails
      return [];
    }
  }
}

// Export a singleton instance
export const sunaService = new SunaIntegrationService();

// Express route handlers for Suna integration
export const sendMessageToSuna = async (req: any, res: Response) => {
  try {
    const { message, threadId, model, researchDepth, searchPreferences } = req.body;
    const userId = req.user.claims.sub;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    console.log(`Processing message in conversation/thread: ${threadId} with model: ${model || 'default'}, research depth: ${researchDepth || 1}`);

    // Use threadId as the conversationId for consistency
    const conversationId = threadId;

    const sunaRequest: SunaRequest = {
      query: message,
      userId,
      conversationId: conversationId,
      threadId: conversationId,
      model: model, // Pass the selected model to the service
      researchDepth: researchDepth || 1, // Default to basic research if not specified
      searchPreferences: searchPreferences // Pass search preferences
    };

    const response = await sunaService.sendMessage(sunaRequest);
    return res.json(response);
  } catch (error) {
    console.error('Error in Suna message endpoint:', error);
    return res.status(500).json({ message: 'Failed to process request with Suna' });
  }
};

export const getSunaConversation = async (req: any, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.claims.sub;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const conversation = await sunaService.getConversation(userId, conversationId);
    return res.json(conversation);
  } catch (error) {
    console.error('Error retrieving Suna conversation:', error);
    return res.status(500).json({ message: 'Failed to retrieve conversation from Suna' });
  }
};

export const getUserConversations = async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const conversations = await sunaService.getUserConversations(userId);
    return res.json(conversations);
  } catch (error) {
    console.error('Error retrieving user conversations:', error);
    return res.status(500).json({ message: 'Failed to retrieve user conversations' });
  }
};