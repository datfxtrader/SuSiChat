
import { llmService } from './llm';
import { advancedSearchOrchestrator, SearchResult } from './advanced-search-orchestrator';

export interface Claim {
  id: string;
  text: string;
  type: 'factual' | 'opinion' | 'prediction' | 'statistic';
  confidence: number;
  source: string;
  context: string;
}

export interface VerificationResult {
  claim: Claim;
  verified: boolean;
  confidence: number;
  supportingSources: SourceEvidence[];
  contradictingSources: SourceEvidence[];
  verificationMethods: string[];
  explanation: string;
}

export interface SourceEvidence {
  source: string;
  url: string;
  excerpt: string;
  credibilityScore: number;
  relevanceScore: number;
  stance: 'supports' | 'contradicts' | 'neutral';
}

export interface VerificationReport {
  totalClaims: number;
  verifiedClaims: number;
  overallConfidence: number;
  verificationResults: VerificationResult[];
  recommendations: string[];
  qualityScore: number;
}

export class AdvancedFactVerificationEngine {
  private credibilityScores = new Map<string, number>();
  private factCheckingAPIs: string[] = [];

  constructor() {
    this.initializeCredibilityScores();
  }

  private initializeCredibilityScores() {
    // High credibility sources
    const highCredibilitySources = [
      'gov', 'edu', 'org',
      'reuters.com', 'bbc.com', 'apnews.com',
      'nature.com', 'science.org', 'pubmed.ncbi.nlm.nih.gov'
    ];

    highCredibilitySources.forEach(source => {
      this.credibilityScores.set(source, 0.9);
    });

    // Medium credibility sources
    const mediumCredibilitySources = [
      'wikipedia.org', 'forbes.com', 'bloomberg.com',
      'economist.com', 'wsj.com', 'ft.com'
    ];

    mediumCredibilitySources.forEach(source => {
      this.credibilityScores.set(source, 0.7);
    });
  }

  async verifyResponse(
    response: string,
    originalQuery: string,
    sources: SearchResult[]
  ): Promise<VerificationReport> {
    
    // Step 1: Extract claims from response
    const claims = await this.extractClaims(response);
    
    // Step 2: Verify each claim
    const verificationResults = await Promise.all(
      claims.map(claim => this.verifyClaim(claim, originalQuery, sources))
    );
    
    // Step 3: Calculate overall metrics
    const verifiedCount = verificationResults.filter(r => r.verified).length;
    const overallConfidence = verificationResults.reduce(
      (sum, r) => sum + r.confidence, 0
    ) / verificationResults.length;
    
    // Step 4: Generate recommendations
    const recommendations = this.generateRecommendations(verificationResults);
    
    // Step 5: Calculate quality score
    const qualityScore = this.calculateQualityScore(verificationResults);
    
    return {
      totalClaims: claims.length,
      verifiedClaims: verifiedCount,
      overallConfidence,
      verificationResults,
      recommendations,
      qualityScore
    };
  }

  private async extractClaims(response: string): Promise<Claim[]> {
    const claimExtractionPrompt = `
    Extract factual claims from this research response. A claim is a statement that can be verified as true or false.
    
    Response: "${response}"
    
    For each claim, provide:
    1. The exact text of the claim
    2. Type (factual/opinion/prediction/statistic)
    3. Confidence level (0.0-1.0)
    
    Return as JSON array with format:
    [{"text": "claim text", "type": "factual", "confidence": 0.8}]
    
    Only extract clear, specific, verifiable claims. Skip opinions and vague statements.
    `;

    try {
      const response_data = await llmService.generateResponse([
        { role: 'user', content: claimExtractionPrompt }
      ], 0.2);

      const claimsData = JSON.parse(response_data.message);
      
      return claimsData.map((claim: any, index: number) => ({
        id: `claim_${Date.now()}_${index}`,
        text: claim.text,
        type: claim.type || 'factual',
        confidence: claim.confidence || 0.5,
        source: 'response',
        context: this.extractContext(claim.text, response)
      }));
    } catch (error) {
      console.error('Failed to extract claims:', error);
      return [];
    }
  }

  private extractContext(claimText: string, fullResponse: string): string {
    const sentences = fullResponse.split(/[.!?]+/);
    const claimSentence = sentences.find(s => s.includes(claimText.slice(0, 50)));
    
    if (claimSentence) {
      const index = sentences.indexOf(claimSentence);
      const contextSentences = sentences.slice(
        Math.max(0, index - 1),
        Math.min(sentences.length, index + 2)
      );
      return contextSentences.join('. ').trim();
    }
    
    return claimText;
  }

  private async verifyClaim(
    claim: Claim,
    originalQuery: string,
    sources: SearchResult[]
  ): Promise<VerificationResult> {
    
    const verificationMethods: string[] = [];
    let supportingSources: SourceEvidence[] = [];
    let contradictingSources: SourceEvidence[] = [];
    
    // Method 1: Verify against provided sources
    const sourceVerification = await this.verifyAgainstSources(claim, sources);
    supportingSources.push(...sourceVerification.supporting);
    contradictingSources.push(...sourceVerification.contradicting);
    verificationMethods.push('source_verification');
    
    // Method 2: Cross-reference with additional searches
    if (supportingSources.length < 2) {
      const crossReference = await this.crossReferenceSearch(claim);
      supportingSources.push(...crossReference.supporting);
      contradictingSources.push(...crossReference.contradicting);
      verificationMethods.push('cross_reference_search');
    }
    
    // Method 3: LLM-based verification
    const llmVerification = await this.llmVerification(claim, supportingSources);
    verificationMethods.push('llm_verification');
    
    // Calculate overall confidence
    const confidence = this.calculateVerificationConfidence(
      supportingSources,
      contradictingSources,
      llmVerification.confidence
    );
    
    // Determine if verified
    const verified = confidence > 0.7 && supportingSources.length > contradictingSources.length;
    
    return {
      claim,
      verified,
      confidence,
      supportingSources,
      contradictingSources,
      verificationMethods,
      explanation: this.generateVerificationExplanation(
        claim, supportingSources, contradictingSources, confidence
      )
    };
  }

  private async verifyAgainstSources(
    claim: Claim,
    sources: SearchResult[]
  ): Promise<{ supporting: SourceEvidence[], contradicting: SourceEvidence[] }> {
    
    const supporting: SourceEvidence[] = [];
    const contradicting: SourceEvidence[] = [];
    
    for (const source of sources) {
      // Calculate semantic similarity
      const relevance = await this.calculateSemanticSimilarity(claim.text, source.content);
      
      if (relevance > 0.6) {
        // Check stance
        const stance = await this.checkStance(claim.text, source.content);
        
        // Get credibility score
        const credibilityScore = this.getSourceCredibility(source.url);
        
        const evidence: SourceEvidence = {
          source: source.source,
          url: source.url,
          excerpt: this.extractRelevantExcerpt(claim.text, source.content),
          credibilityScore,
          relevanceScore: relevance,
          stance
        };
        
        if (stance === 'supports') {
          supporting.push(evidence);
        } else if (stance === 'contradicts') {
          contradicting.push(evidence);
        }
      }
    }
    
    return { supporting, contradicting };
  }

  private async crossReferenceSearch(claim: Claim): Promise<{ supporting: SourceEvidence[], contradicting: SourceEvidence[] }> {
    try {
      // Search for the specific claim
      const searchResults = await advancedSearchOrchestrator.orchestrateSearch(
        claim.text,
        'factual',
        [],
        { maxResults: 10, qualityThreshold: 0.8 }
      );
      
      return await this.verifyAgainstSources(claim, searchResults);
    } catch (error) {
      console.error('Cross-reference search failed:', error);
      return { supporting: [], contradicting: [] };
    }
  }

  private async llmVerification(
    claim: Claim,
    supportingSources: SourceEvidence[]
  ): Promise<{ verified: boolean, confidence: number, explanation: string }> {
    
    const sourcesText = supportingSources
      .map(s => `Source: ${s.source}\nExcerpt: ${s.excerpt}`)
      .join('\n\n');
    
    const verificationPrompt = `
    Verify this claim using the provided sources:
    
    Claim: "${claim.text}"
    
    Sources:
    ${sourcesText}
    
    Analysis:
    1. Is the claim supported by the sources?
    2. Are there any contradictions?
    3. What is your confidence level (0.0-1.0)?
    4. Explain your reasoning.
    
    Respond in JSON format:
    {
      "verified": boolean,
      "confidence": number,
      "explanation": "detailed explanation"
    }
    `;

    try {
      const response = await llmService.generateResponse([
        { role: 'user', content: verificationPrompt }
      ], 0.1);

      return JSON.parse(response.message);
    } catch (error) {
      console.error('LLM verification failed:', error);
      return { verified: false, confidence: 0.5, explanation: 'Verification failed' };
    }
  }

  private async calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
    // Simple keyword-based similarity for now
    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private async checkStance(claim: string, content: string): Promise<'supports' | 'contradicts' | 'neutral'> {
    const stancePrompt = `
    Does this content support, contradict, or remain neutral about the claim?
    
    Claim: "${claim}"
    Content: "${content.slice(0, 500)}"
    
    Respond with only: "supports", "contradicts", or "neutral"
    `;

    try {
      const response = await llmService.generateResponse([
        { role: 'user', content: stancePrompt }
      ], 0.1);

      const stance = response.message.toLowerCase().trim();
      if (['supports', 'contradicts', 'neutral'].includes(stance)) {
        return stance as 'supports' | 'contradicts' | 'neutral';
      }
      return 'neutral';
    } catch {
      return 'neutral';
    }
  }

  private getSourceCredibility(url: string): number {
    for (const [pattern, score] of this.credibilityScores.entries()) {
      if (url.includes(pattern)) {
        return score;
      }
    }
    return 0.5; // Default credibility
  }

  private extractRelevantExcerpt(claim: string, content: string): string {
    const sentences = content.split(/[.!?]+/);
    const claimWords = claim.toLowerCase().split(/\W+/);
    
    let bestSentence = '';
    let bestScore = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = sentence.toLowerCase().split(/\W+/);
      const matches = claimWords.filter(word => sentenceWords.includes(word)).length;
      const score = matches / claimWords.length;
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    }
    
    return bestSentence.trim() || content.slice(0, 200);
  }

  private calculateVerificationConfidence(
    supporting: SourceEvidence[],
    contradicting: SourceEvidence[],
    llmConfidence: number
  ): number {
    
    if (supporting.length === 0 && contradicting.length === 0) {
      return 0.3; // Low confidence if no evidence
    }
    
    const supportingScore = supporting.reduce((sum, s) => sum + s.credibilityScore * s.relevanceScore, 0);
    const contradictingScore = contradicting.reduce((sum, s) => sum + s.credibilityScore * s.relevanceScore, 0);
    
    const sourceBalance = supportingScore / (supportingScore + contradictingScore + 0.1);
    const sourceConfidence = Math.min(0.9, supportingScore * 0.3);
    
    return (sourceBalance * 0.5 + sourceConfidence * 0.3 + llmConfidence * 0.2);
  }

  private generateVerificationExplanation(
    claim: Claim,
    supporting: SourceEvidence[],
    contradicting: SourceEvidence[],
    confidence: number
  ): string {
    
    let explanation = `Verification of claim: "${claim.text}"\n\n`;
    
    if (supporting.length > 0) {
      explanation += `Supporting evidence found from ${supporting.length} source(s):\n`;
      supporting.slice(0, 2).forEach(s => {
        explanation += `- ${s.source}: ${s.excerpt.slice(0, 100)}...\n`;
      });
      explanation += '\n';
    }
    
    if (contradicting.length > 0) {
      explanation += `Contradicting evidence found from ${contradicting.length} source(s):\n`;
      contradicting.slice(0, 2).forEach(s => {
        explanation += `- ${s.source}: ${s.excerpt.slice(0, 100)}...\n`;
      });
      explanation += '\n';
    }
    
    explanation += `Overall confidence: ${(confidence * 100).toFixed(1)}%`;
    
    return explanation;
  }

  private generateRecommendations(results: VerificationResult[]): string[] {
    const recommendations: string[] = [];
    
    const unverifiedClaims = results.filter(r => !r.verified);
    const lowConfidenceClaims = results.filter(r => r.confidence < 0.6);
    
    if (unverifiedClaims.length > 0) {
      recommendations.push(`${unverifiedClaims.length} claims could not be verified. Consider removing or qualifying these statements.`);
    }
    
    if (lowConfidenceClaims.length > 0) {
      recommendations.push(`${lowConfidenceClaims.length} claims have low confidence. Consider adding qualifiers like "according to some sources" or "preliminary evidence suggests".`);
    }
    
    const claimsWithoutSources = results.filter(r => r.supportingSources.length === 0);
    if (claimsWithoutSources.length > 0) {
      recommendations.push(`${claimsWithoutSources.length} claims lack supporting sources. Consider adding citations or removing unsupported statements.`);
    }
    
    return recommendations;
  }

  private calculateQualityScore(results: VerificationResult[]): number {
    if (results.length === 0) return 0;
    
    const verificationRate = results.filter(r => r.verified).length / results.length;
    const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const sourceCoverage = results.filter(r => r.supportingSources.length > 0).length / results.length;
    
    return (verificationRate * 0.4 + averageConfidence * 0.4 + sourceCoverage * 0.2) * 100;
  }
}

export const factVerificationEngine = new AdvancedFactVerificationEngine();
