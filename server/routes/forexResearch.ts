/**
 * Special route handler for forex research requests
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Financial data sources for forex information
const FOREX_SOURCES = [
  {
    title: "Forex Factory",
    url: "https://www.forexfactory.com/",
    domain: "forexfactory.com"
  },
  {
    title: "DailyFX",
    url: "https://www.dailyfx.com/",
    domain: "dailyfx.com"
  },
  {
    title: "Investing.com Forex",
    url: "https://www.investing.com/currencies/",
    domain: "investing.com"
  }
];

/**
 * Generate a forex research report using DeepSeek
 */
async function generateForexReport(query: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error('DeepSeek API key not available');
    return 'Unable to generate forex report: API key missing';
  }
  
  try {
    const systemPrompt = `You are an expert forex market analyst creating a detailed report on currency pairs.
Your analysis should include technical factors, fundamental influences, and market sentiment.
Structure your response with clear headings and include specific price levels and data points.`;

    const userPrompt = `Create a comprehensive analysis report for ${query} including:
1. Current market status with specific price levels, recent movements, and volatility
2. Technical analysis with support/resistance levels, trend identification, and key indicators
3. Fundamental factors affecting the pair (central bank policies, economic data, geopolitical events)
4. Market sentiment and expert forecasts
5. Key levels to watch and possible scenarios

Current date: ${new Date().toISOString().split('T')[0]}

Note that this is an analysis based on general market principles and historical data, not real-time information.`;

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
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

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error('Error generating forex report:', error);
    return `# ${query} Analysis\n\nUnable to generate a detailed report at this time. Please try again later or use a different research depth level.`;
  }
}

// Route for forex research
router.post('/forex', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  try {
    const startTime = Date.now();
    const report = await generateForexReport(query);
    
    res.json({
      report,
      sources: FOREX_SOURCES,
      depth: 3,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Forex research error:', error);
    res.status(500).json({ 
      error: 'Failed to generate forex research',
      report: `Error researching ${query}. Please try again with a different depth level.`,
      sources: [],
      depth: 3,
      processingTime: 0
    });
  }
});

export default router;