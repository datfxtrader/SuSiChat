import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Add crash prevention handler
process.on('unhandledRejection', (reason: any, promise) => {
  if (reason?.code === '57P01' || reason?.message?.includes('administrator command')) {
    console.log('🔄 Database connection reset (normal) - continuing...');
    return; // Don't crash
  }
  console.error('Actual error that needs attention:', reason);
});

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced PostgreSQL pool configuration for long-running research operations
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 30000,     // 30 seconds to establish connection
  idleTimeoutMillis: 600000,         // 10 minutes idle timeout
  max: 20,                           // Maximum connections in pool
  min: 5,                            // Minimum connections to maintain
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // 10 seconds before first keep-alive
});

export const db = drizzle({ client: pool, schema });

// Safe query wrapper to handle connection resets
export async function safeQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    return await queryFn();
  } catch (error: any) {
    if (error.code === '57P01' || error.message?.includes('administrator command')) {
      console.log('🔄 Retrying database connection...');
      // Wait and retry once
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await queryFn();
    }
    throw error;
  }
}

// Research results cache for fallback storage
const researchResultsCache = new Map();

// Store research results with database fallback to memory
export async function storeResearchResults(conversationId: string, results: any) {
  try {
    // Try database first
    await safeQuery(() => executeResearchQuery(
      'INSERT INTO research_results (conversation_id, results, created_at) VALUES ($1, $2, NOW())',
      [conversationId, JSON.stringify(results)]
    ));
    console.log('✅ Results stored in database');
    
  } catch (error) {
    console.error('❌ Database storage failed, using memory cache:', error);
    
    // Fallback to memory storage
    researchResultsCache.set(conversationId, {
      results,
      timestamp: new Date().toISOString()
    });
    console.log('💾 Results cached in memory as fallback');
  }
}

// Retrieve research results with memory fallback
export async function getResearchResults(conversationId: string) {
  try {
    // Try database first
    const result = await safeQuery(() => executeResearchQuery(
      'SELECT results FROM research_results WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1',
      [conversationId]
    ));
    
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].results);
    }
    
  } catch (error) {
    console.error('❌ Database retrieval failed, checking memory cache:', error);
  }
  
  // Fallback to memory cache
  const cached = researchResultsCache.get(conversationId);
  if (cached) {
    console.log('💾 Retrieved results from memory cache');
    return cached.results;
  }
  
  return null;
}

// Enhanced query wrapper with retry logic for research operations
export async function executeResearchQuery(query: string, params: any[] = []) {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Database client connected for research operation');
    const result = await client.query(query, params);
    console.log('✅ Research query completed successfully');
    return result;
    
  } catch (error) {
    console.error('❌ Database query failed:', error);
    
    // Retry logic for connection issues
    if (error.code === 'ECONNRESET' || error.message.includes('administrator command')) {
      console.log('🔄 Retrying database operation after connection reset...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const retryResult = await client.query(query, params);
        console.log('✅ Retry successful');
        return retryResult;
      } catch (retryError) {
        console.error('❌ Retry also failed:', retryError);
        throw retryError;
      }
    }
    throw error;
  } finally {
    client.release();
    console.log('🔓 Database client released');
  }
}