/**
 * Forex data routes for financial market research
 * 
 * This module provides specialized forex and financial market data
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// API endpoint for forex data
router.post('/analyze', async (req, res) => {
  try {
    const { currencyPair, timeframe = 'daily' } = req.body;
    
    if (!currencyPair) {
      return res.status(400).json({ error: 'Currency pair is required' });
    }
    
    console.log(`Processing forex analysis request for: ${currencyPair}`);
    const analysis = await generateForexAnalysis(currencyPair, timeframe);
    
    return res.json(analysis);
  } catch (error) {
    console.error('Error processing forex analysis request:', error);
    return res.status(500).json({
      error: 'Failed to generate forex analysis',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Generate forex analysis using DeepSeek API
 */
async function generateForexAnalysis(currencyPair: string, timeframe: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DeepSeek API key not available');
  }
  
  const startTime = Date.now();
  
  try {
    // Call DeepSeek API for analysis
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert forex and financial market analyst with deep knowledge of technical analysis, fundamental factors, and market dynamics. Provide detailed, data-driven analysis with precise terminology and insights.'
          },
          {
            role: 'user',
            content: `Create a comprehensive forex analysis for ${currencyPair} with ${timeframe} timeframe perspective. Include:

1. Current Market Status - detailed price levels, recent movements, volatility
2. Technical Analysis - support/resistance levels, chart patterns, key indicators (RSI, MACD, moving averages)
3. Fundamental Factors - central bank policies, interest rates, economic data releases
4. Market Sentiment - institutional positioning and retail trader sentiment
5. Forecast - short and medium-term outlook with key scenarios
6. Key Levels to Watch - important price zones for trading decisions

Present this in a well-structured format with detailed numerical data where appropriate.
Current date: ${new Date().toISOString().split('T')[0]}`
          }
        ],
        temperature: 0.3,
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
        analysis: response.data.choices[0].message.content,
        currencyPair,
        timeframe,
        sources: getDefaultForexSources(currencyPair),
        processingTime: Date.now() - startTime
      };
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating forex analysis:', error);
    throw error;
  }
}

/**
 * Get default forex data sources for a specific currency pair
 */
function getDefaultForexSources(currencyPair: string) {
  // Format for different sites requires different formats
  const pairSlash = currencyPair.toUpperCase();
  const pair = currencyPair.replace('/', '').toLowerCase();
  
  return [
    {
      title: `${currencyPair} Chart and Analysis - Investing.com`,
      url: `https://www.investing.com/currencies/${pair}`,
      domain: "investing.com"
    },
    {
      title: `${currencyPair} Analysis - FXStreet`,
      url: `https://www.fxstreet.com/currencies/${pair}`,
      domain: "fxstreet.com"
    },
    {
      title: `${currencyPair} Technical Analysis - TradingView`,
      url: `https://www.tradingview.com/symbols/${pair}/`,
      domain: "tradingview.com"
    },
    {
      title: `${currencyPair} Daily Forecast - DailyFX`,
      url: `https://www.dailyfx.com/forex/technical/${pair}/daily`,
      domain: "dailyfx.com"
    }
  ];
}

export default router;