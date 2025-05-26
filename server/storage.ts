
import {
  users,
  type User,
  type UpsertUser,
  userPreferences,
  type UserPreference,
  type InsertUserPreference,
  reminders,
  type Reminder,
  type InsertReminder,
  familyRooms,
  type FamilyRoom,
  type InsertFamilyRoom,
  familyRoomMembers,
  type FamilyRoomMember,
  type InsertFamilyRoomMember,
  messages,
  type Message,
  type InsertMessage,
  memories,
  type Memory,
  type InsertMemory,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull, sql, gt, count, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User preferences
  getUserPreference(userId: string, key: string): Promise<UserPreference | undefined>;
  setUserPreference(preference: InsertUserPreference): Promise<UserPreference>;
  getUserPreferences(userId: string): Promise<UserPreference[]>;
  
  // Reminders
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  getReminder(id: number): Promise<Reminder | undefined>;
  getUserReminders(userId: string): Promise<Reminder[]>;
  getUserUpcomingReminders(userId: string, limit?: number): Promise<Reminder[]>;
  updateReminder(id: number, reminder: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: number): Promise<boolean>;
  
  // Family rooms
  createFamilyRoom(room: InsertFamilyRoom): Promise<FamilyRoom>;
  getFamilyRoom(id: number): Promise<FamilyRoom | undefined>;
  getUserFamilyRooms(userId: string): Promise<FamilyRoom[]>;
  
  // Family room members
  addFamilyRoomMember(member: InsertFamilyRoomMember): Promise<FamilyRoomMember>;
  getFamilyRoomMembers(roomId: number): Promise<FamilyRoomMember[]>;
  getFamilyRoomMembersWithUserDetails(roomId: number): Promise<(FamilyRoomMember & User)[]>;
  isUserInFamilyRoom(userId: string, roomId: number): Promise<boolean>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getPersonalMessages(userId: string, limit?: number): Promise<Message[]>;
  getFamilyRoomMessages(roomId: number, limit?: number): Promise<Message[]>;
  
  // Memory
  createMemory(memory: InsertMemory): Promise<Memory>;
  getUserMemories(userId: string): Promise<Memory[]>;
  searchUserMemories(userId: string, query: string): Promise<Memory[]>;
}

export class DatabaseStorage implements IStorage {
  // Cache for frequently accessed data
  private readonly userCache = new Map<string, { user: User; timestamp: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // Check cache first
    const cached = this.userCache.get(id);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.user;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    if (user) {
      this.userCache.set(id, { user, timestamp: Date.now() });
    }
    
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // Update cache
    this.userCache.set(user.id, { user, timestamp: Date.now() });
    
    return user;
  }
  
  // User preferences - Optimized with single query
  async getUserPreference(userId: string, key: string): Promise<UserPreference | undefined> {
    const [preference] = await db
      .select()
      .from(userPreferences)
      .where(and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.key, key)
      ))
      .limit(1);
    
    return preference;
  }
  
  async setUserPreference(preference: InsertUserPreference): Promise<UserPreference> {
    const [result] = await db
      .insert(userPreferences)
      .values(preference)
      .onConflictDoUpdate({
        target: [userPreferences.userId, userPreferences.key],
        set: { value: preference.value }
      })
      .returning();
    
    return result;
  }
  
  async getUserPreferences(userId: string): Promise<UserPreference[]> {
    return db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
  }
  
  // Reminders
  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [created] = await db
      .insert(reminders)
      .values(reminder)
      .returning();
    return created;
  }
  
  async getReminder(id: number): Promise<Reminder | undefined> {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, id))
      .limit(1);
    
    return reminder;
  }
  
  async getUserReminders(userId: string): Promise<Reminder[]> {
    return db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(reminders.datetime);
  }
  
  async getUserUpcomingReminders(userId: string, limit: number = 5): Promise<Reminder[]> {
    const now = new Date();
    return db
      .select()
      .from(reminders)
      .where(and(
        eq(reminders.userId, userId),
        eq(reminders.completed, false),
        gt(reminders.datetime, now)
      ))
      .orderBy(reminders.datetime)
      .limit(limit);
  }
  
  async updateReminder(id: number, reminderUpdate: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const [updated] = await db
      .update(reminders)
      .set(reminderUpdate)
      .where(eq(reminders.id, id))
      .returning();
    
    return updated;
  }
  
  async deleteReminder(id: number): Promise<boolean> {
    const result = await db
      .delete(reminders)
      .where(eq(reminders.id, id))
      .returning({ id: reminders.id });
    
    return result.length > 0;
  }
  
  // Family rooms - Optimized with transaction
  async createFamilyRoom(room: InsertFamilyRoom): Promise<FamilyRoom> {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(familyRooms)
        .values(room)
        .returning();
      
      // Add creator as admin
      await tx
        .insert(familyRoomMembers)
        .values({
          familyRoomId: created.id,
          userId: room.createdById,
          isAdmin: true,
        });
      
      return created;
    });
  }
  
  async getFamilyRoom(id: number): Promise<FamilyRoom | undefined> {
    const [room] = await db
      .select()
      .from(familyRooms)
      .where(eq(familyRooms.id, id))
      .limit(1);
    
    return room;
  }
  
  // Optimized with join instead of two queries
  async getUserFamilyRooms(userId: string): Promise<FamilyRoom[]> {
    return db
      .select({
        id: familyRooms.id,
        name: familyRooms.name,
        createdById: familyRooms.createdById,
        createdAt: familyRooms.createdAt,
      })
      .from(familyRooms)
      .innerJoin(
        familyRoomMembers,
        eq(familyRooms.id, familyRoomMembers.familyRoomId)
      )
      .where(eq(familyRoomMembers.userId, userId));
  }
  
  // Family room members - Optimized with upsert
  async addFamilyRoomMember(member: InsertFamilyRoomMember): Promise<FamilyRoomMember> {
    const [result] = await db
      .insert(familyRoomMembers)
      .values(member)
      .onConflictDoUpdate({
        target: [familyRoomMembers.familyRoomId, familyRoomMembers.userId],
        set: { isAdmin: member.isAdmin ?? false }
      })
      .returning();
    
    return result;
  }
  
  async getFamilyRoomMembers(roomId: number): Promise<FamilyRoomMember[]> {
    return db
      .select()
      .from(familyRoomMembers)
      .where(eq(familyRoomMembers.familyRoomId, roomId));
  }
  
  // Optimized with better join selection
  async getFamilyRoomMembersWithUserDetails(roomId: number): Promise<(FamilyRoomMember & User)[]> {
    const results = await db
      .select({
        // FamilyRoomMember fields
        familyRoomId: familyRoomMembers.familyRoomId,
        userId: familyRoomMembers.userId,
        isAdmin: familyRoomMembers.isAdmin,
        joinedAt: familyRoomMembers.joinedAt,
        // User fields
        id: users.id,
        email: users.email,
        name: users.name,
        phoneNumber: users.phoneNumber,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(familyRoomMembers)
      .innerJoin(users, eq(familyRoomMembers.userId, users.id))
      .where(eq(familyRoomMembers.familyRoomId, roomId));
    
    return results as (FamilyRoomMember & User)[];
  }
  
  // Optimized to use EXISTS for better performance
  async isUserInFamilyRoom(userId: string, roomId: number): Promise<boolean> {
    const [result] = await db
      .select({ exists: sql<boolean>`1` })
      .from(familyRoomMembers)
      .where(and(
        eq(familyRoomMembers.userId, userId),
        eq(familyRoomMembers.familyRoomId, roomId)
      ))
      .limit(1);
    
    return !!result;
  }
  
  // Messages
  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db
      .insert(messages)
      .values(message)
      .returning();
    return created;
  }
  
  async getPersonalMessages(userId: string, limit: number = 50): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(and(
        eq(messages.userId, userId),
        isNull(messages.familyRoomId)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }
  
  async getFamilyRoomMessages(roomId: number, limit: number = 50): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.familyRoomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }
  
  // Memory
  async createMemory(memory: InsertMemory): Promise<Memory> {
    const [created] = await db
      .insert(memories)
      .values(memory)
      .returning();
    return created;
  }
  
  async getUserMemories(userId: string): Promise<Memory[]> {
    return db
      .select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.createdAt));
  }
  
  // Optimized with parameterized query for safety
  async searchUserMemories(userId: string, query: string): Promise<Memory[]> {
    // Sanitize query for ILIKE pattern
    const sanitizedQuery = query.replace(/[%_]/g, '\\$&');
    
    return db
      .select()
      .from(memories)
      .where(and(
        eq(memories.userId, userId),
        sql`${memories.content} ILIKE ${`%${sanitizedQuery}%`}`
      ))
      .orderBy(desc(memories.createdAt));
  }
  
  // Utility method to clear user cache
  clearUserCache(userId?: string): void {
    if (userId) {
      this.userCache.delete(userId);
    } else {
      this.userCache.clear();
    }
  }
}

export const storage = new DatabaseStorage();
