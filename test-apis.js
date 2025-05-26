const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;

async function testNewsDataAPI() {
  console.log('🔍 Testing NewsData API...');

  if (!NEWSDATA_API_KEY) {
    console.log('❌ NEWSDATA_API_KEY not found in environment variables');
    return false;
  }

  try {
    const response = await axios.get('https://newsdata.io/api/1/news', {
      params: {
        apikey: NEWSDATA_API_KEY,
        q: 'test',
        language: 'en',
        size: 5
      },
      timeout: 15000
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      console.log('✅ NewsData API working!');
      console.log(`   - Found ${response.data.results.length} results`);
      console.log(`   - Sample title: "${response.data.results[0].title}"`);
      console.log(`   - Total available: ${response.data.totalResults || 'unknown'}`);
      return true;
    } else {
      console.log('⚠️ NewsData API responded but no results found');
      return false;
    }
  } catch (error) {
    console.log('❌ NewsData API Error:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.log('   Error details:', error.response.data);
    }
    return false;
  }
}

async function testSERPAPI() {
  console.log('\n🔍 Testing SERP API...');

  if (!SERP_API_KEY) {
    console.log('❌ SERP_API_KEY not found in environment variables');
    return false;
  }

  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        api_key: SERP_API_KEY,
        q: 'test query',
        engine: 'google',
        num: 5
      },
      timeout: 15000
    });

    if (response.data && response.data.organic_results && response.data.organic_results.length > 0) {
      console.log('✅ SERP API working!');
      console.log(`   - Found ${response.data.organic_results.length} results`);
      console.log(`   - Sample title: "${response.data.organic_results[0].title}"`);
      console.log(`   - Search info: ${response.data.search_information?.total_results || 'unknown'} total results`);
      return true;
    } else {
      console.log('⚠️ SERP API responded but no organic results found');
      console.log('   Response keys:', Object.keys(response.data));
      return false;
    }
  } catch (error) {
    console.log('❌ SERP API Error:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.log('   Error details:', error.response.data);
    }
    return false;
  }
}

async function testWebSearchIntegration() {
  console.log('\n🔍 Testing integrated web search function...');

  try {
    const { performWebSearch } = require('./server/performWebSearch.ts');
    const result = await performWebSearch('latest technology news', 5);

    if (result && result.results && result.results.length > 0) {
      console.log('✅ Integrated web search working!');
      console.log(`   - Total results: ${result.results.length}`);
      console.log(`   - Sources used: ${result.results.map(r => r.source).join(', ')}`);

      const newsDataResults = result.results.filter(r => r.source === 'NewsData');
      const serpResults = result.results.filter(r => r.source === 'SERP');

      console.log(`   - NewsData results: ${newsDataResults.length}`);
      console.log(`   - SERP results: ${serpResults.length}`);
      return true;
    } else {
      console.log('⚠️ Integrated web search returned no results');
      return false;
    }
  } catch (error) {
    console.log('❌ Integrated web search error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 API Testing Suite Starting...\n');

  const newsDataWorking = await testNewsDataAPI();
  const serpWorking = await testSERPAPI();
  const integrationWorking = await testWebSearchIntegration();

  console.log('\n📊 Test Results Summary:');
  console.log(`   NewsData API: ${newsDataWorking ? '✅ Working' : '❌ Not Working'}`);
  console.log(`   SERP API: ${serpWorking ? '✅ Working' : '❌ Not Working'}`);
  console.log(`   Integration: ${integrationWorking ? '✅ Working' : '❌ Not Working'}`);

  if (newsDataWorking && serpWorking) {
    console.log('\n🎉 Both APIs are functioning correctly!');
  } else {
    console.log('\n⚠️ Some APIs need attention. Check your API keys and network connection.');
  }
}

runAllTests().catch(console.error);
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const CONFIG = {
  newsData: {
    url: 'https://newsdata.io/api/1/news',
    key: process.env.NEWSDATA_API_KEY,
    timeout: 10000,
    retries: 2
  },
  serp: {
    url: 'https://serpapi.com/search',
    key: process.env.SERP_API_KEY,
    timeout: 10000,
    retries: 2
  }
};

// Utility function for retrying requests
async function retryRequest(fn, retries = 2, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Create axios instance with default config
const api = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'API-Test-Suite/1.0'
  }
});

// API test functions
class APITester {
  constructor() {
    this.results = {
      newsData: { status: false, details: {} },
      serp: { status: false, details: {} },
      integration: { status: false, details: {} }
    };
  }

  async testNewsDataAPI() {
    console.log('🔍 Testing NewsData API...');

    if (!CONFIG.newsData.key) {
      this.results.newsData.details = { error: 'API key not found' };
      console.log('❌ NEWSDATA_API_KEY not found');
      return false;
    }

    try {
      const response = await retryRequest(() => 
        api.get(CONFIG.newsData.url, {
          params: {
            apikey: CONFIG.newsData.key,
            q: 'test',
            language: 'en',
            size: 5
          },
          timeout: CONFIG.newsData.timeout
        })
      , CONFIG.newsData.retries);

      const { data } = response;
      const hasResults = data?.results?.length > 0;

      if (hasResults) {
        this.results.newsData = {
          status: true,
          details: {
            resultCount: data.results.length,
            sampleTitle: data.results[0].title,
            totalAvailable: data.totalResults || 'unknown',
            responseTime: response.headers['x-response-time'] || 'N/A'
          }
        };
        console.log('✅ NewsData API working!');
        console.log(`   - ${data.results.length} results found`);
      } else {
        this.results.newsData.details = { warning: 'No results found' };
        console.log('⚠️ NewsData API responded but no results');
      }

      return hasResults;
    } catch (error) {
      this.results.newsData.details = this.extractErrorDetails(error);
      console.log('❌ NewsData API Error:', this.results.newsData.details.message);
      return false;
    }
  }

  async testSERPAPI() {
    console.log('\n🔍 Testing SERP API...');

    if (!CONFIG.serp.key) {
      this.results.serp.details = { error: 'API key not found' };
      console.log('❌ SERP_API_KEY not found');
      return false;
    }

    try {
      const response = await retryRequest(() =>
        api.get(CONFIG.serp.url, {
          params: {
            api_key: CONFIG.serp.key,
            q: 'test query',
            engine: 'google',
            num: 5
          },
          timeout: CONFIG.serp.timeout
        })
      , CONFIG.serp.retries);

      const { data } = response;
      const hasResults = data?.organic_results?.length > 0;

      if (hasResults) {
        this.results.serp = {
          status: true,
          details: {
            resultCount: data.organic_results.length,
            sampleTitle: data.organic_results[0].title,
            totalResults: data.search_information?.total_results || 'unknown',
            responseTime: response.headers['x-response-time'] || 'N/A'
          }
        };
        console.log('✅ SERP API working!');
        console.log(`   - ${data.organic_results.length} results found`);
      } else {
        this.results.serp.details = { 
          warning: 'No organic results found',
          availableKeys: Object.keys(data)
        };
        console.log('⚠️ SERP API responded but no organic results');
      }

      return hasResults;
    } catch (error) {
      this.results.serp.details = this.extractErrorDetails(error);
      console.log('❌ SERP API Error:', this.results.serp.details.message);
      return false;
    }
  }

  async testWebSearchIntegration() {
    console.log('\n🔍 Testing integrated web search...');

    try {
      // Dynamic import with error handling
      let performWebSearch;
      try {
        ({ performWebSearch } = require('./server/performWebSearch.ts'));
      } catch (requireError) {
        console.log('❌ Could not load performWebSearch module');
        this.results.integration.details = { error: 'Module not found' };
        return false;
      }

      const result = await performWebSearch('latest technology news', 5);
      const hasResults = result?.results?.length > 0;

      if (hasResults) {
        const sources = result.results.reduce((acc, r) => {
          acc[r.source] = (acc[r.source] || 0) + 1;
          return acc;
        }, {});

        this.results.integration = {
          status: true,
          details: {
            totalResults: result.results.length,
            sourceBreakdown: sources,
            uniqueSources: Object.keys(sources).length
          }
        };

        console.log('✅ Integrated web search working!');
        console.log(`   - Total: ${result.results.length} results`);
        console.log(`   - Sources:`, sources);
      } else {
        this.results.integration.details = { warning: 'No results returned' };
        console.log('⚠️ Integrated web search returned no results');
      }

      return hasResults;
    } catch (error) {
      this.results.integration.details = this.extractErrorDetails(error);
      console.log('❌ Integration error:', this.results.integration.details.message);
      return false;
    }
  }

  extractErrorDetails(error) {
    return {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code
    };
  }

  async runAllTests() {
    console.log('🚀 API Testing Suite v2.0\n');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    // Run tests in parallel for better performance
    const [newsData, serp] = await Promise.allSettled([
      this.testNewsDataAPI(),
      this.testSERPAPI()
    ]);

    // Run integration test after individual tests
    const integration = await this.testWebSearchIntegration();

    this.generateReport();

    return {
      success: this.results.newsData.status && this.results.serp.status,
      results: this.results
    };
  }

  generateReport() {
    console.log('\n📊 Test Results Summary:');
    console.log('─'.repeat(50));

    Object.entries(this.results).forEach(([name, result]) => {
      const icon = result.status ? '✅' : '❌';
      const status = result.status ? 'Working' : 'Failed';
      console.log(`${icon} ${name.padEnd(15)} ${status}`);

      if (result.details && Object.keys(result.details).length > 0) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   ')}`);
      }
    });

    console.log('─'.repeat(50));

    const allWorking = Object.values(this.results).every(r => r.status);
    if (allWorking) {
      console.log('\n🎉 All systems operational!');
    } else {
      console.log('\n⚠️ Some services need attention.');
      console.log('💡 Troubleshooting tips:');
      console.log('   - Verify API keys in .env file');
      console.log('   - Check network connectivity');
      console.log('   - Ensure API quotas are not exceeded');
      console.log('   - Review API documentation for changes');
    }
  }
}

// Export for use in other modules
module.exports = { APITester, CONFIG };

// Run tests if called directly
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
const BACKEND_URL = process.env.BACKEND_URL || 'http://0.0.0.0:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://0.0.0.0:5173';
const DEERFLOW_URL = process.env.DEERFLOW_URL || 'http://0.0.0.0:9000';