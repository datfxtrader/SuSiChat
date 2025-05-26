
import { db } from '../db';
import { blogPosts, userInterests, userLanguages } from '../db/schema/blog';
import { eq, and, gte } from 'drizzle-orm';
import type { VocabularyItem, GenerationMetadata } from '../db/schema/blog';

export class BlogGenerationService {
  private deepseekApiKey: string;
  
  constructor() {
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  async generatePersonalizedContent(userId: string): Promise<void> {
    try {
      // Get user preferences
      const interests = await db.select().from(userInterests).where(eq(userInterests.userId, userId));
      const languages = await db.select().from(userLanguages).where(eq(userLanguages.userId, userId));
      
      if (!interests.length || !languages.length) {
        console.log(`No preferences found for user ${userId}`);
        return;
      }

      // Get recent research queries (you can integrate with your existing research system)
      const recentQueries = await this.getRecentResearchQueries(userId);
      
      // Generate content for each language and interest combination
      for (const language of languages) {
        for (const interest of interests.slice(0, 3)) { // Limit to top 3 interests
          try {
            const content = await this.generateArticle({
              interest,
              language,
              recentQueries,
              userLevel: language.level
            });
            
            if (content) {
              await this.saveGeneratedContent(content, userId, language.languageCode);
            }
          } catch (error) {
            console.error(`Failed to generate content for ${interest.categoryId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to generate personalized content for user ${userId}:`, error);
    }
  }

  private async generateArticle(params: {
    interest: any;
    language: any;
    recentQueries: string[];
    userLevel: string;
  }) {
    const { interest, language, recentQueries, userLevel } = params;
    
    // Search for relevant content using your existing web search
    const searchResults = await this.searchRelevantContent(interest, language.languageCode);
    
    // Generate article using DeepSeek
    const prompt = this.buildPrompt(interest, language, userLevel, recentQueries, searchResults);
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate content with DeepSeek');
    }

    const result = await response.json();
    
    try {
      return JSON.parse(result.choices[0].message.content);
    } catch (error) {
      console.error('Failed to parse generated content:', error);
      return null;
    }
  }

  private buildPrompt(interest: any, language: any, userLevel: string, recentQueries: string[], searchResults: any[]): string {
    return `
Generate a personalized blog article based on the following requirements:

TOPIC FOCUS:
- Primary category: ${interest.categoryId}
- Subcategories: ${interest.subcategories.join(', ')}
- User interest weight: ${interest.weight}/10

LANGUAGE & LEVEL:
- Language: ${language.languageName} (${language.languageCode})
- Reading level: ${userLevel}
- Style: Engaging, educational, conversational

USER CONTEXT:
- Recent interests: ${recentQueries.join(', ')}

CONTENT SOURCES:
${searchResults.map((result, idx) => `${idx + 1}. ${result.title}: ${result.summary || result.content?.substring(0, 200) + '...'}`).join('\n')}

REQUIREMENTS:
1. Write a 400-600 word article
2. Create an engaging title
3. Write a 2-sentence summary
4. Include 8-12 vocabulary words appropriate for ${userLevel} level
5. Add relevant tags (5-8 tags)
6. Ensure content is factual and well-sourced
7. Make it engaging for someone interested in ${interest.categoryId}

OUTPUT FORMAT (JSON):
{
  "title": "Engaging article title",
  "content": "Full article content in markdown format",
  "summary": "Brief 2-sentence summary",
  "vocabularyHighlights": [
    {
      "word": "example",
      "definition": "Clear definition",
      "difficulty": "medium",
      "example": "Usage example"
    }
  ],
  "tags": ["tag1", "tag2", "tag3"],
  "category": "${interest.categoryId}",
  "estimatedReadTime": 3,
  "readingLevel": "${userLevel}"
}

Generate engaging, educational content that matches the user's interests and language level.
    `;
  }

  private async searchRelevantContent(interest: any, language: string): Promise<any[]> {
    try {
      // Use your existing web search functionality
      const searchQuery = `${interest.categoryId} ${interest.subcategories.join(' ')} news recent`;
      
      const response = await fetch('http://0.0.0.0:3000/api/search/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery, 
          language,
          maxResults: 5
        })
      });
      
      if (!response.ok) {
        return [];
      }
      
      const results = await response.json();
      return results.results || [];
    } catch (error) {
      console.error('Failed to search for relevant content:', error);
      return [];
    }
  }

  private async getRecentResearchQueries(userId: string): Promise<string[]> {
    // This would integrate with your existing research system
    // For now, return empty array
    return [];
  }

  private async saveGeneratedContent(content: any, userId: string, language: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days default
    
    const generationMetadata: GenerationMetadata = {
      model: 'deepseek-chat',
      promptTemplate: 'personalized-blog-v1',
      sources: [],
      generatedAt: new Date().toISOString(),
      userContext: {
        interests: [],
        recentQueries: [],
        language,
        level: content.readingLevel
      }
    };

    await db.insert(blogPosts).values({
      title: content.title,
      content: content.content,
      summary: content.summary,
      category: content.category,
      tags: content.tags || [],
      sourceUrls: [],
      language,
      readingLevel: content.readingLevel,
      estimatedReadTime: content.estimatedReadTime || 3,
      vocabularyHighlights: content.vocabularyHighlights || [],
      grammarPoints: [],
      isPersonalized: true,
      isTrending: false,
      factChecked: false,
      expiresAt,
      generationMetadata
    });
  }

  async generateTrendingContent(): Promise<void> {
    try {
      // Get trending topics from web search
      const trendingTopics = await this.getTrendingTopics();
      
      for (const topic of trendingTopics.slice(0, 5)) {
        const content = await this.generateTrendingArticle(topic);
        
        if (content) {
          await this.saveTrendingContent(content);
        }
      }
    } catch (error) {
      console.error('Failed to generate trending content:', error);
    }
  }

  private async getTrendingTopics(): Promise<any[]> {
    // Implementation to get trending topics
    return [];
  }

  private async generateTrendingArticle(topic: any): Promise<any> {
    // Implementation to generate trending articles
    return null;
  }

  private async saveTrendingContent(content: any): Promise<void> {
    // Implementation to save trending content
  }

  async cleanupExpiredPosts(): Promise<void> {
    try {
      await db.delete(blogPosts).where(
        gte(new Date(), blogPosts.expiresAt)
      );
      console.log('Expired blog posts cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup expired posts:', error);
    }
  }
}
