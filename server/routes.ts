import type { Express } from "express";
import { createServer, type Server } from "http";
import { enhancedStorage } from "./storage-enhanced";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { WebSocketServer } from "ws";
import { llmService } from "./llm";
import { sendMessageToSuna, getSunaConversation, getUserConversations } from "./suna-integration";
import * as templateRoutes from "./template-integration";
import { validateContent, sanitizeUserInput } from "./middleware/content-validation.middleware";
import { requestLogger, logger } from "./monitoring/logger";
import { metricsCollector } from "./monitoring/metrics-collector";
import { jobQueue } from "./queue/job-processor";
import { dbManager } from "./db-connection-pool";

import financialResearchRoutes from "./routes/financial-research";
import webSearchRoutes from "./routes/webSearch";
import homework from './routes/homework';

// Add after existing imports
import { researchOrchestrator } from './advanced-research-orchestrator';
import { knowledgeGraph } from './knowledge-graph-integration';
import { factVerificationService } from './real-time-fact-verification';

// WebSocket client connections and their associated rooms
type ClientConnection = {
  userId: string;
  familyRoomId?: number;
  ws: WebSocket;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Add structured logging middleware
  app.use(requestLogger);

  // Add input sanitization middleware
  app.use(sanitizeUserInput);

  // Auth middleware
  await setupAuth(app);

  // Health check endpoints
  app.get('/api/health/database', async (req, res) => {
    try {
      const health = await dbManager.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({ status: 'unhealthy', error: error.message });
    }
  });

  // Metrics endpoint
  app.get('/api/metrics', async (req, res) => {
    try {
      const metrics = metricsCollector.getSystemHealth();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });

  // Job queue endpoints
  app.post('/api/jobs/submit', validateContent({ maxLength: 1000 }), async (req, res) => {
    try {
      const { type, data, priority, delay } = req.body;
      const jobId = await jobQueue.add(type, data, { priority, delay });

      logger.info('Job submitted', { 
        jobId, 
        type, 
        component: 'job_queue' 
      });

      res.json({ job_id: jobId, status: 'submitted' });
    } catch (error) {
      logger.error('Failed to submit job', error);
      res.status(500).json({ error: 'Failed to submit job' });
    }
  });

  app.get('/api/jobs/:jobId/status', async (req, res) => {
    try {
      const job = jobQueue.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({
        id: job.id,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        createdAt: job.createdAt,
        result: job.result,
        error: job.error
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get job status' });
    }
  });

  // Content validation test endpoint
  app.post('/api/test/sanitization', validateContent({ enableProfanityFilter: true }), async (req, res) => {
    res.json({ 
      message: 'Content validated and sanitized',
      sanitized_content: req.body.content 
    });
  });


  // Mount financial research routes
  app.use('/api/financial-research', financialResearchRoutes);

  // Template management routes
  app.get('/api/templates/categories', isAuthenticated, templateRoutes.getTemplateCategories);
  app.get('/api/templates/category/:category', isAuthenticated, templateRoutes.getTemplatesByCategory);
  app.get('/api/templates/user', isAuthenticated, templateRoutes.getUserTemplates);
  app.post('/api/templates/create', isAuthenticated, templateRoutes.createTemplate);
  app.post('/api/templates/generate', isAuthenticated, templateRoutes.generateTemplateFromQuery);
  // Temporarily disable improvements endpoint until implementation is ready
  // app.get('/api/templates/:templateId/improvements', isAuthenticated, templateRoutes.getTemplateImprovements);
  app.get('/api/templates/search', isAuthenticated, templateRoutes.searchTemplates);
  // Temporarily disable usage tracking endpoint until implementation is ready
  // app.post('/api/templates/:templateId/usage', isAuthenticated, templateRoutes.trackTemplateUsage);
  app.get('/api/templates/popular', isAuthenticated, templateRoutes.getPopularTemplates);
  app.post('/api/templates/fill', isAuthenticated, templateRoutes.fillTemplate);

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
          const isInRoom = await enhancedStorage.isUserInFamilyRoom(clientInfo.userId, data.roomId);
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

          const savedMessage = await enhancedStorage.createMessage(messageData);

          // Record metrics
          metricsCollector.incrementCounter('messages.created', 1, {
            type: familyRoomId ? 'family' : 'personal'
          });

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

          const savedAiMessage = await enhancedStorage.createMessage(aiMessageData);

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
      const user = await enhancedStorage.getUser(userId);
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

  // Vietnamese Chat endpoints
  const vietnameseChatRouter = await import('./routes/vietnamese-chat');
  app.use('/api', vietnameseChatRouter.default);

  // Study routes (includes homework and enhanced learning)
  app.use('/api/study', homework);
  app.use('/api/homework', homework); // Keep backward compatibility
  app.use('/api/learning', homework); // Enhanced learning endpoints

  // LLM Health Check Routes
  const express = require('express');
  const router = express.Router();
  const { checkLLMHealth, testLLMConnectivity } = require('./llm-health-check');
  import { enhancedIntegration } from './enhanced-integration-layer';
  import { asyncManager } from './enhanced-async-manager';
  import { logger } from './monitoring/logger';

  router.get('/llm/health', async (req: Request, res: Response) => {
    try {
      const health = await checkLLMHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Failed to check LLM health' });
    }
  });

  router.get('/llm/test-connectivity', async (req: Request, res: Response) => {
    try {
      const results = await testLLMConnectivity();
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to test LLM connectivity' });
    }
  });

  router.post('/research', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { research_question, research_depth, options = {} } = req.body;

      if (!research_question) {
        return res.status(400).json({ error: 'Research question is required' });
      }

      const depth = Math.min(Math.max(parseInt(research_depth) || 3, 1), 5);

      logger.info('Research request received', {
        requestId,
        query: research_question.substring(0, 100),
        depth,
        component: 'api'
      });

      // Use enhanced integration layer
      const result = await enhancedIntegration.performResearch({
        query: research_question,
        depth,
        options: {
          useParallel: options.parallel || false,
          timeout: options.timeout || 120000,
          priority: options.priority || 1,
          enableFallback: options.fallback !== false
        }
      });

      logger.info('Research request completed', {
        requestId,
        status: result.status,
        executionTime: result.metadata?.executionTime,
        component: 'api'
      });

      res.json(result);

    } catch (error) {
      logger.error('Research request failed', error, {
        requestId,
        component: 'api'
      });

      res.status(500).json({ 
        error: 'Research failed', 
        message: error.message,
        status: 'error',
        requestId
      });
    }
  });

// System metrics endpoint
router.get('/system/metrics', async (req, res) => {
  try {
    const metrics = enhancedIntegration.getSystemMetrics();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    logger.error('Failed to get system metrics', error, {
      component: 'api'
    });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Background job endpoint
router.post('/research/background', async (req, res) => {
  try {
    const { research_question, research_depth, options = {} } = req.body;

    if (!research_question) {
      return res.status(400).json({ error: 'Research question is required' });
    }

    const depth = Math.min(Math.max(parseInt(research_depth) || 3, 1), 5);

    const jobId = await enhancedIntegration.queueResearch({
      query: research_question,
      depth,
      options
    });

    res.json({
      status: 'queued',
      jobId,
      message: 'Research has been queued for background processing'
    });

  } catch (error) {
    logger.error('Failed to queue research', error, {
      component: 'api'
    });
    res.status(500).json({ error: 'Failed to queue research' });
  }
});

  app.use('/api', router);

  // Add these endpoints after existing routes

  // Advanced research with multi-stage pipeline
  app.post('/api/research/advanced', async (req, res) => {
    try {
      const { query, options = {} } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const result = await researchOrchestrator.processResearchQuery(query, options);
      res.json(result);

    } catch (error) {
      logger.error('Advanced research failed', error, {
        component: 'api'
      });
      res.status(500).json({ error: 'Advanced research failed' });
    }
  });

  // Knowledge graph endpoints
  app.post('/api/knowledge-graph/extract', async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const graph = await knowledgeGraph.buildKnowledgeGraph(text);
      const entities = await knowledgeGraph.extractEntities(text);

      res.json({
        entities,
        graphSize: graph.size,
        success: true
      });

    } catch (error) {
      logger.error('Knowledge graph extraction failed', error, {
        component: 'api'
      });
      res.status(500).json({ error: 'Knowledge graph extraction failed' });
    }
  });

  app.get('/api/knowledge-graph/search', async (req, res) => {
    try {
      const { query, limit = 10 } = req.query;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const entities = await knowledgeGraph.semanticSearch(query as string, parseInt(limit as string));
      res.json({ entities });

    } catch (error) {
      logger.error('Knowledge graph search failed', error, {
        component: 'api'
      });
      res.status(500).json({ error: 'Knowledge graph search failed' });
    }
  });

  // Fact verification endpoints
  app.post('/api/fact-check', async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const verificationResults = await factVerificationService.verifyFacts(text);

      res.json({
        results: verificationResults,
        summary: {
          totalClaims: verificationResults.length,
          verifiedClaims: verificationResults.filter(r => r.isVerified).length,
          averageConfidence: verificationResults.reduce((sum, r) => sum + r.confidence, 0) / verificationResults.length || 0
        }
      });

    } catch (error) {
      logger.error('Fact verification failed', error, {
        component: 'api'
      });
      res.status(500).json({ error: 'Fact verification failed' });
    }
  });

  // System capabilities endpoint
  app.get('/api/research/capabilities', async (req, res) => {
    try {
      res.json({
        features: {
          multiStageResearch: true,
          knowledgeGraph: true,
          factVerification: true,
          domainAgents: true,
          semanticSearch: true,
          realTimeProcessing: true
        },
        capabilities: {
          maxComplexity: 'expert',
          supportedDomains: ['financial', 'technical', 'scientific', 'news', 'academic', 'general'],
          verificationSources: ['web', 'knowledge_graph', 'authoritative_sources'],
          responseFormats: ['comprehensive', 'summary', 'structured'],
          languages: ['english']
        },
        performance: {
          averageResponseTime: '30-120 seconds',
          maxConcurrentQueries: 10,
          cacheEnabled: true,
          fallbackSystems: 3
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get capabilities' });
    }
  });


  return httpServer;
}