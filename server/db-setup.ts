
// server/db-setup.ts
import { Client } from 'pg';

// Replit PostgreSQL connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.REPLIT_DB_URL;

async function setupDatabase() {
  if (!DATABASE_URL) {
    console.log('No database URL found. Using in-memory storage.');
    return;
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS research_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        topic VARCHAR(500),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_progress (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        language_code VARCHAR(10) NOT NULL,
        level VARCHAR(50),
        progress_percentage INTEGER DEFAULT 0,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb,
        UNIQUE(user_id, language_code)
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_research_sessions_user_created 
      ON research_sessions(user_id, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_learning_progress_user_language 
      ON learning_progress(user_id, language_code);
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('Database setup error:', error);
  } finally {
    await client.end();
  }
}

// Run setup
setupDatabase();
