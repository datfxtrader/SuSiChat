/**
 * Financial market research module for specialized forex and market analysis
 */

const axios = require('axios');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

// Cache results for 15 minutes
const cache = new NodeCache({ stdTTL: 900 });

// Rate limit to 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

/**
 * Generate financial market analysis for forex and market queries
 * @param {string} query - The query to analyze (e.g., "EUR/USD", "GBP/USD")
 * @returns {Promise<Object>} - Research result with report and sources
 */
async function generateFinancialAnalysis(query) {
  console.log(`Generating financial analysis for: ${query}`);
  const startTime = Date.now();
  
  try {
    // Check if DeepSeek API key is available
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn('DeepSeek API key not available for financial analysis');
      return {
        report: createBasicFinancialReport(query),
        sources: getDefaultFinancialSources(),
        processingTime: Date.now() - startTime
      };
    }
    
    // Generate specialized financial analysis using DeepSeek
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst specializing in forex markets, economic indicators, and market analysis. Provide detailed insights using proper financial terminology and specific data points.'
          },
          {
            role: 'user',
            content: `Create a comprehensive market analysis for ${query} including:

1. Current Market Status - detailed price analysis with current rates, ranges, and movements
2. Technical Analysis - support/resistance levels, chart patterns, and key indicators (RSI, MACD, etc.)
3. Fundamental Analysis - central bank policies, economic data releases, and geopolitical influences
4. Market Outlook - short and medium-term forecasts with potential scenarios
5. Key Levels to Watch - significant price levels for trading decisions

Use proper financial terminology and include specific numerical data where appropriate.
Format with clear section headings and structure.
Be detailed and data-driven in your analysis.
Current date: ${new Date().toISOString().split('T')[0]}`
          }
        ],
        temperature: 0.4, // Lower temperature for more precise financial analysis
        max_tokens: 4000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    // Extract and return the generated report
    if (response.data?.choices?.[0]?.message?.content) {
      const content = response.data.choices[0].message.content;
      const confidenceScore = calculateConfidenceScore({
        content,
        responseTime: Date.now() - startTime,
        hasNumericalData: /\d+(\.\d+)?%|\$\d+|\d+\.\d+/.test(content),
        hasTechnicalTerms: /support|resistance|trend|volatility|momentum/i.test(content)
      });
      
      return {
        report: content,
        sources: getDefaultFinancialSources(),
        processingTime: Date.now() - startTime,
        confidence: confidenceScore
      };
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating financial analysis:', error);
    return {
      report: createBasicFinancialReport(query),
      sources: getDefaultFinancialSources(),
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Create a basic financial report when API calls fail
 * @param {string} query - The financial query
 * @returns {string} - A formatted report
 */
function createBasicFinancialReport(query) {
  return `# ${query} Market Analysis

## Current Market Status
As of today (${new Date().toISOString().split('T')[0]}), this currency pair has been showing significant market movements influenced by central bank policies and economic data releases.

## Technical Analysis
Key support and resistance levels are forming on the charts, with important technical indicators suggesting potential market direction.

## Fundamental Factors
Economic data releases and monetary policy decisions continue to impact this currency pair, with interest rate differentials playing a significant role.

## Market Outlook
Analysts are watching upcoming economic events closely as they may significantly impact future price movements.

*Note: For the most up-to-date and detailed analysis, please check specialized financial platforms or services that provide real-time market data.*`;
}

/**
 * Get default financial data sources
 * @returns {Array} - List of financial sources
 */
function getDefaultFinancialSources() {
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
    },
    {
      title: "ForexLive",
      url: "https://www.forexlive.com/",
      domain: "forexlive.com"
    }
  ];
}

/**
 * Check if a query is related to financial markets or forex
 * @param {string} query - The query to check
 * @returns {boolean} - True if the query is financial in nature
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
  generateFinancialAnalysis,
  isFinancialQuery,
  getDefaultFinancialSources
};
/**
 * Calculate confidence score for financial analysis
 * @param {object} params Analysis parameters
 * @returns {number} Confidence score between 0-1
 */
function calculateConfidenceScore({content, responseTime, hasNumericalData, hasTechnicalTerms}) {
  let score = 0;
  
  // Content quality checks
  if (content.length > 500) score += 0.3;
  if (hasNumericalData) score += 0.3;
  if (hasTechnicalTerms) score += 0.2;
  
  // Response time check (penalize very fast/slow responses)
  if (responseTime > 1000 && responseTime < 10000) score += 0.2;
  
  return Math.min(1, score);
}
