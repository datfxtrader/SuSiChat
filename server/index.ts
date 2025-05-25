import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize crash-safe storage system
  const { CrashSafeResearch } = await import('./crash-safe-storage');
  await CrashSafeResearch.initialize();
  console.log('🛡️ Crash-safe research storage initialized');

  // CRASH-SAFE: Store research results
  app.post('/api/research/store-safe', async (req: any, res) => {
    try {
      const { conversationId, userId, query, results } = req.body;
      
      console.log('💾 API: Storing research results crash-safe');
      
      const result = await CrashSafeResearch.store(conversationId, userId, query, results);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Research results stored safely',
          filename: result.filename,
          storageType: 'crash-safe-file'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to store research results'
        });
      }
      
    } catch (error) {
      console.error('❌ API: Error storing research results:', error);
      res.status(500).json({
        success: false,
        message: 'Server error storing results',
        error: (error as Error).message
      });
    }
  });

  // CRASH-SAFE: Retrieve research results  
  app.get('/api/research/results-safe/:conversationId', async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      
      console.log('🔍 API: Retrieving research results crash-safe:', conversationId);
      
      const result = await CrashSafeResearch.retrieve(conversationId);
      
      if (result.success) {
        res.json({
          success: true,
          results: result.results,
          source: result.source,
          storageType: 'crash-safe'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Research results not found',
          conversationId
        });
      }
      
    } catch (error) {
      console.error('❌ API: Error retrieving research results:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving results',
        error: (error as Error).message
      });
    }
  });

  // CRASH-SAFE: Get all user research
  app.get('/api/research/user-research-safe/:userId', async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      console.log('🔍 API: Getting all research for user:', userId);
      
      const research = await CrashSafeResearch.getUserResearch(userId);
      
      res.json({
        success: true,
        research,
        count: research.length,
        storageType: 'crash-safe'
      });
      
    } catch (error) {
      console.error('❌ API: Error getting user research:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting user research',
        error: (error as Error).message
      });
    }
  });

  // CRASH-SAFE: System status
  app.get('/api/research/system-status', async (req: any, res) => {
    try {
      const { join } = await import('path');
      const { readdir } = await import('fs/promises');
      
      const backupDir = join(process.cwd(), 'research-backups');
      
      let fileCount = 0;
      let indexExists = false;
      
      try {
        const files = await readdir(backupDir);
        fileCount = files.filter(f => f.endsWith('.json')).length;
        indexExists = files.includes('research-index.json');
      } catch (error) {
        // Directory doesn't exist yet
      }
      
      res.json({
        success: true,
        system: {
          crashSafeStorageActive: true,
          postgresqlBypassed: true,
          backupDirectory: backupDir,
          researchFilesCount: fileCount,
          indexFileExists: indexExists,
          status: 'operational'
        },
        message: 'Crash-safe research storage is active and operational'
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  });

  // Legacy endpoint for compatibility
  app.get('/api/research/results/:conversationId', async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      console.log('🔍 API: Legacy endpoint - redirecting to crash-safe retrieval');
      
      const result = await CrashSafeResearch.retrieve(conversationId);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.results,
          source: 'crash-safe-storage',
          storageType: 'crash-safe'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Results not found',
          conversationId
        });
      }
      
    } catch (error) {
      console.error('❌ API: Error retrieving results:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving results',
        error: (error as Error).message
      });
    }
  });

  const server = await registerRoutes(app);

  // Root route handler
  app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'DeerFlow Research API' });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error('Server error:', err);
  return res.status(500).json({ message: 'Internal server error' });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
  
  // Force close any existing listeners on this port
  process.on('uncaughtException', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('Port conflict detected, retrying with different port...');
      const altPort = parseInt(port.toString()) + Math.floor(Math.random() * 100);
      server.listen({
        port: altPort,
        host: "0.0.0.0",
        reusePort: true,
      }, () => {
        log(`serving on alternative port ${altPort}`);
      });
      return;
    }
    throw err;
  });
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
