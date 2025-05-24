
import cron from 'node-cron';
// Temporarily disabled financial data updates - will re-enable when provider is available
// import { YahooFinanceProvider } from '../providers/YahooFinanceProvider';
// import { FinanceCache } from '../cache/financeCache';

// const yahooFinance = new YahooFinanceProvider();

const FOREX_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'];
const COMMODITIES = ['GC=F', 'CL=F']; // Gold and Oil futures

export function startFinancialDataUpdates() {
  console.log('Financial data updates temporarily disabled - will re-enable when provider is available');
  // Update forex rates every hour
  // cron.schedule('0 * * * *', async () => {
  //   for (const pair of FOREX_PAIRS) {
  //     try {
  //       const data = await yahooFinance.getForexRate(pair);
  //       await FinanceCache.setForexRate(pair, data);
  //     } catch (error) {
  //       console.error(`Error updating forex rate for ${pair}:`, error);
  //     }
  //   }
  // });

  // Update commodity prices every 2 hours
  // cron.schedule('0 */2 * * *', async () => {
  //   for (const symbol of COMMODITIES) {
  //     try {
  //       const data = await yahooFinance.getCommodityPrice(symbol);
  //       await FinanceCache.setCommodityPrice(symbol, data);
  //     } catch (error) {
  //       console.error(`Error updating commodity price for ${symbol}:`, error);
  //     }
  //   }
  // });
}
