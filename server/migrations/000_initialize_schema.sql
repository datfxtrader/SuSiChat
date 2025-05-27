
-- Initialize the complete database schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    name TEXT,
    avatar TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    is_archived BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Research sessions table
CREATE TABLE IF NOT EXISTS research_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    results JSONB,
    status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending' NOT NULL,
    depth INTEGER DEFAULT 3,
    model TEXT DEFAULT 'deepseek-v3',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP
);

-- Learning progress table
CREATE TABLE IF NOT EXISTS learning_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    language_code TEXT NOT NULL,
    level TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    completed_lessons JSONB DEFAULT '[]',
    streak_days INTEGER DEFAULT 0,
    last_study_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Family rooms table
CREATE TABLE IF NOT EXISTS family_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Family members table
CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    room_id TEXT REFERENCES family_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('parent', 'child', 'tutor')) DEFAULT 'child' NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    slug TEXT UNIQUE NOT NULL,
    author_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    published BOOLEAN DEFAULT FALSE NOT NULL,
    tags JSONB DEFAULT '[]',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    published_at TIMESTAMP
);

-- Vietnamese chat sessions table
CREATE TABLE IF NOT EXISTS vietnamese_chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_name TEXT,
    personality TEXT DEFAULT 'friendly' NOT NULL,
    language TEXT DEFAULT 'vietnamese' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_interaction TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Vietnamese chat messages table
CREATE TABLE IF NOT EXISTS vietnamese_chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES vietnamese_chat_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    translation TEXT,
    sentiment TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_messages_user_tokens ON messages(user_id, tokens) WHERE tokens IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_research_sessions_user_created ON research_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_language ON learning_progress(user_id, language_code);
CREATE INDEX IF NOT EXISTS idx_family_members_room ON family_members(room_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_vietnamese_sessions_user ON vietnamese_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vietnamese_messages_session ON vietnamese_chat_messages(session_id, created_at DESC);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_progress_updated_at ON learning_progress;
CREATE TRIGGER update_learning_progress_updated_at BEFORE UPDATE ON learning_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_rooms_updated_at ON family_rooms;
CREATE TRIGGER update_family_rooms_updated_at BEFORE UPDATE ON family_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
