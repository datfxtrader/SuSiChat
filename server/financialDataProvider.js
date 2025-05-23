/**
 * Financial data provider for forex research
 * This module provides specialized forex market analysis for depth 3 research
 */

const axios = require('axios');

// Use DeepSeek API for generating detailed financial analysis
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * Generate a forex/market research report
 */
async function generateForexAnalysis(query) {
  try {
    console.log('Generating forex analysis for:', query);
    
    // Generate using DeepSeek
    const systemPrompt = 'You are an expert financial analyst specializing in forex markets. Create a comprehensive, data-driven analysis based on market fundamentals, technical indicators, and economic factors.';
    
    const userPrompt = `Create a detailed market analysis for ${query} including:
1. Current Market Status - Evaluate price levels, trends, and recent movements
2. Technical Analysis - Support/resistance levels and key technical indicators
3. Fundamental Analysis - Economic data, central bank policies, and market events
4. Market Outlook - Short and medium-term forecasts with target levels
5. Risk Factors - Key risks and potential market impacts

Current date: ${new Date().toISOString().split('T')[0]}`;

    // Call DeepSeek API
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 3000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}` 
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating forex analysis:', error);
    return `# ${query} Market Analysis

Unable to generate detailed analysis. Please check market data sources for current information.

Key Resources:
${FOREX_SOURCES.map(source => `- ${source.title}: ${source.url}`).join('\n')}`;
  }
}

// Financial data sources
const FOREX_SOURCES = [
  {
    title: 'Investing.com',
    url: 'https://www.investing.com/currencies/',
    domain: 'investing.com'
  },
  {
    title: 'FXStreet',
    url: 'https://www.fxstreet.com/',
    domain: 'fxstreet.com'
  },
  {
    title: 'DailyFX',
    url: 'https://www.dailyfx.com/',
    domain: 'dailyfx.com'
  }
];

/**
 * Detect if a query is related to forex/financial markets
 */
function isFinancialQuery(query) {
  const lowerQuery = query.toLowerCase();
  const financialKeywords = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'forex', 'currency', 
    'exchange rate', 'financial market', 'stock market', 'trading'
  ];
  
  return financialKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Perform financial research at depth level 3
 */
async function performFinancialResearch(query) {
  console.log('Performing depth 3 financial research for:', query);
  
  const startTime = Date.now();
  const report = await generateForexAnalysis(query);
  
  return {
    report,
    sources: FOREX_SOURCES,
    depth: 3,
    processingTime: Date.now() - startTime
  };
}

module.exports = {
  isFinancialQuery,
  performFinancialResearch
};
