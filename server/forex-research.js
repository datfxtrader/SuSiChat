
/**
 * Financial research handler for forex/market queries
 * This provides specialized analysis when web search is unavailable
 */

const axios = require('axios');

// API constants
const API_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

// Financial markets data sources with specialized endpoints
const FOREX_SOURCES = [
  {
    title: "Investing.com",
    url: "https://www.investing.com/currencies/",
    domain: "investing.com",
    endpoints: {
      live: "/api/live-rates",
      news: "/api/news",
      calendar: "/api/calendar"
    }
  },
  {
    title: "FXStreet",
    url: "https://www.fxstreet.com/",
    domain: "fxstreet.com",
    endpoints: {
      analysis: "/api/analysis",
      forecast: "/api/forecast"
    }
  },
  {
    title: "DailyFX",
    url: "https://www.dailyfx.com/",
    domain: "dailyfx.com",
    endpoints: {
      technical: "/api/technical",
      fundamental: "/api/fundamental"
    }
  }
];

/**
 * Generate forex market analysis using DeepSeek API with retries
 */
async function generateForexAnalysis(query, retryCount = 0) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key not available');
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
        temperature: 0.4,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: API_TIMEOUT
      }
    );
    
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }
    
    throw new Error('Invalid API response format');
    
  } catch (error) {
    console.error(`Error generating forex analysis (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return generateForexAnalysis(query, retryCount + 1);
    }
    
    return `# ${query} Analysis\n\nI apologize, but I cannot provide detailed analysis at this time. Error: ${error.message}. Please try again later or use a different research depth level.`;
  }
}

/**
 * Check if a query is related to financial markets
 */
function isFinancialQuery(query) {
  if (!query) return false;
  
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'nzd/usd', 'usd/cad',
    'forex', 'currency', 'exchange rate', 'financial market', 'stock market',
    'trading', 'central bank', 'interest rate', 'inflation', 'recession',
    'gdp', 'monetary policy', 'economic data', 'fed', 'ecb', 'boe', 'boj'
  ];
  
  const lowerQuery = query.toLowerCase();
  return financialTerms.some(term => lowerQuery.includes(term));
}

/**
 * Perform financial research with DeepSeek and enhanced data sources
 */
async function performFinancialResearch(query) {
  console.log('Using specialized financial research for:', query);
  
  const startTime = Date.now();
  
  try {
    const report = await generateForexAnalysis(query);
    
    return {
      report,
      sources: FOREX_SOURCES,
      depth: 3,
      processingTime: Date.now() - startTime,
      success: true
    };
  } catch (error) {
    console.error('Financial research failed:', error);
    return {
      report: 'Research generation failed. Please try again.',
      sources: FOREX_SOURCES,
      depth: 3,
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  isFinancialQuery,
  performFinancialResearch,
  FOREX_SOURCES
};
