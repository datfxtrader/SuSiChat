/**
 * Financial research route to handle forex and market queries
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Sources for financial research
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

// Route for financial research
router.post('/', async (req, res) => {
  try {
    const { query, depth = 3 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    console.log(`Financial research request for: ${query} at depth ${depth}`);
    const startTime = Date.now();
    
    // Generate the research report
    const report = await generateFinancialReport(query);
    
    // Return the research response
    return res.json({
      report,
      sources: FINANCIAL_SOURCES,
      depth,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error handling financial research:', error);
    return res.status(500).json({
      error: 'Failed to process financial research request',
      report: 'An error occurred while researching this financial topic.',
      sources: [],
      depth: 3,
      processingTime: 0
    });
  }
});

/**
 * Generate financial report using DeepSeek
 */
async function generateFinancialReport(query) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      return `# ${query} Analysis\n\nUnable to generate a detailed report due to missing API configuration.`;
    }
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst specialized in forex and market analysis. Create detailed reports with technical analysis, fundamental factors, and market insights.'
          },
          {
            role: 'user',
            content: `Create a comprehensive financial analysis for ${query} including:

1. Executive Summary with key insights
2. Current Market Status with exact price levels and recent movements
3. Technical Analysis with support/resistance levels and key indicators
4. Fundamental Factors affecting the market
5. Expert Forecasts and outlook
6. Key levels to watch and trading considerations

Current date: ${new Date().toISOString().split('T')[0]}
Format with clear section headings and include specific numerical data where appropriate.`
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
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error('Error generating financial report:', error);
    return `# ${query} Analysis\n\nI apologize, but I'm currently unable to provide a detailed analysis due to technical difficulties. Please try again later or use a different research depth level.`;
  }
}

module.exports = router;