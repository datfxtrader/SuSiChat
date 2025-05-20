/**
 * Express route for financial research when regular research fails
 */

const express = require('express');
const router = express.Router();
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

// API endpoint for financial research
router.post('/research', async (req, res) => {
  try {
    const { query, depth = 3 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Check if DeepSeek API key is available
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'API key not configured',
        report: `I'm unable to generate a detailed report for "${query}" due to a configuration issue.`,
        sources: FINANCIAL_SOURCES,
        depth
      });
    }
    
    const startTime = Date.now();
    
    // Generate analysis using DeepSeek
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
            content: `Create a detailed market analysis for ${query} including:

1. Current Market Status with specific price levels and recent movements
2. Technical Analysis with support/resistance levels and important indicators
3. Fundamental Factors affecting the market including economic data releases
4. Expert Outlook with short and medium-term forecasts
5. Key Levels to Watch for trading considerations

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
    
    if (response.data?.choices?.[0]?.message?.content) {
      return res.json({
        report: response.data.choices[0].message.content,
        sources: FINANCIAL_SOURCES,
        depth,
        processingTime: Date.now() - startTime
      });
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating financial research:', error);
    return res.status(500).json({
      error: 'Failed to generate financial research',
      report: 'I encountered an error while analyzing this financial topic. Please try again later or use a different research depth.',
      sources: FINANCIAL_SOURCES,
      depth: 3
    });
  }
});

// Identify financial queries for routing
router.post('/detect', (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  const lowerQuery = query.toLowerCase();
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'forex', 'currency', 
    'exchange rate', 'financial market', 'stock market', 'trading'
  ];
  
  const isFinancial = financialTerms.some(term => lowerQuery.includes(term));
  
  return res.json({
    isFinancial,
    query
  });
});

module.exports = router;