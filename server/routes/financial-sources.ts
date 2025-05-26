
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
import express, { Request, Response } from 'express';
import { FinancialSourceService } from '../services/financial-source.service';
import { SourceCategory, DataType, SourceFeatures } from '../../types/financial-source.types';

const router = express.Router();

/**
 * GET /api/financial-sources
 * Get all financial sources with optional filters
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      category,
      dataType,
      minReliability,
      freeOnly,
      apiRequired,
      language
    } = req.query;

    let sources = FinancialSourceService.getAllSources();

    // Apply filters if provided
    if (category && Object.values(SourceCategory).includes(category as SourceCategory)) {
      sources = sources.filter(s => s.category === category);
    }

    if (dataType && Object.values(DataType).includes(dataType as DataType)) {
      sources = sources.filter(s => s.dataTypes.includes(dataType as DataType));
    }

    if (minReliability) {
      const reliability = parseFloat(minReliability as string);
      if (!isNaN(reliability)) {
        sources = sources.filter(s => s.reliability >= reliability);
      }
    }

    if (freeOnly === 'true') {
      sources = sources.filter(s => s.access.freeAccess);
    }

    if (apiRequired === 'true') {
      sources = sources.filter(s => s.access.apiAccess?.available);
    }

    if (language) {
      sources = sources.filter(s => s.coverage.languages.includes(language as string));
    }

    res.json({
      success: true,
      data: sources,
      count: sources.length
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
 * GET /api/financial-sources/search
 * Search financial sources
 */
router.get('/search', (req: Request, res: Response) => {
  try {
    const { q: query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter (q) is required'
      });
    }

    const filters: any = {};
    const { category, dataType, minReliability, freeOnly, apiRequired, language } = req.query;

    if (category) filters.category = category as SourceCategory;
    if (dataType) filters.dataType = dataType as DataType;
    if (minReliability) filters.minReliability = parseFloat(minReliability as string);
    if (freeOnly === 'true') filters.freeOnly = true;
    if (apiRequired === 'true') filters.apiRequired = true;
    if (language) filters.language = language as string;

    const results = FinancialSourceService.searchSources(query, filters);

    res.json({
      success: true,
      data: results,
      count: results.length,
      query,
      filters
    });

  } catch (error) {
    console.error('Error searching financial sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search financial sources'
    });
  }
});

/**
 * POST /api/financial-sources/recommendations
 * Get source recommendations based on requirements
 */
router.post('/recommendations', (req: Request, res: Response) => {
  try {
    const { dataTypes, features, budget, professionalGrade, realtime } = req.body;

    if (!dataTypes || !Array.isArray(dataTypes)) {
      return res.status(400).json({
        success: false,
        error: 'dataTypes array is required'
      });
    }

    const requirements = {
      dataTypes: dataTypes as DataType[],
      features: features || {},
      budget: budget ? parseFloat(budget) : undefined,
      professionalGrade,
      realtime
    };

    const recommendations = FinancialSourceService.getRecommendations(requirements);

    res.json({
      success: true,
      data: recommendations,
      requirements
    });

  } catch (error) {
    console.error('Error getting source recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

/**
 * GET /api/financial-sources/analytics
 * Get source analytics and metrics
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = FinancialSourceService.getSourceAnalytics();

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching source analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

/**
 * GET /api/financial-sources/:id
 * Get specific financial source by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const source = FinancialSourceService.getAllSources().find(s => s.id === id);

    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Financial source not found'
      });
    }

    res.json({
      success: true,
      data: source
    });

  } catch (error) {
    console.error('Error fetching financial source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financial source'
    });
  }
});

/**
 * POST /api/financial-sources/:id/validate
 * Validate source access and requirements
 */
router.post('/:id/validate', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { needsAPI, needsRealtime, hasSubscription } = req.body;

    const validation = FinancialSourceService.validateSourceAccess(id, {
      needsAPI,
      needsRealtime,
      hasSubscription
    });

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating source access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate source access'
    });
  }
});

/**
 * POST /api/financial-sources/market-coverage
 * Get market coverage analysis
 */
router.post('/market-coverage', (req: Request, res: Response) => {
  try {
    const { markets } = req.body;

    if (!markets || !Array.isArray(markets)) {
      return res.status(400).json({
        success: false,
        error: 'markets array is required'
      });
    }

    const coverage = FinancialSourceService.getMarketCoverage(markets as DataType[]);

    res.json({
      success: true,
      data: coverage,
      markets
    });

  } catch (error) {
    console.error('Error analyzing market coverage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze market coverage'
    });
  }
});

/**
 * POST /api/financial-sources/cost-analysis
 * Get cost analysis for source usage
 */
router.post('/cost-analysis', (req: Request, res: Response) => {
  try {
    const { sourceIds, usage } = req.body;

    if (!sourceIds || !Array.isArray(sourceIds)) {
      return res.status(400).json({
        success: false,
        error: 'sourceIds array is required'
      });
    }

    if (!usage || !usage.period) {
      return res.status(400).json({
        success: false,
        error: 'usage object with period is required'
      });
    }

    const costAnalysis = FinancialSourceService.getCostAnalysis(sourceIds, usage);

    res.json({
      success: true,
      data: costAnalysis
    });

  } catch (error) {
    console.error('Error performing cost analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform cost analysis'
    });
  }
});

/**
 * GET /api/financial-sources/categories
 * Get available categories and data types
 */
router.get('/meta/categories', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        categories: Object.values(SourceCategory),
        subcategories: Object.values(SourceCategory),
        dataTypes: Object.values(DataType)
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
