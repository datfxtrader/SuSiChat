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
import { eq, and, desc, isNull, SQL, sql, gt, count } from "drizzle-orm";

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
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
    return user;
  }
  
  // User preferences
  async getUserPreference(userId: string, key: string): Promise<UserPreference | undefined> {
    const [preference] = await db
      .select()
      .from(userPreferences)
      .where(and(
        eq(userPreferences.userId, userId),
        eq(userPreferences.key, key)
      ));
    return preference;
  }
  
  async setUserPreference(preference: InsertUserPreference): Promise<UserPreference> {
    const existing = await this.getUserPreference(preference.userId, preference.key);
    
    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({ value: preference.value })
        .where(eq(userPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userPreferences)
        .values(preference)
        .returning();
      return created;
    }
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
      .where(eq(reminders.id, id));
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
    return db
      .select()
      .from(reminders)
      .where(and(
        eq(reminders.userId, userId),
        eq(reminders.completed, false),
        gt(reminders.datetime, new Date())
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
  
  // Family rooms
  async createFamilyRoom(room: InsertFamilyRoom): Promise<FamilyRoom> {
    const [created] = await db
      .insert(familyRooms)
      .values(room)
      .returning();
    
    // Add creator as admin
    await db
      .insert(familyRoomMembers)
      .values({
        familyRoomId: created.id,
        userId: room.createdById,
        isAdmin: true,
      });
      
    return created;
  }
  
  async getFamilyRoom(id: number): Promise<FamilyRoom | undefined> {
    const [room] = await db
      .select()
      .from(familyRooms)
      .where(eq(familyRooms.id, id));
    return room;
  }
  
  async getUserFamilyRooms(userId: string): Promise<FamilyRoom[]> {
    const memberRooms = await db
      .select({
        roomId: familyRoomMembers.familyRoomId,
      })
      .from(familyRoomMembers)
      .where(eq(familyRoomMembers.userId, userId));
    
    if (memberRooms.length === 0) return [];
    
    const roomIds = memberRooms.map(r => r.roomId);
    
    return db
      .select()
      .from(familyRooms)
      .where(sql`${familyRooms.id} IN (${roomIds.join(',')})`);
  }
  
  // Family room members
  async addFamilyRoomMember(member: InsertFamilyRoomMember): Promise<FamilyRoomMember> {
    const [created] = await db
      .insert(familyRoomMembers)
      .values(member)
      .onConflictDoNothing({
        target: [familyRoomMembers.familyRoomId, familyRoomMembers.userId],
      })
      .returning();
    
    if (!created) {
      const [existing] = await db
        .select()
        .from(familyRoomMembers)
        .where(and(
          eq(familyRoomMembers.familyRoomId, member.familyRoomId),
          eq(familyRoomMembers.userId, member.userId)
        ));
      return existing;
    }
    
    return created;
  }
  
  async getFamilyRoomMembers(roomId: number): Promise<FamilyRoomMember[]> {
    return db
      .select()
      .from(familyRoomMembers)
      .where(eq(familyRoomMembers.familyRoomId, roomId));
  }
  
  async getFamilyRoomMembersWithUserDetails(roomId: number): Promise<(FamilyRoomMember & User)[]> {
    const results = await db
      .select()
      .from(familyRoomMembers)
      .innerJoin(users, eq(familyRoomMembers.userId, users.id))
      .where(eq(familyRoomMembers.familyRoomId, roomId));
      
    return results.map(row => ({
      ...row.family_room_members,
      ...row.users
    })) as (FamilyRoomMember & User)[];
  }
  
  async isUserInFamilyRoom(userId: string, roomId: number): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(familyRoomMembers)
      .where(and(
        eq(familyRoomMembers.userId, userId),
        eq(familyRoomMembers.familyRoomId, roomId)
      ));
    
    return result.count > 0;
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
  
  async searchUserMemories(userId: string, query: string): Promise<Memory[]> {
    // For now, a simple text search without vector embeddings
    return db
      .select()
      .from(memories)
      .where(and(
        eq(memories.userId, userId),
        sql`${memories.content} ILIKE ${'%' + query + '%'}`
      ))
      .orderBy(desc(memories.createdAt));
  }
}

export const storage = new DatabaseStorage();
