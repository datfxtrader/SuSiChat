import axios from 'axios';
import { Request, Response } from 'express';
import { llmService } from './llm';

// Configuration for Suna API
const SUNA_API_URL = process.env.SUNA_API_URL || 'http://localhost:8000';
const USE_MOCK_SUNA = process.env.USE_MOCK_SUNA === 'true' || !process.env.SUNA_API_URL;

/**
 * Interface for Suna API requests
 */
interface SunaRequest {
  query: string;
  userId: string;
  conversationId?: string;
  tools?: string[];
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

// In-memory storage for mock mode
const mockConversations: Record<string, SunaConversation> = {};

/**
 * Suna integration service for communicating with the Suna backend
 */
export class SunaIntegrationService {
  /**
   * Send a message to the Suna agent
   */
  async sendMessage(data: SunaRequest): Promise<any> {
    if (USE_MOCK_SUNA) {
      return this.mockSendMessage(data);
    }
    
    try {
      const response = await axios.post(`${SUNA_API_URL}/api/agent/message`, data);
      return response.data;
    } catch (error) {
      console.error('Error communicating with Suna API:', error);
      throw error;
    }
  }

  /**
   * Get conversation history from Suna
   */
  async getConversation(userId: string, conversationId: string): Promise<any> {
    if (USE_MOCK_SUNA) {
      return this.mockGetConversation(userId, conversationId);
    }
    
    try {
      const response = await axios.get(`${SUNA_API_URL}/api/conversations/${conversationId}`, {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error retrieving conversation from Suna:', error);
      throw error;
    }
  }

  /**
   * Create a new conversation in Suna
   */
  async createConversation(userId: string, title: string): Promise<any> {
    if (USE_MOCK_SUNA) {
      return this.mockCreateConversation(userId, title);
    }
    
    try {
      const response = await axios.post(`${SUNA_API_URL}/api/conversations`, {
        userId,
        title
      });
      return response.data;
    } catch (error) {
      console.error('Error creating conversation in Suna:', error);
      throw error;
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
        conversationId: data.conversationId
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
    const { message, conversationId } = req.body;
    const userId = req.user.claims.sub;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const sunaRequest: SunaRequest = {
      query: message,
      userId,
      conversationId
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