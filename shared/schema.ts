import {
  pgTable,
  text,
  serial,
  varchar,
  timestamp,
  jsonb,
  index,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User Preferences table for personalization
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  key: true,
  value: true,
});

export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;

// Reminders for schedule management
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  datetime: timestamp("datetime").notNull(),
  completed: boolean("completed").default(false),
  repeat: text("repeat").default("never"),
  notifyBefore: integer("notify_before").default(0), // minutes
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).pick({
  userId: true,
  title: true,
  description: true,
  datetime: true,
  repeat: true,
  notifyBefore: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Family rooms for group chat
export const familyRooms = pgTable("family_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdById: varchar("created_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFamilyRoomSchema = createInsertSchema(familyRooms).pick({
  name: true,
  createdById: true,
});

export type InsertFamilyRoom = z.infer<typeof insertFamilyRoomSchema>;
export type FamilyRoom = typeof familyRooms.$inferSelect;

// Family room members
export const familyRoomMembers = pgTable("family_room_members", {
  id: serial("id").primaryKey(),
  familyRoomId: integer("family_room_id")
    .notNull()
    .references(() => familyRooms.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isAdmin: boolean("is_admin").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => {
  return {
    uniqMembership: index("uniq_room_user").on(table.familyRoomId, table.userId),
  };
});

export const insertFamilyRoomMemberSchema = createInsertSchema(familyRoomMembers).pick({
  familyRoomId: true,
  userId: true,
  isAdmin: true,
});

export type InsertFamilyRoomMember = z.infer<typeof insertFamilyRoomMemberSchema>;
export type FamilyRoomMember = typeof familyRoomMembers.$inferSelect;

// Messages for both personal and family chats
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  familyRoomId: integer("family_room_id")
    .references(() => familyRooms.id, { onDelete: "cascade" }),
  isAiResponse: boolean("is_ai_response").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  userId: true,
  familyRoomId: true,
  isAiResponse: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Memory for long-term context
export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: jsonb("embedding"), // Vector embedding for semantic search
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memories).pick({
  userId: true,
  content: true,
  embedding: true,
});

export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;
