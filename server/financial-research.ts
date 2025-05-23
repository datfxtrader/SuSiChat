
import axios from 'axios';
import { performWebSearch } from './performWebSearch';

// Financial data sources
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
 * Generate financial analysis using LLM
 */
async function generateFinancialAnalysis(query: string, retryCount = 0) {
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
            content: 'You are an expert financial analyst with deep knowledge of forex markets.'
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
 * Check if a query is finance-related
 */
export function isFinancialQuery(query: string): boolean {
  if (!query) return false;
  
  const financialTerms = [
    'eur/usd', 'gbp/usd', 'usd/jpy', 'forex', 'currency', 'exchange rate',
    'financial market', 'stock market', 'trading', 'central bank', 
    'interest rate', 'inflation', 'recession', 'gdp', 'monetary policy'
  ];
  
  return financialTerms.some(term => query.toLowerCase().includes(term));
}

/**
 * Perform comprehensive financial research
 */
export async function performFinancialResearch(query: string) {
  console.log('Performing financial research for:', query);
  
  const startTime = Date.now();
  
  try {
    // Get web search results
    const searchResults = await performWebSearch(query);
    
    // Generate analysis
    const analysis = await generateFinancialAnalysis(query);
    
    return {
      report: analysis,
      sources: FINANCIAL_SOURCES,
      webResults: searchResults.results,
      processingTime: Date.now() - startTime,
      success: true
    };
  } catch (error) {
    console.error('Financial research failed:', error);
    return {
      report: 'Research generation failed. Please try again.',
      sources: FINANCIAL_SOURCES,
      processingTime: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
