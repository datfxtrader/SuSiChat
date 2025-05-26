
// types/financial-source.types.ts
export interface FinancialSource {
  id: string;
  title: string;
  url: string;
  domain: string;
  category: SourceCategory;
  subcategories: SourceSubcategory[];
  reliability: number; // 0-1 score
  features: SourceFeatures;
  dataTypes: DataType[];
  coverage: SourceCoverage;
  access: AccessInfo;
  quality: QualityMetrics;
  metadata: SourceMetadata;
}

export enum SourceCategory {
  DATA = 'data',
  ANALYSIS = 'analysis',
  NEWS = 'news',
  CHARTS = 'charts',
  RESEARCH = 'research',
  EDUCATION = 'education'
}

export enum SourceSubcategory {
  REALTIME_QUOTES = 'realtime_quotes',
  HISTORICAL_DATA = 'historical_data',
  TECHNICAL_ANALYSIS = 'technical_analysis',
  FUNDAMENTAL_ANALYSIS = 'fundamental_analysis',
  MARKET_NEWS = 'market_news',
  ECONOMIC_DATA = 'economic_data',
  EARNINGS = 'earnings',
  SENTIMENT = 'sentiment'
}

export enum DataType {
  FOREX = 'forex',
  STOCKS = 'stocks',
  CRYPTO = 'crypto',
  COMMODITIES = 'commodities',
  INDICES = 'indices',
  BONDS = 'bonds',
  FUTURES = 'futures',
  OPTIONS = 'options',
  ETFS = 'etfs'
}

export interface SourceFeatures {
  realTimeData: boolean;
  historicalData: boolean;
  newsArticles: boolean;
  analysis: boolean;
  charts: boolean;
  screeners: boolean;
  alerts: boolean;
  api: boolean;
  mobileApp: boolean;
  widgets: boolean;
}

export interface SourceCoverage {
  geographic: GeographicCoverage[];
  markets: Market[];
  exchanges: string[];
  languages: string[];
  timeZones: string[];
}

export interface GeographicCoverage {
  region: 'global' | 'north_america' | 'europe' | 'asia' | 'oceania' | 'africa' | 'south_america';
  countries?: string[];
}

export interface Market {
  type: DataType;
  coverage: 'comprehensive' | 'major' | 'limited';
  instruments?: number;
}

export interface AccessInfo {
  requiresRegistration: boolean;
  freeAccess: boolean;
  paidTiers: PaidTier[];
  rateLimit?: RateLimit;
  apiAccess?: APIAccess;
}

export interface PaidTier {
  name: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly';
  features: string[];
}

export interface RateLimit {
  requests: number;
  window: number; // in seconds
  authenticated?: number; // higher limit for authenticated users
}

export interface APIAccess {
  available: boolean;
  documentation?: string;
  authentication: 'api_key' | 'oauth' | 'basic' | 'none';
  formats: string[];
  websocket?: boolean;
}

export interface QualityMetrics {
  dataAccuracy: number; // 0-1
  updateFrequency: UpdateFrequency;
  dataDepth: 'shallow' | 'moderate' | 'deep';
  userRating?: number; // 0-5
  professionalGrade: boolean;
}

export enum UpdateFrequency {
  REALTIME = 'realtime',
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly'
}

export interface SourceMetadata {
  established: number;
  company: string;
  headquarters: string;
  description: string;
  specialties: string[];
  certifications?: string[];
  awards?: string[];
  userBase?: string;
  lastReviewed: string;
}
