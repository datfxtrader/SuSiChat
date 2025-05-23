/**
 * Financial research route for standalone operation
 * This provides specialized financial research when integrated routes fail
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { llmService } = require('./llm');

// API endpoint for financial research
router.post('/generate', async (req, res) => {
  try {
    const { query, depth = 3 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    console.log(`Processing financial research request for: ${query} at depth ${depth}`);
    const result = await generateFinancialAnalysis(query);
    
    return res.json({
      report: result.report,
      sources: result.sources,
      depth,
      processingTime: result.processingTime || 0
    });
  } catch (error) {
    console.error('Error processing financial research request:', error);
    return res.status(500).json({
      error: 'Failed to generate financial research',
      report: 'I encountered an error while analyzing this financial topic. Please try a different approach.',
      sources: getDefaultSources(),
      depth: 3
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
      processingTime: Date.now() - startTime
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
        }
      }
    );
    
    if (response.data?.choices?.[0]?.message?.content) {
      return {
        report: response.data.choices[0].message.content,
        sources: getDefaultSources(),
        processingTime: Date.now() - startTime
      };
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating financial analysis with DeepSeek:', error);
    return {
      report: `# ${query} Market Analysis\n\nI encountered a technical issue while generating a detailed analysis for this financial query. This may be due to API connectivity issues.`,
      sources: getDefaultSources(),
      processingTime: Date.now() - startTime
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
    }
  ];
}

module.exports = router;