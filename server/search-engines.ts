/**
 * Search engine integrations for Tavily and Brave Search APIs
 */

export async function performTavilySearch(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.log('Tavily API key not found, skipping Tavily search');
    return { error: 'API key not configured' };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: query,
        search_depth: 'basic',
        include_answer: true,
        include_images: false,
        include_raw_content: false,
        max_results: 5
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      results: data.results || [],
      answer: data.answer || null
    };
  } catch (error) {
    console.error('Error with Tavily search:', error);
    return { error: 'Failed to search with Tavily' };
  }
}

export async function performBraveSearch(query: string) {
  const apiKey = process.env.BRAVE_API_KEY;
  
  if (!apiKey) {
    console.log('Brave API key not found, skipping Brave search');
    return { error: 'API key not configured' };
  }

  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status}`);
    }

    const data = await response.json();
    
    const results = data.web?.results?.map((result: any) => ({
      title: result.title,
      url: result.url,
      content: result.description,
      publishedDate: result.age || null
    })) || [];

    return { results };
  } catch (error) {
    console.error('Error with Brave search:', error);
    return { error: 'Failed to search with Brave' };
  }
}