import { LRUCache } from 'lru-cache';
import { db, storeResearchResults, getResearchResults } from './db';
import { EventEmitter } from 'events';
import pRetry from 'p-retry';

interface CachedResearchResult {
  conversationId: string;
  message: any;
  timestamp: string;
  userId: string;
  size: number; // Track memory usage
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  dbFallbacks: number;
}

/**
 * Optimized Research Results Cache with LRU eviction and batch operations
 */
export class OptimizedResearchResultsCache extends EventEmitter {
  private cache: LRUCache<string, CachedResearchResult>;
  private conversationsByUser: LRUCache<string, Set<string>>;
  private pendingWrites: Map<string, CachedResearchResult>;
  private writeTimer: NodeJS.Timeout | null = null;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    dbFallbacks: 0
  };

  constructor(options: {
    maxSize?: number;
    maxAge?: number;
    batchWriteInterval?: number;
  } = {}) {
    super();

    // LRU cache with size-based eviction
    this.cache = new LRUCache<string, CachedResearchResult>({
      max: options.maxSize || 1000,
      maxSize: 100 * 1024 * 1024, // 100MB max memory
      sizeCalculation: (value) => value.size,
      ttl: options.maxAge || 1000 * 60 * 60 * 24, // 24 hours
      dispose: (value, key) => {
        this.metrics.evictions++;
        this.emit('eviction', { key, value });
      },
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // User conversation index with LRU
    this.conversationsByUser = new LRUCache<string, Set<string>>({
      max: 10000,
      ttl: options.maxAge || 1000 * 60 * 60 * 24
    });

    // Batch write buffer
    this.pendingWrites = new Map();

    // Start batch write timer
    this.startBatchWriteTimer(options.batchWriteInterval || 5000);
  }

  /**
   * Store result with optimized batch writing
   */
  async storeResult(userId: string, conversationId: string, message: any): Promise<void> {
    const cacheKey = `${userId}-${conversationId}`;
    const timestamp = new Date().toISOString();

    // Calculate approximate size
    const size = JSON.stringify(message).length;

    const cacheEntry: CachedResearchResult = {
      conversationId,
      message,
      timestamp,
      userId,
      size
    };

    // Store in cache immediately
    this.cache.set(cacheKey, cacheEntry);

    // Update user index
    let userConversations = this.conversationsByUser.get(userId);
    if (!userConversations) {
      userConversations = new Set();
      this.conversationsByUser.set(userId, userConversations);
    }
    userConversations.add(conversationId);

    // Add to pending writes for batch processing
    this.pendingWrites.set(cacheKey, cacheEntry);

    // Emit event for real-time updates
    this.emit('resultStored', { userId, conversationId });
  }

  /**
   * Get user conversations with efficient caching
   */
  async getUserConversations(userId: string): Promise<any[]> {
    try {
      // Check if we have cached conversation IDs for this user
      const cachedConvIds = this.conversationsByUser.get(userId);

      if (cachedConvIds && cachedConvIds.size > 0) {
        this.metrics.hits++;

        // Batch retrieve from cache
        const conversations = Array.from(cachedConvIds).map(convId => {
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

        if (conversations.length > 0) {
          return conversations;
        }
      }

      this.metrics.misses++;
      this.metrics.dbFallbacks++;

      // Fallback to database with retry
      const dbResults = await pRetry(
        async () => {
          const { conversations } = await import('../shared/schema');
          const { eq } = await import('drizzle-orm');

          return db.select()
            .from(conversations)
            .where(eq(conversations.userId, userId))
            .limit(100); // Prevent huge queries
        },
        {
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 5000
        }
      );

      // Cache the results
      for (const conv of dbResults) {
        const cacheKey = `${userId}-${conv.id}`;
        if (!this.cache.has(cacheKey)) {
          this.cache.set(cacheKey, {
            conversationId: conv.id,
            message: { content: conv.title || '' },
            timestamp: conv.createdAt,
            userId: userId,
            size: JSON.stringify(conv).length
          });
        }
      }

      return dbResults;

    } catch (error) {
      console.error('Failed to get user conversations:', error);

      // Return cached data even if database fails
      const cachedConvIds = this.conversationsByUser.get(userId);
      if (cachedConvIds) {
        return Array.from(cachedConvIds).map(convId => {
          const cached = this.cache.get(`${userId}-${convId}`);
          return cached ? {
            id: convId,
            title: this.extractTitleFromMessage(cached.message.content),
            userId,
            messages: [cached.message],
            createdAt: cached.timestamp,
            updatedAt: cached.timestamp
          } : null;
        }).filter(Boolean);
      }

      return [];
    }
  }

  /**
   * Get specific conversation with caching
   */
  async getConversation(userId: string, conversationId: string): Promise<any> {
    const cacheKey = `${userId}-${conversationId}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.hits++;
      return {
        id: conversationId,
        title: this.extractTitleFromMessage(cached.message.content),
        userId: userId,
        messages: [cached.message],
        createdAt: cached.timestamp,
        updatedAt: cached.timestamp
      };
    }

    this.metrics.misses++;

    try {
      // Try database with retry
      const dbResult = await pRetry(
        () => getResearchResults(conversationId),
        {
          retries: 2,
          minTimeout: 500
        }
      );

      if (dbResult) {
        // Cache the result
        this.cache.set(cacheKey, {
          conversationId,
          message: dbResult.messages?.[0] || { content: '' },
          timestamp: dbResult.createdAt,
          userId,
          size: JSON.stringify(dbResult).length
        });

        return dbResult;
      }
    } catch (error) {
      console.error('Database retrieval failed:', error);
    }

    return null;
  }

  /**
   * Batch write pending changes to database
   */
  private async batchWritePendingChanges(): Promise<void> {
    if (this.pendingWrites.size === 0) return;

    const writesToProcess = Array.from(this.pendingWrites.entries());
    this.pendingWrites.clear();

    try {
      // Batch insert/update
      const promises = writesToProcess.map(([key, data]) => 
        pRetry(
          () => storeResearchResults(data.conversationId, {
            message: data.message,
            userId: data.userId,
            timestamp: data.timestamp
          }),
          {
            retries: 2,
            minTimeout: 500,
            onFailedAttempt: (error) => {
              console.warn(`Batch write attempt ${error.attemptNumber} failed:`, error.message);
            }
          }
        ).catch(error => {
          // Re-add to pending writes on failure
          this.pendingWrites.set(key, data);
          console.error('Failed to write to database:', error);
        })
      );

      await Promise.allSettled(promises);

      console.log(`✅ Batch wrote ${writesToProcess.length} research results to database`);

    } catch (error) {
      console.error('Batch write failed:', error);

      // Re-add all failed writes
      writesToProcess.forEach(([key, data]) => {
        this.pendingWrites.set(key, data);
      });
    }
  }

  /**
   * Start batch write timer
   */
  private startBatchWriteTimer(interval: number): void {
    this.writeTimer = setInterval(() => {
      this.batchWritePendingChanges().catch(console.error);
    }, interval);
  }

  /**
   * Extract title with optimization
   */
  private extractTitleFromMessage(content: string): string {
    if (!content) return 'Research Analysis';

    // Use regex for efficient extraction
    const titleMatch = content.match(/^#+\s*(.+?)$/m) || 
                      content.match(/(Analysis|Research|Market|Study).*?(?=\n|$)/i);

    if (titleMatch) {
      return titleMatch[1].replace(/[#*]/g, '').trim().substring(0, 50) + 
             (titleMatch[1].length > 50 ? '...' : '');
    }

    // Fallback to first line
    const firstLine = content.split('\n')[0];
    return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics & { cacheSize: number; hitRate: number } {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      hitRate: total > 0 ? this.metrics.hits / total : 0
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.conversationsByUser.clear();
    this.pendingWrites.clear();
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Stop timer
    if (this.writeTimer) {
      clearInterval(this.writeTimer);
      this.writeTimer = null;
    }

    // Flush pending writes
    await this.batchWritePendingChanges();

    // Clear caches
    this.clear();

    this.emit('shutdown');
  }
}

// Create optimized instance
export const researchCache = new OptimizedResearchResultsCache({
  maxSize: 1000,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  batchWriteInterval: 5000 // 5 seconds
});

// Graceful shutdown on process exit
process.on('SIGINT', async () => {
  await researchCache.shutdown();
  process.exit(0);
});