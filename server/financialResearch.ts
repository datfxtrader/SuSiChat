/**
 * Financial research helper module
 * This provides specialized forex and market research capabilities
 */

import axios from 'axios';

// API keys from environment variables
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * Generates a detailed forex/market research report when web search fails
 */
export async function generateForexResearch(query: string): Promise<{
  report: string;
  sources: any[];
}> {
  // Default sources for financial data
  const defaultSources = [
    {
      title: "Forex Factory",
      url: "https://www.forexfactory.com/",
      domain: "forexfactory.com",
      content: "Market news and economic calendar data"
    },
    {
      title: "Trading Economics",
      url: "https://tradingeconomics.com/",
      domain: "tradingeconomics.com",
      content: "Economic indicators and market data"
    },
    {
      title: "Investing.com",
      url: "https://www.investing.com/",
      domain: "investing.com",
      content: "Financial markets data and analysis"
    },
    {
      title: "TradingView",
      url: "https://www.tradingview.com/",
      domain: "tradingview.com",
      content: "Advanced charting and technical analysis"
    },
    {
      title: "FXStreet",
      url: "https://www.fxstreet.com/",
      domain: "fxstreet.com",
      content: "Forex news and market analysis"
    },
    {
      title: "Reuters",
      url: "https://www.reuters.com/markets/",
      domain: "reuters.com",
      content: "Global financial news and market coverage"
    },
    {
      title: "Bloomberg",
      url: "https://www.bloomberg.com/markets",
      domain: "bloomberg.com",
      content: "Real-time financial market data and news"
    },
    {
      title: "MarketWatch",
      url: "https://www.marketwatch.com/",
      domain: "marketwatch.com",
      content: "Stock market news and financial analysis"
    },
    {
      title: "Seeking Alpha",
      url: "https://seekingalpha.com/",
      domain: "seekingalpha.com",
      content: "In-depth market analysis and research"
    },
    {
      title: "Financial Times",
      url: "https://www.ft.com/",
      domain: "ft.com", 
      content: "Global financial news and expert analysis"
    },
    {
      title: "Yahoo Finance",
      url: "https://finance.yahoo.com/",
      domain: "finance.yahoo.com",
      content: "Financial data and market statistics"
    },
    {
      title: "CNBC",
      url: "https://www.cnbc.com/",
      domain: "cnbc.com",
      content: "Real-time financial news and market coverage"
    }
  ];

  try {
    // Generate a research report using DeepSeek
    if (!DEEPSEEK_API_KEY) {
      console.warn('DeepSeek API key not available');
      return {
        report: createFallbackReport(query),
        sources: defaultSources
      };
    }

    // Check for rate limiting and timeouts
    const timeoutMs = 30000;
      const systemPrompt = `You are an expert financial analyst specializing in forex markets. 
You will create a comprehensive, data-driven analysis based on the current date and your knowledge 
of market fundamentals, technical analysis principles, and macroeconomic factors.`;

      const userPrompt = `Create a detailed, professional-level analysis of ${query} for today's market (${new Date().toISOString().split('T')[0]}).

Your analysis must include:
1. Current market status with precise price levels and recent movement percentages
2. Key technical analysis (support/resistance levels, chart patterns, key indicators)
3. Fundamental analysis (relevant economic data, central bank policies)
4. Expert consensus on short and medium-term outlook
5. Key risk factors that could impact the currency pair

Format your response as a comprehensive market report with clear section headings, bullet points,
and precise numerical data where appropriate. Note that this is a fallback research method when 
real-time data sources are unavailable, so clearly state this limitation.`;

      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          }
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid API response format');
      }

      const report = response.data.choices[0].message.content;
      if (report.length < 100) {
        throw new Error('Generated report too short');
      }

      return {
        report,
        sources: defaultSources,
        metadata: {
          generated: new Date().toISOString(),
          model: 'deepseek-chat'
        }
      };
    }

    // Fallback report if API call fails
    return {
      report: `# ${query} Market Analysis\n\n## Overview\nThis is a limited market analysis created when real-time web search was unavailable. The information represents general market principles rather than real-time data.\n\n## Key Points\n- Financial markets are influenced by central bank policies, economic indicators, and geopolitical events\n- Technical analysis examines chart patterns, support/resistance levels, and indicators to identify potential market movements\n- Always verify this information with live market data before making trading decisions`,
      sources: defaultSources
    };
  } catch (error) {
    console.error('Error generating forex research:', error);
    
    // Retry once on failure
    try {
      console.log('Retrying research generation...');
      const retryResponse = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: timeoutMs
        }
      );

      if (retryResponse.data?.choices?.[0]?.message?.content) {
        return {
          report: retryResponse.data.choices[0].message.content,
          sources: defaultSources,
          metadata: {
            generated: new Date().toISOString(),
            model: 'deepseek-chat',
            retried: true
          }
        };
      }
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    }

    return {
      report: `# Basic ${query} Analysis\n\nUnable to retrieve detailed market information. Please consider the following general insights:\n\n- Currency pairs are influenced by interest rate differentials\n- Economic data releases impact short-term price movements\n- Central bank policies guide long-term trends\n\nThis information represents general market principles rather than real-time data.`,
      sources: defaultSources
    };
  }
}