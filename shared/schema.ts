
import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, varchar, decimal } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text("email").unique().notNull(),
  username: text("username").unique(),
  name: text("name"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  conversationId: text("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  tokens: integer("tokens"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const researchSessions = pgTable("research_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: text("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  results: jsonb("results"),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] })
    .default("pending")
    .notNull(),
  depth: integer("depth").default(3),
  model: text("model").default("deepseek-v3"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const learningProgress = pgTable("learning_progress", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  languageCode: text("language_code").notNull(),
  level: text("level").notNull(),
  progress: integer("progress").default(0),
  completedLessons: jsonb("completed_lessons").default('[]'),
  streakDays: integer("streak_days").default(0),
  lastStudyDate: timestamp("last_study_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const familyRooms = pgTable("family_rooms", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  inviteCode: text("invite_code").unique().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const familyMembers = pgTable("family_members", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  roomId: text("room_id")
    .references(() => familyRooms.id, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role", { enum: ["parent", "child", "tutor"] })
    .default("child")
    .notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  slug: text("slug").unique().notNull(),
  authorId: text("author_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  published: boolean("published").default(false).notNull(),
  tags: jsonb("tags").default('[]'),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

export const vietnameseChatSessions = pgTable("vietnamese_chat_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionName: text("session_name"),
  personality: text("personality").default("friendly").notNull(),
  language: text("language").default("vietnamese").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastInteraction: timestamp("last_interaction").defaultNow().notNull(),
});

export const vietnameseChatMessages = pgTable("vietnamese_chat_messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  sessionId: text("session_id")
    .references(() => vietnameseChatSessions.id, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  translation: text("translation"),
  sentiment: text("sentiment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type ResearchSession = typeof researchSessions.$inferSelect;
export type NewResearchSession = typeof researchSessions.$inferInsert;
export type LearningProgress = typeof learningProgress.$inferSelect;
export type NewLearningProgress = typeof learningProgress.$inferInsert;
export type FamilyRoom = typeof familyRooms.$inferSelect;
export type NewFamilyRoom = typeof familyRooms.$inferInsert;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type VietnameseChatSession = typeof vietnameseChatSessions.$inferSelect;
export type NewVietnameseChatSession = typeof vietnameseChatSessions.$inferInsert;
export type VietnameseChatMessage = typeof vietnameseChatMessages.$inferSelect;
export type NewVietnameseChatMessage = typeof vietnameseChatMessages.$inferInsert;
