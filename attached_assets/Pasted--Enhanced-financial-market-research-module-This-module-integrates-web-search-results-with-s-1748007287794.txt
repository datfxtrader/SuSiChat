/**
 * Enhanced financial market research module
 * This module integrates web search results with specialized financial analysis
 */

const axios = require('axios');

/**
 * Generate comprehensive financial market analysis
 * @param {string} query - The financial query (e.g., "EUR/USD", "GBP/USD")
 * @returns {Promise<Object>} - Research result
 */
async function generateMarketAnalysis(query) {
  console.log(`Generating enhanced financial analysis for: ${query}`);
  const startTime = Date.now();
  
  // Step 1: Perform web search to get real-time data
  const webSearchResults = await performFinancialWebSearch(query);
  
  // Step 2: Generate financial analysis using DeepSeek
  let report = await generateFinancialReport(query, webSearchResults);
  
  // Step 3: Collect source information
  const sources = extractSourcesFromSearchResults(webSearchResults);
  
  return {
    report,
    sources: sources.length ? sources : getDefaultFinancialSources(),
    processingTime: Date.now() - startTime
  };
}

/**
 * Perform web search for financial queries
 */
async function performFinancialWebSearch(query) {
  try {
    // Make direct request to web search API
    const searchEndpoint = '/api/web-search';
    const formattedQuery = formatFinancialQuery(query);
    
    const response = await axios.post(searchEndpoint, {
      query: formattedQuery,
      maxResults: 10
    });
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results;
    } else {
      console.warn('Web search returned no results');
      return [];
    }
  } catch (error) {
    console.error('Error performing financial web search:', error);
    return [];
  }
}

/**
 * Format financial query for better search results
 */
function formatFinancialQuery(query) {
  const baseQuery = query.trim();
  
  // If it's a currency pair, add relevant terms
  if (/EUR\/USD|GBP\/USD|USD\/JPY|AUD\/USD/i.test(baseQuery)) {
    return `${baseQuery} forex analysis current price forecast trading`;
  }
  
  // For cryptocurrency queries
  if (/bitcoin|ethereum|crypto/i.test(baseQuery)) {
    return `${baseQuery} price analysis market trend current`;
  }
  
  // General financial queries
  return `${baseQuery} financial market analysis current`;
}

/**
 * Generate financial report using DeepSeek API
 */
async function generateFinancialReport(query, searchResults) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn('DeepSeek API key not available');
      return createBasicFinancialReport(query);
    }
    
    // Extract relevant information from search results
    const searchContexts = searchResults.map((result, index) => {
      return `Source ${index + 1}: ${result.title}
URL: ${result.url}
Content: ${result.description || result.content || 'No content available'}`;
    }).join('\n\n');
    
    // Create specialized system prompt for financial analysis
    const systemPrompt = 'You are an expert financial analyst specializing in forex markets, cryptocurrencies, and market analysis. Provide detailed insights using proper financial terminology and specific data points from the search results provided.';
    
    // Create user prompt with search context
    const userPrompt = `Create a comprehensive market analysis for ${query} based on the following search results:

${searchContexts || 'No search results available. Use your knowledge to provide the best analysis possible.'}

Your analysis should include:
1. Current Market Status - detailed price analysis with current rates, ranges, and movements
2. Technical Analysis - support/resistance levels, chart patterns, and key indicators
3. Fundamental Analysis - relevant economic factors and news affecting the market
4. Market Outlook - short and medium-term forecasts
5. Key Levels to Watch - significant price levels for trading decisions

Use proper financial terminology and format with clear Markdown headings.
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
        temperature: 0.3,
        max_tokens: 4000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating financial report:', error);
    return createBasicFinancialReport(query);
  }
}

/**
 * Extract sources from search results
 */
function extractSourcesFromSearchResults(results) {
  if (!results || !results.length) return [];
  
  return results.map(result => {
    try {
      if (!result.url) return null;
      
      // Extract domain from URL
      const url = new URL(result.url);
      const domain = url.hostname;
      
      return {
        title: result.title || domain,
        url: result.url,
        domain: domain
      };
    } catch (e) {
      return null;
    }
  }).filter(source => source !== null);
}

/**
 * Create basic financial report when API calls fail
 */
function createBasicFinancialReport(query) {
  return `# ${query} Market Analysis

## Current Market Status
As of today (${new Date().toISOString().split('T')[0]}), this market has been influenced by recent economic data and central bank policies.

## Technical Analysis
Key support and resistance levels are forming based on recent price action, with important technical indicators suggesting potential market direction.

## Fundamental Factors
Economic data releases and policy decisions continue to impact this market, with interest rate differentials and economic sentiment playing significant roles.

## Market Outlook
Analysts are watching key economic events and technical levels closely as they may significantly impact future price movements.

*Note: For real-time market data and detailed analysis, please check specialized financial platforms or services.*`;
}

/**
 * Get default financial data sources
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
      title: "TradingView",
      url: "https://www.tradingview.com/",
      domain: "tradingview.com"
    },
    {
      title: "DailyFX",
      url: "https://www.dailyfx.com/",
      domain: "dailyfx.com"
    }
  ];
}

/**
 * Check if a query is related to financial markets
 */
function isFinancialQuery(query) {
  if (!query) return false;
  
  const lowerQuery = query.toLowerCase();
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'forex',
    'bitcoin', 'ethereum', 'crypto', 'btc', 'currency', 
    'exchange rate', 'financial market', 'stock market', 'trading'
  ];
  
  return financialTerms.some(term => lowerQuery.includes(term));
}

module.exports = {
  generateMarketAnalysis,
  isFinancialQuery,
  getDefaultFinancialSources
};