
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';

interface FamilyMember {
  userId: number;
  familyId: string;
  role: 'parent' | 'child' | 'guardian';
  name: string;
  online: boolean;
}

interface LearningProgress {
  userId: number;
  language: string;
  concept: string;
  progress: number;
  timestamp: Date;
}

interface FamilyChallenge {
  id: string;
  familyId: string;
  title: string;
  description: string;
  participants: number[];
  status: 'active' | 'completed' | 'paused';
  progress: Record<number, number>; // userId -> progress percentage
}

export class FamilyLearningWebSocket {
  private wss: WebSocketServer;
  private familyConnections: Map<string, Set<WebSocket>> = new Map();
  private userConnections: Map<number, WebSocket> = new Map();
  private userSessions: Map<WebSocket, { userId: number; familyId?: string }> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/family-learning',
      verifyClient: (info) => {
        // Basic verification - in production, verify authentication
        return true;
      }
    });
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      console.log('New WebSocket connection for family learning');

      // Extract user info from connection
      const user = await this.authenticateConnection(req);
      if (!user) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      // Store user connection
      this.userConnections.set(user.id, ws);
      this.userSessions.set(ws, { userId: user.id, familyId: user.familyId });

      // Add to family group if user has family
      if (user.familyId) {
        this.addToFamily(user.familyId, ws);
      }

      // Set up message handling
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, user, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.userConnections.delete(user.id);
        this.userSessions.delete(ws);
        if (user.familyId) {
          this.removeFromFamily(user.familyId, ws);
        }
        console.log(`User ${user.id} disconnected from family learning`);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        userId: user.id,
        familyId: user.familyId,
        timestamp: new Date()
      }));

      // Send family status if in family
      if (user.familyId) {
        await this.sendFamilyStatus(user.familyId, user.id);
      }
    });

    console.log('Family Learning WebSocket service initialized');
  }

  private async authenticateConnection(req: IncomingMessage): Promise<{ id: number; familyId?: string } | null> {
    // Extract token from query parameters or headers
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return null;
    }

    // Mock authentication - in real implementation, verify JWT token
    // const user = await verifyToken(token);
    
    // Mock user data for demonstration
    const mockUser = {
      id: Math.floor(Math.random() * 1000),
      familyId: 'family_123'
    };

    return mockUser;
  }

  private async handleMessage(ws: WebSocket, user: any, message: any) {
    const { type, ...data } = message;

    switch (type) {
      case 'learning-progress':
        await this.handleLearningProgress(ws, user, data);
        break;

      case 'family-challenge-update':
        await this.handleChallengeUpdate(ws, user, data);
        break;

      case 'practice-invitation':
        await this.handlePracticeInvitation(ws, user, data);
        break;

      case 'achievement-unlocked':
        await this.handleAchievementUnlocked(ws, user, data);
        break;

      case 'sync-request':
        await this.handleSyncRequest(ws, user, data);
        break;

      case 'family-chat':
        await this.handleFamilyChat(ws, user, data);
        break;

      case 'study-session-start':
        await this.handleStudySessionStart(ws, user, data);
        break;

      case 'study-session-end':
        await this.handleStudySessionEnd(ws, user, data);
        break;

      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: `Unknown message type: ${type}` 
        }));
    }
  }

  private async handleLearningProgress(ws: WebSocket, user: any, data: any) {
    const { familyId, language, concept, progress } = data;

    if (!familyId) return;

    const progressUpdate: LearningProgress = {
      userId: user.id,
      language,
      concept,
      progress,
      timestamp: new Date()
    };

    // Store progress (in real implementation, save to database)
    console.log('Learning progress update:', progressUpdate);

    // Broadcast to family members
    this.broadcastToFamily(familyId, {
      type: 'member-progress',
      userId: user.id,
      userName: data.userName || `User ${user.id}`,
      language,
      concept,
      progress,
      timestamp: new Date()
    }, user.id);

    // Send acknowledgment
    ws.send(JSON.stringify({
      type: 'progress-acknowledged',
      timestamp: new Date()
    }));
  }

  private async handleChallengeUpdate(ws: WebSocket, user: any, data: any) {
    const { familyId, challengeId, update } = data;

    if (!familyId) return;

    // Update challenge status (in real implementation, update database)
    console.log('Challenge update:', { challengeId, update });

    // Broadcast to all family members
    this.broadcastToFamily(familyId, {
      type: 'challenge-update',
      challengeId,
      update,
      userId: user.id,
      userName: data.userName || `User ${user.id}`,
      timestamp: new Date()
    });
  }

  private async handlePracticeInvitation(ws: WebSocket, user: any, data: any) {
    const { toUserId, sessionDetails } = data;

    // Send direct invitation to specific user
    const targetWs = this.userConnections.get(toUserId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify({
        type: 'practice-invitation',
        fromUserId: user.id,
        fromUserName: data.fromUserName || `User ${user.id}`,
        sessionDetails,
        timestamp: new Date()
      }));

      // Send confirmation to sender
      ws.send(JSON.stringify({
        type: 'invitation-sent',
        toUserId,
        timestamp: new Date()
      }));
    } else {
      // User not online
      ws.send(JSON.stringify({
        type: 'invitation-failed',
        reason: 'User not online',
        toUserId,
        timestamp: new Date()
      }));
    }
  }

  private async handleAchievementUnlocked(ws: WebSocket, user: any, data: any) {
    const { familyId, achievement } = data;

    if (!familyId) return;

    // Broadcast achievement to family
    this.broadcastToFamily(familyId, {
      type: 'member-achievement',
      userId: user.id,
      userName: data.userName || `User ${user.id}`,
      achievement,
      timestamp: new Date()
    });
  }

  private async handleSyncRequest(ws: WebSocket, user: any, data: any) {
    const { familyId } = data;

    if (!familyId) return;

    // Get current family data and send back
    const familyData = await this.getFamilyData(familyId);
    
    ws.send(JSON.stringify({
      type: 'family-sync',
      familyData,
      timestamp: new Date()
    }));
  }

  private async handleFamilyChat(ws: WebSocket, user: any, data: any) {
    const { familyId, message, language } = data;

    if (!familyId) return;

    // Broadcast chat message to family
    this.broadcastToFamily(familyId, {
      type: 'family-chat-message',
      userId: user.id,
      userName: data.userName || `User ${user.id}`,
      message,
      language,
      timestamp: new Date()
    }, user.id);
  }

  private async handleStudySessionStart(ws: WebSocket, user: any, data: any) {
    const { familyId, sessionType, language } = data;

    if (!familyId) return;

    // Notify family about study session
    this.broadcastToFamily(familyId, {
      type: 'study-session-started',
      userId: user.id,
      userName: data.userName || `User ${user.id}`,
      sessionType,
      language,
      timestamp: new Date()
    }, user.id);
  }

  private async handleStudySessionEnd(ws: WebSocket, user: any, data: any) {
    const { familyId, sessionStats } = data;

    if (!familyId) return;

    // Share session results with family
    this.broadcastToFamily(familyId, {
      type: 'study-session-completed',
      userId: user.id,
      userName: data.userName || `User ${user.id}`,
      sessionStats,
      timestamp: new Date()
    }, user.id);
  }

  private broadcastToFamily(familyId: string, message: any, excludeUserId?: number) {
    const connections = this.familyConnections.get(familyId);
    if (!connections) return;

    const messageStr = JSON.stringify(message);

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        // Check if we should exclude this connection
        if (excludeUserId) {
          const session = this.userSessions.get(ws);
          if (session?.userId === excludeUserId) return;
        }

        ws.send(messageStr);
      }
    });
  }

  private addToFamily(familyId: string, ws: WebSocket) {
    if (!this.familyConnections.has(familyId)) {
      this.familyConnections.set(familyId, new Set());
    }
    this.familyConnections.get(familyId)!.add(ws);
  }

  private removeFromFamily(familyId: string, ws: WebSocket) {
    const connections = this.familyConnections.get(familyId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.familyConnections.delete(familyId);
      }
    }
  }

  private async sendFamilyStatus(familyId: string, userId: number) {
    const connections = this.familyConnections.get(familyId);
    if (!connections) return;

    // Get online family members
    const onlineMembers: number[] = [];
    connections.forEach(ws => {
      const session = this.userSessions.get(ws);
      if (session) {
        onlineMembers.push(session.userId);
      }
    });

    // Broadcast family status
    this.broadcastToFamily(familyId, {
      type: 'family-status',
      onlineMembers,
      totalConnections: connections.size,
      timestamp: new Date()
    });
  }

  private async getFamilyData(familyId: string) {
    // Mock family data - in real implementation, query from database
    return {
      familyId,
      activeChallenges: [
        {
          id: 'challenge_1',
          title: 'Weekly Vietnamese Practice',
          description: 'Practice Vietnamese conversation for 30 minutes this week',
          participants: [1, 2, 3],
          progress: { 1: 60, 2: 40, 3: 80 }
        }
      ],
      recentAchievements: [
        {
          userId: 1,
          achievement: '7-day learning streak!',
          timestamp: new Date()
        }
      ],
      familyStats: {
        totalLearningTime: 120, // minutes
        languagesPracticed: ['vi', 'pl'],
        weeklyGoalProgress: 75
      }
    };
  }

  // Public methods for external use
  public sendToUser(userId: number, message: any) {
    const ws = this.userConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  public sendToFamily(familyId: string, message: any) {
    this.broadcastToFamily(familyId, message);
  }

  public getOnlineFamilyMembers(familyId: string): number[] {
    const connections = this.familyConnections.get(familyId);
    if (!connections) return [];

    const onlineMembers: number[] = [];
    connections.forEach(ws => {
      const session = this.userSessions.get(ws);
      if (session) {
        onlineMembers.push(session.userId);
      }
    });

    return onlineMembers;
  }

  public getFamilyConnectionCount(familyId: string): number {
    const connections = this.familyConnections.get(familyId);
    return connections ? connections.size : 0;
  }
}
