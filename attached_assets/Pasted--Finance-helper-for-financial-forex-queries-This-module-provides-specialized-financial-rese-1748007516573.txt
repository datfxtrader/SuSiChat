/**
 * Finance helper for financial/forex queries
 * This module provides specialized financial research capabilities
 */

const axios = require('axios');

// Default financial data sources
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
 * Check if a query is financial/forex related
 */
function isFinancialQuery(query) {
  if (!query) return false;
  
  const lowerQuery = query.toLowerCase();
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'forex', 'currency', 'exchange rate'
  ];
  
  return financialTerms.some(term => lowerQuery.includes(term));
}

/**
 * Get financial data from DeepSeek API
 */
async function getFinancialAnalysis(query) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.log('DeepSeek API key not found');
      return {
        report: `# ${query} Analysis\n\nUnable to generate detailed analysis: API configuration issue.`,
        sources: FINANCIAL_SOURCES
      };
    }
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst specializing in forex markets.'
          },
          {
            role: 'user',
            content: `Create a detailed analysis of ${query} including current market status with price levels, technical analysis with support/resistance levels, market sentiment, and outlook. Use clear headings and include specific data points.`
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
      return {
        report: response.data.choices[0].message.content,
        sources: FINANCIAL_SOURCES
      };
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error('Error getting financial analysis:', error);
    return {
      report: `# ${query} Analysis\n\nI apologize, but I'm currently unable to provide detailed financial analysis due to a technical issue.`,
      sources: FINANCIAL_SOURCES
    };
  }
}

module.exports = {
  isFinancialQuery,
  getFinancialAnalysis,
  FINANCIAL_SOURCES
};