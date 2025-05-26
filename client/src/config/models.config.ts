
export const ModelConfig = {
  // ============================================
  // MODEL DEFINITIONS
  // ============================================
  models: {
    auto: {
      id: 'auto',
      name: 'Auto',
      displayName: 'Auto Select',
      description: 'Automatically selects the best model for the task',
      provider: 'system',
      isDefault: true,
      capabilities: {
        chat: true,
        research: true,
        homework: true,
        vietnamese: true,
        family: true,
        reasoning: true,
        codeGeneration: true,
        longContext: true,
        realtime: true
      },
      limits: {
        maxTokens: 'unlimited',
        contextWindow: 'adaptive',
        rateLimitPerMinute: 100
      },
      routing: {
        depth1: 'deepseek-chat',
        depth2: 'deepseek-chat', 
        depth3: 'gemini-1.5-flash',
        vietnamese: 'gemini-1.5-flash',
        homework: 'deepseek-chat',
        family: 'gemini-1.5-flash',
        fallback: 'deepseek-chat'
      },
      metadata: {
        color: 'from-purple-600 to-indigo-600',
        icon: 'Sparkles',
        tier: 'premium'
      }
    },
    'deepseek-chat': {
      id: 'deepseek-chat',
      name: 'DeepSeek',
      displayName: 'DeepSeek Chat',
      description: 'Fast and efficient reasoning model',
      provider: 'deepseek',
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      capabilities: {
        chat: true,
        research: true,
        homework: true,
        vietnamese: false,
        family: true,
        reasoning: true,
        codeGeneration: true,
        longContext: false,
        realtime: true
      },
      limits: {
        maxTokens: 2000,
        contextWindow: 32768,
        rateLimitPerMinute: 60
      },
      pricing: {
        inputTokens: 0.00014,
        outputTokens: 0.00028,
        currency: 'USD',
        per1k: true
      },
      metadata: {
        color: 'from-blue-600 to-blue-700',
        icon: 'Zap',
        tier: 'standard'
      }
    },
    'gemini-1.5-flash': {
      id: 'gemini-1.5-flash',
      name: 'Gemini',
      displayName: 'Gemini 1.5 Flash',
      description: 'Google\'s latest model with unlimited context',
      provider: 'google',
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      capabilities: {
        chat: true,
        research: true,
        homework: true,
        vietnamese: true,
        family: true,
        reasoning: true,
        codeGeneration: true,
        longContext: true,
        realtime: true
      },
      limits: {
        maxTokens: 8192,
        contextWindow: 1000000,
        rateLimitPerMinute: 100
      },
      pricing: {
        inputTokens: 0.000075,
        outputTokens: 0.0003,
        currency: 'USD',
        per1k: true
      },
      metadata: {
        color: 'from-green-600 to-emerald-600',
        icon: 'Brain',
        tier: 'premium'
      }
    },
    'openrouter/openai/gpt-4o-mini': {
      id: 'openrouter/openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      displayName: 'GPT-4o Mini',
      description: 'OpenAI\'s efficient mini model via OpenRouter',
      provider: 'openrouter',
      apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
      capabilities: {
        chat: true,
        research: true,
        homework: true,
        vietnamese: false,
        family: true,
        reasoning: true,
        codeGeneration: true,
        longContext: false,
        realtime: true
      },
      limits: {
        maxTokens: 2000,
        contextWindow: 128000,
        rateLimitPerMinute: 50
      },
      pricing: {
        inputTokens: 0.00015,
        outputTokens: 0.0006,
        currency: 'USD',
        per1k: true
      },
      metadata: {
        color: 'from-orange-600 to-red-600',
        icon: 'MessageCircle',
        tier: 'standard'
      }
    },
    'openrouter/deepseek/deepseek-r1-distill-llama-70b': {
      id: 'openrouter/deepseek/deepseek-r1-distill-llama-70b',
      name: 'DeepSeek R1',
      displayName: 'DeepSeek R1 Distill',
      description: 'DeepSeek R1 reasoning model via OpenRouter',
      provider: 'openrouter',
      apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
      capabilities: {
        chat: true,
        research: true,
        homework: true,
        vietnamese: false,
        family: true,
        reasoning: true,
        codeGeneration: true,
        longContext: true,
        realtime: false
      },
      limits: {
        maxTokens: 4000,
        contextWindow: 65536,
        rateLimitPerMinute: 30
      },
      pricing: {
        inputTokens: 0.0002,
        outputTokens: 0.0008,
        currency: 'USD',
        per1k: true
      },
      metadata: {
        color: 'from-purple-600 to-pink-600',
        icon: 'Brain',
        tier: 'premium'
      }
    },
    'bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0': {
      id: 'bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0',
      name: 'Claude 3.7',
      displayName: 'Claude 3.7 Sonnet',
      description: 'Anthropic\'s latest Claude model via AWS Bedrock',
      provider: 'bedrock',
      apiEndpoint: 'bedrock',
      capabilities: {
        chat: true,
        research: true,
        homework: true,
        vietnamese: true,
        family: true,
        reasoning: true,
        codeGeneration: true,
        longContext: true,
        realtime: false
      },
      limits: {
        maxTokens: 4096,
        contextWindow: 200000,
        rateLimitPerMinute: 40
      },
      pricing: {
        inputTokens: 0.003,
        outputTokens: 0.015,
        currency: 'USD',
        per1k: true
      },
      metadata: {
        color: 'from-amber-600 to-orange-600',
        icon: 'Sparkles',
        tier: 'premium'
      }
    }
  },

  // ============================================
  // MODEL CATEGORIES
  // ============================================
  categories: {
    general: {
      name: 'General Chat',
      models: ['auto', 'deepseek-chat', 'gemini-1.5-flash', 'openrouter/openai/gpt-4o-mini'],
      description: 'Best for everyday conversations and general assistance'
    },
    research: {
      name: 'Research & Analysis',
      models: ['auto', 'gemini-1.5-flash', 'bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0', 'deepseek-chat'],
      description: 'Optimized for deep research and comprehensive analysis'
    },
    homework: {
      name: 'Educational Support', 
      models: ['auto', 'deepseek-chat', 'gemini-1.5-flash', 'openrouter/openai/gpt-4o-mini'],
      description: 'Specialized for learning and homework assistance'
    },
    vietnamese: {
      name: 'Vietnamese Language',
      models: ['auto', 'gemini-1.5-flash', 'bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0'],
      description: 'Best Vietnamese language understanding and generation'
    },
    family: {
      name: 'Family Chat',
      models: ['auto', 'gemini-1.5-flash', 'deepseek-chat', 'openrouter/openai/gpt-4o-mini'],
      description: 'Family-friendly conversations and activities'
    },
    reasoning: {
      name: 'Advanced Reasoning',
      models: ['auto', 'openrouter/deepseek/deepseek-r1-distill-llama-70b', 'bedrock/anthropic.claude-3-7-sonnet-20250219-v1:0', 'gemini-1.5-flash'],
      description: 'Complex problem solving and logical reasoning'
    }
  },

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  getModel: (modelId: string) => {
    return ModelConfig.models[modelId as keyof typeof ModelConfig.models] || ModelConfig.models.auto;
  },

  getModelsForCategory: (category: string) => {
    const categoryConfig = ModelConfig.categories[category as keyof typeof ModelConfig.categories];
    if (!categoryConfig) return Object.values(ModelConfig.models);
    
    return categoryConfig.models.map(modelId => ModelConfig.getModel(modelId));
  },

  getDefaultModel: (context?: string) => {
    if (context && ModelConfig.categories[context as keyof typeof ModelConfig.categories]) {
      const categoryModels = ModelConfig.getModelsForCategory(context);
      return categoryModels[0] || ModelConfig.models.auto;
    }
    return ModelConfig.models.auto;
  },

  getModelsByCapability: (capability: string) => {
    return Object.values(ModelConfig.models).filter(model => 
      model.capabilities[capability as keyof typeof model.capabilities]
    );
  },

  getModelsByProvider: (provider: string) => {
    return Object.values(ModelConfig.models).filter(model => model.provider === provider);
  },

  getRoutedModel: (baseModel: string, context: { depth?: number; type?: string }) => {
    const model = ModelConfig.getModel(baseModel);
    
    if (model.id === 'auto' && model.routing) {
      if (context.depth === 3) return ModelConfig.getModel(model.routing.depth3);
      if (context.depth === 2) return ModelConfig.getModel(model.routing.depth2);
      if (context.depth === 1) return ModelConfig.getModel(model.routing.depth1);
      if (context.type && model.routing[context.type as keyof typeof model.routing]) {
        return ModelConfig.getModel(model.routing[context.type as keyof typeof model.routing] as string);
      }
      return ModelConfig.getModel(model.routing.fallback);
    }
    
    return model;
  },

  formatModelForUI: (modelId: string) => {
    const model = ModelConfig.getModel(modelId);
    return {
      id: model.id,
      name: model.displayName,
      description: model.description,
      color: model.metadata.color,
      icon: model.metadata.icon,
      tier: model.metadata.tier,
      capabilities: Object.entries(model.capabilities)
        .filter(([_, enabled]) => enabled)
        .map(([capability, _]) => capability),
      limits: model.limits,
      pricing: model.pricing
    };
  },

  validateModelForContext: (modelId: string, context: string): boolean => {
    const model = ModelConfig.getModel(modelId);
    const capability = context as keyof typeof model.capabilities;
    return model.capabilities[capability] !== false;
  },

  getAllModels: () => Object.values(ModelConfig.models),
  getAllCategories: () => Object.values(ModelConfig.categories)
} as const;

export type ModelId = keyof typeof ModelConfig.models;
export type ModelCategory = keyof typeof ModelConfig.categories;
export type ModelCapability = keyof typeof ModelConfig.models.auto.capabilities;

export default ModelConfig;
