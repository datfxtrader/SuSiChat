
import express, { Request, Response } from 'express';
import { SearchEngineManagerService } from '../services/search-engine-manager.service';
import { SearchEngineConfigManager } from '../config/search-engines.config';
import { SearchType } from '../../types/search-engine.types';

const router = express.Router();
const engineManager = SearchEngineManagerService.getInstance();

/**
 * GET /api/search-engines
 * Get all available search engines
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const engines = SearchEngineConfigManager.getAllConfigs();
    
    res.json({
      success: true,
      data: engines.map(engine => ({
        id: engine.id,
        name: engine.name,
        priority: engine.priority,
        features: engine.features,
        metadata: engine.metadata
      }))
    });
  } catch (error) {
    console.error('Error fetching search engines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search engines'
    });
  }
});

/**
 * GET /api/search-engines/:engineId
 * Get specific search engine details
 */
router.get('/:engineId', (req: Request, res: Response) => {
  try {
    const { engineId } = req.params;
    const engineInfo = engineManager.getEngineInfo(engineId);

    if (!engineInfo.config) {
      return res.status(404).json({
        success: false,
        error: 'Search engine not found'
      });
    }

    res.json({
      success: true,
      data: engineInfo
    });
  } catch (error) {
    console.error('Error fetching search engine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search engine'
    });
  }
});

/**
 * POST /api/search-engines/select
 * Select optimal search engine for requirements
 */
router.post('/select', (req: Request, res: Response) => {
  try {
    const {
      searchType,
      needsDateRange,
      needsCountryFilter,
      maxLatency,
      excludeEngines,
      preferFree
    } = req.body;

    const requirements = {
      searchType: searchType as SearchType,
      needsDateRange,
      needsCountryFilter,
      maxLatency,
      excludeEngines,
      preferFree
    };

    const selection = engineManager.selectEngine(requirements);

    if (!selection) {
      return res.status(404).json({
        success: false,
        error: 'No suitable search engine found for requirements'
      });
    }

    res.json({
      success: true,
      data: selection
    });
  } catch (error) {
    console.error('Error selecting search engine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to select search engine'
    });
  }
});

/**
 * GET /api/search-engines/health
 * Get health status of all search engines
 */
router.get('/health/all', (req: Request, res: Response) => {
  try {
    const health = engineManager.getAllEngineHealth();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error fetching engine health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engine health'
    });
  }
});

/**
 * GET /api/search-engines/:engineId/health
 * Get health status of specific search engine
 */
router.get('/:engineId/health', (req: Request, res: Response) => {
  try {
    const { engineId } = req.params;
    const health = engineManager.getEngineHealth(engineId);

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error fetching engine health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engine health'
    });
  }
});

/**
 * POST /api/search-engines/:engineId/reset-stats
 * Reset statistics for specific search engine
 */
router.post('/:engineId/reset-stats', (req: Request, res: Response) => {
  try {
    const { engineId } = req.params;
    
    engineManager.resetEngineStats(engineId);

    res.json({
      success: true,
      message: `Statistics reset for engine: ${engineId}`
    });
  } catch (error) {
    console.error('Error resetting engine stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset engine statistics'
    });
  }
});

/**
 * GET /api/search-engines/by-feature/:feature
 * Get engines supporting specific feature
 */
router.get('/by-feature/:feature', (req: Request, res: Response) => {
  try {
    const { feature } = req.params;
    const engines = SearchEngineConfigManager.getByFeature(
      feature as keyof SearchEngineConfigManager['getAllConfigs'][0]['features']
    );

    res.json({
      success: true,
      data: engines.map(engine => ({
        id: engine.id,
        name: engine.name,
        priority: engine.priority,
        features: engine.features
      }))
    });
  } catch (error) {
    console.error('Error fetching engines by feature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engines by feature'
    });
  }
});

/**
 * GET /api/search-engines/by-type/:searchType
 * Get engines supporting specific search type
 */
router.get('/by-type/:searchType', (req: Request, res: Response) => {
  try {
    const { searchType } = req.params;
    
    if (!Object.values(SearchType).includes(searchType as SearchType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search type'
      });
    }

    const engines = SearchEngineConfigManager.getBySearchType(searchType as SearchType);

    res.json({
      success: true,
      data: engines.map(engine => ({
        id: engine.id,
        name: engine.name,
        priority: engine.priority,
        supportedTypes: engine.features.supportedSearchTypes
      }))
    });
  } catch (error) {
    console.error('Error fetching engines by search type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engines by search type'
    });
  }
});

/**
 * GET /api/search-engines/priority-order
 * Get engines in priority order
 */
router.get('/priority-order', (req: Request, res: Response) => {
  try {
    const engines = SearchEngineConfigManager.getByPriority();

    res.json({
      success: true,
      data: engines.map(engine => ({
        id: engine.id,
        name: engine.name,
        priority: engine.priority,
        status: engineManager.getEngineHealth(engine.id).status
      }))
    });
  } catch (error) {
    console.error('Error fetching engines by priority:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engines by priority'
    });
  }
});

export default router;
