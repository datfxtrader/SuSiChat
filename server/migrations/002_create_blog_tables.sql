
-- Create enums
CREATE TYPE reading_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE language_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- User Interests Table
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    subcategories JSONB DEFAULT '[]'::jsonb,
    weight INTEGER NOT NULL DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Language Preferences
CREATE TABLE user_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    language_code TEXT NOT NULL,
    language_name TEXT NOT NULL,
    level language_level NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blog Posts Table
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    source_urls JSONB DEFAULT '[]'::jsonb,
    language TEXT NOT NULL DEFAULT 'en',
    reading_level reading_level NOT NULL,
    estimated_read_time INTEGER NOT NULL,
    vocabulary_highlights JSONB,
    grammar_points JSONB DEFAULT '[]'::jsonb,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_personalized BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    fact_checked BOOLEAN DEFAULT false,
    fact_check_score REAL,
    generation_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Blog Interactions
CREATE TABLE user_blog_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    post_id UUID NOT NULL REFERENCES blog_posts(id),
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'share', 'fact_check', 'dislike')),
    time_spent INTEGER,
    vocabulary_learned JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vocabulary Learning Progress
CREATE TABLE vocabulary_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    language TEXT NOT NULL,
    times_encountered INTEGER DEFAULT 1,
    times_correct INTEGER DEFAULT 0,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mastered BOOLEAN DEFAULT false,
    UNIQUE(user_id, word, language)
);

-- Indexes for performance
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_languages_user_id ON user_languages(user_id);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_language ON blog_posts(language);
CREATE INDEX idx_blog_posts_reading_level ON blog_posts(reading_level);
CREATE INDEX idx_blog_posts_personalized ON blog_posts(is_personalized);
CREATE INDEX idx_blog_posts_trending ON blog_posts(is_trending);
CREATE INDEX idx_blog_posts_expires_at ON blog_posts(expires_at);
CREATE INDEX idx_user_blog_interactions_user_id ON user_blog_interactions(user_id);
CREATE INDEX idx_user_blog_interactions_post_id ON user_blog_interactions(post_id);
CREATE INDEX idx_vocabulary_progress_user_id ON vocabulary_progress(user_id);
