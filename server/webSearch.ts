
import axios from 'axios';
import { performRobustSearch } from './robustWebSearch';
import { SafeSearchProvider } from './safeWebSearch';

export async function performWebSearch(query: string, options = {}) {
  try {
    // First attempt robust search
    const robustResults = await performRobustSearch(query);
    if (robustResults && robustResults.length > 0) {
      return robustResults;
    }

    // Fallback to safe search
    const safeSearch = new SafeSearchProvider();
    return await safeSearch.search(query);
  } catch (error) {
    console.error('Web search error:', error);
    throw error;
  }
}
