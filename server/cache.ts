
import Redis from 'ioredis';

class ConversationCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async getConversation(id: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(`conv:${id}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setConversation(id: string, conversation: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(`conv:${id}`, ttl, JSON.stringify(conversation));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidateConversation(id: string): Promise<void> {
    try {
      await this.redis.del(`conv:${id}`);
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  async getUserConversations(userId: string): Promise<string[]> {
    try {
      return await this.redis.smembers(`user:${userId}:conversations`);
    } catch (error) {
      console.error('Cache get user conversations error:', error);
      return [];
    }
  }

  async addUserConversation(userId: string, conversationId: string): Promise<void> {
    try {
      await this.redis.sadd(`user:${userId}:conversations`, conversationId);
    } catch (error) {
      console.error('Cache add user conversation error:', error);
    }
  }
}

export const conversationCache = new ConversationCache();
