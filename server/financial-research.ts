
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
    'bitcoin', 'crypto', 'gold', 'silver', 'commodities'
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
            content: `Create a detailed analysis for ${query} including:
1. Current Market Status with price levels and movements
2. Technical Analysis with support/resistance levels
3. Fundamental Factors affecting the market
4. Expert Outlook and key levels to watch

Include specific numerical data where appropriate.
Current date: ${new Date().toISOString().split('T')[0]}`
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
    
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }
    
    throw new Error('Invalid API response format');
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
