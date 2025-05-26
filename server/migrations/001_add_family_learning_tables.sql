
-- Extend existing tables with learning context
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS learning_context JSONB DEFAULT '{}';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS language_corrections JSONB DEFAULT '[]';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS learning_insights JSONB DEFAULT '{}';

-- Family management tables
CREATE TABLE IF NOT EXISTS families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  primary_user_id INTEGER REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
  id SERIAL PRIMARY KEY,
  family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('parent', 'child', 'guardian')),
  age_group VARCHAR(20) CHECK (age_group IN ('child', 'teen', 'adult')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Learning profiles integrated with user context
CREATE TABLE IF NOT EXISTS user_learning_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  native_languages JSONB DEFAULT '[]',
  learning_languages JSONB DEFAULT '[]',
  cultural_background VARCHAR(50),
  learning_style VARCHAR(50),
  current_level JSONB DEFAULT '{}',
  interests JSONB DEFAULT '[]',
  daily_goal_minutes INTEGER DEFAULT 30,
  preferred_learning_time JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Learning content with offline support
CREATE TABLE IF NOT EXISTS learning_modules (
  id SERIAL PRIMARY KEY,
  title JSONB NOT NULL,
  description JSONB,
  category VARCHAR(50),
  target_language VARCHAR(10),
  source_language VARCHAR(10),
  difficulty_level INTEGER,
  content JSONB,
  offline_package JSONB,
  cultural_notes JSONB,
  estimated_minutes INTEGER,
  prerequisites JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Progress tracking linked to chat/research activities
CREATE TABLE IF NOT EXISTS user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  module_id INTEGER REFERENCES learning_modules(id),
  family_id INTEGER REFERENCES families(id),
  status VARCHAR(20) DEFAULT 'not_started',
  score INTEGER,
  time_spent INTEGER,
  mistakes JSONB DEFAULT '[]',
  chat_sessions_referenced JSONB DEFAULT '[]',
  research_tasks_referenced JSONB DEFAULT '[]',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pre-generated content queue
CREATE TABLE IF NOT EXISTS content_preparation_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  content_type VARCHAR(50),
  target_date DATE,
  preferences JSONB,
  generated_content JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Family learning sessions
CREATE TABLE IF NOT EXISTS family_learning_sessions (
  id SERIAL PRIMARY KEY,
  family_id INTEGER REFERENCES families(id),
  session_type VARCHAR(50),
  participants JSONB,
  content JSONB,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  achievements JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_family_id ON user_progress(family_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_learning ON chat_messages USING GIN(learning_context);
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_preparation_queue(status, target_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_language ON chat_messages(user_id, (learning_context->>'language'));
CREATE INDEX IF NOT EXISTS idx_learning_modules_offline ON learning_modules(target_language) WHERE offline_package IS NOT NULL;
