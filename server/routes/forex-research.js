/**
 * Express route handler for forex research 
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Handle forex research requests
router.post('/', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    const startTime = Date.now();
    const result = await performFinancialResearch(query);
    
    return res.json({
      ...result,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error in forex research:', error);
    return res.status(500).json({
      error: 'Failed to perform forex research',
      report: `I encountered an error while trying to research ${query}. Please try again or use a different research depth.`,
      sources: [],
      depth: 3
    });
  }
});

/**
 * Use DeepSeek API to generate forex analysis
 */
async function performFinancialResearch(query) {
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
          content: 'You are an expert financial analyst specializing in forex markets and economic analysis. Provide detailed, data-driven analysis with technical and fundamental insights.'
        },
        {
          role: 'user',
          content: `Create a detailed market analysis for ${query} including:
1. Current Market Status with price levels and recent movements
2. Technical Analysis with support/resistance levels and indicators
3. Fundamental Factors affecting the market 
4. Expert Outlook with potential scenarios
5. Key Levels to Watch for trading decisions

Use clear section headings and include specific numerical data where appropriate.
Current date: ${new Date().toISOString().split('T')[0]}`
        }
      ],
      temperature: 0.5,
      max_tokens: 3000
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }
  );
  
  if (!response.data?.choices?.[0]?.message?.content) {
    throw new Error('Invalid API response');
  }
  
  return {
    report: response.data.choices[0].message.content,
    sources: getDefaultSources(),
    depth: 3
  };
}

/**
 * Default forex data sources
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