
interface ChatContext {
  message: string;
  userProfile: UserProfile;
  recentConversations: Conversation[];
  language: string;
}

interface UserProfile {
  name: string;
  languages: string[];
  interests: string[];
  preferredStyle: string;
  memoryDuration: number;
  culturalBackground?: string;
}

interface Conversation {
  messages: any[];
  timestamp: string;
}

export class VietnamesePersonalityService {
  private readonly PERSONALITY_TEMPLATES = {
    vietnamese: `
You are a close Vietnamese friend chatting naturally. Be:
- Warm and caring like a best friend (bạn thân)
- Use Vietnamese expressions naturally when appropriate
- Reference Vietnamese culture, food, places when relevant
- Mix languages naturally (like how young Vietnamese people chat)
- Use emojis and casual expressions
- Be playful with Vietnamese humor style

Cultural context:
- Understand Vietnamese holidays (Tết, Mid-Autumn Festival)
- Know popular Vietnamese memes and internet culture
- Reference Vietnamese food, music, celebrities when fitting
- Use "anh/chị/em" appropriately based on context
- Understand family values and collectivist culture
- Know about Vietnamese street food, coffee culture, and social customs
`,
    english: `
You are a witty, caring best friend chatting in English. Be:
- Warm, supportive, and genuinely interested
- Occasionally playful and humorous
- Reference current trends and memes
- Very casual and natural in conversation
- Use emojis and modern expressions
- Remember details from past conversations
`,
    polish: `
You are a friendly Polish companion. Be:
- Warm and direct in Polish communication style
- Use Polish humor and cultural references
- Natural and casual like chatting with a friend
- Reference Polish culture when appropriate
- Mix in Polish expressions naturally
`
  };

  async buildPersonalizedPrompt(context: ChatContext): Promise<string> {
    const { message, userProfile, recentConversations, language } = context;
    
    // Select base personality
    const basePersonality = this.getBasePersonality(language, userProfile);
    
    // Build memory context
    const memoryContext = this.buildMemoryContext(userProfile, recentConversations);
    
    // Add social context if relevant
    const socialContext = await this.getSocialContext(userProfile);
    
    return `
${basePersonality}

About your friend:
- Name: ${userProfile.name}
- Languages: ${userProfile.languages.join(', ')}
- Interests: ${userProfile.interests.join(', ')}
- Communication style: ${userProfile.preferredStyle}
- Memory retention: ${userProfile.memoryDuration} days
- Cultural background: ${userProfile.culturalBackground || 'Not specified'}

${memoryContext}

${socialContext}

Current time: ${new Date().toLocaleString('vi-VN')}
Their message: ${message}

Respond naturally as their best friend. Feel free to:
- Switch between languages if it feels natural
- Reference shared memories
- Use appropriate slang/memes
- Show you remember and care about them
- Use Vietnamese expressions when chatting with Vietnamese users
- Be culturally aware and sensitive
`;
  }

  private getBasePersonality(language: string, profile: UserProfile): string {
    // Check for Vietnamese background
    if (profile.culturalBackground === 'vietnamese' || 
        profile.languages.includes('vi')) {
      return this.PERSONALITY_TEMPLATES.vietnamese;
    }
    
    // Otherwise use language-specific template
    return this.PERSONALITY_TEMPLATES[language] || this.PERSONALITY_TEMPLATES.english;
  }

  private buildMemoryContext(profile: UserProfile, conversations: Conversation[]): string {
    const memories = conversations
      .filter(conv => this.isWithinMemoryWindow(conv, profile.memoryDuration))
      .map(conv => this.extractKeyMemories(conv))
      .flat();
    
    if (memories.length === 0) return '';
    
    return `
Recent memories with ${profile.name}:
${memories.map(m => `- ${m}`).join('\n')}
`;
  }

  private async getSocialContext(profile: UserProfile): Promise<string> {
    // Get relevant social trends based on user's interests and culture
    const trends = await this.getRelevantTrends(profile);
    
    if (trends.length === 0) return '';
    
    return `
Current trends relevant to ${profile.name}:
${trends.map(t => `- ${t.topic}: ${t.summary}`).join('\n')}
`;
  }

  private isWithinMemoryWindow(conversation: Conversation, days: number): boolean {
    const conversationDate = new Date(conversation.timestamp);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return conversationDate >= cutoffDate;
  }

  private extractKeyMemories(conversation: Conversation): string[] {
    // Extract important moments, emotions, topics
    return conversation.messages
      .filter(m => m.importance && m.importance > 0.7)
      .map(m => m.summary || m.content.substring(0, 100));
  }

  private async getRelevantTrends(profile: UserProfile): Promise<any[]> {
    // This would connect to social media APIs or cached trends
    // For now, return empty array
    return [];
  }
}
