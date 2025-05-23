
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
      news: "/api/news",
      calendar: "/api/calendar"
    }
  },
  {
    title: "FXStreet",
    url: "https://www.fxstreet.com/",
    domain: "fxstreet.com",
    endpoints: {
      analysis: "/api/analysis",
      forecast: "/api/forecast" 
    }
  },
  {
    title: "DailyFX",
    url: "https://www.dailyfx.com/",
    domain: "dailyfx.com",
    endpoints: {
      technical: "/api/technical",
      fundamental: "/api/fundamental"
    }
  }
];

/**
 * Check if a query is finance-related
 */
export function isFinancialQuery(query: string): boolean {
  if (!query) return false;
  
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'usd/cad', 'nzd/usd',
    'usd/chf', 'forex', 'currency', 'exchange rate', 'pip', 'spread',
    'technical analysis', 'fundamental analysis', 'trading', 'market',
    'bitcoin', 'btc', 'eth', 'ethereum', 'crypto', 'cryptocurrency',
    'gold', 'xau/usd', 'silver', 'xag/usd', 'commodities'
  ];

  return financialTerms.some(term => 
    query.toLowerCase().includes(term.toLowerCase())
  );
}

/**
 * Generate financial analysis using LLM
 */
async function generateFinancialAnalysis(query: string, retryCount = 0): Promise<string> {
  try {
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
            content: 'You are an expert financial analyst specialized in forex markets.'
          },
          {
            role: 'user',
            content: `Create a detailed analysis for ${query} including current price levels, technical analysis, fundamental factors, and market outlook. Include specific numerical data.`
          }
        ],
        temperature: 0.4,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000
      }
    );
    
    return response.data?.choices?.[0]?.message?.content;
  } catch (error) {
    console.error(`Error generating financial analysis (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generateFinancialAnalysis(query, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Perform comprehensive financial research
 */
export async function performFinancialResearch(query: string): Promise<ResearchResult> {
  console.log('Performing financial research for:', query);
  
  const startTime = Date.now();
  
  try {
    const report = await generateFinancialAnalysis(query);
    
    return {
      report,
      sources: FINANCIAL_SOURCES,
      depth: ResearchDepth.Deep,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('Financial research failed:', error);
    return {
      report: 'Research generation failed. Please try again.',
      sources: FINANCIAL_SOURCES,
      depth: ResearchDepth.Deep,
      processingTime: Date.now() - startTime
    };
  }
}
