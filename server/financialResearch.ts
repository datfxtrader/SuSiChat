import { deerflowClient } from './deerflow-client';
import { performWebSearch } from './webSearch';

export async function performFinancialResearch(query: string, options = {}) {
  try {
    const deerflowResult = await deerflowClient.performResearch({
      research_question: query,
      include_market_data: true,
      research_tone: 'analytical'
    });

    return {
      analysis: deerflowResult.report,
      sources: deerflowResult.sources
    };
  } catch (error) {
    console.error('Financial research error:', error);
    return { error: 'Research failed' };
  }
}