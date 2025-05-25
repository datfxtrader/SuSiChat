// server/main.js - Unified proxy server for Replit
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    services: {
      main: 'running',
      deerflow: 'internal:5000'
    },
    timestamp: new Date().toISOString(),
    environment: process.env.REPLIT_DB_URL ? 'replit' : 'local'
  });
});

// Import enhanced research service
let enhancedResearchService;
try {
  const { EnhancedResearchService } = require('./deerflow-integration-enhanced');
  enhancedResearchService = new EnhancedResearchService();
} catch (error) {
  console.log('⚠️ Enhanced research service not available, using basic fallback');
}

// Research endpoint - smart proxy/orchestrator
app.post('/api/research', async (req, res) => {
  try {
    console.log('🔍 Research request received:', req.body.query);
    
    if (enhancedResearchService) {
      const result = await enhancedResearchService.performResearch({
        query: req.body.query,
        depth: req.body.depth || 3,
        modelId: req.body.modelId || 'deepseek-chat',
        includeMarketData: req.body.includeMarketData || true,
        includeNews: req.body.includeNews || true,
        researchLength: 'comprehensive',
        researchTone: 'analytical'
      });
      
      console.log('✅ Research completed successfully');
      res.json(result);
    } else {
      // Basic fallback response
      res.json({
        success: false,
        message: 'Research service initializing...',
        suggestion: 'Please try again in a moment'
      });
    }
    
  } catch (error) {
    console.error('❌ Research failed:', error.message);
    
    // Return user-friendly error
    res.status(500).json({
      error: 'Research service temporarily unavailable',
      message: error.message,
      suggestion: 'Please try again in a few moments or simplify your query'
    });
  }
});

// Legacy API compatibility
app.post('/api/suna/research', async (req, res) => {
  // Redirect to new research endpoint
  req.url = '/api/research';
  app._router.handle(req, res);
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start main server on port 3000 (Replit's public port)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Main server running on port ${PORT}`);
  if (process.env.REPLIT_DB_URL) {
    console.log(`🌐 Public URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  }
  console.log(`🔗 DeerFlow service: localhost:5000 (internal)`);
});