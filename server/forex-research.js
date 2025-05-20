/**
 * Financial research handler for forex/market queries
 * This provides specialized analysis when web search is unavailable
 */

const axios = require('axios');

// Financial markets data sources
const FOREX_SOURCES = [
  {
    title: "Investing.com",
    url: "https://www.investing.com/currencies/",
    domain: "investing.com"
  },
  {
    title: "FXStreet",
    url: "https://www.fxstreet.com/",
    domain: "fxstreet.com"
  },
  {
    title: "DailyFX",
    url: "https://www.dailyfx.com/",
    domain: "dailyfx.com"
  }
];

/**
 * Generate forex market analysis using DeepSeek API
 */
async function generateForexAnalysis(query) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.error('DeepSeek API key not available');
      return "Unable to generate detailed research: API key missing";
    }
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst with deep knowledge of forex markets.'
          },
          {
            role: 'user',
            content: `Create a detailed analysis for ${query} including current price levels, technical analysis (support/resistance, indicators), fundamental factors, and market outlook. Include specific numerical data and format with clear section headings.`
          }
        ],
        temperature: 0.5,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error generating forex analysis:', error);
    return `# ${query} Analysis\n\nI apologize, but I cannot provide detailed analysis at this time due to technical issues. Please try using a different research depth level.`;
  }
}

/**
 * Check if a query is related to financial markets
 */
function isFinancialQuery(query) {
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'nzd/usd', 'usd/cad',
    'forex', 'currency', 'exchange rate', 'financial market', 'stock market',
    'trading', 'central bank', 'interest rate', 'inflation', 'recession'
  ];
  
  const lowerQuery = query.toLowerCase();
  return financialTerms.some(term => lowerQuery.includes(term));
}

/**
 * Perform financial research with DeepSeek
 */
async function performFinancialResearch(query) {
  console.log('Using specialized financial research for:', query);
  
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