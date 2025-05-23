
import axios from 'axios';
import { performDeerFlowSearch } from './deerflow-integration';

export async function performWebSearch(query: string, numResults = 10, maxDepth = 2, includeContent = true, source = 'brave') {
  try {
    if (source === 'deerflow') {
      return await performDeerFlowSearch(query, numResults);
    }
    
    // Fallback to Brave search
    const response = await axios.get(`https://api.search.brave.com/res/v1/web/search`, {
      headers: { 'X-Subscription-Token': process.env.BRAVE_API_KEY },
      params: { q: query, count: numResults }
    });

    return {
      results: response.data.web.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.description
      }))
    };
  } catch (error) {
    console.error('Web search error:', error);
    return { error: 'Search failed', results: [] };
  }
}
