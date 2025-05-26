
-- Whitelist table
CREATE TABLE IF NOT EXISTS whitelist (
  email VARCHAR(255) PRIMARY KEY,
  added_by VARCHAR(255) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User settings for memory and preferences
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  memory_retention_days INTEGER DEFAULT 30,
  memory_categories JSONB DEFAULT '{"personal": true, "preferences": true, "emotions": true, "plans": true, "casual": false}',
  forget_patterns TEXT[],
  cultural_background VARCHAR(50),
  languages TEXT[] DEFAULT ARRAY['en'],
  interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferred_style VARCHAR(50) DEFAULT 'friendly',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations storage
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID DEFAULT gen_random_uuid(),
  messages JSONB NOT NULL,
  language_analysis JSONB,
  importance_score FLOAT DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin content for curation
CREATE TABLE IF NOT EXISTS admin_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(500),
  target_users TEXT DEFAULT 'all',
  priority VARCHAR(20) DEFAULT 'normal',
  expires_at TIMESTAMP NOT NULL,
  added_by VARCHAR(255) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW()
);

-- Social trends cache
CREATE TABLE IF NOT EXISTS social_trends_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  region VARCHAR(10) NOT NULL,
  trend_data JSONB NOT NULL,
  fetched_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Memory embeddings (for advanced memory features)
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- Adjust dimension based on your embedding model
  metadata JSONB,
  importance_score FLOAT DEFAULT 0.5,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_content_expires_at ON admin_content(expires_at);
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_user_id ON memory_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_expires_at ON memory_embeddings(expires_at);

-- Add some default admin users (update emails as needed)
INSERT INTO whitelist (email, added_by) VALUES 
  ('admin@example.com', 'system'),
  ('developer@example.com', 'system')
ON CONFLICT (email) DO NOTHING;

-- Set admin flags for initial admin users
UPDATE users SET is_admin = TRUE 
WHERE email IN ('admin@example.com', 'developer@example.com');
