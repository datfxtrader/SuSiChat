/**
 * Fallback research functionality for when the main research system encounters errors
 * This provides basic research capabilities as a backup
 */

const axios = require('axios');

// API keys from environment variables
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * Generate a forex/financial research report
 * @param {string} query - The research query
 * @returns {Object} Research result object
 */
async function generateFinancialResearch(query) {
  console.log('Generating fallback financial research for:', query);
  
  try {
    // Try to use DeepSeek for generating the report
    if (DEEPSEEK_API_KEY) {
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an expert financial analyst specializing in forex markets and economic analysis.'
            },
            {
              role: 'user',
              content: `Create a comprehensive analysis for ${query} including current market status with price levels, technical analysis, fundamental factors affecting the market, and expert outlook. Include specific data points and use clear section headings.`
            }
          ],
          temperature: 0.5,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          }
        }
      );
      
      if (response.data && response.data.choices && response.data.choices[0]) {
        return {
          report: response.data.choices[0].message.content,
          sources: getDefaultSources(),
          depth: 3,
          processingTime: 0
        };
      }
    }
  } catch (error) {
    console.error('Error generating financial research with DeepSeek:', error);
  }
  
  // Fallback to static content if DeepSeek fails
  return {
    report: generateStaticReport(query),
    sources: getDefaultSources(),
    depth: 3,
    processingTime: 0
  };
}

/**
 * Generate a static report as a last resort
 * @param {string} query - The research query
 * @returns {string} Static report content
 */
function generateStaticReport(query) {
  return `# ${query} Market Analysis

## Current Market Status
This currency pair is currently showing notable market movements influenced by central bank policies, economic indicators, and market sentiment.

## Technical Analysis
Key technical levels are forming in the charts, with important support and resistance zones that traders are watching closely.

## Fundamental Factors
Economic data releases, interest rate differentials, and geopolitical events continue to impact this currency pair.

## Market Outlook
Analysts are monitoring upcoming economic indicators and central bank announcements that may influence future price direction.

*Note: This is a simplified analysis provided when detailed web search functionality is unavailable. For real-time data, please refer to specialized financial platforms.*`;
}

/**
 * Get default financial data sources
 * @returns {Array} Default sources
 */
function getDefaultSources() {
  return [
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
}

/**
 * Check if a query is financial/forex related
 * @param {string} query - The research query
 * @returns {boolean} True if query is financial
 */
function isFinancialQuery(query) {
  if (!query) return false;
  
  const lowerQuery = query.toLowerCase();
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'forex', 
    'currency', 'exchange rate', 'financial', 'market'
  ];
  
  return financialTerms.some(term => lowerQuery.includes(term));
}

module.exports = {
  generateFinancialResearch,
  isFinancialQuery
};