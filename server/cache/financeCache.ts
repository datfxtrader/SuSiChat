
import Redis from 'ioredis';
import { FinancialDataType } from '../types';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const CACHE_TTL = {
  FOREX: 3600, // 1 hour
  COMMODITIES: 7200, // 2 hours
  NEWS: 1800, // 30 minutes
  EVENTS: 14400 // 4 hours
};

export class FinanceCache {
  static async getForexRate(pair: string): Promise<any> {
    const key = `forex:${pair}`;
    return await redis.get(key);
  }

  static async setForexRate(pair: string, data: any): Promise<void> {
    const key = `forex:${pair}`;
    await redis.setex(key, CACHE_TTL.FOREX, JSON.stringify(data));
  }

  static async getCommodityPrice(symbol: string): Promise<any> {
    const key = `commodity:${symbol}`;
    return await redis.get(key);
  }

  static async setCommodityPrice(symbol: string, data: any): Promise<void> {
    const key = `commodity:${symbol}`;
    await redis.setex(key, CACHE_TTL.COMMODITIES, JSON.stringify(data));
  }

  static async getFinancialNews(topic: string): Promise<any> {
    const key = `news:${topic}`;
    return await redis.get(key);
  }

  static async setFinancialNews(topic: string, news: any): Promise<void> {
    const key = `news:${topic}`;
    await redis.setex(key, CACHE_TTL.NEWS, JSON.stringify(news));
  }

  static async invalidateCache(type: FinancialDataType, identifier: string): Promise<void> {
    const key = `${type}:${identifier}`;
    await redis.del(key);
  }
}
