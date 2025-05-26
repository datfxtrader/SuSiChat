
export async function checkLLMHealth() {
  const healthStatus = {
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    bedrock: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    overall: false
  };

  healthStatus.overall = Object.values(healthStatus).some(status => status === true);

  return {
    status: healthStatus.overall ? 'healthy' : 'degraded',
    providers: healthStatus,
    timestamp: new Date().toISOString(),
    message: healthStatus.overall ? 'At least one LLM provider is configured' : 'No LLM providers are properly configured'
  };
}

// Test endpoint for LLM connectivity
export async function testLLMConnectivity() {
  const results = {
    deepseek: { available: false, error: null },
    gemini: { available: false, error: null },
    openrouter: { available: false, error: null },
    bedrock: { available: false, error: null }
  };

  // Test DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` }
      });
      results.deepseek.available = response.ok;
    } catch (error) {
      results.deepseek.error = error.message;
    }
  }

  // Test Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
      results.gemini.available = response.ok;
    } catch (error) {
      results.gemini.error = error.message;
    }
  }

  // Test OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
      });
      results.openrouter.available = response.ok;
    } catch (error) {
      results.openrouter.error = error.message;
    }
  }

  // Test Bedrock (basic credential check)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    results.bedrock.available = true; // Basic check - would need AWS SDK for full test
  }

  return results;
}
