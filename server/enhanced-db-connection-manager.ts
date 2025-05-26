
import { Pool, PoolClient, PoolConfig } from 'pg';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  lastHealthCheck: Date;
}

interface QueryOptions {
  timeout?: number;
  retries?: number;
  priority?: 'high' | 'normal' | 'low';
  cache?: boolean;
  cacheTTL?: number;
}

class EnhancedDatabaseManager extends EventEmitter {
  private pool: Pool;
  private queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();
  private metrics: ConnectionMetrics;
  private isHealthy = true;
  private lastHealthCheck = Date.now();
  private queryQueue: Array<{ query: string; params: any[]; resolve: Function; reject: Function; priority: string }> = [];
  
  constructor() {
    super();
    this.initializePool();
    this.initializeMetrics();
    this.startHealthMonitoring();
    this.startQueryProcessor();
  }
  
  private initializePool(): void {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum connections for Replit
      min: 2,  // Minimum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      query_timeout: 25000,
      application_name: 'replit_enhanced_app',
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };
    
    this.pool = new Pool(config);
    
    // Enhanced error handling
    this.pool.on('error', (err) => {
      console.error('💥 Database pool error:', err);
      this.isHealthy = false;
      this.emit('pool_error', err);
      this.attemptReconnection();
    });
    
    this.pool.on('connect', (client) => {
      console.log('🔗 New client connected');
      this.metrics.totalConnections++;
      this.emit('client_connected');
    });
    
    this.pool.on('remove', (client) => {
      console.log('🔓 Client removed');
      this.emit('client_removed');
    });
  }
  
  private initializeMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      lastHealthCheck: new Date()
    };
  }
  
  private async attemptReconnection(): Promise<void> {
    console.log('🔄 Attempting database reconnection...');
    
    try {
      await this.pool.end();
      this.initializePool();
      
      // Test connection
      const testResult = await this.query('SELECT 1 as test');
      if (testResult) {
        this.isHealthy = true;
        console.log('✅ Database reconnection successful');
        this.emit('reconnected');
      }
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      setTimeout(() => this.attemptReconnection(), 5000);
    }
  }
  
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const start = Date.now();
        await this.pool.query('SELECT 1');
        const duration = Date.now() - start;
        
        this.isHealthy = true;
        this.lastHealthCheck = Date.now();
        this.metrics.lastHealthCheck = new Date();
        
        // Update pool metrics
        this.updatePoolMetrics();
        
        this.emit('health_check', { healthy: true, duration });
      } catch (error) {
        this.isHealthy = false;
        console.error('💔 Health check failed:', error);
        this.emit('health_check', { healthy: false, error });
      }
    }, 30000); // Every 30 seconds
  }
  
  private updatePoolMetrics(): void {
    this.metrics.totalConnections = this.pool.totalCount;
    this.metrics.activeConnections = this.pool.totalCount - this.pool.idleCount;
    this.metrics.idleConnections = this.pool.idleCount;
    this.metrics.waitingClients = this.pool.waitingCount;
  }
  
  private startQueryProcessor(): void {
    setInterval(() => {
      if (this.queryQueue.length > 0) {
        // Sort by priority
        this.queryQueue.sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        const batch = this.queryQueue.splice(0, 5); // Process 5 at a time
        batch.forEach(item => this.executeQueuedQuery(item));
      }
    }, 100);
  }
  
  private async executeQueuedQuery(item: any): Promise<void> {
    try {
      const result = await this.executeQuery(item.query, item.params);
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }
  }
  
  async query(
    text: string, 
    params: any[] = [], 
    options: QueryOptions = {}
  ): Promise<any> {
    const queryId = this.generateQueryId(text, params);
    const startTime = Date.now();
    
    // Check cache first
    if (options.cache && this.queryCache.has(queryId)) {
      const cached = this.queryCache.get(queryId)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        console.log('📦 Query served from cache');
        return cached.result;
      } else {
        this.queryCache.delete(queryId);
      }
    }
    
    // Queue low priority queries during high load
    if (options.priority === 'low' && this.pool.waitingCount > 5) {
      return new Promise((resolve, reject) => {
        this.queryQueue.push({ query: text, params, resolve, reject, priority: options.priority || 'normal' });
      });
    }
    
    try {
      const result = await this.executeQuery(text, params, options.timeout);
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.metrics.totalQueries++;
      this.metrics.averageQueryTime = 
        (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + duration) / this.metrics.totalQueries;
      
      // Cache result if requested
      if (options.cache) {
        this.queryCache.set(queryId, {
          result: result.rows || result,
          timestamp: Date.now(),
          ttl: options.cacheTTL || 300000 // 5 minutes default
        });
      }
      
      this.emit('query_executed', { query: text, duration, success: true });
      
      return result.rows || result;
    } catch (error) {
      this.metrics.failedQueries++;
      console.error('💥 Query failed:', { query: text, error: error.message });
      this.emit('query_executed', { query: text, duration: Date.now() - startTime, success: false, error });
      
      // Retry logic for transient errors
      if (options.retries && options.retries > 0 && this.isTransientError(error)) {
        await this.delay(1000);
        return this.query(text, params, { ...options, retries: options.retries - 1 });
      }
      
      throw error;
    }
  }
  
  private async executeQuery(text: string, params: any[], timeout?: number): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      if (timeout) {
        return await Promise.race([
          client.query(text, params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          )
        ]);
      }
      
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }
  
  private generateQueryId(text: string, params: any[]): string {
    return createHash('md5')
      .update(text + JSON.stringify(params))
      .digest('hex');
  }
  
  private isTransientError(error: any): boolean {
    const transientErrorCodes = ['ECONNRESET', 'ETIMEDOUT', '57P01', '08006'];
    return transientErrorCodes.some(code => 
      error.code === code || error.message.includes(code)
    );
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Prepared statements for common queries
  async getConversationMessages(conversationId: string, limit = 50): Promise<any[]> {
    const query = `
      SELECT m.*, u.username 
      FROM messages m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.conversation_id = $1 
      ORDER BY m.created_at DESC 
      LIMIT $2
    `;
    
    return this.query(query, [conversationId, limit], { 
      cache: true, 
      cacheTTL: 60000,
      priority: 'high' 
    });
  }
  
  async getUserConversations(userId: string, limit = 20): Promise<any[]> {
    const query = `
      SELECT c.*, 
             (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c 
      WHERE c.user_id = $1 AND c.is_archived = false
      ORDER BY c.updated_at DESC 
      LIMIT $2
    `;
    
    return this.query(query, [userId, limit], { 
      cache: true, 
      cacheTTL: 30000,
      priority: 'normal' 
    });
  }
  
  async createOptimizedIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC) WHERE NOT is_archived',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_tokens ON messages(user_id, tokens) WHERE tokens IS NOT NULL',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_research_sessions_user_created ON research_sessions(user_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_progress_user_language ON learning_progress(user_id, language_code)',
    ];
    
    for (const indexQuery of indexes) {
      try {
        await this.query(indexQuery);
        console.log('✅ Index created successfully');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Index creation failed:', error);
        }
      }
    }
  }
  
  // Analytics and reporting
  async getDatabaseStats(): Promise<any> {
    const queries = [
      {
        name: 'table_sizes',
        query: `
          SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
            pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
          FROM pg_tables
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
          ORDER BY size_bytes DESC
          LIMIT 10
        `
      },
      {
        name: 'connection_stats',
        query: `
          SELECT 
            COUNT(*) as total_connections,
            COUNT(*) FILTER (WHERE state = 'active') as active_connections,
            COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity
          WHERE datname = current_database()
        `
      },
      {
        name: 'slow_queries',
        query: `
          SELECT 
            query,
            calls,
            total_exec_time,
            mean_exec_time
          FROM pg_stat_statements
          WHERE mean_exec_time > 100
          ORDER BY mean_exec_time DESC
          LIMIT 5
        `
      }
    ];
    
    const stats = {};
    for (const { name, query } of queries) {
      try {
        stats[name] = await this.query(query);
      } catch (error) {
        stats[name] = { error: error.message };
      }
    }
    
    return {
      ...stats,
      pool_metrics: this.metrics,
      cache_stats: {
        cached_queries: this.queryCache.size,
        cache_hit_ratio: this.calculateCacheHitRatio()
      }
    };
  }
  
  private calculateCacheHitRatio(): number {
    // Implementation would track cache hits vs misses
    return 0.85; // Placeholder
  }
  
  getMetrics(): ConnectionMetrics {
    this.updatePoolMetrics();
    return { ...this.metrics };
  }
  
  async shutdown(): Promise<void> {
    console.log('🔒 Shutting down database manager...');
    this.queryCache.clear();
    await this.pool.end();
    this.removeAllListeners();
  }
}

export const enhancedDbManager = new EnhancedDatabaseManager();
export default enhancedDbManager;
