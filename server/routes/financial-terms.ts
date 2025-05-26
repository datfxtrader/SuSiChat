
import express, { Request, Response } from 'express';
import { FinancialTermsService } from '../services/financial-terms.service';
import { TermCategory, TermSubcategory } from '../../types/financial-terms.types';

const router = express.Router();

/**
 * POST /api/financial-terms/analyze
 * Analyze text for financial terms and context
 */
router.post('/analyze', (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text parameter is required'
      });
    }

    const analysis = FinancialTermsService.analyzeText(text);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Error analyzing financial terms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze text'
    });
  }
});

/**
 * GET /api/financial-terms/search
 * Search financial terms with filters
 */
router.get('/search', (req: Request, res: Response) => {
  try {
    const { 
      q: query, 
      category, 
      subcategory, 
      minWeight, 
      tradingRelevance 
    } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter (q) is required'
      });
    }

    const filters: any = {};
    
    if (category && Object.values(TermCategory).includes(category as TermCategory)) {
      filters.category = category as TermCategory;
    }

    if (subcategory && Object.values(TermSubcategory).includes(subcategory as TermSubcategory)) {
      filters.subcategory = subcategory as TermSubcategory;
    }

    if (minWeight) {
      const weight = parseFloat(minWeight as string);
      if (!isNaN(weight) && weight >= 0 && weight <= 1) {
        filters.minWeight = weight;
      }
    }

    if (tradingRelevance && ['high', 'medium', 'low'].includes(tradingRelevance as string)) {
      filters.tradingRelevance = tradingRelevance as 'high' | 'medium' | 'low';
    }

    const results = FinancialTermsService.searchTerms(query, filters);

    res.json({
      success: true,
      data: results,
      count: results.length,
      query,
      filters
    });

  } catch (error) {
    console.error('Error searching financial terms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search terms'
    });
  }
});

/**
 * GET /api/financial-terms/category/:category
 * Get terms by category
 */
router.get('/category/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    if (!Object.values(TermCategory).includes(category as TermCategory)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    const categoryData = FinancialTermsService.getTermsByCategory(category as TermCategory);

    res.json({
      success: true,
      data: categoryData
    });

  } catch (error) {
    console.error('Error fetching category terms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category terms'
    });
  }
});

/**
 * GET /api/financial-terms/term/:normalized
 * Get specific term details
 */
router.get('/term/:normalized', (req: Request, res: Response) => {
  try {
    const { normalized } = req.params;
    const term = FinancialTermsService.getTermDetails(normalized);

    if (!term) {
      return res.status(404).json({
        success: false,
        error: 'Term not found'
      });
    }

    res.json({
      success: true,
      data: term
    });

  } catch (error) {
    console.error('Error fetching term details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch term details'
    });
  }
});

/**
 * POST /api/financial-terms/extract-entities
 * Extract financial entities from query
 */
router.post('/extract-entities', (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const entities = FinancialTermsService.extractFinancialEntities(query);

    res.json({
      success: true,
      data: entities,
      query
    });

  } catch (error) {
    console.error('Error extracting financial entities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract entities'
    });
  }
});

/**
 * GET /api/financial-terms/statistics
 * Get term statistics and metrics
 */
router.get('/statistics', (req: Request, res: Response) => {
  try {
    const statistics = FinancialTermsService.getTermStatistics();

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Error fetching term statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/financial-terms/categories
 * Get available categories and subcategories
 */
router.get('/categories', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        categories: Object.values(TermCategory),
        subcategories: Object.values(TermSubcategory)
      }
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

export default router;
