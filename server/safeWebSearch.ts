// server/safeWebSearch.ts
// A safer wrapper for web search functionality

/**
 * Safe wrapper for web search to handle errors properly
 */
export async function safeWebSearch(query: string, maxResults: number = 5) {
  try {
    // Use the global performWebSearch function
    if (typeof (global as any).performWebSearch === 'function') {
      const results = await (global as any).performWebSearch(query, maxResults);
      return results;
    } else {
      console.error('performWebSearch function not available globally');
      return { 
        error: 'Web search functionality not available',
        results: [] 
      };
    }
  } catch (err) {
    console.error('Error in safeWebSearch:', err);
    return { 
      error: 'Failed to perform web search',
      results: [] 
    };
  }
}