import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { enhancedDbManager } from './enhanced-db-connection-manager';
import { monitoringSystem } from './advanced-monitoring-system';
import { securityMiddleware } from './security-enhanced-middleware';
import systemHealthRoutes from './routes/system-health';
import financialResearchRoutes from './routes/financial-research';
import webSearchRoutes from './routes/webSearch';
import enhancedWebSearchRoutes from './routes/enhanced-web-search';
import { intelligentSearchManager } from './intelligentSearchManager';
import { 
  performResearch, 
  ResearchDepth, 
  cancelResearch, 
  getResearchMetrics, 
  clearResearchCaches, 
  shutdownResearchService 
} from './deerflow-integration';
import searchMetricsRoutes from './routes/search-metrics';
import cacheMonitoringRoutes from './routes/cache-monitoring';
import yahooFinanceMetricsRoutes from './routes/yahoo-finance-metrics';
import enhancedSearchRouter from './routes/enhanced-search.router';
import factCheckRouter from './routes/fact-check';
import cacheMonitoringRouter from './routes/cache-monitoring';
import financialFactCheckingRouter from './routes/financial-fact-checking.route';
import blogRoutes from './routes/blog';

const app = express();

// Comprehensive CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'http://localhost:5000',
    'https://*.replit.dev',
    'https://*.repl.co'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply security middleware
app.use(...securityMiddleware.getSecurityMiddleware());

// Apply rate limiting
app.use('/api/auth', securityMiddleware.getAuthRateLimiter());
app.use('/api/research', securityMiddleware.getResearchRateLimiter());
app.use('/api', securityMiddleware.getApiRateLimiter());

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

    // Record request for monitoring
    monitoringSystem.recordRequest(path);

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
  // Initialize enhanced database and monitoring systems
  console.log('🚀 Initializing enhanced systems...');

  try {
    // Initialize database schema first
    console.log('🔧 Checking database schema...');

    try {
      // Test if basic tables exist
      await enhancedDbManager.query('SELECT 1 FROM users LIMIT 1');
      console.log('✅ Database schema exists');

      // Now apply optimizations
      await enhancedDbManager.createOptimizedIndexes();
      console.log('✅ Database optimizations applied');
    } catch (schemaError) {
      console.log('⚠️ Database schema needs initialization');
      console.log('💡 Run the database initialization endpoint to set up the schema');

      // Continue without database optimizations for now
      console.log('🔄 Starting without database optimizations');
    }

    // Start monitoring
    console.log('✅ Advanced monitoring system started');

    // Initialize crash-safe storage system
    const { crashSafeStorage } = await import('./crash-safe-storage');
    await crashSafeStorage.initialize();
    console.log('✅ Crash-safe research storage initialized');

  } catch (error) {
    console.error('❌ System initialization error:', error);
  }

  // CRASH-SAFE: Store research results
  app.post('/api/research/store-safe', async (req: any, res) => {
    try {
      const { conversationId, userId, query, results } = req.body;

      console.log('💾 API: Storing research results crash-safe');

      const result = await crashSafeStorage.store(conversationId, userId, query, results);

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

      const result = await crashSafeStorage.retrieve(conversationId);

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

  // OPTIMIZED: Get all user research with cache
  app.get('/api/research/user-research-optimized/:userId', async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { researchCache } = await import('./optimized-research-cache');

      console.log('🔍 API: Getting optimized research for user:', userId);

      const research = await researchCache.getUserConversations(userId);

      res.json({
        success: true,
        research,
        count: research.length,
        storageType: 'optimized-cache',
        cacheMetrics: researchCache.getMetrics()
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

  // CRASH-SAFE: Get all user research (legacy fallback)
  app.get('/api/research/user-research-safe/:userId', async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { researchCache } = await import('./optimized-research-cache');

      console.log('🔍 API: Getting research for user (with cache fallback):', userId);

      // Try optimized cache first
      try {
        const research = await researchCache.getUserConversations(userId);
        if (research && research.length > 0) {
          return res.json({
            success: true,
            research,
            count: research.length,
            storageType: 'optimized-cache'
          });
        }
      } catch (cacheError) {
        console.warn('Cache retrieval failed, falling back to crash-safe storage:', cacheError);
      }

      // Fallback to crash-safe storage
      const research = await crashSafeStorage.getUserResearch(userId);

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

  // CRASH-SAFE: System status with optimized cache metrics
  app.get('/api/research/system-status', async (req: any, res) => {
    try {
      const { join } = await import('path');
      const { readdir } = await import('fs/promises');
      const { researchCache } = await import('./optimized-research-cache');

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

      const cacheMetrics = researchCache.getMetrics();

      res.json({
        success: true,
        system: {
          crashSafeStorageActive: true,
          postgresqlBypassed: true,
          backupDirectory: backupDir,
          researchFilesCount: fileCount,
          indexFileExists: indexExists,
          status: 'operational',
          optimizedCache: {
            enabled: true,
            ...cacheMetrics
          }
        },
        message: 'Optimized research storage is active and operational'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  });

  // Optimized cache metrics endpoint
  app.get('/api/research/cache-metrics', async (req: any, res) => {
    try {
      const { researchCache } = await import('./optimized-research-cache');
      const metrics = researchCache.getMetrics();

      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  });

  // Clear optimized cache endpoint
  app.post('/api/research/clear-cache-optimized', async (req: any, res) => {
    try {
      const { researchCache } = await import('./optimized-research-cache');
      researchCache.clear();

      res.json({
        success: true,
        message: 'Optimized research cache cleared successfully'
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

      const result = await crashSafeStorage.retrieve(conversationId);

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

  // Suna research integration endpoint
  app.post('/api/suna-research', async (req, res) => {
    try {
      console.log('📡 Received research request from frontend:', req.body);

      const { query, depth = 3, model = 'auto' } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      console.log('🔄 Starting DeerFlow research request...');

      // Make request to DeerFlow service
      const deerflowResponse = await fetch('http://0.0.0.0:9000/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          research_question: query,
          research_depth: parseInt(depth),
          model_id: model === 'auto' ? 'deepseek-v3' : model
        }),
      });

      if (!deerflowResponse.ok) {
        const errorText = await deerflowResponse.text();
        console.error('❌ DeerFlow service error:', deerflowResponse.status, errorText);
        throw new Error(`DeerFlow service error: ${deerflowResponse.status} - ${errorText}`);
      }

      const deerflowData = await deerflowResponse.json();
      console.log('✅ DeerFlow research completed successfully');
      console.log('📊 Report length:', deerflowData.report?.length || 0);
      console.log('📊 Sources count:', deerflowData.sources?.length || 0);

      // Format sources properly
      const formattedSources = (deerflowData.sources || []).map((source, index) => ({
        title: source.title || `Source ${index + 1}`,
        url: source.url || '',
        domain: source.domain || (source.url ? new URL(source.url).hostname : 'unknown'),
        content: source.content || ''
      }));

      const response = {
        status: 'completed',
        report: deerflowData.report || 'Research completed but no content was generated.',
        content: deerflowData.report || 'Research completed but no content was generated.',
        sources: formattedSources,
        timestamp: new Date().toISOString(),
        query: query,
        depth: depth
      };

      console.log('📤 Sending response to frontend:', {
        status: response.status,
        reportLength: response.report.length,
        sourcesCount: response.sources.length
      });

      res.json(response);

    } catch (error) {
      console.error('❌ Research API error:', error);
      res.status(500).json({ 
        error: 'Research request failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        status: 'error'
      });
    }
  });

  // DeerFlow Integration with Optimized Service
  app.post('/api/research/deerflow', async (req, res) => {
    try {
      const { query, depth = 3, ...otherParams } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      console.log(`🔍 Optimized DeerFlow research request: ${query} (depth: ${depth})`);

      const result = await performResearch({
        query,
        depth,
        cacheEnabled: true,
        priority: 'normal',
        ...otherParams
      });

      res.json({
        success: true,
        result: {
          report: result.report,
          sources: result.sources,
          depth: result.depth,
          processingTime: result.processingTime,
          fromCache: result.fromCache || false
        }
      });

    } catch (error) {
      console.error('DeerFlow research error:', error);
      res.status(500).json({
        error: 'Research failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Research metrics endpoint
  app.get('/api/research/metrics', (req, res) => {
    try {
      const metrics = getResearchMetrics();
      res.json({ success: true, metrics });
    } catch (error) {
      console.error('Metrics error:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  // Cancel research endpoint
  app.post('/api/research/cancel', (req, res) => {
    try {
      const { researchId } = req.body;
      const cancelled = cancelResearch(researchId);
      res.json({ success: true, cancelled });
    } catch (error) {
      console.error('Cancel error:', error);
      res.status(500).json({ error: 'Failed to cancel research' });
    }
  });

  // Clear cache endpoint
  app.post('/api/research/clear-cache', (req, res) => {
    try {
      clearResearchCaches();
      res.json({ success: true, message: 'Caches cleared' });
    } catch (error) {
      console.error('Clear cache error:', error);
      res.status(500).json({ error: 'Failed to clear caches' });
    }
  });

  app.use('/api/financial-research', financialResearchRoutes);
  // Use enhanced web search as the primary search system  
  app.use('/api/enhanced-web-search', enhancedWebSearchRoutes);
  app.use('/api/search-metrics', searchMetricsRoutes);

  // Import and use cache monitoring routes
  app.use('/api/cache', cacheMonitoringRoutes);
  app.use('/api/yahoo-finance', yahooFinanceMetricsRoutes);
  app.use('/api/cache-monitoring', cacheMonitoringRoutes);

  // Use routes
  app.use('/api/fact-check', factCheckRouter);
  app.use('/api/enhanced-search', enhancedSearchRouter);
  app.use('/api/cache', cacheMonitoringRouter);
  app.use('/api/financial-facts', financialFactCheckingRouter);

  // Import and use the enhanced financial research route (consolidated)
  const enhancedFinancialResearchRouter = (await import('./routes/financial-research-enhanced.route')).default;
  app.use('/api/financial', enhancedFinancialResearchRouter);

  // Database initialization endpoint
  app.post('/api/admin/initialize-database', async (req, res) => {
    try {
      console.log('🔧 Initializing database schema...');

      // Run the schema migration
      const fs = await import('fs/promises');
      const path = await import('path');

      const schemaPath = path.join(process.cwd(), 'server/migrations/000_initialize_schema.sql');

      try {
        const schemaSQL = await fs.readFile(schemaPath, 'utf-8');
        await enhancedDbManager.query(schemaSQL);
        console.log('✅ Database schema initialized successfully');

        // Now create optimized indexes
        await enhancedDbManager.createOptimizedIndexes();
        console.log('✅ Database optimizations applied');

        res.json({
          success: true,
          message: 'Database schema initialized successfully'
        });
      } catch (fileError) {
        console.log('⚠️ Schema file not found, creating basic tables...');

        // Create basic tables if schema file doesn't exist
        const basicSchema = `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS conversations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            title VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER REFERENCES conversations(id),
            content TEXT,
            role VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;

        await enhancedDbManager.query(basicSchema);
        console.log('✅ Basic database schema created');

        res.json({
          success: true,
          message: 'Basic database schema created successfully'
        });
      }
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      res.status(500).json({
        success: false,
        error: 'Database initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Import and use homework help route
  const homeworkRouter = (await import('./routes/homework')).default;
  app.use('/api/homework', homeworkRouter);

  // Import and use financial terms routes
  const financialTermsRouter = (await import('./routes/financial-terms')).default;
  app.use('/api/financial-terms', financialTermsRouter);

  // Search engine management routes
  const searchEnginesRouter = (await import('./routes/search-engines')).default;
  app.use('/api/search-engines', searchEnginesRouter);

  // System health and monitoring routes
  app.use('/api/system', systemHealthRoutes);

  // Search system status endpoint
  app.get('/api/search-status', (req, res) => {
    try {
      const status = intelligentSearchManager.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get search status' });
    }
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

  // Use port 5000 (Replit's recommended web app port)
  // Server on port 5000, Vite dev server on 5173
  const port = parseInt(process.env.PORT || "5000");

  // Check if port is already in use
  const { createServer } = await import('net');
  const testServer = createServer();

  testServer.once('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use!`);
      console.error('This might be caused by:');
      console.error('1. Another instance of this server running');
      console.error('2. Vite dev server using the same port');
      console.error('3. Another Node.js process');
      console.error('\nTrying to kill conflicting processes...');

      // Try to find and kill conflicting processes
      import('child_process').then(({ exec }) => {
        exec(`lsof -ti:${port}`, (error, stdout) => {
          if (stdout.trim()) {
            const pids = stdout.trim().split('\n');
            pids.forEach(pid => {
              console.log(`Killing process ${pid} on port ${port}`);
              exec(`kill -9 ${pid}`);
            });

            // Retry after killing processes
            setTimeout(() => {
              startServer();
            }, 1000);
          } else {
            process.exit(1);
          }
        });
      });
      return;
    }
    console.error('Server error during port test:', err);
    process.exit(1);
  });

  testServer.once('listening', () => {
    testServer.close();
    startServer();
  });

  testServer.listen(port, "0.0.0.0");

  function startServer() {
    server.listen(port, "0.0.0.0", (err?: Error) => {
      if (err) {
        console.error(`Failed to start server on port ${port}:`, err);
        process.exit(1);
      }
      log(`🚀 Server successfully running on port ${port}`);
      log(`🌐 Access your app at: http://0.0.0.0:${port}`);
      log(`🔗 Replit webview will show your app automatically`);
      log(`🔧 Environment: ${app.get("env")}`);
    });
  }

  // Handle server errors
  server.on('error', (err: Error) => {
    console.error('Server error:', err);
    if (err.message.includes('EADDRINUSE')) {
      console.error(`Port ${port} is already in use. Please check for other processes.`);
    }
  });

  // Enhanced graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM signal received: closing HTTP server');
    try {
      // Shutdown monitoring system
      monitoringSystem.shutdown();
      console.log('✅ Monitoring system shutdown complete');

      // Shutdown enhanced database manager
      await enhancedDbManager.shutdown();
      console.log('✅ Database manager shutdown complete');

      // Shutdown research cache
      const { researchCache } = await import('./optimized-research-cache');
      await researchCache.shutdown();
      console.log('✅ Optimized cache shutdown complete');

      await shutdownResearchService();
    } catch (error) {
      console.error('❌ Shutdown error:', error);
    }

    server.close(() => {
      console.log('🔒 HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('🛑 SIGINT signal received: closing HTTP server');
    try {
      const { researchCache } = await import('./optimized-research-cache');
      await researchCache.shutdown();
      console.log('✅ Optimized cache shutdown complete');
    } catch (error) {
      console.error('❌ Cache shutdown error:', error);
    }
    await shutdownResearchService();
    server.close(() => {
      console.log('🔒 HTTP server closed');
      process.exit(0);
    });
  });
})();