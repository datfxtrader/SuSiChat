
import { advancedSearchOrchestrator } from './advanced-search-orchestrator';
import { factVerificationEngine } from './advanced-fact-verification';
import { ensembleLLMProcessor } from './ensemble-llm-processor';
import { qualityAssurance } from './advanced-quality-assurance';
import { llmService } from './llm';

export interface EnhancedResearchRequest {
  query: string;
  intent?: 'factual' | 'analytical' | 'comparative' | 'creative';
  depth?: 'basic' | 'comprehensive' | 'expert';
  options?: {
    requireAcademic?: boolean;
    requireNews?: boolean;
    maxSources?: number;
    enableEnsemble?: boolean;
    enableFactCheck?: boolean;
    qualityThreshold?: number;
    targetAudience?: 'academic' | 'general' | 'simple';
  };
}

export interface EnhancedResearchResult {
  response: string;
  sources: any[];
  metadata: {
    searchMetrics: any;
    verificationReport: any;
    qualityReport: any;
    ensembleData?: any;
    processingTime: number;
    confidence: number;
  };
  recommendations: string[];
}

export class EnhancedDeerFlowService {
  private readonly defaultOptions = {
    requireAcademic: false,
    requireNews: true,
    maxSources: 15,
    enableEnsemble: true,
    enableFactCheck: true,
    qualityThreshold: 0.75,
    targetAudience: 'general' as const
  };

  async performEnhancedResearch(request: EnhancedResearchRequest): Promise<EnhancedResearchResult> {
    const startTime = Date.now();
    const options = { ...this.defaultOptions, ...request.options };
    
    console.log(`🚀 Starting enhanced research for: "${request.query}"`);
    
    try {
      // Step 1: Intelligent search orchestration
      console.log('📊 Phase 1: Multi-source search orchestration');
      const searchSources = ['web'];
      if (options.requireAcademic) searchSources.push('academic');
      if (options.requireNews) searchSources.push('news');
      
      const searchResults = await advancedSearchOrchestrator.orchestrateSearch(
        request.query,
        request.intent || 'factual',
        [], // entities - could be extracted first
        {
          maxResults: options.maxSources,
          requireAcademic: options.requireAcademic,
          requireNews: options.requireNews,
          qualityThreshold: 0.7
        }
      );
      
      console.log(`✅ Found ${searchResults.length} high-quality sources`);
      
      // Step 2: Generate response with ensemble processing
      console.log('🧠 Phase 2: Multi-model response generation');
      let response: string;
      let ensembleData: any = null;
      
      if (options.enableEnsemble && searchResults.length > 3) {
        // Use ensemble processing for high-quality results
        const context = this.buildContext(searchResults);
        const ensembleResult = await ensembleLLMProcessor.processEnsembleResearch(
          request.query,
          context,
          request.intent || 'factual',
          { prioritizeQuality: true }
        );
        
        response = ensembleResult.primaryResponse;
        ensembleData = {
          consensusScore: ensembleResult.consensusScore,
          modelCount: ensembleResult.modelResponses.length,
          confidence: ensembleResult.confidence,
          conflicts: ensembleResult.conflictingClaims
        };
        
        console.log(`✅ Ensemble processing complete (${ensembleResult.modelResponses.length} models, consensus: ${(ensembleResult.consensusScore * 100).toFixed(1)}%)`);
      } else {
        // Single model fallback
        response = await this.generateSingleModelResponse(request.query, searchResults);
        console.log('✅ Single model response generated');
      }
      
      // Step 3: Fact verification
      console.log('🔍 Phase 3: Comprehensive fact verification');
      let verificationReport: any = null;
      
      if (options.enableFactCheck) {
        verificationReport = await factVerificationEngine.verifyResponse(
          response,
          request.query,
          searchResults
        );
        
        console.log(`✅ Verified ${verificationReport.verifiedClaims}/${verificationReport.totalClaims} claims (${(verificationReport.overallConfidence * 100).toFixed(1)}% confidence)`);
      }
      
      // Step 4: Quality assessment
      console.log('📋 Phase 4: Quality assurance assessment');
      const qualityReport = await qualityAssurance.assessResponseQuality(
        response,
        request.query,
        searchResults,
        {
          requireCitations: true,
          readabilityTarget: options.targetAudience,
          biasCheck: true
        }
      );
      
      console.log(`✅ Quality assessment complete (Grade: ${qualityReport.grade}, Score: ${(qualityReport.overallScore * 100).toFixed(1)}%)`);
      
      // Step 5: Final optimization
      if (!qualityReport.meetsThreshold && qualityReport.overallScore < options.qualityThreshold) {
        console.log('🔧 Phase 5: Response optimization');
        response = await this.optimizeResponse(response, qualityReport);
        console.log('✅ Response optimized');
      }
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        qualityReport,
        verificationReport,
        ensembleData
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`🎉 Enhanced research completed in ${(processingTime / 1000).toFixed(2)}s`);
      
      return {
        response,
        sources: searchResults,
        metadata: {
          searchMetrics: {
            sourceCount: searchResults.length,
            sourceTypes: this.analyzeSourceTypes(searchResults)
          },
          verificationReport,
          qualityReport,
          ensembleData,
          processingTime,
          confidence: this.calculateOverallConfidence(verificationReport, qualityReport, ensembleData)
        },
        recommendations
      };
      
    } catch (error) {
      console.error('❌ Enhanced research failed:', error);
      
      // Fallback to basic research
      const fallbackResponse = await this.fallbackResearch(request.query);
      
      return {
        response: fallbackResponse,
        sources: [],
        metadata: {
          searchMetrics: { error: 'Fallback used' },
          verificationReport: null,
          qualityReport: null,
          processingTime: Date.now() - startTime,
          confidence: 0.3
        },
        recommendations: ['System encountered errors - consider retrying the request']
      };
    }
  }

  private buildContext(sources: any[]): string {
    return sources
      .slice(0, 10) // Limit context size
      .map(source => `Source: ${source.title}\nURL: ${source.url}\nContent: ${source.content}\n`)
      .join('\n---\n\n');
  }

  private async generateSingleModelResponse(query: string, sources: any[]): Promise<string> {
    const context = this.buildContext(sources);
    
    const prompt = `Based on the following sources, provide a comprehensive answer to the research query.

Query: "${query}"

Sources:
${context}

Provide a well-structured, factual response with proper citations. Include:
1. A clear introduction
2. Main findings organized logically
3. Supporting evidence from sources
4. A conclusion summarizing key points
5. Proper source citations

Focus on accuracy, completeness, and clarity.`;

    const response = await llmService.generateResponse([
      { role: 'user', content: prompt }
    ], 0.3);

    return response.message;
  }

  private async optimizeResponse(response: string, qualityReport: any): Promise<string> {
    const issues = qualityReport.recommendations.join('; ');
    
    const optimizationPrompt = `Improve this research response based on the identified quality issues:

Original Response:
"${response}"

Quality Issues to Address:
${issues}

Please rewrite the response to:
1. Address the identified quality issues
2. Maintain factual accuracy
3. Improve overall clarity and structure
4. Better citation practices
5. Reduce any detected bias

Provide the improved version:`;

    try {
      const optimized = await llmService.generateResponse([
        { role: 'user', content: optimizationPrompt }
      ], 0.4);

      return optimized.message;
    } catch (error) {
      console.error('Response optimization failed:', error);
      return response; // Return original if optimization fails
    }
  }

  private analyzeSourceTypes(sources: any[]): Record<string, number> {
    const types: Record<string, number> = {};
    
    for (const source of sources) {
      const type = source.source || 'unknown';
      types[type] = (types[type] || 0) + 1;
    }
    
    return types;
  }

  private calculateOverallConfidence(
    verificationReport: any,
    qualityReport: any,
    ensembleData: any
  ): number {
    
    let confidence = 0.5; // Base confidence
    
    if (verificationReport) {
      confidence += verificationReport.overallConfidence * 0.4;
    }
    
    if (qualityReport) {
      confidence += qualityReport.overallScore * 0.3;
    }
    
    if (ensembleData) {
      confidence += ensembleData.confidence * 0.3;
    } else {
      confidence += 0.1; // Small boost for single model
    }
    
    return Math.min(1.0, confidence);
  }

  private generateRecommendations(
    qualityReport: any,
    verificationReport: any,
    ensembleData: any
  ): string[] {
    
    const recommendations: string[] = [];
    
    // Quality recommendations
    if (qualityReport && !qualityReport.meetsThreshold) {
      recommendations.push(...qualityReport.recommendations);
    }
    
    // Verification recommendations
    if (verificationReport && verificationReport.verifiedClaims < verificationReport.totalClaims * 0.8) {
      recommendations.push(...verificationReport.recommendations);
    }
    
    // Ensemble recommendations
    if (ensembleData && ensembleData.consensusScore < 0.7) {
      recommendations.push('Multiple models showed disagreement - verify key claims independently');
    }
    
    if (ensembleData && ensembleData.conflicts.length > 0) {
      recommendations.push(`Conflicting information detected: ${ensembleData.conflicts.slice(0, 2).join(', ')}`);
    }
    
    return recommendations;
  }

  private async fallbackResearch(query: string): Promise<string> {
    try {
      const response = await llmService.generateResponse([
        { role: 'user', content: `Provide a research response for: "${query}"` }
      ], 0.5);
      
      return `I apologize, but I encountered technical difficulties during the enhanced research process. Here's a basic response:\n\n${response.message}\n\n*Note: This response was generated using fallback methods and may not include the full range of sources and verification typically provided.*`;
    } catch (error) {
      return `I apologize, but I'm currently unable to process your research request due to technical difficulties. Please try again later or rephrase your query.`;
    }
  }
}

export const enhancedDeerFlowService = new EnhancedDeerFlowService();
