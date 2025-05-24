/**
 * Yahoo Finance Integration for Real-Time Bitcoin Data
 * Provides authentic current market data for financial research
 */

import axios from 'axios';

interface YahooFinanceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  volume?: number;
  marketCap?: number;
}

interface BitcoinMarketData {
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
  source: string;
}

/**
 * Get current Bitcoin price data from Yahoo Finance
 */
export async function getCurrentBitcoinPrice(): Promise<BitcoinMarketData | null> {
  try {
    console.log('Fetching current Bitcoin price from Yahoo Finance...');
    
    // Yahoo Finance API endpoint for Bitcoin (BTC-USD)
    const response = await axios.get(
      'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      }
    );

    if (response.data?.chart?.result?.[0]) {
      const result = response.data.chart.result[0];
      const quote = result.indicators?.quote?.[0];
      const meta = result.meta;

      if (meta && quote) {
        const currentPrice = meta.regularMarketPrice || meta.previousClose;
        const previousClose = meta.previousClose;
        const priceChange = currentPrice - previousClose;
        const priceChangePercent = (priceChange / previousClose) * 100;

        const bitcoinData: BitcoinMarketData = {
          currentPrice: Math.round(currentPrice * 100) / 100,
          priceChange24h: Math.round(priceChange * 100) / 100,
          priceChangePercent24h: Math.round(priceChangePercent * 100) / 100,
          marketCap: meta.marketCap || 0,
          volume24h: meta.regularMarketVolume || 0,
          lastUpdated: new Date().toISOString(),
          source: 'Yahoo Finance'
        };

        console.log(`✅ Current Bitcoin Price: $${bitcoinData.currentPrice} (${bitcoinData.priceChangePercent24h > 0 ? '+' : ''}${bitcoinData.priceChangePercent24h}%)`);
        return bitcoinData;
      }
    }

    console.warn('No valid Bitcoin data found in Yahoo Finance response');
    return null;
  } catch (error) {
    console.error('Error fetching Bitcoin price from Yahoo Finance:', error);
    return null;
  }
}

/**
 * Get Bitcoin market context with current pricing
 */
export async function getBitcoinMarketContext(): Promise<string> {
  const bitcoinData = await getCurrentBitcoinPrice();
  
  if (!bitcoinData) {
    return "Unable to retrieve current Bitcoin pricing data from Yahoo Finance.";
  }

  const direction = bitcoinData.priceChangePercent24h >= 0 ? '📈' : '📉';
  const changeText = bitcoinData.priceChangePercent24h >= 0 ? 'up' : 'down';
  
  return `
🪙 **CURRENT BITCOIN MARKET DATA** (${bitcoinData.lastUpdated.split('T')[0]})
${direction} **Price**: $${bitcoinData.currentPrice.toLocaleString()}
📊 **24h Change**: ${bitcoinData.priceChangePercent24h > 0 ? '+' : ''}$${bitcoinData.priceChange24h.toLocaleString()} (${bitcoinData.priceChangePercent24h > 0 ? '+' : ''}${bitcoinData.priceChangePercent24h}%)
📈 **Market Cap**: $${(bitcoinData.marketCap / 1e9).toFixed(1)}B
💰 **24h Volume**: $${(bitcoinData.volume24h / 1e9).toFixed(1)}B
🔄 **Trend**: Bitcoin is ${changeText} ${Math.abs(bitcoinData.priceChangePercent24h).toFixed(2)}% over the last 24 hours

*Data Source: Yahoo Finance (Real-time)*
`;
}

/**
 * Enhanced search query with current Bitcoin context
 */
export function enhanceBitcoinQuery(originalQuery: string, bitcoinData: BitcoinMarketData): string {
  const currentPrice = bitcoinData.currentPrice;
  const trend = bitcoinData.priceChangePercent24h >= 0 ? 'rising' : 'declining';
  
  return `${originalQuery} current price $${currentPrice} ${trend} trend May 2025 analysis forecast`;
}