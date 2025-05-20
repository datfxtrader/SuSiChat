/**
 * Research API routes
 */
import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { ResearchDepth, researchService } from '../deerflow-integration';
import { z } from 'zod';

const router = Router();

// Schema for research request validation
const researchRequestSchema = z.object({
  query: z.string().min(3).max(500),
  depth: z.number().int().min(1).max(3).optional(),
  modelId: z.string().optional(),
  includeMarketData: z.boolean().optional(),
  includeNews: z.boolean().optional(),
});

/**
 * Perform research at different depth levels
 */
router.post('/research', isAuthenticated, async (req, res) => {
  try {
    // Validate request
    const validationResult = researchRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.format()
      });
    }
    
    // Extract validated data
    const { query, depth = ResearchDepth.Basic, modelId, includeMarketData, includeNews } = validationResult.data;
    
    // Log the research request
    console.log(`Research requested by user ${req.user?.claims?.sub} at depth ${depth}: "${query}"`);
    
    // Perform research
    const result = await researchService.performResearch({
      query,
      depth,
      modelId,
      includeMarketData,
      includeNews
    });
    
    // Add timestamp to the result
    const timestamp = new Date().toISOString();
    
    // Return the research result
    return res.json({
      ...result,
      timestamp,
      searchQuery: query
    });
  } catch (error) {
    console.error('Error processing research request:', error);
    return res.status(500).json({
      error: 'Failed to perform research',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;