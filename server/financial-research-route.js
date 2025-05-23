
/**
 * Financial research route for standalone operation
 * This provides specialized financial research when integrated routes fail
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const { llmService } = require('./llm');

// Initialize cache with 15 minute TTL
const cache = new NodeCache({ stdTTL: 900 });

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

router.use(limiter);

// API endpoint for financial research
router.post('/generate', async (req, res) => {
  try {
    const { query, depth = 3 } = req.body;
    const requestId = Date.now().toString(36);
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Query is required',
        code: 'MISSING_QUERY',
        requestId 
      });
    }

    if (depth < 1 || depth > 5) {
      return res.status(400).json({
        error: 'Depth must be between 1 and 5',
        code: 'INVALID_DEPTH',
        requestId
      });
    }
    
    console.log(`[${requestId}] Processing financial research request for: ${query} at depth ${depth}`);

    // Check cache
    const cacheKey = `${query}-${depth}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return res.json({
        ...cachedResult,
        cached: true,
        requestId
      });
    }

    const result = await generateFinancialAnalysis(query);
    
    // Cache successful results
    if (result.report && !result.error) {
      cache.set(cacheKey, result);
    }

    return res.json({
      ...result,
      requestId,
      timestamp: new Date().toISOString(),
      cached: false
    });
  } catch (error) {
    const requestId = Date.now().toString(36);
    console.error(`[${requestId}] Error processing financial research request:`, error);
    
    return res.status(500).json({
      error: 'Failed to generate financial research',
      code: error.code || 'INTERNAL_ERROR',
      report: 'I encountered an error while analyzing this financial topic. Please try a different approach.',
      sources: getDefaultSources(),
      depth: 3,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate financial analysis using DeepSeek
 */
async function generateFinancialAnalysis(query) {
  const startTime = Date.now();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.warn('DeepSeek API key not available for financial analysis');
    return {
      report: `# ${query} Analysis\n\nI'm currently unable to provide in-depth analysis due to API configuration issues.`,
      sources: getDefaultSources(),
      processingTime: Date.now() - startTime,
      error: true,
      code: 'API_KEY_MISSING'
    };
  }
  
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst specializing in forex markets and economic analysis. Provide detailed, data-driven analysis with insights on technical patterns, fundamental factors, and market outlook.'
          },
          {
            role: 'user',
            content: `Create a comprehensive market analysis for ${query} including:

1. Current Market Status - detailed price levels, recent movements, and trading ranges
2. Technical Analysis - support/resistance levels, chart patterns, and key indicators
3. Fundamental Factors - central bank policies, economic data releases, and geopolitical influences
4. Market Outlook - short and medium-term forecasts with potential scenarios
5. Key Levels to Watch - significant price levels for trading decisions

Use clear section headings and include specific numerical data where appropriate.
Current date: ${new Date().toISOString().split('T')[0]}`
          }
        ],
        temperature: 0.4,
        max_tokens: 3000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    if (response.data?.choices?.[0]?.message?.content) {
      return {
        report: response.data.choices[0].message.content,
        sources: getDefaultSources(),
        processingTime: Date.now() - startTime,
        confidence: 0.8 // Example confidence score
      };
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating financial analysis with DeepSeek:', error);
    return {
      report: `# ${query} Market Analysis\n\nI encountered a technical issue while generating a detailed analysis for this financial query. This may be due to API connectivity issues.`,
      sources: getDefaultSources(),
      processingTime: Date.now() - startTime,
      error: true,
      code: error.code || 'API_ERROR'
    };
  }
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
    },
    {
      title: "Reuters",
      url: "https://www.reuters.com/markets/currencies/",
      domain: "reuters.com" 
    }
  ];
}

module.exports = router;
