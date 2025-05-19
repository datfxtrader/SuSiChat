import axios from 'axios';
import { Request, Response } from 'express';

// Configuration for Suna API
const SUNA_API_URL = process.env.SUNA_API_URL || 'http://localhost:8000';

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
 * Suna integration service for communicating with the Suna backend
 */
export class SunaIntegrationService {
  
  /**
   * Send a message to the Suna agent
   */
  async sendMessage(data: SunaRequest): Promise<any> {
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