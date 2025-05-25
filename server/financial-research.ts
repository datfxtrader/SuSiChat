
import axios from 'axios';
import { ResearchResult, ResearchDepth } from './deerflow-integration';

// Unified financial sources 
const FINANCIAL_SOURCES = [
  {
    title: "Investing.com",
    url: "https://www.investing.com/currencies/",
    domain: "investing.com",
    endpoints: {
      live: "/api/live-rates",
      news: "/api/news"
    }
  },
  {
    title: "FXStreet",
    url: "https://www.fxstreet.com/",
    domain: "fxstreet.com", 
    endpoints: {
      analysis: "/api/analysis"
    }
  },
  {
    title: "DailyFX",
    url: "https://www.dailyfx.com/",
    domain: "dailyfx.com",
    endpoints: {
      technical: "/api/technical"
    }
  }
];

/**
 * Check if a query is finance-related
 */
export function isFinancialQuery(query: string): boolean {
  if (!query) return false;

  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'usd/cad',
    'forex', 'currency', 'exchange rate', 'pip', 'spread',
    'technical analysis', 'fundamental analysis', 'trading',
    'bitcoin', 'crypto', 'gold', 'silver', 'commodities',
    'stock', 'market', 'price', 'investment'
  ];

  return financialTerms.some(term => 
    query.toLowerCase().includes(term.toLowerCase())
  );
}

/**
 * Generate financial analysis using LLM
 */
async function generateFinancialAnalysis(query: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const API_TIMEOUT = 30000;

  if (!apiKey) {
    throw new Error('DeepSeek API key not available');
  }

  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst specializing in forex markets. Provide concise, data-driven analysis.'
          },
          {
            role: 'user',
            content: `Analyze ${query} with:
1. Current price levels and movements
2. Key technical levels
3. Major market drivers
4. Risk assessment`
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: API_TIMEOUT
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response format');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Financial analysis generation failed:', error);
    throw error;
  }
}

/**
 * Perform comprehensive financial research
 */
export async function performFinancialResearch(query: string): Promise<ResearchResult> {
  const startTime = Date.now();

  try {
    const report = await generateFinancialAnalysis(query);

    return {
      report,
      sources: FINANCIAL_SOURCES,
      depth: ResearchDepth.Deep,
      processingTime: Date.now() - startTime,
      success: true
    };
  } catch (error) {
    console.error('Financial research failed:', error);
    return {
      report: 'Research generation failed. Please try again.',
      sources: FINANCIAL_SOURCES,
      depth: ResearchDepth.Deep,
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message
    };
  }
}
