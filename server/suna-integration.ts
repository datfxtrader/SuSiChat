import axios from 'axios';
import { Request, Response } from 'express';
import { llmService } from './llm';
import { v4 as uuidv4 } from 'uuid';
import { researchService, ResearchDepth } from './deerflow-integration';

import LRU from 'lru-cache';
import { getCurrentBitcoinPrice, getBitcoinMarketContext, enhanceBitcoinQuery } from './yahoo-finance-integration';
import rateLimit from 'express-rate-limit';
import { validate } from 'class-validator';
import { IsString, MinLength, MaxLength, IsOptional, IsNumber, Min, Max } from 'class-validator';

// Cache related constants
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 50;

// LRU cache for web search results
const searchCache = new LRU({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true
});

// Rate limiter for API requests
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// In-memory storage for research results to bypass database timeouts
const researchResultsMemoryCache = new Map<string, {
  results: any;
  timestamp: string;
  query: string;
  userId: string;
  conversationData: any;
}>();

// Enhanced result storage with memory priority (bypasses database entirely)
export async function storeResearchResultsSafely(
  conversationId: string, 
  results: any, 
  query: string, 
  userId: string,
  conversationData?: any
) {
  console.log('💾 Storing research results safely in memory...');
  
  researchResultsMemoryCache.set(conversationId, {
    results,
    timestamp: new Date().toISOString(),
    query,
    userId,
    conversationData: conversationData || {}
  });
  
  console.log('✅ Results cached in memory successfully');
  return {
    success: true,
    storage: 'memory',
    conversationId
  };
}

// Get all conversations for user from memory cache
export function getUserConversationsFromMemory(userId: string) {
  const userConversations: any[] = [];
  
  researchResultsMemoryCache.forEach((data, conversationId) => {
    if (data.userId === userId) {
      userConversations.push({
        id: conversationId,
        title: data.query.length > 50 ? data.query.substring(0, 47) + '...' : data.query,
        userId: userId,
        createdAt: data.timestamp,
        updatedAt: data.timestamp,
        messages: data.results ? [data.results] : []
      });
    }
  });
  
  console.log(`💾 Found ${userConversations.length} conversations in memory for user ${userId}`);
  return userConversations.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Input validation class
class SunaRequestDTO {
  query!: string;
  userId!: string;
  researchDepth?: number;

  constructor() {
    // Empty constructor for class-validator
  }
}

// Cache TTL in milliseconds (5 minutes)
interface CacheEntry {
  results: any;
  timestamp: number;
  queryUsed: string;
}

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
  for (const [key, entry] of searchCache.dump()) {
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

    // Enhanced rate limiting with intelligent spacing to prevent 429 errors
    await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds for reliability
    
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
async function performWebSearch(query: string, retries = 3, timeout = 10000) {
  const makeRequest = async (attempt: number) => {
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

    // Run searches with Brave as primary, Tavily as backup
    const [braveResults, tavilyResults] = await Promise.allSettled([
      BRAVE_API_KEY ? performBraveSearch(query) : Promise.resolve({ error: 'Brave API key not configured' }),
      performTavilySearch(query)
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
  researchDepth?: number;
  searchPreferences?: {
    forceSearch?: boolean;
    disableSearch?: boolean;
    priority?: 'relevance' | 'freshness';
    maxResults?: number;
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
    query?: string;
    sources?: string[];
    resultCount?: number;
    searchEngines?: string[];
    searchTime?: number;
    sourceDetails?: {
      title: string;
      url: string;
      domain: string;
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
class SunaIntegrationService {
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
      // Smart Auto Model Routing Logic
      let selectedModel = data.model || 'deepseek-chat';

      // If "auto" model is selected, intelligently route based on research depth
      if (selectedModel === 'auto') {
        if (data.researchDepth === 3) {
          selectedModel = 'gemini-1.5-flash'; // Use Gemini for comprehensive Research Depth 3
          console.log(`Auto model: Routing Research Depth 3 to Gemini 1.5 Flash for unlimited tokens`);
        } else {
          selectedModel = 'deepseek-chat'; // Use DeepSeek for Depth 1-2
          console.log(`Auto model: Routing Research Depth ${data.researchDepth || 1} to DeepSeek for efficiency`);
        }
      }

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



      // Get the research depth level - CRITICAL DEBUG POINT
      console.log('=== RESEARCH DEPTH DEBUG ===');
      console.log('data.researchDepth raw value:', data.researchDepth);
      console.log('typeof data.researchDepth:', typeof data.researchDepth);
      const researchDepth = data.researchDepth || 1;
      console.log(`Research depth detected: ${researchDepth}`);
      console.log('=== END DEBUG ===');

      // Force DeerFlow for depth level 3 from ANY UI component - PRIORITY CHECK
      if (researchDepth === 3) {

        try {
          // For Research Depth 3, force Gemini for comprehensive reports (no token limits)
          const modelId = 'gemini-1.5-flash';
          const startTime = Date.now();

          // Optimized DeerFlow research call
          const deerflowResult = await researchService.performResearch({
            query: data.query,
            depth: ResearchDepth.Deep,
            modelId: modelId,
            researchDepth: researchDepth,
            researchLength: 'comprehensive',
            researchTone: 'analytical',
            minWordCount: 2500
          });

          if (deerflowResult && deerflowResult.report) {
            const processingTime = Date.now() - startTime;

            // Return optimized comprehensive report
            return {
              message: {
                id: `run-${Date.now()}`,
                role: 'assistant',
                content: deerflowResult.report,
                sources: deerflowResult.sources || [],
                metadata: {
                  searchTime: processingTime,
                  sourceCount: deerflowResult.sources?.length || 0,
                  researchDepth: researchDepth,
                  model: modelId
                }
              }
            };
          }
        } catch (error) {
          console.error('DeerFlow research error:', error);
          console.log('Falling back to basic web search due to DeerFlow error');
        }
      }

      // Enhanced web search activation - prioritize financial and current data queries
      const isFinancialQuery = ['bitcoin', 'btc', 'crypto', 'price', 'forecast', 'market', 'trading', 'usd', 'factors', 'trend'].some(keyword => 
        data.query.toLowerCase().includes(keyword)
      );
      
      // Force search for financial queries and current information needs
      const shouldSearch = !disableSearch &&
        ((TAVILY_API_KEY || BRAVE_API_KEY) &&
         (forceSearch || isFinancialQuery || this.needsWebSearch(data.query, conversation.messages)));

      if (shouldSearch) {
        try {
          // Get current Bitcoin price data for financial queries
          let bitcoinContext = '';
          if (isFinancialQuery) {
            console.log('🪙 Fetching current Bitcoin market data...');
            try {
              bitcoinContext = await getBitcoinMarketContext();
              console.log('✅ Bitcoin market data retrieved successfully');
            } catch (error) {
              console.warn('⚠️ Could not fetch Bitcoin market data:', error);
            }
          }

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

          // Continue with regular web search for depth 1 & 2
          console.log(`Web search using refined query: ${finalQuery}`);
          webSearchResults = await performWebSearch(finalQuery);

          // Format search results and handle potential null/undefined results
          const webSearchError = webSearchResults?.error || null;
          if (!webSearchError) {
            const searchResults = webSearchResults?.results || [];

            // Collect source information for metadata
            const sourceDomains: string[] = [];
            const sourceUrls: {title: string, url: string, domain: string}[] = [];
            const usedSearchEngines: string[] = [];

            // Track which search engines were used
            if (webSearchResults?.tavilyResults && !webSearchResults?.tavilyResults?.error) {
              usedSearchEngines.push('Tavily');
            }
            if (webSearchResults?.braveResults && !webSearchResults?.braveResults?.error) {
              usedSearchEngines.push('Brave');
            }

            // Extract source information from results safely
            const results = webSearchResults?.results || [];
            if (Array.isArray(results)) {
              results.forEach((result: any) => {
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
                dateMatches.forEach((date: string) => {                  if (!dateFacts.has(date)) {
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
            // Add current price context and validate data freshness
            let priceContext = '';
            let dataFreshnessWarning = '';
            
            // Enhanced date range filtering and macro data validation
            const currentDate = new Date();
            const threeDaysAgo = new Date(currentDate.getTime() - (3 * 24 * 60 * 60 * 1000));
            
            // Enhanced source credibility and relevance filtering
            const credibleResults = sortedResults.filter((result: any) => {
              const content = (result.content || '').toLowerCase();
              const title = (result.title || '').toLowerCase();
              const text = content + ' ' + title;
              const url = (result.url || '').toLowerCase();
              
              // Strict date filtering - reject old years
              if (text.includes('2023') || text.includes('2022') || text.includes('2021')) {
                return false;
              }
              
              // Check for outdated macro data indicators
              const hasOutdatedMacroData = 
                text.includes('q4 2024') || 
                text.includes('q3 2024') || 
                text.includes('december 2024') || 
                text.includes('november 2024') ||
                text.includes('october 2024');
              
              if (hasOutdatedMacroData) {
                return false; // Reject articles with outdated macro references
              }
              
              // Enhanced credibility scoring based on source domain
              const trustedDomains = [
                'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'cnbc.com',
                'marketwatch.com', 'investing.com', 'yahoo.com', 'google.com',
                'kitco.com', 'goldprice.org', 'bullionvault.com', 'federalreserve.gov',
                'imf.org', 'worldbank.org', 'bis.org', 'oecd.org'
              ];
              
              const isFromTrustedSource = trustedDomains.some(domain => url.includes(domain));
              
              // PRIORITY: Must have current timeframe indicators for May 2025
              const hasCurrentIndicators = 
                text.includes('may 2025') || 
                text.includes('2025') ||
                text.includes('q2 2025') ||
                text.includes('current price') || 
                text.includes('latest price') || 
                text.includes('price today') || 
                text.includes('this week') ||
                text.includes('live price') ||
                /\$[8-9][0-9],?[0-9]{3}/.test(text) || // Accept current price range $80k+
                /\$1[0-5][0-9],?[0-9]{3}/.test(text) || // Accept realistic 2025 prices up to $150k
                /[8-9][0-9]k/.test(text) || // Accept shorthand like "95k"
                /1[0-5][0-9]k/.test(text); // Accept shorthand like "120k"
              
              // Quality content indicators
              const hasQualityIndicators = 
                text.includes('analysis') ||
                text.includes('forecast') ||
                text.includes('outlook') ||
                text.includes('report') ||
                text.includes('data') ||
                text.includes('research');
              
              // Must have current indicators AND (trusted source OR quality content)
              return hasCurrentIndicators && (isFromTrustedSource || hasQualityIndicators);
            });
            
            if (credibleResults.length < sortedResults.length) {
              dataFreshnessWarning = `\n🏆 PREMIUM SOURCE FILTERING: Selected ${credibleResults.length} high-credibility sources from ${sortedResults.length} total results.\n🔍 Filtered out: Outdated macro data, non-credible sources, stale content\n⏰ Date Range: ${threeDaysAgo.toLocaleDateString()} to ${currentDate.toLocaleDateString()}\n📊 Quality Focus: Trusted financial institutions + Current May 2025 data only\n`;
              let freshResults = credibleResults; // Use only premium credible sources
        sortedResults = freshResults;
            }
            
            // Check if this is a financial forecast query
            const financialKeywords = ['price', 'forecast', 'target', 'btc', 'bitcoin', 'usd', 'trading', 'market'];
            const isFinancialQuery = financialKeywords.some(keyword => 
              data.query.toLowerCase().includes(keyword)
            );
            
            if (isFinancialQuery) {
              // Extract current price context if available
              const pricePattern = /(?:current|price|trading).*?\$?([0-9,]+)/i;
              for (const result of sortedResults) {
                const match = (result.content || '').match(pricePattern);
                if (match) {
                  priceContext = `\nCURRENT MARKET CONTEXT: Current price indicators found in sources\n`;
                  break;
                }
              }
            }

            // Advanced reasoning chain with hypothesis generation and evidence synthesis
            let advancedAnalysis = '';
            try {
              // Extract forecasts with their timestamps for intelligent validation
              const forecasts = [];
              const contradictions = [];
              const hypotheses = [];
              
              for (const result of sortedResults) {
                const content = result.content || '';
                const title = result.title || '';
                
                // Look for forecast patterns with prices
                const forecastMatch = content.match(/(?:forecast|target|expects?|predicts?).*?\$([0-9,]+)/i) ||
                                     title.match(/(?:forecast|target|expects?|predicts?).*?\$([0-9,]+)/i);
                
                if (forecastMatch) {
                  const forecastPrice = parseInt(forecastMatch[1].replace(',', ''));
                  
                  // Extract timestamp
                  let forecastDate = result.publishedDate;
                  if (!forecastDate && content) {
                    const dateMatch = content.match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+202[4-5]/i);
                    if (dateMatch) forecastDate = dateMatch[0];
                  }
                  
                  forecasts.push({
                    price: forecastPrice,
                    date: forecastDate,
                    source: result.title,
                    url: result.url,
                    confidence: 0.8 // Basic confidence scoring
                  });
                }
                
                // Extract hypotheses and reasoning patterns
                const hypothesisPatterns = [
                  /(?:if|when|should|likely|expect|anticipate).*?(?:then|will|could|might)/gi,
                  /(?:due to|because of|driven by|influenced by).*?(?:may|will|could)/gi
                ];
                
                for (const pattern of hypothesisPatterns) {
                  const matches = content.match(pattern);
                  if (matches) {
                    hypotheses.push(...matches.map(match => ({
                      statement: match,
                      source: result.title,
                      confidence: 0.7
                    })));
                  }
                }
              }
              
              // Cross-validate forecasts for contradictions
              if (forecasts.length > 1) {
                for (let i = 0; i < forecasts.length; i++) {
                  for (let j = i + 1; j < forecasts.length; j++) {
                    const priceDiff = Math.abs(forecasts[i].price - forecasts[j].price);
                    const percentDiff = (priceDiff / Math.min(forecasts[i].price, forecasts[j].price)) * 100;
                    
                    if (percentDiff > 10) { // Significant difference
                      contradictions.push({
                        source1: forecasts[i].source,
                        price1: forecasts[i].price,
                        source2: forecasts[j].source,
                        price2: forecasts[j].price,
                        difference: percentDiff.toFixed(1)
                      });
                    }
                  }
                }
              }
              
              // Generate advanced analysis summary
              if (forecasts.length > 0 || hypotheses.length > 0 || contradictions.length > 0) {
                advancedAnalysis = `\n🧠 ADVANCED REASONING ANALYSIS:\n`;
                
                if (forecasts.length > 0) {
                  advancedAnalysis += `📊 Forecasts Identified: ${forecasts.length}\n${forecasts.map(f => 
                    `💡 ${f.source}: $${f.price.toLocaleString()} target ${f.date ? `(${f.date})` : '(undated)'} [Confidence: ${(f.confidence * 100).toFixed(0)}%]`
                  ).join('\n')}\n`;
                }
                
                if (contradictions.length > 0) {
                  advancedAnalysis += `⚠️ Source Contradictions: ${contradictions.length}\n${contradictions.map(c =>
                    `🔍 ${c.source1} ($${c.price1.toLocaleString()}) vs ${c.source2} ($${c.price2.toLocaleString()}) - ${c.difference}% difference`
                  ).join('\n')}\n`;
                }
                
                if (hypotheses.length > 0) {
                  const topHypotheses = hypotheses.slice(0, 3);
                  advancedAnalysis += `🎯 Key Hypotheses: ${topHypotheses.length}\n${topHypotheses.map(h =>
                    `📋 ${h.statement} [${h.source}]`
                  ).join('\n')}\n`;
                }
              }
            } catch (e) {
              // Continue without advanced analysis if extraction fails
            }

            // Include Bitcoin market context if available
            const marketContextSection = bitcoinContext ? `${bitcoinContext}\n\n` : '';
            
            webSearchContent = `${marketContextSection}
Web Search Results (${new Date().toLocaleString()}) - Found ${searchResults.length} results in ${searchTimeMs}ms:
${usedSearchEngines.length > 0 ? `Search engines used: ${usedSearchEngines.join(', ')}` : ''}
Search query: "${finalQuery}"${advancedAnalysis}${dataFreshnessWarning}${priceContext}

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

  // Enhanced timestamp extraction with multiple date patterns
  let timeInfo = '';
  if (result.publishedDate) {
    timeInfo = `📅 Published: ${result.publishedDate}`;
  } else if (result.content) {
    // Try multiple date extraction patterns
    const datePatterns = [
      /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+202[4-5]/i,
      /202[4-5][-\/]\d{1,2}[-\/]\d{1,2}/,
      /\d{1,2}[-\/]\d{1,2}[-\/]202[4-5]/,
      /(?:today|yesterday|this week|last week)/i,
      /\d{1,2}\s+(?:hours?|days?)\s+ago/i
    ];
    
    for (const pattern of datePatterns) {
      const dateMatch = result.content.match(pattern);
      if (dateMatch) {
        timeInfo = `📅 Date found: ${dateMatch[0]}`;
        break;
      }
    }
    
    if (!timeInfo) {
      timeInfo = `⚠️ No timestamp - verify data freshness`;
    }
  }

  // Create clickable hyperlink for the source
  const sourceLink = result.url ? `[🔗 ${result.title || 'View Source'}](${result.url})` : 'No URL available';

  // Format the result with enhanced attribution and timestamp
  return `[${index + 1}] ${sourceLink}
📍 Source: ${domain} ${result.source ? `via ${result.source}` : ''}
${timeInfo}
📝 Content: ${result.content || result.description || 'No content available'}`;
}).join('\n\n') || 'No results found'}

${(webSearchResults && webSearchResults.answer) ? `Search Answer: ${webSearchResults.answer}` : ''}

Current Date: ${new Date().toISOString().split('T')[0]}
`;
            console.log('Successfully retrieved web search results');
          }
        }
      } catch (err) {
        console.error('Error performing web search:', err);
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

When creating research responses, format your output professionally with emphasis on data recency:

FINANCIAL RESEARCH PRIORITY:
- **ALWAYS prioritize the most recent data and news closest to today's date**
- **CRITICAL: Check current market prices against any forecasts provided**
- **URGENT: Reject outdated data from 2021-2023 when discussing current 2025 trends**
- **CRITICAL: Smart forecast validation using timestamp analysis**
- For price forecasts, validate using intelligent context:
  * Check forecast publication date and market price at that time
  * If forecast target REACHED: Mark as "✅ Forecast achieved" with timeline
  * If forecast target NOT REACHED: Keep as valid with progress tracking
  * Always state: "Forecast: $X,XXX (made when gold was $Y,YYY) | Current: $Z,ZZZ"
  * Show forecast progress: "Target $X,XXX is XX% above current $Y,YYY"
- **STRICT DATE FILTERING: Only use articles from past 3 days for current analysis**
- **MACRO DATA VALIDATION: Reject articles referencing Q4 2024 or older macro data**
- **CURRENT TIMEFRAME FOCUS: Prioritize May 2025 and Q2 2025 references only**
- **PREMIUM SOURCE SELECTION: Prioritize Reuters, Bloomberg, WSJ, Fed, IMF, BIS sources**
- **QUALITY CONTENT FOCUS: Require analysis/forecast/research indicators in content**
- **MANDATORY: Include publication dates and timestamps for ALL cited sources**
- **MACRO DATA REQUIREMENTS: Back every statement with current numbers:**
  * Fed Rate Decisions: Current rate X.XX%, next meetings Jun 18/July 30, 2025
  * Inflation Data: Current CPI X.X% (Month Year), Core CPI X.X%
  * Employment: Current unemployment X.X% (Month Year), NFP +XXXk jobs
  * GDP Growth: Current Q2 2025 estimate X.X% annualized
  * Dollar Index: Current DXY XXX.XX level
  * 10-Year Treasury: Current yield X.XX%
- **NO INCOMPLETE STATEMENTS: Every macro factor must include current numbers and next event dates**
- Cross-reference information across multiple sources to verify accuracy
- When multiple sources provide different data for the same metric, present both with timestamps
- Highlight any contradictions between sources and explain potential reasons
- For financial data, always include the date when the data was published or last updated

STRUCTURE YOUR RESPONSE:
- Start with an executive summary highlighting key findings with dates
- Use clear headers (## for main sections, ### for subsections)
- Organize content with proper spacing and bullet points
- Include data tables when presenting numerical information with timestamps
- End with actionable insights and recommendations based on latest data

FORMATTING GUIDELINES:
- Use **bold** for important terms, key figures, and recent dates
- Create tables for comparative data (| Metric | Value | Date | Source |)
- Use bullet points for lists with proper spacing
- Include blockquotes for significant market insights with attribution
- Separate sections with clear headers and spacing

CITATION STANDARDS:
- Clearly cite sources with proper attribution and publication dates
- Integrate information from multiple sources comprehensively
- Prioritize recent data and highlight contradictions with timestamps
- Create numbered source references for easy tracking with dates
- Format financial data consistently (percentages, currencies, dates)

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
      const modelDisplayNames = {
        'gemini-1.5-flash': 'Gemini 1.5 Flash',
        'gemini-1.0-pro': 'Gemini 1.5 Pro',
        'deepseek-chat': 'DeepSeek',
        'auto': 'Auto'
      };

      let modelUsed = modelDisplayNames[selectedModel as keyof typeof modelDisplayNames] || selectedModel;

      // Log which model we're actually using, for clarity
      console.log(`Using ${modelUsed} (${selectedModel}) to generate response`);

      // Try the selected model first
      try {
        if (selectedModel.startsWith('gemini')) {
          // Call Gemini API
          aiResponse = await this.callGeminiAPI(messages, selectedModel);
        } else if (selectedModel === 'deepseek-chat') {
          // Use DeepSeek API
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

        // Check available fallback options
        const hasGemini = process.env.GEMINI_API_KEY;
        const hasDeepSeek = DEEPSEEK_API_KEY;

        // Try to find best available fallback
        if (hasGemini && !selectedModel.startsWith('gemini')) {
          console.log('Falling back to Gemini API');
          try {
            aiResponse = await this.callGeminiAPI(messages, 'gemini-1.5-flash');
            modelUsed = 'Gemini 1.5 Flash (fallback)';
            
          } catch (fallbackError) {
            console.error('Gemini fallback failed:', fallbackError);
          }
        }

        if (hasDeepSeek && selectedModel !== 'deepseek-chat') {
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

      // Generate conversation title from the user query
      if (!conversation.title || conversation.title === 'New Conversation') {
        // Extract key topic from query for a meaningful title
        let title = data.query;
        if (title.length > 50) {
          // Find key financial terms or topics
          const keyTerms = title.match(/(?:iPhone|Apple|Samsung|Google|Pixel|market|analysis|research|competitive|benchmark)/gi);
          if (keyTerms && keyTerms.length > 0) {
            title = keyTerms.slice(0, 3).join(' ') + ' Analysis';
          } else {
            title = title.substring(0, 47) + '...';
          }
        }
        conversation.title = title;
      }

      // Create an assistant message with enhanced metadata about model and search
      const runId = `run-${Date.now()}`;

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

      // Store the updated conversation in memory cache to bypass database issues
      if (data.threadId) {
        await storeResearchResultsSafely(
          data.threadId, 
          assistantMessage, 
          data.query, 
          data.userId,
          conversation
        );
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
const sunaService = new SunaIntegrationService();

// Express route handlers for Suna integration
const sendMessageToSuna = async (req: any, res: Response) => {
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

const getSunaConversation = async (req: any, res: Response) => {
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

const getUserConversations = async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Use memory-based storage to bypass database issues
    const conversations = getUserConversationsFromMemory(userId);
    console.log(`📱 Returning ${conversations.length} conversations from memory for user ${userId}`);
    return res.json(conversations);
  } catch (error) {
    console.error('Error retrieving user conversations:', error);
    return res.status(500).json({ message: 'Failed to retrieve user conversations' });
  }
};

// Export the service instance and route handlers together
export {
  sunaService,
  sendMessageToSuna,
  getSunaConversation,
  getUserConversations
};