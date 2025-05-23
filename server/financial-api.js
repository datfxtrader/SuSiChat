/**
 * Financial research API for forex and market data
 * This module provides specialized financial research capabilities
 */

const axios = require('axios');
const { FINANCIAL_SOURCES } = require('./financeHelper');

// Check available API keys
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Generate financial/forex analysis 
 */
async function generateFinancialAnalysis(query, model = 'auto', depth = 3) {
  console.log('Generating financial analysis for:', query);

  try {
    // Select model based on availability, depth and preference
    let selectedModel = model;

    // Prioritize Gemini for depth 3 when in auto mode
    if (model === 'auto' && depth === 3 && GEMINI_API_KEY) {
      selectedModel = 'gemini-1.5-flash';
    }

    // If model is specified directly, verify API key availability
    if (model.startsWith('gemini') && !GEMINI_API_KEY) {
      console.warn('Gemini API key not available, falling back to alternative');
      selectedModel = 'auto';
    } else if (model === 'deepseek-chat' && !DEEPSEEK_API_KEY) {
      console.warn('DeepSeek API key not available, falling back to alternative');
      selectedModel = 'auto';
    }

    // Auto-select best available model
    if (selectedModel === 'auto') {
      if (GEMINI_API_KEY && DEEPSEEK_API_KEY) {
        // Randomly alternate between providers for load balancing
        selectedModel = Math.random() > 0.5 ? 'gemini-1.5-flash' : 'deepseek-chat';
      } else if (GEMINI_API_KEY) {
        selectedModel = 'gemini-1.5-flash';
      } else if (DEEPSEEK_API_KEY) {
        selectedModel = 'deepseek-chat';
      } else {
        console.warn('No LLM API keys available for financial analysis');
        return getFallbackReport(query);
      }
    }

    const prompt = `Create a detailed analysis for ${query} including:
1. Current Market Status with specific price levels and recent movements
2. Technical Analysis with support/resistance levels and key indicators
3. Fundamental Factors affecting the market including economic data
4. Expert Outlook and forecasts
5. Key Levels to Watch and trading considerations

Format your response with clear section headings and include specific data where appropriate.
Current date: ${new Date().toISOString().split('T')[0]}`;

    let response;
    if (selectedModel.startsWith('gemini')) {
      response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: 'You are an expert financial analyst specializing in forex markets and economic analysis.' }]
            },
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 15000,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
          }
        }
      );

      return {
        report: response.data.candidates[0].content.parts[0].text,
        sources: FINANCIAL_SOURCES,
        success: true,
        model: selectedModel
      };
    } else {
      response = await axios.post(
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
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 8000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          }
        }
      );

      return {
        report: response.data.choices[0].message.content,
        sources: FINANCIAL_SOURCES,
        success: true,
        model: 'deepseek-chat'
      };
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
    sources: FINANCIAL_SOURCES,
    success: false
  };
}

/**
 * Check if query is financial in nature
 */
function isFinancialQuery(query) {
  if (!query) return false;

  const lowerQuery = query.toLowerCase();
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'usd/cad', 'nzd/usd',
    'usd/chf', 'forex', 'currency', 'exchange rate', 'pip', 'spread',
    'technical analysis', 'fundamental analysis', 'trading', 'market',
    'bitcoin', 'btc', 'eth', 'ethereum', 'crypto', 'cryptocurrency',
    'gold', 'xau/usd', 'silver', 'xag/usd', 'platinum', 'palladium',
    'crude oil', 'wti', 'brent', 'natural gas', 'copper', 'aluminum',
    'corn', 'wheat', 'soybean', 'commodities', 'commodity futures'
  ];

  return financialTerms.some(term => lowerQuery.includes(term));
}

/**
 * Perform comprehensive financial research
 */
async function performFinancialResearch(query, depth = 3, model = 'auto') {
  console.log(`Performing financial research at depth ${depth} for: ${query}`);

  const startTime = Date.now();
  const { report, sources, success, model: usedModel } = await generateFinancialAnalysis(query, model, depth);

  return {
    report,
    sources,
    depth,
    model: usedModel,
    processingTime: Date.now() - startTime
  };
}

module.exports = {
  isFinancialQuery,
  performFinancialResearch
};