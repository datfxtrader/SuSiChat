import { type User, type Reminder, type FamilyRoom, type Message } from "@shared/schema";

export interface ChatMessage {
  id: number;
  content: string;
  userId: string | null;
  familyRoomId: number | null;
  isAiResponse: boolean;
  createdAt: string;
  user?: User;
}

export interface FamilyRoomWithMembers extends FamilyRoom {
  members?: User[];
}

export type MessageType = 'auth' | 'join_family_room' | 'leave_family_room' | 'message' | 'new_message' | 'auth_success' | 'join_success' | 'leave_success' | 'error';

export interface WebSocketMessage {
  type: MessageType;
  userId?: string;
  roomId?: number;
  content?: string;
  message?: ChatMessage;
  error?: string;
}