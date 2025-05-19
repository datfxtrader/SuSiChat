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
   * Mock implementation of sending a message to Suna
   * This uses the existing LLM service to generate responses when Suna backend isn't available
   */
  private async mockSendMessage(data: SunaRequest): Promise<any> {
    console.log('Using mock Suna service for message:', data.query);
    
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
    
    // Generate AI response using the existing LLM service
    try {
      const aiResponse = await llmService.generateResponse(data.userId, data.query);
      
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
      console.error('Error generating mock Suna response:', error);
      throw error;
    }
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