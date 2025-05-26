
import { llmService } from './llm';

export interface ModelCapability {
  reasoning: number;
  analysis: number;
  factual: number;
  creative: number;
  speed: number;
  cost: number;
}

export interface EnsembleModel {
  id: string;
  name: string;
  capabilities: ModelCapability;
  contextLimit: number;
  available: boolean;
}

export interface EnsembleResponse {
  primaryResponse: string;
  modelResponses: ModelResponse[];
  consensusScore: number;
  conflictingClaims: string[];
  synthesizedFacts: any[];
  confidence: number;
}

export interface ModelResponse {
  modelId: string;
  response: string;
  confidence: number;
  keyPoints: string[];
  facts: any[];
  executionTime: number;
}

export class EnsembleLLMProcessor {
  private models: Map<string, EnsembleModel> = new Map();
  private maxConcurrentModels = 3;

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    this.models.set('deepseek-v3', {
      id: 'deepseek-v3',
      name: 'DeepSeek V3',
      capabilities: {
        reasoning: 0.95,
        analysis: 0.9,
        factual: 0.85,
        creative: 0.8,
        speed: 0.8,
        cost: 0.9
      },
      contextLimit: 64000,
      available: true
    });

    this.models.set('gemini-1.5-flash', {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      capabilities: {
        reasoning: 0.85,
        analysis: 0.88,
        factual: 0.9,
        creative: 0.85,
        speed: 0.95,
        cost: 0.95
      },
      contextLimit: 32000,
      available: true
    });

    this.models.set('claude-3-haiku', {
      id: 'claude-3-haiku',
      name: 'Claude 3 Haiku',
      capabilities: {
        reasoning: 0.88,
        analysis: 0.92,
        factual: 0.9,
        creative: 0.9,
        speed: 0.9,
        cost: 0.8
      },
      contextLimit: 200000,
      available: process.env.ANTHROPIC_API_KEY ? true : false
    });

    this.models.set('gpt-4o-mini', {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      capabilities: {
        reasoning: 0.9,
        analysis: 0.88,
        factual: 0.85,
        creative: 0.85,
        speed: 0.85,
        cost: 0.7
      },
      contextLimit: 128000,
      available: process.env.OPENAI_API_KEY ? true : false
    });
  }

  async processEnsembleResearch(
    query: string,
    context: string,
    taskType: 'factual' | 'analytical' | 'comparative' | 'creative' = 'factual',
    options: {
      maxModels?: number;
      requireConsensus?: boolean;
      prioritizeSpeed?: boolean;
      prioritizeQuality?: boolean;
    } = {}
  ): Promise<EnsembleResponse> {
    
    // Select optimal models for the task
    const selectedModels = this.selectModelsForTask(taskType, options);
    
    // Generate responses in parallel
    const modelResponses = await this.generateParallelResponses(
      selectedModels,
      query,
      context,
      taskType
    );
    
    // Analyze consensus and conflicts
    const consensusAnalysis = await this.analyzeConsensus(modelResponses);
    
    // Synthesize final response
    const synthesizedResponse = await this.synthesizeResponses(
      modelResponses,
      query,
      consensusAnalysis
    );
    
    // Extract and validate facts
    const synthesizedFacts = await this.extractAndValidateFacts(modelResponses);
    
    return {
      primaryResponse: synthesizedResponse,
      modelResponses,
      consensusScore: consensusAnalysis.score,
      conflictingClaims: consensusAnalysis.conflicts,
      synthesizedFacts,
      confidence: this.calculateOverallConfidence(modelResponses, consensusAnalysis)
    };
  }

  private selectModelsForTask(
    taskType: string,
    options: any
  ): EnsembleModel[] {
    
    const availableModels = Array.from(this.models.values()).filter(m => m.available);
    const maxModels = Math.min(options.maxModels || 3, this.maxConcurrentModels);
    
    // Score models based on task requirements
    const scoredModels = availableModels.map(model => {
      let score = 0;
      
      switch (taskType) {
        case 'factual':
          score = model.capabilities.factual * 0.6 + model.capabilities.reasoning * 0.4;
          break;
        case 'analytical':
          score = model.capabilities.analysis * 0.5 + model.capabilities.reasoning * 0.5;
          break;
        case 'comparative':
          score = model.capabilities.reasoning * 0.4 + model.capabilities.analysis * 0.4 + model.capabilities.factual * 0.2;
          break;
        case 'creative':
          score = model.capabilities.creative * 0.6 + model.capabilities.reasoning * 0.4;
          break;
      }
      
      // Apply option modifiers
      if (options.prioritizeSpeed) {
        score = score * 0.7 + model.capabilities.speed * 0.3;
      }
      
      if (options.prioritizeQuality) {
        score = score * 0.9 + model.capabilities.reasoning * 0.1;
      }
      
      return { model, score };
    });
    
    // Sort by score and select top models
    scoredModels.sort((a, b) => b.score - a.score);
    return scoredModels.slice(0, maxModels).map(sm => sm.model);
  }

  private async generateParallelResponses(
    models: EnsembleModel[],
    query: string,
    context: string,
    taskType: string
  ): Promise<ModelResponse[]> {
    
    const responsePromises = models.map(model => 
      this.generateModelResponse(model, query, context, taskType)
    );
    
    const responses = await Promise.allSettled(responsePromises);
    
    return responses
      .filter((result): result is PromiseFulfilledResult<ModelResponse> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  private async generateModelResponse(
    model: EnsembleModel,
    query: string,
    context: string,
    taskType: string
  ): Promise<ModelResponse> {
    
    const startTime = Date.now();
    
    try {
      // Create specialized prompt for the model
      const prompt = this.createSpecializedPrompt(model, query, context, taskType);
      
      // Generate response
      const response = await llmService.generateResponse(
        [{ role: 'user', content: prompt }],
        0.3, // Lower temperature for consistency
        undefined,
        model.id
      );
      
      // Extract key points
      const keyPoints = await this.extractKeyPoints(response.message, model.id);
      
      // Extract facts
      const facts = await this.extractFacts(response.message, model.id);
      
      return {
        modelId: model.id,
        response: response.message,
        confidence: this.estimateResponseConfidence(response.message, model),
        keyPoints,
        facts,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error(`Model ${model.id} failed:`, error);
      
      return {
        modelId: model.id,
        response: `Error: ${error}`,
        confidence: 0,
        keyPoints: [],
        facts: [],
        executionTime: Date.now() - startTime
      };
    }
  }

  private createSpecializedPrompt(
    model: EnsembleModel,
    query: string,
    context: string,
    taskType: string
  ): string {
    
    let basePrompt = `Research Query: ${query}\n\nContext:\n${context}\n\n`;
    
    // Customize prompt based on model strengths
    if (model.capabilities.reasoning > 0.9) {
      basePrompt += `Use your strong reasoning capabilities to provide a logical, step-by-step analysis. `;
    }
    
    if (model.capabilities.factual > 0.9) {
      basePrompt += `Focus on factual accuracy and cite specific information from the context. `;
    }
    
    // Add task-specific instructions
    switch (taskType) {
      case 'factual':
        basePrompt += `Provide a factual, evidence-based response with specific data and citations.`;
        break;
      case 'analytical':
        basePrompt += `Provide a deep analytical response examining causes, effects, and implications.`;
        break;
      case 'comparative':
        basePrompt += `Compare and contrast different aspects, highlighting similarities and differences.`;
        break;
      case 'creative':
        basePrompt += `Provide an insightful and well-reasoned response with original analysis.`;
        break;
    }
    
    return basePrompt;
  }

  private async extractKeyPoints(response: string, modelId: string): Promise<string[]> {
    try {
      const extractionPrompt = `Extract the 3-5 most important key points from this response:

"${response}"

Return as a JSON array of strings.`;

      const extraction = await llmService.generateResponse(
        [{ role: 'user', content: extractionPrompt }],
        0.1,
        undefined,
        'gemini-1.5-flash' // Use fast model for extraction
      );

      return JSON.parse(extraction.message);
    } catch {
      // Fallback: extract first sentences
      return response.split(/[.!?]+/).slice(0, 3).map(s => s.trim()).filter(s => s.length > 10);
    }
  }

  private async extractFacts(response: string, modelId: string): Promise<any[]> {
    try {
      const factPrompt = `Extract specific facts and data points from this response:

"${response}"

Return as JSON array with format: [{"fact": "statement", "confidence": 0.0-1.0}]`;

      const extraction = await llmService.generateResponse(
        [{ role: 'user', content: factPrompt }],
        0.1,
        undefined,
        'gemini-1.5-flash'
      );

      return JSON.parse(extraction.message);
    } catch {
      return [];
    }
  }

  private estimateResponseConfidence(response: string, model: EnsembleModel): number {
    // Basic confidence estimation
    let confidence = 0.5;
    
    // Check for uncertainty indicators
    const uncertaintyWords = ['maybe', 'possibly', 'might', 'could be', 'uncertain'];
    const uncertaintyCount = uncertaintyWords.filter(word => 
      response.toLowerCase().includes(word)
    ).length;
    
    confidence -= uncertaintyCount * 0.1;
    
    // Check for confidence indicators
    const confidenceWords = ['definitely', 'certainly', 'clearly', 'proven', 'confirmed'];
    const confidenceCount = confidenceWords.filter(word => 
      response.toLowerCase().includes(word)
    ).length;
    
    confidence += confidenceCount * 0.1;
    
    // Factor in model capabilities
    confidence += model.capabilities.factual * 0.2;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private async analyzeConsensus(responses: ModelResponse[]): Promise<{
    score: number;
    conflicts: string[];
    agreements: string[];
  }> {
    
    if (responses.length < 2) {
      return { score: 0.5, conflicts: [], agreements: [] };
    }
    
    // Extract all key points
    const allKeyPoints = responses.flatMap(r => r.keyPoints);
    
    // Find agreements (similar key points across models)
    const agreements: string[] = [];
    const conflicts: string[] = [];
    
    for (let i = 0; i < allKeyPoints.length; i++) {
      for (let j = i + 1; j < allKeyPoints.length; j++) {
        const similarity = await this.calculateSimilarity(allKeyPoints[i], allKeyPoints[j]);
        
        if (similarity > 0.8) {
          agreements.push(allKeyPoints[i]);
        } else if (similarity < 0.3) {
          // Check if they're contradictory
          const contradiction = await this.checkContradiction(allKeyPoints[i], allKeyPoints[j]);
          if (contradiction) {
            conflicts.push(`"${allKeyPoints[i]}" vs "${allKeyPoints[j]}"`);
          }
        }
      }
    }
    
    // Calculate consensus score
    const agreementRate = agreements.length / (agreements.length + conflicts.length + 1);
    const responseConsistency = this.calculateResponseConsistency(responses);
    
    const score = (agreementRate * 0.6 + responseConsistency * 0.4);
    
    return {
      score,
      conflicts: [...new Set(conflicts)],
      agreements: [...new Set(agreements)]
    };
  }

  private async calculateSimilarity(text1: string, text2: string): Promise<number> {
    // Simple semantic similarity
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private async checkContradiction(text1: string, text2: string): Promise<boolean> {
    const contradictionPrompt = `Do these two statements contradict each other?

Statement 1: "${text1}"
Statement 2: "${text2}"

Respond with only "yes" or "no".`;

    try {
      const response = await llmService.generateResponse(
        [{ role: 'user', content: contradictionPrompt }],
        0.1,
        undefined,
        'gemini-1.5-flash'
      );

      return response.message.toLowerCase().trim() === 'yes';
    } catch {
      return false;
    }
  }

  private calculateResponseConsistency(responses: ModelResponse[]): number {
    if (responses.length < 2) return 1.0;
    
    const confidences = responses.map(r => r.confidence);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    // Calculate variance in confidence
    const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length;
    
    // Lower variance means higher consistency
    return Math.max(0, 1 - variance);
  }

  private async synthesizeResponses(
    responses: ModelResponse[],
    originalQuery: string,
    consensusAnalysis: any
  ): Promise<string> {
    
    const validResponses = responses.filter(r => r.confidence > 0.3);
    
    if (validResponses.length === 0) {
      return "I apologize, but I couldn't generate a reliable response to your query.";
    }
    
    if (validResponses.length === 1) {
      return validResponses[0].response;
    }
    
    // Create synthesis prompt
    const responsesText = validResponses.map((r, i) => 
      `Model ${i + 1} (${r.modelId}, confidence: ${r.confidence.toFixed(2)}):\n${r.response}`
    ).join('\n\n---\n\n');
    
    const synthesisPrompt = `Synthesize these multiple AI responses into a comprehensive, accurate answer:

Original Query: "${originalQuery}"

Responses to synthesize:
${responsesText}

Consensus Score: ${consensusAnalysis.score.toFixed(2)}
Agreements: ${consensusAnalysis.agreements.join('; ')}
Conflicts: ${consensusAnalysis.conflicts.join('; ')}

Create a synthesis that:
1. Integrates the best insights from each response
2. Resolves any conflicts by noting different perspectives
3. Maintains factual accuracy
4. Provides a coherent, comprehensive answer
5. Notes any uncertainties or limitations

Focus on the most reliable and consistent information across responses.`;

    try {
      const synthesis = await llmService.generateResponse(
        [{ role: 'user', content: synthesisPrompt }],
        0.4,
        undefined,
        'deepseek-v3' // Use best model for synthesis
      );

      return synthesis.message;
    } catch (error) {
      // Fallback to highest confidence response
      const bestResponse = validResponses.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      return bestResponse.response;
    }
  }

  private async extractAndValidateFacts(responses: ModelResponse[]): Promise<any[]> {
    const allFacts = responses.flatMap(r => r.facts);
    
    // Group similar facts
    const factGroups: any[][] = [];
    
    for (const fact of allFacts) {
      let added = false;
      
      for (const group of factGroups) {
        const similarity = await this.calculateSimilarity(
          fact.fact, 
          group[0].fact
        );
        
        if (similarity > 0.7) {
          group.push(fact);
          added = true;
          break;
        }
      }
      
      if (!added) {
        factGroups.push([fact]);
      }
    }
    
    // Validate and consolidate facts
    return factGroups.map(group => {
      const avgConfidence = group.reduce((sum, f) => sum + f.confidence, 0) / group.length;
      const supportCount = group.length;
      
      return {
        fact: group[0].fact,
        confidence: avgConfidence,
        supportingModels: supportCount,
        validated: supportCount >= 2 && avgConfidence > 0.7
      };
    }).filter(f => f.validated);
  }

  private calculateOverallConfidence(
    responses: ModelResponse[],
    consensusAnalysis: any
  ): number {
    
    const avgModelConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    const consensusWeight = consensusAnalysis.score;
    const responseCount = responses.length;
    
    // More models generally increase confidence
    const diversityBonus = Math.min(0.2, responseCount * 0.05);
    
    return Math.min(1.0, avgModelConfidence * 0.6 + consensusWeight * 0.3 + diversityBonus);
  }
}

export const ensembleLLMProcessor = new EnsembleLLMProcessor();
