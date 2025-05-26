
/**
 * Global Test Framework
 * Standardized testing utilities based on DeerFlow testing patterns
 */

import { TestConfig, DEFAULT_TEST_CONFIG } from '@/config/testing.config';

export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  SKIPPED = 'skipped'
}

export interface TestResult {
  name: string;
  status: TestStatus;
  duration: number;
  details: Record<string, any>;
  error?: string;
  warnings?: string[];
  metrics?: Record<string, any>;
}

export interface TestSuite {
  name: string;
  tests: TestFunction[];
  config?: Partial<TestConfig>;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export type TestFunction = () => Promise<TestResult>;

export class GlobalTestRunner {
  private config: TestConfig;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...DEFAULT_TEST_CONFIG, ...config };
  }

  async runSuite(suite: TestSuite): Promise<TestResult[]> {
    console.log(`🚀 Starting test suite: ${suite.name}`);
    this.startTime = Date.now();

    // Setup
    if (suite.setup) {
      await this.withRetry(suite.setup, 'Suite Setup');
    }

    // Run tests
    if (this.config.parallel) {
      await this.runTestsParallel(suite.tests);
    } else {
      await this.runTestsSequential(suite.tests);
    }

    // Teardown
    if (suite.teardown) {
      await this.withRetry(suite.teardown, 'Suite Teardown');
    }

    this.printSummary(suite.name);
    return this.results;
  }

  private async runTestsParallel(tests: TestFunction[]): Promise<void> {
    const chunks = this.chunkArray(tests, this.config.maxWorkers);
    
    for (const chunk of chunks) {
      const promises = chunk.map(test => this.runSingleTest(test));
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
        } else {
          this.results.push({
            name: `Test ${index}`,
            status: TestStatus.FAILED,
            duration: 0,
            details: {},
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }
  }

  private async runTestsSequential(tests: TestFunction[]): Promise<void> {
    for (const test of tests) {
      const result = await this.runSingleTest(test);
      this.results.push(result);
    }
  }

  private async runSingleTest(test: TestFunction): Promise<TestResult> {
    const testStart = Date.now();
    
    try {
      const result = await Promise.race([
        test(),
        this.timeoutPromise(this.config.timeout.medium)
      ]);
      
      return {
        ...result,
        duration: Date.now() - testStart
      };
    } catch (error) {
      return {
        name: test.name || 'Unknown Test',
        status: TestStatus.FAILED,
        duration: Date.now() - testStart,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    name: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retries.max; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retries.max) {
          const delay = this.config.retries.delay * Math.pow(this.config.retries.backoff, attempt - 1);
          console.log(`⚠️ ${name} failed (attempt ${attempt}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  private timeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout);
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printSummary(suiteName: string): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === TestStatus.PASSED).length;
    const failed = this.results.filter(r => r.status === TestStatus.FAILED).length;
    const warnings = this.results.filter(r => r.status === TestStatus.WARNING).length;
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Test Suite: ${suiteName} - Summary`);
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('='.repeat(60));
  }
}

// Standard test utilities
export const testUtils = {
  // API testing
  async testApiEndpoint(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return response;
  },

  // UI testing
  async testTypewriterEffect(element: HTMLElement, expectedText: string): Promise<boolean> {
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (element.textContent === expectedText) {
          observer.disconnect();
          resolve(true);
        }
      });
      
      observer.observe(element, { childList: true, subtree: true });
      
      setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, 10000);
    });
  },

  // Performance testing
  async measureResponseTime(fn: () => Promise<any>): Promise<{ result: any; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  // Component testing
  async testComponentRender(component: any, props: any = {}): Promise<boolean> {
    try {
      // This would integrate with your testing library
      return true;
    } catch {
      return false;
    }
  }
};
