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

  // Redirect to existing research agent
  app.get('/research', (req, res) => {
    res.redirect('/research-agent');
  });

  // Direct Research Agent interface (fallback)
  app.get('/research-direct', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Research Agent</title>
    <style>
        body { margin: 0; font-family: system-ui; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); color: white; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .form { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
        .input { width: 100%; padding: 15px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(0,0,0,0.3); color: white; font-size: 16px; }
        .button { background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 16px; margin-top: 15px; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
        .button:disabled { opacity: 0.6; cursor: not-allowed; }
        .result { margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px; }
        .loading { text-align: center; padding: 20px; }
        .error { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); }
        .success { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); }
        .sources { margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
        .source { padding: 10px; margin: 5px 0; background: rgba(255,255,255,0.05); border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Enhanced Research Agent</h1>
            <p>Multi-source AI research with DeerFlow intelligence</p>
            <p><small>✅ NewsAPI • ✅ Wikipedia • ✅ Academic Papers • ✅ Original DeerFlow Intelligence</small></p>
        </div>
        
        <div class="form">
            <textarea id="query" class="input" placeholder="Enter your research query (e.g., 'Bitcoin analysis', 'EURUSD market trends', 'latest AI developments')" rows="4"></textarea>
            
            <select id="depth" class="input" style="margin-top: 15px;">
                <option value="1">Quick Research (8K tokens)</option>
                <option value="2">Standard Research (15K tokens)</option>
                <option value="3" selected>Deep Research (25K tokens)</option>
            </select>
            
            <button id="submitBtn" class="button" onclick="performResearch()">🚀 Start Enhanced Research</button>
        </div>
        
        <div id="result" style="display: none;"></div>
    </div>

    <script>
        let isResearching = false;

        async function performResearch() {
            if (isResearching) return;
            
            const query = document.getElementById('query').value.trim();
            if (!query) {
                alert('Please enter a research query');
                return;
            }

            isResearching = true;
            const btn = document.getElementById('submitBtn');
            const result = document.getElementById('result');
            
            btn.textContent = '🔄 Researching...';
            btn.disabled = true;
            
            result.style.display = 'block';
            result.innerHTML = '<div class="loading">🔍 Analyzing with enhanced multi-source research...</div>';

            try {
                const response = await fetch('/api/suna/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: query,
                        depth: parseInt(document.getElementById('depth').value),
                        modelId: 'deepseek-chat',
                        includeMarketData: true,
                        includeNews: true,
                        researchLength: 'comprehensive'
                    })
                });

                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }

                const data = await response.json();
                
                let html = '<div class="result success">';
                html += '<h2>📊 Enhanced Research Results</h2>';
                html += '<div style="white-space: pre-wrap; line-height: 1.6;">' + (data.content || data.report || data.analysis) + '</div>';
                
                if (data.sources && data.sources.length > 0) {
                    html += '<div class="sources">';
                    html += '<h3>🔗 Sources (' + data.sources.length + ')</h3>';
                    data.sources.forEach((source, idx) => {
                        html += '<div class="source">';
                        html += '<strong>[' + (idx + 1) + '] ' + (source.title || source.domain || 'Source') + '</strong><br>';
                        if (source.url) {
                            html += '<a href="' + source.url + '" target="_blank" style="color: #60a5fa;">' + source.url + '</a><br>';
                        }
                        if (source.snippet) {
                            html += '<small style="color: #9ca3af;">' + source.snippet + '</small>';
                        }
                        html += '</div>';
                    });
                    html += '</div>';
                }
                
                html += '</div>';
                result.innerHTML = html;

            } catch (error) {
                result.innerHTML = '<div class="result error"><h2>❌ Research Failed</h2><p>' + error.message + '</p><p>Please try again or simplify your query.</p></div>';
            } finally {
                isResearching = false;
                btn.textContent = '🚀 Start Enhanced Research';
                btn.disabled = false;
            }
        }

        // Allow Enter key to submit
        document.getElementById('query').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                performResearch();
            }
        });
    </script>
</body>
</html>
    `);
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

  // Use port 5000 for Replit compatibility, with smart fallback
  const preferredPort = 5000;
  const fallbackPort = 3000;
  const port = parseInt(process.env.PORT || preferredPort.toString());
  
  // Enhanced server startup with smart port detection
  function startServer(portToTry: number, isRetry = false) {
    const serverInstance = server.listen({
      port: portToTry,
      host: "0.0.0.0",
    }, () => {
      log(`🚀 Research Agent server running on port ${portToTry}`);
      if (portToTry === preferredPort) {
        log(`🌐 Optimal Replit configuration active`);
      }
      if (process.env.REPLIT_DB_URL) {
        log(`🔗 Available at: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
      }
    });

    serverInstance.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && !isRetry) {
        log(`Port ${portToTry} busy, trying fallback port ${fallbackPort}`);
        setTimeout(() => startServer(fallbackPort, true), 1000);
      } else if (err.code === 'EADDRINUSE' && isRetry) {
        const randomPort = fallbackPort + Math.floor(Math.random() * 100);
        log(`Using alternative port ${randomPort}`);
        setTimeout(() => startServer(randomPort, true), 1000);
      } else {
        throw err;
      }
    });
  }

  startServer(Number(port));
})();
