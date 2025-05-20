import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { WebSocketServer } from "ws";
import { llmService } from "./llm";
import { sendMessageToSuna, getSunaConversation, getUserConversations } from "./suna-integration";
// Use the simplified DeerFlow implementation for enhanced research
import { handleResearchRequest, deerflowService } from "./deerflow-simplified";
import { handleDirectResearchRequest } from "./deerflow-api";

// WebSocket client connections and their associated rooms
type ClientConnection = {
  userId: string;
  familyRoomId?: number;
  ws: WebSocket;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connections: ClientConnection[] = [];
  
  wss.on('connection', (ws: any) => {
    console.log('WebSocket connection established');
    let clientInfo: ClientConnection = { userId: '', ws };
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Authentication message
        if (data.type === 'auth') {
          clientInfo.userId = data.userId;
          connections.push(clientInfo);
          ws.send(JSON.stringify({ type: 'auth_success' }));
        }
        // Join family room
        else if (data.type === 'join_family_room') {
          const isInRoom = await storage.isUserInFamilyRoom(clientInfo.userId, data.roomId);
          if (isInRoom) {
            clientInfo.familyRoomId = data.roomId;
            ws.send(JSON.stringify({ type: 'join_success', roomId: data.roomId }));
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authorized to join this room' }));
          }
        }
        // Leave family room
        else if (data.type === 'leave_family_room') {
          clientInfo.familyRoomId = undefined;
          ws.send(JSON.stringify({ type: 'leave_success' }));
        }
        // Chat message
        else if (data.type === 'message') {
          const userId = clientInfo.userId;
          const familyRoomId = clientInfo.familyRoomId;
          
          // Store the message
          const messageData = {
            content: data.content,
            userId,
            familyRoomId: familyRoomId || null,
            isAiResponse: false
          };
          
          const savedMessage = await storage.createMessage(messageData);
          
          // Broadcast to connected clients in the same room
          const broadcastTarget = familyRoomId 
            ? connections.filter(c => c.familyRoomId === familyRoomId)
            : [clientInfo]; // Personal chat only goes back to sender
          
          for (const client of broadcastTarget) {
            if (client.ws.readyState === 1) { // WebSocket.OPEN
              client.ws.send(JSON.stringify({
                type: 'new_message',
                message: savedMessage
              }));
            }
          }
          
          // Generate AI response
          const aiResponse = await llmService.generateResponse(userId, data.content, familyRoomId);
          
          // Store AI response
          const aiMessageData = {
            content: aiResponse,
            userId: null,
            familyRoomId: familyRoomId || null,
            isAiResponse: true
          };
          
          const savedAiMessage = await storage.createMessage(aiMessageData);
          
          // Broadcast AI response to same clients
          for (const client of broadcastTarget) {
            if (client.ws.readyState === 1) { // WebSocket.OPEN
              client.ws.send(JSON.stringify({
                type: 'new_message',
                message: savedAiMessage
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      const index = connections.findIndex(c => c.ws === ws);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    });
  });
  
  // Authentication endpoints
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Reminder endpoints
  app.post('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminderData = { ...req.body, userId };
      const reminder = await storage.createReminder(reminderData);
      res.status(201).json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });
  
  app.get('/api/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminders = await storage.getUserReminders(userId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });
  
  app.get('/api/reminders/upcoming', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : 5;
      const reminders = await storage.getUserUpcomingReminders(userId, limit);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching upcoming reminders:", error);
      res.status(500).json({ message: "Failed to fetch upcoming reminders" });
    }
  });
  
  app.put('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminderId = parseInt(req.params.id);
      
      // Verify reminder belongs to user
      const reminder = await storage.getReminder(reminderId);
      if (!reminder || reminder.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedReminder = await storage.updateReminder(reminderId, req.body);
      res.json(updatedReminder);
    } catch (error) {
      console.error("Error updating reminder:", error);
      res.status(500).json({ message: "Failed to update reminder" });
    }
  });
  
  app.delete('/api/reminders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reminderId = parseInt(req.params.id);
      
      // Verify reminder belongs to user
      const reminder = await storage.getReminder(reminderId);
      if (!reminder || reminder.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.deleteReminder(reminderId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });
  
  // Family Room endpoints
  app.post('/api/family-rooms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomData = { 
        name: req.body.name,
        createdById: userId
      };
      const room = await storage.createFamilyRoom(roomData);
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating family room:", error);
      res.status(500).json({ message: "Failed to create family room" });
    }
  });
  
  app.get('/api/family-rooms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rooms = await storage.getUserFamilyRooms(userId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching family rooms:", error);
      res.status(500).json({ message: "Failed to fetch family rooms" });
    }
  });
  
  app.get('/api/family-rooms/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.id);
      
      // Verify user is a member of this room
      const isInRoom = await storage.isUserInFamilyRoom(userId, roomId);
      if (!isInRoom) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const room = await storage.getFamilyRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Family room not found" });
      }
      
      res.json(room);
    } catch (error) {
      console.error("Error fetching family room:", error);
      res.status(500).json({ message: "Failed to fetch family room" });
    }
  });
  
  app.post('/api/family-rooms/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.id);
      
      // Verify user is an admin of this room
      const members = await storage.getFamilyRoomMembers(roomId);
      const isAdmin = members.some(m => m.userId === userId && m.isAdmin);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can add members" });
      }
      
      // Add the new member
      const targetUser = await storage.getUser(req.body.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const memberData = {
        familyRoomId: roomId,
        userId: req.body.userId,
        isAdmin: req.body.isAdmin || false
      };
      
      const member = await storage.addFamilyRoomMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding family room member:", error);
      res.status(500).json({ message: "Failed to add family room member" });
    }
  });
  
  app.get('/api/family-rooms/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.id);
      
      // Verify user is a member of this room
      const isInRoom = await storage.isUserInFamilyRoom(userId, roomId);
      if (!isInRoom) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const members = await storage.getFamilyRoomMembersWithUserDetails(roomId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching family room members:", error);
      res.status(500).json({ message: "Failed to fetch family room members" });
    }
  });
  
  // Message history endpoints
  app.get('/api/messages/personal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const messages = await storage.getPersonalMessages(userId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching personal messages:", error);
      res.status(500).json({ message: "Failed to fetch personal messages" });
    }
  });
  
  app.get('/api/family-rooms/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.id);
      
      // Verify user is a member of this room
      const isInRoom = await storage.isUserInFamilyRoom(userId, roomId);
      if (!isInRoom) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const messages = await storage.getFamilyRoomMessages(roomId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching family room messages:", error);
      res.status(500).json({ message: "Failed to fetch family room messages" });
    }
  });
  
  // User preferences endpoints
  app.post('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { key, value } = req.body;
      
      const preference = await storage.setUserPreference({
        userId,
        key,
        value
      });
      
      res.status(201).json(preference);
    } catch (error) {
      console.error("Error setting preference:", error);
      res.status(500).json({ message: "Failed to set preference" });
    }
  });
  
  app.get('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // Suna Integration endpoints
  app.post('/api/suna/message', isAuthenticated, sendMessageToSuna);
  app.get('/api/suna/conversations/:conversationId', isAuthenticated, getSunaConversation);
  app.get('/api/suna/conversations', isAuthenticated, getUserConversations);

  // DeerFlow Research Integration endpoints
  app.post('/api/research', isAuthenticated, handleResearchRequest);
  
  // Direct DeerFlow research endpoint - For advanced depth level 3 research
  app.post('/api/deerflow/research', isAuthenticated, handleDirectResearchRequest);
  
  // Check DeerFlow service availability
  app.get('/api/research/status', isAuthenticated, async (req, res) => {
    try {
      const isAvailable = await deerflowService.checkServiceAvailability();
      res.json({ available: isAvailable });
    } catch (error) {
      console.error("Error checking research service:", error);
      res.status(500).json({ message: "Failed to check research service status" });
    }
  });

  return httpServer;
}
