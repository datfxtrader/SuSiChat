
// types/financial-source.types.ts
export interface FinancialSource {
  id: string;
  title: string;
  url: string;
  domain: string;
  category: SourceCategory;
  subcategories?: SourceSubcategory[];
  reliability: number; // 0-1 score
  features: SourceFeatures;
  regions?: Region[];
  updateFrequency?: UpdateFrequency;
  apiAvailable?: boolean;
  requiresAuth?: boolean;
  metadata?: SourceMetadata;
}

export enum SourceCategory {
  REALTIME = 'realtime',
  ANALYSIS = 'analysis',
  NEWS = 'news',
  DATA = 'data',
  CHARTS = 'charts',
  RESEARCH = 'research'
}

export enum SourceSubcategory {
  FOREX = 'forex',
  STOCKS = 'stocks',
  CRYPTO = 'crypto',
  COMMODITIES = 'commodities',
  BONDS = 'bonds',
  INDICES = 'indices',
  ECONOMICS = 'economics'
}

export interface SourceFeatures {
  realTimePrices: boolean;
  historicalData: boolean;
  technicalAnalysis: boolean;
  fundamentalAnalysis: boolean;
  newsArticles: boolean;
  expertCommentary: boolean;
  economicCalendar: boolean;
  chartingTools: boolean;
}

export enum Region {
  GLOBAL = 'global',
  NORTH_AMERICA = 'north_america',
  EUROPE = 'europe',
  ASIA = 'asia',
  LATIN_AMERICA = 'latin_america',
  MIDDLE_EAST = 'middle_east',
  AFRICA = 'africa'
}

export enum UpdateFrequency {
  REALTIME = 'realtime',
  MINUTE = 'minute',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly'
}

export interface SourceMetadata {
  established?: number;
  parentCompany?: string;
  languages?: string[];
  mobileFriendly?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // in ms
  };
  specialNotes?: string;
}
