
/**
 * Global Testing Configuration
 * Based on DeerFlow testing standards for consistent testing across all features
 */

export interface TestConfig {
  // Test execution settings
  parallel: boolean;
  maxWorkers: number;
  timeout: {
    short: number;
    medium: number;
    long: number;
  };
  
  // Retry configuration
  retries: {
    max: number;
    delay: number;
    backoff: number;
  };
  
  // Performance thresholds
  performance: {
    responseTime: number;
    successRate: number;
    throughput: number;
  };
  
  // UI testing
  ui: {
    typewriterSpeed: number;
    animationDelay: number;
    interactionTimeout: number;
  };
  
  // API testing
  api: {
    endpoints: string[];
    methods: string[];
    expectedStatus: number[];
  };
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  parallel: true,
  maxWorkers: 4,
  timeout: {
    short: 5000,
    medium: 15000,
    long: 30000
  },
  retries: {
    max: 3,
    delay: 1000,
    backoff: 2
  },
  performance: {
    responseTime: 2000, // 2 seconds
    successRate: 0.8,   // 80%
    throughput: 10      // requests per second
  },
  ui: {
    typewriterSpeed: 30,
    animationDelay: 300,
    interactionTimeout: 5000
  },
  api: {
    endpoints: ['/health', '/capabilities', '/metrics'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    expectedStatus: [200, 201, 202, 204]
  }
};

export const SUSI_TEST_CONFIG: TestConfig = {
  ...DEFAULT_TEST_CONFIG,
  ui: {
    ...DEFAULT_TEST_CONFIG.ui,
    typewriterSpeed: 25, // Slightly faster for chat
    animationDelay: 200
  },
  api: {
    ...DEFAULT_TEST_CONFIG.api,
    endpoints: [
      '/health',
      '/chat/message',
      '/chat/history',
      '/susi/capabilities',
      '/susi/personality'
    ]
  }
};
