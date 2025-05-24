/**
 * Financial Research Router
 * 
 * Specialized endpoint for in-depth financial market analysis
 */

import express from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ResearchParams, ResearchResult, ResearchSource, ResearchDepth } from '../deerflow-integration';
import { isAuthenticated } from '../replitAuth';
// import { FinanceCache } from '../cache/financeCache';
// import { YahooFinanceProvider } from '../providers/YahooFinanceProvider';

const router = express.Router();

// const yahooFinance = new YahooFinanceProvider();

// Financial data sources
const FINANCIAL_SOURCES: ResearchSource[] = [
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

// Check if query is financial/forex related
function isFinancialQuery(query: string): boolean {
  if (!query) return false;

  const lowerQuery = query.toLowerCase();
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'nzd/usd', 'usd/cad', 'forex',
    'currency', 'exchange rate', 'financial market', 'stock market', 'trading'
  ];

  return financialTerms.some(term => lowerQuery.includes(term));
}

// Generate financial analysis with DeepSeek
async function generateFinancialAnalysis(query: string): Promise<ResearchResult> {
  console.log(`Generating specialized financial analysis for: ${query}`);
  const startTime = Date.now();
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.warn('DeepSeek API key not available for financial analysis');
    return {
      report: `# ${query} Analysis\n\nI'm currently unable to provide in-depth analysis due to API configuration issues.`,
      sources: FINANCIAL_SOURCES,
      depth: ResearchDepth.Deep,
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
        sources: FINANCIAL_SOURCES,
        depth: ResearchDepth.Deep,
        processingTime: Date.now() - startTime
      };
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('Error generating financial analysis with DeepSeek:', error);
    return {
      report: `# ${query} Market Analysis\n\nI encountered a technical issue while generating a detailed analysis for this financial query. This may be due to API connectivity issues.`,
      sources: FINANCIAL_SOURCES,
      depth: ResearchDepth.Deep,
      processingTime: Date.now() - startTime
    };
  }
}

// API endpoint for financial research
router.post('/generate', isAuthenticated, async (req: any, res) => {
  try {
    const { query, depth = ResearchDepth.Deep } = req.body as ResearchParams;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!isFinancialQuery(query)) {
      return res.status(400).json({ error: 'Query must be financial in nature' });
    }

    // Check cache first
    // Cache temporarily disabled
    // const cachedData = await FinanceCache.getFinancialNews(query);
    // if (cachedData) {
    //   return res.json(JSON.parse(cachedData));
    // }

    console.log(`Processing financial research request for: ${query} at depth ${depth}`);
    const result = await generateFinancialAnalysis(query);

    // Add research to history if user is authenticated
    const userId = req.user?.claims?.sub;
    if (userId) {
      // Here you could save the research to a database if needed
      console.log(`Saving research for user ${userId}`);
    }

     // Store the result in cache
     // await FinanceCache.setFinancialNews(query, JSON.stringify(result));

    return res.json(result);
  } catch (error) {
    console.error('Error processing financial research request:', error);
    return res.status(500).json({
      error: 'Failed to generate financial research',
      report: 'I encountered an error while analyzing this financial topic. Please try a different approach.',
      sources: FINANCIAL_SOURCES,
      depth: ResearchDepth.Deep,
      processingTime: 0
    });
  }
});

export default router;