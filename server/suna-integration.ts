import { performTavilySearch, performBraveSearch } from './search-engines';

interface CacheEntry {
  results: any;
  timestamp: number;
  queryUsed: string;
}

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

interface SunaConversation {
  id: string;
  title: string;
  messages: SunaMessage[];
  createdAt: string;
  userId: string;
}

// Simple in-memory cache
const searchCache = new Map<string, CacheEntry>();
const conversations = new Map<string, SunaConversation>();

function hashQuery(query: string): string {
  return Buffer.from(query).toString('base64');
}

function isCacheValid(entry: CacheEntry): boolean {
  const MAX_AGE = 5 * 60 * 1000; // 5 minutes
  return Date.now() - entry.timestamp < MAX_AGE;
}

function cleanupCache(): void {
  const entries = Array.from(searchCache.entries());
  for (const [key, entry] of entries) {
    if (!isCacheValid(entry)) {
      searchCache.delete(key);
    }
  }
}

async function performWebSearch(query: string) {
  try {
    cleanupCache();
    const cacheKey = hashQuery(query);
    const cached = searchCache.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      console.log('Using cached search results for:', query);
      return cached.results;
    }

    console.log('Performing fresh web search for:', query);
    
    const [tavilyResults, braveResults] = await Promise.allSettled([
      performTavilySearch(query),
      performBraveSearch(query)
    ]);

    const combinedResults = {
      results: [] as any[],
      tavilyResults: tavilyResults.status === 'fulfilled' ? tavilyResults.value : { error: 'Failed' },
      braveResults: braveResults.status === 'fulfilled' ? braveResults.value : { error: 'Failed' }
    };

    // Combine results from both engines
    if (tavilyResults.status === 'fulfilled' && tavilyResults.value?.results) {
      combinedResults.results.push(...tavilyResults.value.results.map((r: any) => ({ ...r, source: 'Tavily' })));
    }
    if (braveResults.status === 'fulfilled' && braveResults.value?.results) {
      combinedResults.results.push(...braveResults.value.results.map((r: any) => ({ ...r, source: 'Brave' })));
    }

    // Cache the results
    searchCache.set(cacheKey, {
      results: combinedResults,
      timestamp: Date.now(),
      queryUsed: query
    });

    return combinedResults;
  } catch (error) {
    console.error('Error in performWebSearch:', error);
    return { results: [], error: true };
  }
}

export class SunaIntegrationService {
  private projectId: string;
  private apiKey: string | null = null;

  constructor() {
    this.projectId = process.env.REPLIT_DEPLOYMENT ? 'prod' : 'dev';
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private needsWebSearch(query: string, messages: any[] = []): boolean {
    const searchIndicators = [
      /what.*(?:news|latest|recent|current|today|happening)/i,
      /(?:search|find|look up|tell me about)/i,
      /(?:price|cost|stock|market)/i,
      /(?:weather|forecast)/i,
      /(?:when|where|who|how|why).*(?:is|are|was|were|did|does)/i,
      /(?:compare|vs|versus|difference between)/i,
      /(?:best|top|recommended|review)/i,
      /(?:definition|meaning|explain)/i
    ];

    const noSearchIndicators = [
      /^(?:hi|hello|hey|good morning|good afternoon|good evening)/i,
      /^(?:thank you|thanks|bye|goodbye)/i,
      /^(?:yes|no|ok|okay|sure)/i,
      /^(?:help|how to use)/i
    ];

    if (noSearchIndicators.some(pattern => pattern.test(query))) {
      return false;
    }

    return searchIndicators.some(pattern => pattern.test(query));
  }

  private async callGeminiAPI(messages: any[], model: string = 'gemini-1.5-flash') {
    // Note: This would require Google AI API key setup
    // For now, returning a placeholder response
    throw new Error('Gemini API not configured');
  }

  async sendMessage(data: SunaRequest): Promise<any> {
    try {
      const startTime = Date.now();
      let webSearchContent = '';
      let searchMetadata: SunaMessage['searchMetadata'] = undefined;
      
      // Determine if web search is needed
      const forceSearch = data.searchPreferences?.forceSearch || false;
      const disableSearch = data.searchPreferences?.disableSearch || false;
      const needsSearch = forceSearch || (!disableSearch && this.needsWebSearch(data.query));
      
      // Check research depth
      const researchDepth = data.researchDepth || 1;
      console.log(`Processing query with research depth: ${researchDepth}`);

      if (needsSearch) {
        const searchStartTime = Date.now();
        const maxResults = data.searchPreferences?.maxResults || 10;
        
        try {
          // For Research Depth 3, use DeerFlow comprehensive research
          if (researchDepth === 3) {
            console.log('Using DeerFlow comprehensive research for depth 3');
            // This would integrate with your DeerFlow service
            // For now, fall back to regular search
          }
          
          const webResults = await performWebSearch(data.query);
          
          if (webResults && webResults.results?.length > 0) {
            const results = webResults.results.slice(0, maxResults);
            
            webSearchContent = `Recent search results for "${data.query}":\n\n${
              results.map((result: any, index: number) => {
                const domain = result.url ? new URL(result.url).hostname : 'Unknown domain';
                return `[${index + 1}] "${result.title || 'Untitled'}" 
Source: ${domain}
URL: ${result.url || 'No URL available'}
Content: ${result.content || result.description || 'No content available'}`;
              }).join('\n\n')
            }\n\nCurrent Date: ${new Date().toISOString().split('T')[0]}`;

            const searchEndTime = Date.now();
            const sourceDomains = [...new Set(results.map((r: any) => {
              try { return new URL(r.url).hostname; } catch { return 'unknown'; }
            }))];

            searchMetadata = {
              query: data.query,
              sources: sourceDomains,
              resultCount: results.length,
              searchEngines: ['Tavily', 'Brave'],
              searchTime: searchEndTime - searchStartTime,
              sourceDetails: results.map((result: any) => ({
                title: result.title || 'Untitled',
                url: result.url || '',
                domain: result.url ? new URL(result.url).hostname : 'unknown'
              }))
            };
          }
        } catch (err) {
          console.error('Error performing web search:', err);
        }
      }

      // Prepare messages for AI model
      const messages = [
        {
          role: 'system',
          content: `You are Suna, an advanced AI assistant designed to help with real-world tasks.

${webSearchContent ? `Here's current information from web search:\n${webSearchContent}\n\n` : ''}

Provide helpful, accurate responses based on the available information.`
        },
        {
          role: 'user',
          content: data.query
        }
      ];

      // Select model based on research depth
      let selectedModel = 'gemini-1.5-flash';
      if (researchDepth === 3) {
        selectedModel = 'gemini-1.5-flash'; // High token limit for comprehensive reports
      }

      // For now, provide a basic response since AI APIs aren't configured
      const response = `I understand you're asking about: "${data.query}"

${webSearchContent ? 'Based on the latest search results, I can help you with this topic.' : 'I can help you with this query.'}

Research Depth: ${researchDepth}
${searchMetadata ? `Found ${searchMetadata.resultCount} relevant sources` : 'No web search performed'}

To provide more detailed responses, please ensure the AI API keys are properly configured.`;

      // Store conversation
      const conversationId = data.conversationId || data.threadId || `conv_${Date.now()}`;
      const conversation = conversations.get(conversationId) || {
        id: conversationId,
        title: data.query.slice(0, 50) + '...',
        messages: [],
        createdAt: new Date().toISOString(),
        userId: data.userId
      };

      const userMessage: SunaMessage = {
        id: `msg_${Date.now()}_user`,
        content: data.query,
        role: 'user',
        timestamp: new Date().toISOString()
      };

      const assistantMessage: SunaMessage = {
        id: `msg_${Date.now()}_assistant`,
        content: response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        modelUsed: selectedModel,
        webSearchUsed: needsSearch,
        searchMetadata: searchMetadata
      };

      conversation.messages.push(userMessage, assistantMessage);
      conversations.set(conversationId, conversation);

      return {
        output: response,
        threadId: conversationId,
        projectId: this.projectId,
        runId: `run_${Date.now()}`,
        status: 'completed',
        metadata: {
          modelUsed: selectedModel,
          webSearchUsed: needsSearch,
          researchDepth,
          processingTime: Date.now() - startTime,
          searchMetadata
        }
      };

    } catch (error) {
      console.error('Error in sendMessage:', error);
      return {
        output: 'I apologize, but I encountered an error processing your request. Please try again.',
        threadId: data.conversationId || `conv_${Date.now()}`,
        projectId: this.projectId,
        runId: `run_${Date.now()}`,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createThread(userId: string): Promise<{ threadId: string }> {
    const threadId = `thread_${Date.now()}_${userId}`;
    const conversation: SunaConversation = {
      id: threadId,
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      userId: userId
    };
    conversations.set(threadId, conversation);
    return { threadId };
  }

  async getConversation(userId: string, threadId: string): Promise<SunaConversation | null> {
    const conversation = conversations.get(threadId);
    if (conversation && conversation.userId === userId) {
      return conversation;
    }
    return null;
  }

  async getUserConversations(userId: string): Promise<SunaConversation[]> {
    return Array.from(conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const sunaService = new SunaIntegrationService();

export const sendMessageToSuna = async (req: any, res: any) => {
  try {
    const { query, userId, conversationId, tools, projectId, threadId, model, researchDepth, searchPreferences } = req.body;

    const sunaRequest: SunaRequest = {
      query,
      userId,
      conversationId,
      tools,
      projectId,
      threadId,
      model,
      researchDepth,
      searchPreferences
    };

    const result = await sunaService.sendMessage(sunaRequest);
    res.json(result);
  } catch (error) {
    console.error('Error in sendMessageToSuna:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getSunaConversation = async (req: any, res: any) => {
  try {
    const { threadId } = req.params;
    const { userId } = req.query;
    
    const conversation = await sunaService.getConversation(userId, threadId);
    if (conversation) {
      res.json(conversation);
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (error) {
    console.error('Error in getSunaConversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserConversations = async (req: any, res: any) => {
  try {
    const { userId } = req.query;
    const conversations = await sunaService.getUserConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};