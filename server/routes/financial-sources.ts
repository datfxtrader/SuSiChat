
import express, { Request, Response } from 'express';
import { FinancialSourceService } from '../services/financial-source.service';
import { SourceCategory, SourceSubcategory, Region } from '../../types/financial-source.types';

const router = express.Router();

/**
 * GET /api/financial-sources
 * Get all financial sources with optional filtering
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      category,
      subcategory,
      region,
      minReliability,
      requiresAPI,
      search
    } = req.query;

    if (search) {
      const results = FinancialSourceService.searchSources(search as string);
      return res.json({
        success: true,
        data: results,
        count: results.length
      });
    }

    const filters: any = {};
    
    if (category && Object.values(SourceCategory).includes(category as SourceCategory)) {
      filters.category = category as SourceCategory;
    }

    if (subcategory && Object.values(SourceSubcategory).includes(subcategory as SourceSubcategory)) {
      filters.subcategory = subcategory as SourceSubcategory;
    }

    if (region && Object.values(Region).includes(region as Region)) {
      filters.region = region as Region;
    }

    if (minReliability) {
      const reliability = parseFloat(minReliability as string);
      if (!isNaN(reliability) && reliability >= 0 && reliability <= 1) {
        filters.minReliability = reliability;
      }
    }

    if (requiresAPI !== undefined) {
      filters.requiresAPI = requiresAPI === 'true';
    }

    const sources = filters && Object.keys(filters).length > 0 
      ? FinancialSourceService.getFilteredSources(filters)
      : FinancialSourceService.getAllSources();

    res.json({
      success: true,
      data: sources,
      count: sources.length,
      filters: filters
    });

  } catch (error) {
    console.error('Error fetching financial sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financial sources'
    });
  }
});

/**
 * GET /api/financial-sources/recommendations
 * Get recommended sources for a query
 */
router.get('/recommendations', (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const recommendations = FinancialSourceService.getRecommendedSources(query);

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      query
    });

  } catch (error) {
    console.error('Error getting source recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get source recommendations'
    });
  }
});

/**
 * GET /api/financial-sources/metrics
 * Get source metrics and statistics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = FinancialSourceService.getSourceMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching source metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch source metrics'
    });
  }
});

/**
 * GET /api/financial-sources/categories
 * Get available categories and subcategories
 */
router.get('/categories', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        categories: Object.values(SourceCategory),
        subcategories: Object.values(SourceSubcategory),
        regions: Object.values(Region)
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

/**
 * GET /api/financial-sources/:id
 * Get specific source by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sources = FinancialSourceService.getAllSources();
    const source = sources.find(s => s.id === id);

    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }

    res.json({
      success: true,
      data: source
    });

  } catch (error) {
    console.error('Error fetching source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch source'
    });
  }
});

export default router;
