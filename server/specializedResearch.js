/**
 * Specialized research module for financial topics
 * This provides alternative research capabilities when the main system encounters errors
 */

const axios = require('axios');

// Financial data sources
const FINANCIAL_SOURCES = [
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
 * Generate specialized financial/forex research
 */
async function generateFinancialResearch(query, depth = 3) {
  console.log(`Generating specialized financial research for: ${query} at depth ${depth}`);
  
  try {
    // Check if DeepSeek API key is available
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DeepSeek API key not available');
    }
    
    // Generate analysis using DeepSeek
    const startTime = Date.now();
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst with deep knowledge of forex markets, economic indicators, and trading strategies.'
          },
          {
            role: 'user',
            content: `Create a comprehensive market analysis for ${query}. Include:

1. Current Market Status - detailed price analysis with exact rates, ranges, and movements
2. Technical Analysis - specific support/resistance levels, chart patterns, and key indicators (RSI, MACD, etc.)
3. Fundamental Analysis - central bank policies, economic data, and geopolitical factors affecting the market
4. Market Sentiment - institutional positioning and retail trader sentiment 
5. Forecasts - short and medium-term outlook with specific price targets
6. Trading Considerations - key levels to watch and risk management suggestions

Use proper financial terminology and formatting with clear section headings, bullet points for key data, and numerical values where appropriate.
Current date: ${new Date().toISOString().split('T')[0]}`
          }
        ],
        temperature: 0.4,  // Lower temperature for more precise financial analysis
        max_tokens: 3000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data?.choices?.[0]?.message?.content) {
      return {
        report: response.data.choices[0].message.content,
        sources: FINANCIAL_SOURCES,
        depth,
        processingTime: Date.now() - startTime
      };
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating financial research:', error);
    
    // Provide informative error response
    const errorReport = `# ${query} Market Analysis

I encountered a technical issue while attempting to generate a detailed analysis for this financial query. This could be due to one of the following reasons:

1. API connection issues
2. Service availability limitations
3. Configuration problems with the research service

Please try again later or consider using a different research depth level for now.

*Note: For real-time financial data, consider using specialized financial platforms or services.*`;

    return {
      report: errorReport,
      sources: FINANCIAL_SOURCES,
      depth: 3,
      processingTime: 0,
      error: true
    };
  }
}

/**
 * Detect if a query is financial/forex related
 */
function isFinancialQuery(query) {
  if (!query) return false;
  
  const lowerQuery = query.toLowerCase();
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'nzd/usd', 'usd/cad', 'forex',
    'currency', 'exchange rate', 'financial market', 'stock market', 'trading'
  ];
  
  return financialTerms.some(term => lowerQuery.includes(term));
}

module.exports = {
  generateFinancialResearch,
  isFinancialQuery,
  FINANCIAL_SOURCES
};