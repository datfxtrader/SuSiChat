// server/deerflow-integration-enhanced.js
const axios = require('axios');

class EnhancedResearchService {
  constructor() {
    // Configure for Replit environment
    this.deerflowUrl = process.env.DEERFLOW_URL || 'http://localhost:5000';
    this.isReplit = process.env.REPLIT_DB_URL !== undefined;
    console.log(`🔧 Enhanced Research Service initialized for ${this.isReplit ? 'Replit' : 'local'} environment`);
  }

  async performResearch(params) {
    console.log(`🔍 Starting research in ${this.isReplit ? 'Replit' : 'local'} environment`);
    
    try {
      // Try DeerFlow first
      return await this.performDeerFlowResearch(params);
    } catch (deerflowError) {
      console.log('⚠️ DeerFlow unavailable, using enhanced fallback');
      
      // Use enhanced fallback system
      return await this.performEnhancedFallback(params);
    }
  }

  async performDeerFlowResearch(params) {
    try {
      const response = await axios.post(`${this.deerflowUrl}/research`, params, {
        timeout: 30000, // 30 second timeout
        headers: { 'Content-Type': 'application/json' }
      });

      return response.data;
    } catch (error) {
      console.log(`❌ DeerFlow error: ${error.message}`);
      throw new Error(`DeerFlow service unavailable: ${error.message}`);
    }
  }

  async performEnhancedFallback(params) {
    // Enhanced fallback using your existing research capabilities
    console.log('🔄 Using enhanced fallback research system');
    
    try {
      // Import your existing enhanced research service
      const { enhancedResearchService } = require('./enhanced-research-service');
      
      return await enhancedResearchService.performComprehensiveResearch({
        query: params.query,
        depth: params.depth || 3,
        includeNews: params.includeNews !== false,
        includeWiki: true,
        includeAcademic: true
      });
    } catch (fallbackError) {
      console.log('⚠️ Enhanced fallback also failed, using basic response');
      
      return {
        success: true,
        query: params.query,
        content: `Research analysis for: ${params.query}

I apologize, but the research services are temporarily unavailable. This could be due to:
- Network connectivity issues
- External API rate limits
- Service maintenance

Please try again in a few moments. If the issue persists, you may want to:
1. Check your internet connection
2. Verify API keys are properly configured
3. Try a simpler query

The system will automatically retry with full capabilities once services are restored.`,
        analysis: 'Service temporarily unavailable - please retry',
        sources: [],
        timestamp: new Date().toISOString(),
        fallbackUsed: true
      };
    }
  }
}

module.exports = { EnhancedResearchService };