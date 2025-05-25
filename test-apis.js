
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
