import axios from 'axios';
import { Request, Response } from 'express';
import { llmService } from './llm';

// Configuration for Suna API
const SUNA_API_URL = process.env.SUNA_API_URL || 'http://localhost:8000';
const USE_MOCK_SUNA = process.env.USE_MOCK_SUNA === 'true' || !process.env.SUNA_API_URL;

// Logging the Suna configuration on startup
console.log(`Suna API URL: ${SUNA_API_URL}`);
console.log(`Using mock Suna: ${USE_MOCK_SUNA}`);

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
    this.apiKey = process.env.SUNA_API_KEY || null;
    
    if (!USE_MOCK_SUNA && !this.apiKey) {
      console.warn('No Suna API key provided. Some features may not work correctly.');
    }
  }
  
  /**
   * Set the API key for Suna
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Send a message to the Suna agent
   */
  async sendMessage(data: SunaRequest): Promise<any> {
    if (USE_MOCK_SUNA) {
      console.log('Using mock Suna service for message:', data.query);
      return this.mockSendMessage(data);
    }
    
    try {
      console.log('Sending message to Suna API:', data.query);
      
      // If no thread ID is provided, we need to create a new thread
      if (!data.threadId) {
        // Create a thread first
        const threadResponse = await this.createThread(data.userId);
        data.threadId = threadResponse.threadId;
      }
      
      // Create a request payload for Suna
      const requestPayload = {
        input: data.query,
        userId: data.userId, 
        projectId: this.projectId,
        threadId: data.threadId,
        stream: false
      };
      
      // Make the API request to Suna
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      const response = await axios.post(
        `${SUNA_API_URL}/api/agent/run`, 
        requestPayload,
        { headers }
      );
      
      // Extract the relevant information from the response
      const agentRunResponse: AgentRunResponse = response.data;
      
      // Convert to our internal format
      const assistantMessage: SunaMessage = {
        id: agentRunResponse.runId,
        content: agentRunResponse.output || 'Sorry, I was unable to process your request.',
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      return {
        message: assistantMessage,
        threadId: agentRunResponse.threadId,
        runId: agentRunResponse.runId,
        status: agentRunResponse.status
      };
    } catch (error) {
      console.error('Error communicating with Suna API:', error);
      // If there's an error with the Suna API, fall back to the mock implementation
      console.log('Falling back to mock Suna service due to API error');
      return this.mockSendMessage(data);
    }
  }

  /**
   * Create a new thread in Suna
   */
  async createThread(userId: string): Promise<any> {
    if (USE_MOCK_SUNA) {
      const conv = await this.mockCreateConversation(userId, 'New Conversation');
      return { threadId: conv.id };
    }
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      const response = await axios.post(
        `${SUNA_API_URL}/api/threads`, 
        {
          userId,
          projectId: this.projectId,
          title: 'New Conversation'
        },
        { headers }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error creating thread in Suna:', error);
      // Fall back to mock implementation
      const conv = await this.mockCreateConversation(userId, 'New Conversation');
      return { threadId: conv.id };
    }
  }

  /**
   * Get conversation/thread history from Suna
   */
  async getConversation(userId: string, threadId: string): Promise<any> {
    if (USE_MOCK_SUNA) {
      return this.mockGetConversation(userId, threadId);
    }
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      // Get thread details
      const threadResponse = await axios.get(
        `${SUNA_API_URL}/api/threads/${threadId}`, 
        {
          params: { 
            userId,
            projectId: this.projectId
          },
          headers
        }
      );
      
      // Get thread messages
      const messagesResponse = await axios.get(
        `${SUNA_API_URL}/api/threads/${threadId}/messages`, 
        {
          params: { 
            userId,
            projectId: this.projectId
          },
          headers
        }
      );
      
      // Convert to our internal format
      const conversation: SunaConversation = {
        id: threadId,
        title: threadResponse.data.title || 'Conversation',
        messages: messagesResponse.data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.createdAt
        })),
        createdAt: threadResponse.data.createdAt,
        userId
      };
      
      return conversation;
    } catch (error) {
      console.error('Error retrieving conversation from Suna:', error);
      // Fall back to the mock implementation
      return this.mockGetConversation(userId, threadId);
    }
  }

  /**
   * Get all conversations/threads for a user
   */
  async getUserConversations(userId: string): Promise<any[]> {
    if (USE_MOCK_SUNA) {
      return Object.values(mockConversations).filter(conv => conv.userId === userId);
    }
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      const response = await axios.get(
        `${SUNA_API_URL}/api/threads`, 
        {
          params: { 
            userId,
            projectId: this.projectId
          },
          headers
        }
      );
      
      // Convert to our internal format
      return response.data.map((thread: any) => ({
        id: thread.id,
        title: thread.title || 'Conversation',
        createdAt: thread.createdAt,
        userId
      }));
    } catch (error) {
      console.error('Error retrieving user conversations from Suna:', error);
      // Fall back to the mock implementation
      return Object.values(mockConversations).filter(conv => conv.userId === userId);
    }
  }
  
  /**
   * Enhanced mock implementation of Suna with DeepSeek integration
   * This simulates the functionality of Suna with agent-like capabilities
   */
  private async mockSendMessage(data: SunaRequest): Promise<any> {
    console.log('Using enhanced Suna service with DeepSeek for message:', data.query);
    
    // Create conversation if it doesn't exist
    if (data.conversationId && !mockConversations[data.conversationId]) {
      await this.mockCreateConversation(data.userId, 'New Conversation');
      data.conversationId = Object.keys(mockConversations)[0];
    }
    
    // If no conversation ID, create one
    if (!data.conversationId) {
      const conv = await this.mockCreateConversation(data.userId, 'New Conversation');
      data.conversationId = conv.id;
    }
    
    const conversation = mockConversations[data.conversationId];
    
    // Add user message
    const userMessage: SunaMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      content: data.query,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    conversation.messages.push(userMessage);
    
    // Generate context from conversation history
    const conversationContext = this.buildConversationContext(conversation);
    
    // Generate AI response using the existing LLM service with enhanced context
    try {
      const taskPrompt = this.determineTaskType(data.query);
      const enhancedPrompt = `${taskPrompt}\n\nUser query: ${data.query}\n\nConversation history: ${conversationContext}`;
      
      const aiResponse = await llmService.generateResponse(data.userId, enhancedPrompt);
      
      // Update the conversation title if this is the first exchange
      if (conversation.messages.length === 1) {
        // Generate a title based on the first message
        const titleLimit = Math.min(data.query.length, 30);
        conversation.title = data.query.substring(0, titleLimit) + (data.query.length > 30 ? '...' : '');
      }
      
      // Add AI message
      const assistantMessage: SunaMessage = {
        id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      conversation.messages.push(assistantMessage);
      
      return {
        message: assistantMessage,
        conversationId: data.conversationId,
        threadId: data.conversationId,
        runId: assistantMessage.id,
        status: 'completed'
      };
    } catch (error) {
      console.error('Error generating enhanced Suna response:', error);
      throw error;
    }
  }
  
  /**
   * Build context from conversation history
   */
  private buildConversationContext(conversation: SunaConversation): string {
    // Get all messages in the conversation for proper context
    const allMessages = conversation.messages;
    
    let context = 'CONVERSATION HISTORY:\n\n';
    for (const msg of allMessages) {
      context += `${msg.role === 'user' ? '👤 User' : '🤖 Assistant'}: ${msg.content}\n\n`;
    }
    
    context += 'END OF CONVERSATION HISTORY\n\n';
    context += 'IMPORTANT: Remember to maintain context awareness between messages. If the user refers to something mentioned earlier in the conversation, make sure to reference that information in your response.\n\n';
    
    return context;
  }
  
  /**
   * Determine the type of task the user is asking about and generate
   * appropriate guidance for how Suna would handle it
   */
  private determineTaskType(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Start with the standard agent persona
    let taskSpecificPrompt = `You are Suna, an advanced AI agent with multiple capabilities. You have a strong memory and maintain context throughout conversations.
Always consider the ENTIRE conversation history when responding, especially handling references to previous messages.

Your capabilities include:
1. Web browsing and internet search
2. Document creation and editing
3. Data analysis and visualization
4. Code writing and execution
5. Complex problem-solving with multi-step reasoning

Instructions:
- Be conversational and natural in your responses
- Provide detailed, thoughtful answers that maintain context
- If a user refers to previous information, acknowledge and use that context
- If a request is ambiguous, clarify what the user means by referencing conversation history
- For complex requests, explain your thought process step by step
`;
    
    // Web search and research
    if (lowerQuery.includes('search') || 
        lowerQuery.includes('find') || 
        lowerQuery.includes('look up') ||
        lowerQuery.includes('research')) {
      taskSpecificPrompt += `
For this web research query about "${query}", you would:
1. Use your web browsing capabilities to search multiple sources
2. Extract and synthesize information from websites, news, and databases
3. Verify information across multiple reliable sources
4. Compile the findings into a comprehensive answer

Since your web tools aren't currently active, provide your best response based on existing knowledge, and explain what additional information you would normally search for to give a more complete answer.`;
    }
    
    // File creation or document processing
    else if (lowerQuery.includes('create file') || 
        lowerQuery.includes('make a document') || 
        lowerQuery.includes('write a') ||
        lowerQuery.includes('generate a') ||
        lowerQuery.includes('edit')) {
      taskSpecificPrompt += `
For this document creation request about "${query}", you would:
1. Use your file creation and editing tools
2. Create the requested document with proper formatting
3. Include relevant sections, headings, and content
4. Save or export the file in the appropriate format

Even though your document tools aren't currently active, provide sample content you would include and explain how you would structure the document.`;
    }
    
    // Data analysis
    else if (lowerQuery.includes('analyze') || 
        lowerQuery.includes('data') || 
        lowerQuery.includes('statistics') ||
        lowerQuery.includes('metrics') ||
        lowerQuery.includes('trends')) {
      taskSpecificPrompt += `
For this data analysis request about "${query}", you would:
1. Import and clean the data from various sources
2. Perform statistical analysis and identify patterns
3. Generate visualizations to illustrate key findings
4. Provide insights and recommendations based on the analysis

Without direct access to the data, provide a framework for how you would approach this analysis and what insights you might expect to find based on general knowledge.`;
    }
    
    // Technical tasks
    else if (lowerQuery.includes('code') || 
        lowerQuery.includes('program') || 
        lowerQuery.includes('debug') ||
        lowerQuery.includes('function') ||
        lowerQuery.includes('script')) {
      taskSpecificPrompt += `
For this technical request about "${query}", you would:
1. Set up a coding environment for the appropriate language
2. Write, test, and debug the code in real-time
3. Optimize the solution for performance and readability
4. Provide documentation and explanations alongside the code

Provide a detailed explanation and sample code to address this request, even though you can't execute it directly right now.`;
    }
    
    // For ambiguous or short queries, emphasize context awareness
    else if (query.length < 15 || query.split(' ').length < 4) {
      taskSpecificPrompt += `
This appears to be a short or potentially ambiguous query: "${query}"

IMPORTANT: Pay special attention to the conversation history to understand what the user is referring to. 
- Look for references to previous messages or topics
- If they're referring to an earlier part of the conversation, respond directly to that context
- If still unclear after checking history, politely ask for clarification while suggesting possible interpretations based on the conversation so far`;
    }
    
    // Default case for other general queries
    else {
      taskSpecificPrompt += `
For this request about "${query}", carefully review the conversation history and:
1. Determine which of your capabilities would be most helpful
2. Consider any relevant information shared earlier in the conversation
3. Provide a comprehensive response that addresses the user's need in context
4. If this would normally require external tools, explain what you would do with those tools and then provide your best answer based on existing knowledge`;
    }
    
    return taskSpecificPrompt;
  }
  
  /**
   * Mock implementation of getting a conversation
   */
  private async mockGetConversation(userId: string, conversationId: string): Promise<SunaConversation> {
    console.log('Using mock Suna service for conversation:', conversationId);
    
    if (!mockConversations[conversationId]) {
      throw new Error('Conversation not found');
    }
    
    return mockConversations[conversationId];
  }
  
  /**
   * Mock implementation of creating a conversation
   */
  private async mockCreateConversation(userId: string, title: string): Promise<SunaConversation> {
    console.log('Using mock Suna service to create conversation');
    
    const conversationId = `conv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const conversation: SunaConversation = {
      id: conversationId,
      title: title || 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      userId
    };
    
    mockConversations[conversationId] = conversation;
    
    return conversation;
  }
}

// Export a singleton instance
export const sunaService = new SunaIntegrationService();

// Express route handlers for Suna integration
export const sendMessageToSuna = async (req: any, res: Response) => {
  try {
    const { message, conversationId, threadId } = req.body;
    const userId = req.user.claims.sub;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const sunaRequest: SunaRequest = {
      query: message,
      userId,
      conversationId,
      threadId
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