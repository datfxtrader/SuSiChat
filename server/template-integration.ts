
/**
 * Highly Optimized Template Integration API for DeerFlow Research Service
 */

import { Request, Response, NextFunction } from 'express';
import axios, { AxiosInstance, AxiosError } from 'axios';
import LRU from 'lru-cache';

// Types and Interfaces
interface TemplateVariable {
  name: string;
  description: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  required: boolean;
  default?: string | number;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface ResearchTemplate {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  category: string;
  icon: string;
  variables: TemplateVariable[];
  created_by: string;
  created_at: string;
  updated_at?: string;
  usage_count: number;
  effectiveness_score: number;
  tags: string[];
  is_public: boolean;
  version?: number;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: string[];
  template_count?: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

// Optimized Configuration
const CONFIG = {
  DEERFLOW_BASE_URL: process.env.DEERFLOW_SERVICE_URL || 'http://0.0.0.0:8000',
  CACHE: {
    MAX_SIZE: 1000,
    TTL: {
      CATEGORIES: 30 * 60 * 1000,      // 30 minutes
      TEMPLATES: 10 * 60 * 1000,       // 10 minutes
      POPULAR: 5 * 60 * 1000,          // 5 minutes
      USER_TEMPLATES: 2 * 60 * 1000,   // 2 minutes
      SEARCH: 5 * 60 * 1000,           // 5 minutes
    },
  },
  TIMEOUT: {
    DEFAULT: 8000,     // 8 seconds
    GENERATE: 25000,   // 25 seconds
    SEARCH: 10000,     // 10 seconds
  },
  RETRY: {
    ATTEMPTS: 2,       // Reduced for faster failures
    DELAY: 500,        // Faster retry
    MAX_DELAY: 2000,
  },
  RATE_LIMIT: {
    WINDOW: 60 * 1000,
    MAX_REQUESTS: 150, // Increased limit
  },
  BATCH_SIZE: 25,      // Optimized batch size
  CONNECTION_POOL: {
    MAX_SOCKETS: 50,
    KEEP_ALIVE: true,
    KEEP_ALIVE_MSECS: 30000,
  },
} as const;

// Error types
class TemplateServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TemplateServiceError';
  }
}

// High-performance rate limiter with sliding window
class OptimizedRateLimiter {
  private windows = new LRU<string, number[]>({
    max: 1000,
    ttl: CONFIG.RATE_LIMIT.WINDOW * 2,
  });
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - CONFIG.RATE_LIMIT.WINDOW;
    
    let requests = this.windows.get(key) || [];
    
    // Efficient filtering using binary search concept
    let validStartIndex = 0;
    for (let i = 0; i < requests.length; i++) {
      if (requests[i] > windowStart) {
        validStartIndex = i;
        break;
      }
    }
    
    requests = requests.slice(validStartIndex);
    
    if (requests.length >= CONFIG.RATE_LIMIT.MAX_REQUESTS) {
      return false;
    }
    
    requests.push(now);
    this.windows.set(key, requests);
    return true;
  }
  
  getRemainingRequests(key: string): number {
    const requests = this.windows.get(key) || [];
    const now = Date.now();
    const windowStart = now - CONFIG.RATE_LIMIT.WINDOW;
    const validRequests = requests.filter(time => time > windowStart);
    return Math.max(0, CONFIG.RATE_LIMIT.MAX_REQUESTS - validRequests.length);
  }
}

// Circuit breaker for fault tolerance
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private timeout = 60000,
    private monitoringPeriod = 10000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new TemplateServiceError('Circuit breaker is OPEN', 503, 'CIRCUIT_OPEN', true);
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  getState(): string {
    return this.state;
  }
}

// Main optimized service class
class OptimizedTemplateService {
  private static instance: OptimizedTemplateService;
  private axiosInstance: AxiosInstance;
  private cache: LRU<string, any>;
  private rateLimiter = new OptimizedRateLimiter();
  private circuitBreaker = new CircuitBreaker();
  private defaultCategories: TemplateCategory[];
  private metrics = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    avgResponseTime: 0,
    totalResponseTime: 0,
  };
  
  private constructor() {
    // Initialize LRU cache for better memory management
    this.cache = new LRU<string, any>({
      max: CONFIG.CACHE.MAX_SIZE,
      ttl: CONFIG.CACHE.TTL.TEMPLATES,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    });
    
    // Configure axios with connection pooling
    this.axiosInstance = axios.create({
      baseURL: CONFIG.DEERFLOW_BASE_URL,
      timeout: CONFIG.TIMEOUT.DEFAULT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
      },
      maxRedirects: 3,
      httpAgent: require('http').Agent({
        keepAlive: CONFIG.CONNECTION_POOL.KEEP_ALIVE,
        keepAliveMsecs: CONFIG.CONNECTION_POOL.KEEP_ALIVE_MSECS,
        maxSockets: CONFIG.CONNECTION_POOL.MAX_SOCKETS,
        maxFreeSockets: 10,
      }),
    });
    
    this.setupInterceptors();
    this.defaultCategories = this.initializeDefaultCategories();
  }
  
  static getInstance(): OptimizedTemplateService {
    if (!OptimizedTemplateService.instance) {
      OptimizedTemplateService.instance = new OptimizedTemplateService();
    }
    return OptimizedTemplateService.instance;
  }
  
  private setupInterceptors(): void {
    // Request interceptor for metrics
    this.axiosInstance.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        this.metrics.requests++;
        return config;
      },
      (error) => {
        this.metrics.errors++;
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for metrics and retry logic
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        this.updateResponseTimeMetrics(duration);
        return response;
      },
      async (error: AxiosError) => {
        this.metrics.errors++;
        
        if (error.config?.metadata) {
          const duration = Date.now() - error.config.metadata.startTime;
          this.updateResponseTimeMetrics(duration);
        }
        
        // Enhanced retry logic
        if (this.shouldRetry(error) && !error.config?.__retryCount) {
          error.config.__retryCount = 0;
        }
        
        if (error.config?.__retryCount < CONFIG.RETRY.ATTEMPTS) {
          error.config.__retryCount++;
          const delay = Math.min(
            CONFIG.RETRY.DELAY * Math.pow(2, error.config.__retryCount - 1),
            CONFIG.RETRY.MAX_DELAY
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.axiosInstance.request(error.config);
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true; // Network errors
    const status = error.response.status;
    return status === 429 || status >= 500; // Rate limit or server errors
  }
  
  private updateResponseTimeMetrics(duration: number): void {
    this.metrics.totalResponseTime += duration;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.requests;
  }
  
  private getCacheKey(method: string, ...params: any[]): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(`${method}:${JSON.stringify(params)}`)
      .digest('hex');
    return `${method}:${hash}`;
  }
  
  private getFromCache<T>(key: string, customTTL?: number): T | null {
    const cached = this.cache.get(key);
    if (cached) {
      this.metrics.cacheHits++;
      return cached as T;
    }
    this.metrics.cacheMisses++;
    return null;
  }
  
  private setCache<T>(key: string, data: T, customTTL?: number): void {
    this.cache.set(key, data, { ttl: customTTL });
  }
  
  async getTemplateCategories(): Promise<TemplateCategory[]> {
    const cacheKey = this.getCacheKey('categories');
    const cached = this.getFromCache<TemplateCategory[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const categories = await this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.get('/api/templates/categories');
        return response.data.categories || [];
      });
      
      this.setCache(cacheKey, categories, CONFIG.CACHE.TTL.CATEGORIES);
      return categories;
    } catch (error) {
      console.error('📋 Template categories fetch failed:', this.getErrorMessage(error));
      return this.defaultCategories;
    }
  }
  
  async getTemplatesByCategory(category: string): Promise<ResearchTemplate[]> {
    const cacheKey = this.getCacheKey('category', category);
    const cached = this.getFromCache<ResearchTemplate[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const templates = await this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.get(`/api/templates/category/${encodeURIComponent(category)}`);
        return response.data.templates || [];
      });
      
      this.setCache(cacheKey, templates, CONFIG.CACHE.TTL.TEMPLATES);
      return templates;
    } catch (error) {
      console.error(`📁 Templates for category '${category}' fetch failed:`, this.getErrorMessage(error));
      return [];
    }
  }
  
  async getUserTemplates(userId: string): Promise<ResearchTemplate[]> {
    const cacheKey = this.getCacheKey('user', userId);
    const cached = this.getFromCache<ResearchTemplate[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const templates = await this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.get(`/api/templates/user/${encodeURIComponent(userId)}`);
        return response.data.templates || [];
      });
      
      this.setCache(cacheKey, templates, CONFIG.CACHE.TTL.USER_TEMPLATES);
      return templates;
    } catch (error) {
      console.error(`👤 User templates for '${userId}' fetch failed:`, this.getErrorMessage(error));
      return [];
    }
  }
  
  async createTemplate(templateData: {
    name: string;
    description: string;
    prompt_template: string;
    category: string;
    icon: string;
    tags: string[];
    user_id: string;
  }): Promise<{ success: boolean; template?: ResearchTemplate; error?: string; suggestions?: string[] }> {
    // Fast validation
    const validation = this.validateTemplateSync(templateData);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        suggestions: validation.suggestions,
      };
    }
    
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return await this.axiosInstance.post('/api/templates/create', {
          ...templateData,
          variables: this.extractVariablesOptimized(templateData.prompt_template),
        });
      });
      
      // Efficient cache invalidation
      this.invalidateUserCache(templateData.user_id);
      this.invalidateCategoryCache(templateData.category);
      
      return response.data;
    } catch (error) {
      console.error('✨ Template creation failed:', this.getErrorMessage(error));
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }
  
  async generateTemplateFromQuery(userId: string, query: string): Promise<{
    success: boolean;
    suggested_template?: any;
    confidence?: number;
    message?: string;
    reason?: string;
  }> {
    // Rate limiting check
    if (!this.rateLimiter.isAllowed(`generate:${userId}`)) {
      return {
        success: false,
        message: `Rate limit exceeded. ${this.rateLimiter.getRemainingRequests(`generate:${userId}`)} requests remaining.`,
      };
    }
    
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return await this.axiosInstance.post(
          '/api/templates/generate',
          { user_id: userId, query: query.trim() },
          { timeout: CONFIG.TIMEOUT.GENERATE }
        );
      });
      
      return response.data;
    } catch (error) {
      console.error('🤖 Template generation failed:', this.getErrorMessage(error));
      return {
        success: false,
        message: this.getErrorMessage(error),
      };
    }
  }
  
  async searchTemplates(query: string, category?: string): Promise<ResearchTemplate[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) return [];
    
    const cacheKey = this.getCacheKey('search', normalizedQuery, category);
    const cached = this.getFromCache<ResearchTemplate[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const templates = await this.circuitBreaker.execute(async () => {
        const params = new URLSearchParams({ q: normalizedQuery });
        if (category) params.append('category', category);
        
        const response = await this.axiosInstance.get(
          `/api/templates/search?${params}`,
          { timeout: CONFIG.TIMEOUT.SEARCH }
        );
        return response.data.templates || [];
      });
      
      this.setCache(cacheKey, templates, CONFIG.CACHE.TTL.SEARCH);
      return templates;
    } catch (error) {
      console.error(`🔍 Template search for '${query}' failed:`, this.getErrorMessage(error));
      return [];
    }
  }
  
  async getPopularTemplates(limit: number = 10): Promise<ResearchTemplate[]> {
    const safeLimit = Math.min(Math.max(1, limit), CONFIG.BATCH_SIZE);
    const cacheKey = this.getCacheKey('popular', safeLimit);
    const cached = this.getFromCache<ResearchTemplate[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const templates = await this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.get(`/api/templates/popular?limit=${safeLimit}`);
        return response.data.templates || [];
      });
      
      this.setCache(cacheKey, templates, CONFIG.CACHE.TTL.POPULAR);
      return templates;
    } catch (error) {
      console.error('🔥 Popular templates fetch failed:', this.getErrorMessage(error));
      return [];
    }
  }
  
  fillTemplate(template: string, variables: Record<string, string | number>): string {
    // Optimized template filling with pre-compiled regex
    const variableCache = new Map<string, RegExp>();
    let result = template;
    
    // Sort by length to prevent partial replacements
    const sortedVars = Object.entries(variables).sort(([a], [b]) => b.length - a.length);
    
    for (const [key, value] of sortedVars) {
      if (!variableCache.has(key)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        variableCache.set(key, new RegExp(`\\{\\{?\\s*${escapedKey}\\s*\\}?\\}`, 'gi'));
      }
      
      const regex = variableCache.get(key)!;
      result = result.replace(regex, String(value));
    }
    
    return result;
  }
  
  private validateTemplateSync(templateData: any): {
    valid: boolean;
    error?: string;
    suggestions?: string[];
  } {
    const suggestions: string[] = [];
    
    // Quick validation checks
    if (!templateData.name || templateData.name.trim().length < 3) {
      return { valid: false, error: 'Template name must be at least 3 characters long' };
    }
    
    if (!templateData.prompt_template || templateData.prompt_template.trim().length < 20) {
      return { valid: false, error: 'Template prompt must be at least 20 characters long' };
    }
    
    if (!templateData.description || templateData.description.trim().length < 10) {
      suggestions.push('Consider adding a more detailed description');
    }
    
    // Check for variables
    if (!templateData.prompt_template.includes('{')) {
      suggestions.push('Consider adding variables to make your template more flexible (e.g., {company_name})');
    }
    
    return { valid: true, suggestions: suggestions.length > 0 ? suggestions : undefined };
  }
  
  private extractVariablesOptimized(template: string): TemplateVariable[] {
    const variableMap = new Map<string, TemplateVariable>();
    const regex = /\{(\w+)(?::(\w+))?\}/g;
    
    let match;
    while ((match = regex.exec(template)) !== null) {
      const [, name, type] = match;
      if (!variableMap.has(name)) {
        variableMap.set(name, {
          name,
          description: `Variable: ${name}`,
          type: (type as 'text' | 'number' | 'select') || 'text',
          required: true,
        });
      }
    }
    
    return Array.from(variableMap.values());
  }
  
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.error) return error.response.data.error;
      if (error.response?.status === 404) return 'Template service not found';
      if (error.response?.status === 503) return 'Template service temporarily unavailable';
      if (error.code === 'ECONNREFUSED') return 'Cannot connect to template service';
      if (error.code === 'ETIMEDOUT') return 'Request timed out';
    }
    
    if (error instanceof TemplateServiceError) return error.message;
    
    return 'An unexpected error occurred';
  }
  
  private invalidateUserCache(userId: string): void {
    const userKeys = Array.from(this.cache.keys()).filter(key => key.includes(`user:${userId}`));
    userKeys.forEach(key => this.cache.delete(key));
  }
  
  private invalidateCategoryCache(category: string): void {
    const categoryKeys = Array.from(this.cache.keys()).filter(key => key.includes(`category:${category}`));
    categoryKeys.forEach(key => this.cache.delete(key));
  }
  
  private initializeDefaultCategories(): TemplateCategory[] {
    return [
      {
        id: 'financial',
        name: 'Financial Analysis',
        description: 'Templates for market analysis, investment research, and financial reporting',
        icon: 'TrendingUp',
        templates: [],
        template_count: 0,
      },
      {
        id: 'competitive',
        name: 'Competitive Intelligence',
        description: 'Templates for competitor analysis and market positioning',
        icon: 'Search',
        templates: [],
        template_count: 0,
      },
      {
        id: 'risk',
        name: 'Risk Assessment',
        description: 'Templates for risk analysis and opportunity evaluation',
        icon: 'AlertCircle',
        templates: [],
        template_count: 0,
      },
      {
        id: 'industry',
        name: 'Industry Research',
        description: 'Templates for sector analysis and industry insights',
        icon: 'Database',
        templates: [],
        template_count: 0,
      },
      {
        id: 'technology',
        name: 'Technology Analysis',
        description: 'Templates for tech trends, innovation, and digital transformation',
        icon: 'Sparkles',
        templates: [],
        template_count: 0,
      },
      {
        id: 'custom',
        name: 'Custom Templates',
        description: 'User-created personalized research templates',
        icon: 'Settings',
        templates: [],
        template_count: 0,
      },
    ];
  }
  
  // Performance monitoring
  getMetrics(): CacheMetrics & typeof this.metrics {
    return {
      ...this.metrics,
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses,
      hitRate: this.metrics.requests > 0 ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) : 0,
      size: this.cache.size,
      maxSize: CONFIG.CACHE.MAX_SIZE,
    };
  }
  
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }
  
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Template service cache cleared');
  }
  
  destroy(): void {
    this.cache.clear();
  }
}

// Singleton instance
const templateService = OptimizedTemplateService.getInstance();

// Optimized middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
  }
  next();
}

// API Route Handlers with enhanced error handling
export async function getTemplateCategories(req: Request, res: Response) {
  try {
    const categories = await templateService.getTemplateCategories();
    res.json({ 
      success: true, 
      categories,
      metrics: templateService.getMetrics(),
    });
  } catch (error) {
    console.error('❌ getTemplateCategories failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch template categories',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function getTemplatesByCategory(req: Request, res: Response) {
  try {
    const { category } = req.params;
    if (!category?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category parameter is required' 
      });
    }
    
    const templates = await templateService.getTemplatesByCategory(category.trim());
    res.json({ 
      success: true, 
      templates,
      count: templates.length,
      category: category.trim(),
    });
  } catch (error) {
    console.error('❌ getTemplatesByCategory failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch templates' 
    });
  }
}

export async function getUserTemplates(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const templates = await templateService.getUserTemplates(userId);
    res.json({ 
      success: true, 
      templates,
      count: templates.length,
      userId,
    });
  } catch (error) {
    console.error('❌ getUserTemplates failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user templates' 
    });
  }
}

export async function createTemplate(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { name, description, prompt_template, category, icon, tags } = req.body;
    
    // Input sanitization
    const sanitizedData = {
      name: name?.trim(),
      description: description?.trim(),
      prompt_template: prompt_template?.trim(),
      category: category?.trim() || 'custom',
      icon: icon?.trim() || 'FileText',
      tags: Array.isArray(tags) ? tags.filter(tag => tag?.trim()).map(tag => tag.trim()) : [],
      user_id: userId,
    };
    
    const result = await templateService.createTemplate(sanitizedData);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('❌ createTemplate failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create template' 
    });
  }
}

export async function generateTemplateFromQuery(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { query } = req.body;
    
    const trimmedQuery = query?.trim();
    if (!trimmedQuery || trimmedQuery.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query must be at least 10 characters long' 
      });
    }
    
    const result = await templateService.generateTemplateFromQuery(userId, trimmedQuery);
    res.json(result);
  } catch (error) {
    console.error('❌ generateTemplateFromQuery failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate template' 
    });
  }
}

export async function searchTemplates(req: Request, res: Response) {
  try {
    const { q, category } = req.query;
    const query = String(q || '').trim();
    
    if (!query || query.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query must be at least 2 characters long' 
      });
    }
    
    const templates = await templateService.searchTemplates(query, category as string);
    res.json({ 
      success: true, 
      templates,
      count: templates.length,
      query,
      category: category || null,
    });
  } catch (error) {
    console.error('❌ searchTemplates failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search templates' 
    });
  }
}

export async function getPopularTemplates(req: Request, res: Response) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const templates = await templateService.getPopularTemplates(limit);
    res.json({ 
      success: true, 
      templates,
      count: templates.length,
      limit,
    });
  } catch (error) {
    console.error('❌ getPopularTemplates failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch popular templates' 
    });
  }
}

export async function fillTemplate(req: Request, res: Response) {
  try {
    const { template, variables } = req.body;
    
    if (!template || typeof template !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Template string is required' 
      });
    }
    
    if (!variables || typeof variables !== 'object' || variables === null) {
      return res.status(400).json({ 
        success: false, 
        error: 'Variables object is required' 
      });
    }
    
    const filledTemplate = templateService.fillTemplate(template, variables);
    const unfilledVars = filledTemplate.match(/\{\{?\s*\w+\s*\}?\}/g) || [];
    
    res.json({ 
      success: true, 
      filled_template: filledTemplate,
      unfilled_count: unfilledVars.length,
      unfilled_variables: unfilledVars,
    });
  } catch (error) {
    console.error('❌ fillTemplate failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fill template' 
    });
  }
}

// Health check endpoint
export async function getTemplateServiceHealth(req: Request, res: Response) {
  try {
    const metrics = templateService.getMetrics();
    const circuitState = templateService.getCircuitBreakerState();
    
    res.json({
      success: true,
      status: 'healthy',
      metrics,
      circuit_breaker: circuitState,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
}

// Cache management endpoint
export async function clearTemplateCache(req: Request, res: Response) {
  try {
    templateService.clearCache();
    res.json({
      success: true,
      message: 'Template cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      timestamp: new Date().toISOString(),
    });
  }
}

// Export optimized service
export { templateService };

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Template service shutting down gracefully...');
  templateService.destroy();
});

process.on('SIGINT', () => {
  console.log('🛑 Template service shutting down gracefully...');
  templateService.destroy();
});
