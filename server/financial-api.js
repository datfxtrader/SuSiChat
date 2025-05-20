/**
 * Financial research API for forex and market data
 * This module provides specialized financial research capabilities
 */

const axios = require('axios');

// Check if DeepSeek API key is available
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * Generate financial/forex analysis 
 */
async function generateFinancialAnalysis(query) {
  console.log('Generating financial analysis for:', query);
  
  try {
    // Check for API key
    if (!DEEPSEEK_API_KEY) {
      console.warn('DeepSeek API key not available for financial analysis');
      return getFallbackReport(query);
    }
    
    // Make API request to DeepSeek
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
            content: `Create a detailed analysis for ${query} including:
1. Current Market Status with specific price levels and recent movements
2. Technical Analysis with support/resistance levels and key indicators
3. Fundamental Factors affecting the market including economic data
4. Expert Outlook and forecasts
5. Key Levels to Watch and trading considerations

Format your response with clear section headings and include specific data where appropriate.
Current date: ${new Date().toISOString().split('T')[0]}`
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
    
    // Process response
    if (response.data?.choices?.[0]?.message?.content) {
      return {
        report: response.data.choices[0].message.content,
        sources: getDefaultSources(),
        success: true
      };
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating financial analysis:', error);
    return getFallbackReport(query);
  }
}

/**
 * Get fallback report when API fails
 */
function getFallbackReport(query) {
  return {
    report: `# ${query} Market Analysis\n\nI apologize, but I'm currently unable to provide a detailed analysis due to technical limitations. Please try again later or consider using a different research depth.`,
    sources: getDefaultSources(),
    success: false
  };
}

/**
 * Get default financial data sources
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
 * Check if query is financial in nature
 */
function isFinancialQuery(query) {
  const lowerQuery = query.toLowerCase();
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'forex', 'currency', 
    'exchange rate', 'financial market', 'stock market', 'trading'
  ];
  
  return financialTerms.some(term => lowerQuery.includes(term));
}

/**
 * Perform comprehensive financial research
 */
async function performFinancialResearch(query, depth = 3) {
  console.log(`Performing financial research at depth ${depth} for: ${query}`);
  
  const startTime = Date.now();
  const { report, sources, success } = await generateFinancialAnalysis(query);
  
  return {
    report,
    sources,
    depth,
    processingTime: Date.now() - startTime
  };
}

module.exports = {
  isFinancialQuery,
  performFinancialResearch
};