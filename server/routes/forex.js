/**
 * Express route handler for forex/financial research
 * This provides dedicated research functionality for financial topics
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Sources for financial research
const FINANCIAL_SOURCES = [
  {
    title: "Investing.com",
    url: "https://www.investing.com/",
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

// API endpoint for forex/financial research
router.post('/research', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    const startTime = Date.now();
    const report = await generateForexAnalysis(query);
    
    return res.json({
      report,
      sources: FINANCIAL_SOURCES,
      depth: 3,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Financial research error:', error);
    return res.status(500).json({
      error: 'Failed to generate financial research',
      report: 'I encountered an error researching this financial topic. Please try a different research depth.',
      sources: [],
      depth: 3,
      processingTime: 0
    });
  }
});

/**
 * Generate financial analysis using DeepSeek
 */
async function generateForexAnalysis(query) {
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
          content: 'You are an expert financial analyst specialized in forex and market analysis. Create comprehensive, data-driven reports with detailed technical and fundamental analysis.'
        },
        {
          role: 'user',
          content: `Create a detailed market analysis report for ${query}. Include:
1. Current market status with specific price levels and recent movements
2. Technical analysis (support/resistance levels, indicators, chart patterns)
3. Fundamental factors affecting the market (economic data, central bank policies)
4. Market sentiment and expert forecasts
5. Key levels to watch and trading considerations

Current date: ${new Date().toISOString().split('T')[0]}

Format with clear headings and include specific numerical data where appropriate.`
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
  
  if (response.data && response.data.choices && response.data.choices[0]) {
    return response.data.choices[0].message.content;
  } else {
    throw new Error('Unexpected API response format');
  }
}

module.exports = router;