import axios from 'axios';
import { storage } from './storage';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekConfig {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export class LLMService {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;
  private systemPrompt: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiEndpoint = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.systemPrompt = `You are Tongkeeper, a friendly AI assistant for families. 
You provide helpful, accurate information in a warm, approachable tone suitable for all family members.
You can assist with homework, scheduling reminders, planning trips, and general knowledge questions.
Be concise but thorough in your responses. If asked about a topic inappropriate for children, politely 
redirect the conversation. Always prioritize safety and wellbeing in your advice.`;
  }

  async generateResponse(
    userId: string,
    message: string,
    familyRoomId?: number
  ): Promise<string> {
    // Get user history for context
    const userPreferences = await storage.getUserPreferences(userId);
    const relevantMemories = await storage.searchUserMemories(userId, message);
    
    // Build context section from user preferences and memories
    let contextStr = '';
    if (userPreferences.length > 0) {
      contextStr += 'User preferences:\n';
      userPreferences.forEach(pref => {
        contextStr += `- ${pref.key}: ${pref.value}\n`;
      });
      contextStr += '\n';
    }
    
    if (relevantMemories.length > 0) {
      contextStr += 'Relevant information about the user:\n';
      relevantMemories.slice(0, 5).forEach(memory => {
        contextStr += `- ${memory.content}\n`;
      });
      contextStr += '\n';
    }
    
    // Prepare messages array with system prompt and context
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: this.systemPrompt + (contextStr ? `\n\nUser context:\n${contextStr}` : '')
      },
      { role: 'user', content: message }
    ];
    
    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      const responseText = response.data.choices[0].message.content;
      
      // Extract potential facts/preferences for memory
      await this.extractAndStoreMemory(userId, message, responseText);
      
      return responseText;
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);
      return "I'm sorry, I encountered an issue while processing your request. Please try again in a moment.";
    }
  }
  
  private async extractAndStoreMemory(userId: string, userMessage: string, aiResponse: string) {
    // This is a simplified logic to extract potential memory items
    // In a production system, this would use more sophisticated NLP techniques
    
    // Very simple heuristic: store info when user shares personal details
    const personalPrefixes = [
      "my name is", "i am", "i like", "i love", "i prefer", 
      "my favorite", "i don't like", "i hate", "i need to", "i want to"
    ];
    
    const lowercaseMsg = userMessage.toLowerCase();
    
    for (const prefix of personalPrefixes) {
      if (lowercaseMsg.includes(prefix)) {
        await storage.createMemory({
          userId,
          content: userMessage,
          embedding: null // Would store vector embeddings in a production system
        });
        break;
      }
    }
  }
}

export const llmService = new LLMService();
