
import { dbManager } from './db-connection-pool';
import { users, messages, familyRooms, familyRoomMembers, reminders, userPreferences } from '../shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

class EnhancedStorage {
  private fallbackStorage = new Map<string, any>();

  async withFallback<T>(operation: () => Promise<T>, fallbackValue: T): Promise<T> {
    try {
      const health = await dbManager.healthCheck();
      if (health.status !== 'healthy') {
        console.warn('Database unhealthy, using fallback storage');
        return fallbackValue;
      }
      
      return await operation();
    } catch (error) {
      console.error('Database operation failed, using fallback:', error);
      return fallbackValue;
    }
  }

  async createUser(userData: any) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    }, userData);
  }

  async getUser(userId: string) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      return user;
    }, null);
  }

  async createMessage(messageData: any) {
    const messageWithId = { ...messageData, id: Date.now() };
    
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      const [message] = await db.insert(messages).values(messageData).returning();
      return message;
    }, messageWithId);
  }

  async getPersonalMessages(userId: string, limit: number = 50) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      return await db.select()
        .from(messages)
        .where(and(eq(messages.userId, userId), eq(messages.familyRoomId, null)))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
    }, []);
  }

  async getFamilyRoomMessages(roomId: number, limit: number = 50) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      return await db.select()
        .from(messages)
        .where(eq(messages.familyRoomId, roomId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
    }, []);
  }

  async createFamilyRoom(roomData: any) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      const [room] = await db.insert(familyRooms).values(roomData).returning();
      
      // Add creator as admin
      await db.insert(familyRoomMembers).values({
        familyRoomId: room.id,
        userId: roomData.createdById,
        isAdmin: true
      });
      
      return room;
    }, { ...roomData, id: Date.now() });
  }

  async getUserFamilyRooms(userId: string) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      return await db.select({
        id: familyRooms.id,
        name: familyRooms.name,
        createdById: familyRooms.createdById,
        createdAt: familyRooms.createdAt,
        isAdmin: familyRoomMembers.isAdmin
      })
      .from(familyRooms)
      .innerJoin(familyRoomMembers, eq(familyRooms.id, familyRoomMembers.familyRoomId))
      .where(eq(familyRoomMembers.userId, userId));
    }, []);
  }

  async createReminder(reminderData: any) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      const [reminder] = await db.insert(reminders).values(reminderData).returning();
      return reminder;
    }, { ...reminderData, id: Date.now() });
  }

  async getUserReminders(userId: string) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      return await db.select()
        .from(reminders)
        .where(eq(reminders.userId, userId))
        .orderBy(desc(reminders.datetime));
    }, []);
  }

  async setUserPreference(preferenceData: any) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      const [preference] = await db.insert(userPreferences).values(preferenceData).returning();
      return preference;
    }, preferenceData);
  }

  async getUserPreferences(userId: string) {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      return await db.select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));
    }, []);
  }

  async isUserInFamilyRoom(userId: string, roomId: number): Promise<boolean> {
    return this.withFallback(async () => {
      const db = dbManager.getDrizzleInstance();
      const [member] = await db.select()
        .from(familyRoomMembers)
        .where(and(
          eq(familyRoomMembers.userId, userId),
          eq(familyRoomMembers.familyRoomId, roomId)
        ));
      return !!member;
    }, false);
  }
}

export const enhancedStorage = new EnhancedStorage();
