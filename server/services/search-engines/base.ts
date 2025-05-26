
// services/search-engines/base.ts
import axios, { AxiosInstance } from 'axios';
import { SearchResult, SearchOptions, SearchFilters } from '../../../types/search.types';

export abstract class SearchEngine {
  protected client: AxiosInstance;
  protected apiKey: string;
  protected name: string;
  protected priority: number;
  protected timeout: number;

  constructor(name: string, apiKey: string, priority: number, timeout = 10000) {
    this.name = name;
    this.apiKey = apiKey;
    this.priority = priority;
    this.timeout = timeout;
    
    this.client = axios.create({
      timeout: this.timeout,
      validateStatus: (status) => status < 500
    });
  }

  abstract search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  
  getName(): string { return this.name; }
  getPriority(): number { return this.priority; }
  isAvailable(): boolean { return !!this.apiKey; }
}
