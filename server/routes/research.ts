// server/routes/research.ts
import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { researchService, ResearchDepth } from '../deerflow-integration';

const router = Router();

/**
 * Endpoint to perform research at different depth levels
 * POST /api/research
 */
router.post('/', isAuthenticated, async (req: any, res) => {
  try {
    const { query, depth = 1, modelId, includeMarketData, includeNews } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Research query is required' });
    }
    
    // Validate depth
    const researchDepth = Number(depth);
    if (isNaN(researchDepth) || researchDepth < 1 || researchDepth > 3) {
      return res.status(400).json({ error: 'Invalid research depth. Must be 1, 2, or 3.' });
    }
    
    // Perform research at the specified depth
    const result = await researchService.performResearch({
      query,
      depth: researchDepth as ResearchDepth,
      modelId,
      includeMarketData,
      includeNews
    });
    
    res.json(result);
  } catch (error) {
    console.error('Research error:', error);
    res.status(500).json({ error: 'Failed to perform research' });
  }
});

/**
 * Get research depth info
 * GET /api/research/depth-info
 */
router.get('/depth-info', async (req, res) => {
  // Provide information about research depth levels
  res.json({
    depths: [
      {
        level: 1,
        name: "Basic",
        description: "Quick web search with essential information",
        estimatedTime: "5-15 seconds"
      },
      {
        level: 2,
        name: "Enhanced",
        description: "Comprehensive web search with better processing",
        estimatedTime: "15-30 seconds"
      },
      {
        level: 3,
        name: "Deep",
        description: "In-depth research with comprehensive report generation",
        estimatedTime: "1-2 minutes"
      }
    ]
  });
});

export default router;