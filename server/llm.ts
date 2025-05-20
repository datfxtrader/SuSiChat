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
    this.systemPrompt = `You are Suna, an advanced open-source generalist AI agent designed to help accomplish real-world tasks. 
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

If asked about tasks that would normally require your advanced tools (like web search or file creation), explain what capabilities the full Suna agent would use to accomplish the task, then provide the best response you can with your current knowledge.

For example, if asked to research a topic, you might say: "In my full implementation, I would use my web browsing tools to search for the latest information on this topic. Based on my current knowledge, here's what I can tell you..."

Always prioritize providing accurate, helpful information while maintaining a balance between thoroughness and conciseness.`;
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
  
  /**
   * Generate a comprehensive research report from web sources
   */
  async generateResearchReport(
    messages: DeepSeekMessage[],
    temperature: number = 0.7,
    maxTokens: number = 4000
  ): Promise<{message: string}> {
    try {
      // Call DeepSeek API for research report
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: this.model,
          messages,
          temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      if (response.data.choices && response.data.choices[0]) {
        return { message: response.data.choices[0].message.content };
      } else {
        console.error('Unexpected DeepSeek API response format:', response.data);
        return { message: 'I encountered an issue generating a detailed research report.' };
      }
    } catch (error) {
      console.error('Error generating research report with LLM:', error);
      return { message: 'I apologize, but I encountered an error while trying to generate a detailed research report.' };
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
