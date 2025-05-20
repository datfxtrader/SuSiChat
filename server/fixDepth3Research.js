/**
 * Simple script to patch the failing depth 3 research
 * This acts as a temporary solution until the main code can be fixed
 */

const { generateForexResearch } = require('./financialResearch');

// Export a simple handler for depth 3 research
module.exports = {
  /**
   * Handle depth 3 research for financial topics
   */
  async handleFinancialResearch(query) {
    console.log('Using specialized financial research handler for query:', query);
    
    try {
      // Generate research report
      const { report, sources } = await generateForexResearch(query);
      
      return {
        report,
        sources,
        depth: 3,
        processingTime: 0
      };
    } catch (error) {
      console.error('Error in financial research handler:', error);
      return {
        report: `# Analysis of ${query}\n\nI'm currently unable to provide a detailed analysis due to a technical issue with our research system. Please try again later or consider using depth level 2 research for now.`,
        sources: [],
        depth: 3,
        processingTime: 0
      };
    }
  },
  
  /**
   * Check if a query is financial/forex related
   */
  isFinancialQuery(query) {
    const financialKeywords = [
      'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'nzd/usd', 'usd/cad', 'usd/chf', 
      'forex', 'currency', 'exchange rate', 'financial', 'market', 'trading', 'trader',
      'stock', 'bond', 'treasury', 'interest rate', 'central bank', 'fed', 'ecb', 'boe',
      'inflation', 'recession', 'gdp'
    ];
    
    const lowerQuery = query.toLowerCase();
    return financialKeywords.some(keyword => lowerQuery.includes(keyword));
  }
};