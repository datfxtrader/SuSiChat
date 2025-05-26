import axios, { AxiosInstance, AxiosError } from 'axios';
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

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Configuration constants
const CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 1000,
  RESEARCH_MAX_TOKENS: 4000,
  MAX_MEMORIES_CONTEXT: 5,
  API_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Personal information patterns compiled once
const PERSONAL_PATTERNS = [
  /\bmy name is\b/i,
  /\bi am\s+(?:a|an)?\s*\w+/i,
  /\bi (?:like|love|enjoy|prefer)\b/i,
  /\bmy (?:favorite|favourite)\b/i,
  /\bi (?:don't|do not|dislike|hate)\b/i,
  /\bi (?:need|want|have) to\b/i,
  /\bi work (?:at|for|as)\b/i,
  /\bi live (?:in|at)\b/i,
] as const;

interface ChatContext {
  userId: string;
  temperature?: number;
  maxTokens?: number;
  conversationId?: string;
}

interface StreamingChatHandler {
  handleChatStream(
    conversationId: string,
    message: string,
    context: ChatContext
  ): Promise<ReadableStream>;
}

export class LLMService implements StreamingChatHandler {
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly axiosInstance: AxiosInstance;

  // Cache for user contexts to avoid repeated DB queries
  private userContextCache = new Map<string, { context: string; timestamp: number }>();
  private readonly contextCacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  // Rate limiting per user
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_MESSAGES_PER_WINDOW = 20;

  constructor() {
    // Validate environment variables
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    if (!this.apiKey) {
      console.warn('DEEPSEEK_API_KEY not set - LLM service will not function');
    }

    this.apiEndpoint = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    // Pre-compile system prompt
    this.systemPrompt = this.getSystemPrompt();

    // Create axios instance with defaults
    this.axiosInstance = axios.create({
      baseURL: this.apiEndpoint,
      timeout: CONFIG.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }

  private getSystemPrompt(): string {
    return `You are SuSi, an advanced open-source generalist AI agent designed to help accomplish real-world tasks. 
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
    if (!this.apiKey) {
      return "I'm sorry, but the AI service is not properly configured. Please contact your administrator.";
    }

    try {
      // Get or build user context
      const context = await this.getUserContext(userId, message);

      // Prepare messages
      const messages: DeepSeekMessage[] = [
        {
          role: 'system',
          content: context ? `${this.systemPrompt}\n\nUser context:\n${context}` : this.systemPrompt
        },
        { role: 'user', content: message }
      ];

      // Make API call with retry logic
      const responseText = await this.callDeepSeekWithRetry({
        model: this.model,
        messages,
        temperature: CONFIG.DEFAULT_TEMPERATURE,
        max_tokens: CONFIG.DEFAULT_MAX_TOKENS
      });

      // Asynchronously extract and store memory (don't wait)
      this.extractAndStoreMemory(userId, message, responseText).catch(err => 
        console.error('Failed to store memory:', err)
      );

      return responseText;
    } catch (error) {
      console.error('Error in generateResponse:', error);
      return this.getErrorMessage(error);
    }
  }

  async generateResearchReport(
    messages: DeepSeekMessage[],
    temperature: number = CONFIG.DEFAULT_TEMPERATURE,
    maxTokens: number = CONFIG.RESEARCH_MAX_TOKENS
  ): Promise<{ message: string }> {
    if (!this.apiKey) {
      return { message: "The AI service is not properly configured for research reports." };
    }

    try {
      const responseText = await this.callDeepSeekWithRetry({
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens
      });

      return { message: responseText };
    } catch (error) {
      console.error('Error generating research report:', error);
      return { message: this.getErrorMessage(error) };
    }
  }

  private async getUserContext(userId: string, message: string): Promise<string> {
    // Check cache first
    const cached = this.userContextCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.contextCacheTimeout) {
      return cached.context;
    }

    try {
      // Fetch data in parallel
      const [userPreferences, relevantMemories] = await Promise.all([
        storage.getUserPreferences(userId),
        storage.searchUserMemories(userId, message)
      ]);

      let context = '';

      // Build preferences context
      if (userPreferences.length > 0) {
        const prefLines = userPreferences
          .map(pref => `- ${pref.key}: ${pref.value}`)
          .join('\n');
        context += `User preferences:\n${prefLines}\n\n`;
      }

      // Build memories context
      if (relevantMemories.length > 0) {
        const memoryLines = relevantMemories
          .slice(0, CONFIG.MAX_MEMORIES_CONTEXT)
          .map(memory => `- ${memory.content}`)
          .join('\n');
        context += `Relevant information about the user:\n${memoryLines}\n`;
      }

      // Cache the context
      this.userContextCache.set(userId, { context, timestamp: Date.now() });

      return context;
    } catch (error) {
      console.error('Error building user context:', error);
      return '';
    }
  }

  private async callDeepSeekWithRetry(config: DeepSeekConfig): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await this.axiosInstance.post<DeepSeekResponse>('', config);

        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content;
        }

        throw new Error('Invalid response format from DeepSeek API');
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < CONFIG.RETRY_ATTEMPTS - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError || new Error('Failed to call DeepSeek API');
  }

  private async extractAndStoreMemory(userId: string, userMessage: string, aiResponse: string): Promise<void> {
    // Check if message contains personal information using pre-compiled patterns
    const containsPersonalInfo = PERSONAL_PATTERNS.some(pattern => pattern.test(userMessage));

    if (containsPersonalInfo) {
      try {
        await storage.createMemory({
          userId,
          content: userMessage,
          embedding: null // Would store vector embeddings in a production system
        });

        // Clear user context cache to include new memory
        this.userContextCache.delete(userId);
      } catch (error) {
        console.error('Failed to create memory:', error);
      }
    }
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        return "I'm currently experiencing high demand. Please try again in a moment.";
      } else if (error.response?.status === 401) {
        return "There's an issue with my authentication. Please contact support.";
      } else if (error.code === 'ECONNABORTED') {
        return "The request took too long. Please try again with a simpler query.";
      }
    }

    return "I'm sorry, I encountered an issue while processing your request. Please try again in a moment.";
  }



  async handleChatStream(
    conversationId: string,
    message: string,
    context: ChatContext
  ): Promise<ReadableStream> {
    // 1. Validate input
    const validated = await this.validateInput(message, context.userId);
    if (!validated.valid) {
      throw new Error(validated.error);
    }

    // 2. Check rate limits
    await this.checkRateLimit(context.userId);

    // 3. Load conversation history
    const history = await this.loadHistory(conversationId);

    // 4. Prepare prompt with context
    const prompt = this.buildPrompt(validated.sanitized, history, context);

    // 5. Create streaming response
    return new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: prompt,
              temperature: context.temperature || 0.7,
              max_tokens: context.maxTokens || 2000,
              stream: true
            })
          });

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim());

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    controller.close();
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                        type: 'token',
                        content: content
                      })}\n\n`));
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }

  private async validateInput(message: string, userId: string): Promise<{ valid: boolean; sanitized?: string; error?: string }> {
    const MAX_MESSAGE_LENGTH = 4000;

    // Length check
    if (message.length > MAX_MESSAGE_LENGTH) {
      return { valid: false, error: 'Message too long' };
    }

    // Rate limiting
    const rateLimitOk = await this.checkRateLimit(userId);
    if (!rateLimitOk) {
      return { valid: false, error: 'Rate limit exceeded' };
    }

    // Sanitize input - remove potential prompt injections
    const sanitized = message
      .replace(/\[INST\]|\[\/INST\]/g, '')
      .replace(/\<\|im_start\|\>|\<\|im_end\|\>/g, '')
      .replace(/^(system|assistant):/gmi, '')
      .trim();

    return { valid: true, sanitized };
  }

  private async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitMap.set(userId, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return true;
    }

    if (userLimit.count >= this.MAX_MESSAGES_PER_WINDOW) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  private async loadHistory(conversationId: string): Promise<Array<{ role: string; content: string }>> {
    // This should integrate with your database to load conversation history
    // For now, return empty array - implement based on your DB structure
    return [];
  }

  private buildPrompt(
    message: string,
    history: Array<{ role: string; content: string }>,
    context: ChatContext
  ): Array<{ role: string; content: string }> {
    const systemPrompt = this.getSystemPrompt();
    const contextWindow = this.selectRelevantHistory(history, 4000);

    return [
      { role: 'system', content: systemPrompt },
      ...contextWindow,
      { role: 'user', content: message }
    ];
  }

  private selectRelevantHistory(
    history: Array<{ role: string; content: string }>,
    maxTokens: number = 4000
  ): Array<{ role: string; content: string }> {
    // Simple implementation - take last N messages that fit in token limit
    // In production, you'd use proper token counting
    let tokenCount = 0;
    const selected = [];

    for (let i = history.length - 1; i >= 0; i--) {
      const estimated = history[i].content.length / 4; // Rough token estimation
      if (tokenCount + estimated > maxTokens) break;
      
      selected.unshift(history[i]);
      tokenCount += estimated;
    }

    return selected;
  }

  // Utility method to clear context cache
  clearContextCache(userId?: string): void {
    if (userId) {
      this.userContextCache.delete(userId);
    } else {
      this.userContextCache.clear();
    }
  }
}

export const llmService = new LLMService();