
// config/financial-sources.ts
import { FinancialSource } from '../../types/financial-research.types';

export const FINANCIAL_SOURCES: FinancialSource[] = [
  {
    title: "Investing.com",
    url: "https://www.investing.com/currencies/",
    domain: "investing.com",
    category: "data",
    reliability: 0.9
  },
  {
    title: "FXStreet",
    url: "https://www.fxstreet.com/",
    domain: "fxstreet.com",
    category: "analysis",
    reliability: 0.85
  },
  {
    title: "DailyFX",
    url: "https://www.dailyfx.com/",
    domain: "dailyfx.com",
    category: "analysis",
    reliability: 0.85
  },
  {
    title: "Bloomberg Markets",
    url: "https://www.bloomberg.com/markets",
    domain: "bloomberg.com",
    category: "news",
    reliability: 0.95
  },
  {
    title: "Reuters Finance",
    url: "https://www.reuters.com/finance/",
    domain: "reuters.com",
    category: "news",
    reliability: 0.95
  },
  {
    title: "TradingView",
    url: "https://www.tradingview.com/",
    domain: "tradingview.com",
    category: "charts",
    reliability: 0.9
  }
];
