
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

class DatabaseConnectionManager {
  private pool: Pool | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxRetries = 5;
  private retryDelay = 2000;

  constructor() {
    this.initializePool();
  }

  private initializePool() {
    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: 30000,
        query_timeout: 30000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        application_name: 'deerflow_app'
      });

      this.pool.on('error', (err) => {
        console.error('Database pool error:', err);
        this.isConnected = false;
      });

      this.pool.on('connect', () => {
        console.log('New database connection established');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

    } catch (error) {
      console.error('Failed to initialize database pool:', error);
      this.isConnected = false;
    }
  }

  async getConnection() {
    if (!this.pool || !this.isConnected) {
      await this.reconnect();
    }

    try {
      const client = await this.pool!.connect();
      return client;
    } catch (error) {
      console.error('Failed to get database connection:', error);
      await this.reconnect();
      throw error;
    }
  }

  private async reconnect() {
    if (this.connectionAttempts >= this.maxRetries) {
      throw new Error('Max database connection retries exceeded');
    }

    this.connectionAttempts++;
    console.log(`Attempting database reconnection ${this.connectionAttempts}/${this.maxRetries}`);

    await new Promise(resolve => setTimeout(resolve, this.retryDelay * this.connectionAttempts));

    this.initializePool();

    try {
      const client = await this.pool!.connect();
      client.release();
      this.isConnected = true;
      console.log('Database reconnection successful');
    } catch (error) {
      console.error('Database reconnection failed:', error);
      throw error;
    }
  }

  getDrizzleInstance() {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return drizzle(this.pool, { schema });
  }

  async healthCheck() {
    try {
      const client = await this.getConnection();
      await client.query('SELECT 1');
      client.release();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date().toISOString() 
      };
    }
  }

  async shutdown() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('Database pool shutdown complete');
    }
  }
}

export const dbManager = new DatabaseConnectionManager();
export const db = dbManager.getDrizzleInstance();
