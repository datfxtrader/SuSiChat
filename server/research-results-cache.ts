// Research Results Cache - Memory fallback for database connection issues
import { db, storeResearchResults, getResearchResults } from './db';

interface CachedResearchResult {
  conversationId: string;
  message: any;
  timestamp: string;
  userId: string;
}

class ResearchResultsCache {
  private cache = new Map<string, CachedResearchResult>();
  private conversationsByUser = new Map<string, string[]>();

  // Store research result with database fallback to memory
  async storeResult(userId: string, conversationId: string, message: any) {
    const cacheKey = `${userId}-${conversationId}`;
    
    try {
      // Try database first with our enhanced connection handling
      await storeResearchResults(conversationId, {
        message,
        userId,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Research result stored in database');
      
    } catch (error) {
      console.warn('❌ Database storage failed, using memory cache:', error);
      
      // Fallback to memory cache
      this.cache.set(cacheKey, {
        conversationId,
        message,
        timestamp: new Date().toISOString(),
        userId
      });
      
      // Track conversations by user
      if (!this.conversationsByUser.has(userId)) {
        this.conversationsByUser.set(userId, []);
      }
      const userConversations = this.conversationsByUser.get(userId)!;
      if (!userConversations.includes(conversationId)) {
        userConversations.push(conversationId);
      }
      
      console.log('💾 Research result cached in memory');
    }
  }

  // Get all conversations for a user with memory fallback
  async getUserConversations(userId: string) {
    try {
      // Try database first
      const dbResults = await db.select().from(require('@shared/schema').conversations)
        .where(require('drizzle-orm').eq(require('@shared/schema').conversations.userId, userId));
      
      if (dbResults && dbResults.length > 0) {
        console.log('✅ Retrieved conversations from database');
        return dbResults;
      }
    } catch (error) {
      console.warn('❌ Database retrieval failed, checking memory cache:', error);
    }
    
    // Fallback to memory cache
    const userConversationIds = this.conversationsByUser.get(userId) || [];
    const cachedConversations = userConversationIds.map(convId => {
      const cacheKey = `${userId}-${convId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return {
          id: convId,
          title: this.extractTitleFromMessage(cached.message.content),
          userId: userId,
          createdAt: cached.timestamp,
          updatedAt: cached.timestamp,
          messages: [cached.message]
        };
      }
      return null;
    }).filter(Boolean);
    
    if (cachedConversations.length > 0) {
      console.log(`💾 Retrieved ${cachedConversations.length} conversations from memory cache`);
    }
    
    return cachedConversations;
  }

  // Get specific conversation with memory fallback  
  async getConversation(userId: string, conversationId: string) {
    const cacheKey = `${userId}-${conversationId}`;
    
    try {
      // Try database first
      const dbResult = await getResearchResults(conversationId);
      if (dbResult) {
        console.log('✅ Retrieved conversation from database');
        return dbResult;
      }
    } catch (error) {
      console.warn('❌ Database retrieval failed, checking memory cache:', error);
    }
    
    // Fallback to memory cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('💾 Retrieved conversation from memory cache');
      return {
        id: conversationId,
        title: this.extractTitleFromMessage(cached.message.content),
        userId: userId,
        messages: [cached.message],
        createdAt: cached.timestamp,
        updatedAt: cached.timestamp
      };
    }
    
    return null;
  }

  private extractTitleFromMessage(content: string): string {
    // Extract meaningful title from research content
    const lines = content.split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (line.includes('Analysis') || line.includes('Research') || line.includes('Market')) {
        return line.replace(/[#*]/g, '').trim().substring(0, 50) + '...';
      }
    }
    return 'Research Analysis';
  }

  // Clear old cache entries (call periodically)
  clearOldEntries(maxAgeHours = 24) {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    for (const [key, cached] of this.cache.entries()) {
      const entryTime = new Date(cached.timestamp).getTime();
      if (entryTime < cutoffTime) {
        this.cache.delete(key);
        console.log(`🗑️ Cleared old cache entry: ${key}`);
      }
    }
  }
}

export const researchCache = new ResearchResultsCache();

// Clear old entries every hour
setInterval(() => {
  researchCache.clearOldEntries();
}, 60 * 60 * 1000);