import axios from 'axios';
import { Request, Response } from 'express';
import { llmService } from './llm';
import { v4 as uuidv4 } from 'uuid';

// Web search functionality using Tavily API
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';

/**
 * Perform a web search using Tavily API
 * @param query Search query string
 * @returns Search results from the web
 */
async function performWebSearch(query: string) {
  try {
    console.log('Performing web search for:', query);
    
    const response = await axios.post(
      TAVILY_SEARCH_URL,
      {
        query: query,
        search_depth: 'advanced',  // basic or advanced
        include_domains: [],        // optional specific domains to include
        exclude_domains: [],        // optional specific domains to exclude
        max_results: 8,             // number of results to return
        include_answer: true,       // include an AI generated answer
        include_raw_content: false, // include raw content of each search result
        max_tokens: 1000,          // max tokens in the answer
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
    return { error: 'Failed to perform web search' };
  }
}

// Configuration for the DeepSeek API (used for Suna agent functionality)
const DEEPSEEK_API_ENDPOINT = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
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
}

/**
 * Message structure for Suna conversations
 */
interface SunaMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
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
   * This is a simple heuristic - it can be made more sophisticated
   */
  private needsWebSearch(query: string): boolean {
    const webSearchTerms = [
      'current', 'latest', 'recent', 'news', 'today', 'vs', 'match', 'game',
      'score', 'weather', 'stock', 'price', 'covid', 'update', 'election',
      'result', 'data', 'stats', 'statistics', 'event', 'championship',
      'tournament', 'final', 'semifinal', 'quarterfinal', 
      'who won', 'what happened', 'when is', 'where is'
    ];
    
    const lowerQuery = query.toLowerCase();
    
    // Check if any web search terms are in the query
    return webSearchTerms.some(term => lowerQuery.includes(term));
  }

  /**
   * Send a message to the Suna agent (directly using DeepSeek API)
   */
  async sendMessage(data: SunaRequest): Promise<any> {
    try {
      console.log('Processing Suna agent message with DeepSeek:', data.query);
      
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
      
      // Determine if web search is needed based on the query
      let webSearchResults = null;
      let webSearchContent = '';
      
      if (TAVILY_API_KEY && this.needsWebSearch(data.query)) {
        try {
          webSearchResults = await performWebSearch(data.query);
          
          if (!webSearchResults.error) {
            // Format search results for the LLM
            webSearchContent = `
Web Search Results:
${webSearchResults.results?.map((result: any, index: number) => 
  `[${index + 1}] "${result.title}"
URL: ${result.url}
Content: ${result.content}
`).join('\n') || 'No results found'}

Search Answer: ${webSearchResults.answer || 'No answer available'}

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
3. Web crawling and search capabilities
4. Command-line execution for system tasks
5. Integration with various APIs and services

When responding to users, be:
- Helpful and informative with detailed, accurate responses
- Capable of solving complex problems with step-by-step reasoning
- Knowledgeable about a wide range of topics
- Professional but conversational in tone

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
      
      // Call DeepSeek API directly
      console.log('Calling DeepSeek API for Suna agent response');
      
      // Create a user message in the conversation
      const userMessageId = `msg-${uuidv4()}`;
      const userMessage: SunaMessage = {
        id: userMessageId,
        content: data.query,
        role: 'user',
        timestamp: new Date().toISOString()
      };
      
      conversation.messages.push(userMessage);
      
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
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      // Extract the AI response
      const aiResponse = response.data.choices[0].message.content;
      
      // Create an assistant message
      const runId = `run-${uuidv4()}`;
      const assistantMessage: SunaMessage = {
        id: runId,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date().toISOString()
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
        webSearchUsed: !!webSearchContent
      };
    } catch (error) {
      console.error('Error with DeepSeek API for Suna agent:', error);
      throw new Error('Failed to generate Suna agent response with DeepSeek API');
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
    const { message, threadId } = req.body;
    const userId = req.user.claims.sub;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    console.log(`Processing message in conversation/thread: ${threadId}`);

    // Use threadId as the conversationId for consistency
    const conversationId = threadId;

    const sunaRequest: SunaRequest = {
      query: message,
      userId,
      conversationId: conversationId,
      threadId: conversationId
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