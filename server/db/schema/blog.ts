
import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, pgEnum, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const readingLevelEnum = pgEnum('reading_level', ['beginner', 'intermediate', 'advanced']);
export const languageLevelEnum = pgEnum('language_level', ['beginner', 'intermediate', 'advanced']);

// User Interests Table
export const userInterests = pgTable('user_interests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  categoryId: text('category_id').notNull(),
  subcategories: jsonb('subcategories').$type<string[]>().default([]),
  weight: integer('weight').notNull().default(5), // 1-10
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// User Language Preferences
export const userLanguages = pgTable('user_languages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  languageCode: text('language_code').notNull(),
  languageName: text('language_name').notNull(),
  level: languageLevelEnum('level').notNull(),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

// Blog Posts Table
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  summary: text('summary').notNull(),
  category: text('category').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]),
  sourceUrls: jsonb('source_urls').$type<string[]>().default([]),
  language: text('language').notNull().default('en'),
  readingLevel: readingLevelEnum('reading_level').notNull(),
  estimatedReadTime: integer('estimated_read_time').notNull(),
  vocabularyHighlights: jsonb('vocabulary_highlights').$type<VocabularyItem[]>(),
  grammarPoints: jsonb('grammar_points').$type<string[]>(),
  publishedAt: timestamp('published_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  isPersonalized: boolean('is_personalized').default(false),
  isTrending: boolean('is_trending').default(false),
  factChecked: boolean('fact_checked').default(false),
  factCheckScore: real('fact_check_score'),
  generationMetadata: jsonb('generation_metadata').$type<GenerationMetadata>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// User Blog Interactions
export const userBlogInteractions = pgTable('user_blog_interactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  postId: uuid('post_id').notNull().references(() => blogPosts.id),
  interactionType: text('interaction_type').notNull(), // 'view', 'click', 'share', 'fact_check', 'dislike'
  timeSpent: integer('time_spent'), // seconds
  vocabularyLearned: jsonb('vocabulary_learned').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow()
});

// Vocabulary Learning Progress
export const vocabularyProgress = pgTable('vocabulary_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  word: text('word').notNull(),
  language: text('language').notNull(),
  timesEncountered: integer('times_encountered').default(1),
  timesCorrect: integer('times_correct').default(0),
  lastSeen: timestamp('last_seen').defaultNow(),
  mastered: boolean('mastered').default(false)
});

// Types
export interface VocabularyItem {
  word: string;
  definition: string;
  translation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  example?: string;
}

export interface GenerationMetadata {
  model: string;
  promptTemplate: string;
  sources: string[];
  generatedAt: string;
  userContext: {
    interests: string[];
    recentQueries: string[];
    language: string;
    level: string;
  };
}

// Relations
export const blogPostsRelations = relations(blogPosts, ({ many }) => ({
  interactions: many(userBlogInteractions),
}));

export const userBlogInteractionsRelations = relations(userBlogInteractions, ({ one }) => ({
  post: one(blogPosts, {
    fields: [userBlogInteractions.postId],
    references: [blogPosts.id],
  }),
}));
