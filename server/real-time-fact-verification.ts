
import { logger } from './monitoring/logger';
import { knowledgeGraph } from './knowledge-graph-integration';

export interface FactClaim {
  id: string;
  text: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  source?: string;
}

export interface VerificationResult {
  claim: FactClaim;
  isVerified: boolean;
  confidence: number;
  sources: VerificationSource[];
  contradictions: VerificationSource[];
  reasoning: string;
}

export interface VerificationSource {
  url: string;
  title: string;
  snippet: string;
  credibilityScore: number;
  relevanceScore: number;
  publishDate?: Date;
}

export class RealTimeFactVerificationService {
  private verificationCache = new Map<string, VerificationResult>();
  private sourceCredibilityDb = new Map<string, number>();

  constructor() {
    this.initializeCredibilityDatabase();
  }

  async verifyFacts(text: string): Promise<VerificationResult[]> {
    const claims = await this.extractClaims(text);
    const verificationPromises = claims.map(claim => this.verifyClaim(claim));
    
    return Promise.all(verificationPromises);
  }

  async verifyClaim(claim: FactClaim): Promise<VerificationResult> {
    const cacheKey = this.generateCacheKey(claim);
    
    // Check cache first
    if (this.verificationCache.has(cacheKey)) {
      return this.verificationCache.get(cacheKey)!;
    }

    try {
      // Multi-source verification
      const [
        webVerification,
        knowledgeGraphVerification,
        crossReferenceVerification
      ] = await Promise.all([
        this.verifyAgainstWeb(claim),
        this.verifyAgainstKnowledgeGraph(claim),
        this.crossReferenceVerification(claim)
      ]);

      // Aggregate results
      const result = this.aggregateVerificationResults(
        claim,
        webVerification,
        knowledgeGraphVerification,
        crossReferenceVerification
      );

      // Cache result
      this.verificationCache.set(cacheKey, result);

      logger.info('Fact verification completed', {
        claimId: claim.id,
        isVerified: result.isVerified,
        confidence: result.confidence,
        sourcesCount: result.sources.length,
        component: 'fact-verification'
      });

      return result;

    } catch (error) {
      logger.error('Fact verification failed', error, {
        claimId: claim.id,
        component: 'fact-verification'
      });

      return {
        claim,
        isVerified: false,
        confidence: 0,
        sources: [],
        contradictions: [],
        reasoning: `Verification failed: ${error.message}`
      };
    }
  }

  private async extractClaims(text: string): Promise<FactClaim[]> {
    const claims: FactClaim[] = [];
    
    // Simple pattern-based claim extraction
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      
      // Skip questions and very short sentences
      if (sentence.includes('?') || sentence.length < 20) continue;
      
      // Extract subject-predicate-object patterns
      const patterns = [
        /^(.+?)\s+(is|are|was|were|has|have|will)\s+(.+)$/i,
        /^(.+?)\s+(increased|decreased|rose|fell|gained|lost)\s+(.+)$/i,
        /^(.+?)\s+(announced|reported|said|stated)\s+(.+)$/i
      ];

      for (const pattern of patterns) {
        const match = sentence.match(pattern);
        if (match) {
          claims.push({
            id: `claim_${Date.now()}_${i}`,
            text: sentence,
            subject: match[1].trim(),
            predicate: match[2].trim(),
            object: match[3].trim(),
            confidence: 0.8,
            source: 'extracted'
          });
          break;
        }
      }
    }

    return claims;
  }

  private async verifyAgainstWeb(claim: FactClaim): Promise<Partial<VerificationResult>> {
    try {
      const { performWebSearch } = await import('./performWebSearch');
      
      // Search for supporting evidence
      const searchQuery = `"${claim.subject}" ${claim.predicate} ${claim.object}`;
      const searchResults = await performWebSearch(searchQuery);

      const sources: VerificationSource[] = [];
      const contradictions: VerificationSource[] = [];

      for (const result of searchResults.results?.slice(0, 5) || []) {
        const credibilityScore = this.getSourceCredibility(result.url);
        const relevanceScore = this.calculateRelevance(claim.text, result.snippet || '');
        
        const source: VerificationSource = {
          url: result.url,
          title: result.title,
          snippet: result.snippet || '',
          credibilityScore,
          relevanceScore,
          publishDate: result.publishDate ? new Date(result.publishDate) : undefined
        };

        // Simple contradiction detection
        const isContradiction = this.detectContradiction(claim, source.snippet);
        
        if (isContradiction) {
          contradictions.push(source);
        } else if (relevanceScore > 0.6) {
          sources.push(source);
        }
      }

      return { sources, contradictions };

    } catch (error) {
      logger.warn('Web verification failed', {
        claimId: claim.id,
        error: error.message,
        component: 'fact-verification'
      });
      return { sources: [], contradictions: [] };
    }
  }

  private async verifyAgainstKnowledgeGraph(claim: FactClaim): Promise<Partial<VerificationResult>> {
    try {
      // Search for related entities in knowledge graph
      const relatedEntities = await knowledgeGraph.semanticSearch(claim.text, 5);
      
      const sources: VerificationSource[] = [];
      
      for (const entity of relatedEntities) {
        if (entity.properties.verified && entity.confidence > 0.7) {
          sources.push({
            url: 'internal://knowledge-graph',
            title: `Knowledge Graph: ${entity.name}`,
            snippet: `Entity: ${entity.name} (Type: ${entity.type})`,
            credibilityScore: entity.confidence,
            relevanceScore: 0.8
          });
        }
      }

      return { sources };

    } catch (error) {
      logger.warn('Knowledge graph verification failed', {
        claimId: claim.id,
        error: error.message,
        component: 'fact-verification'
      });
      return { sources: [] };
    }
  }

  private async crossReferenceVerification(claim: FactClaim): Promise<Partial<VerificationResult>> {
    // Cross-reference with multiple authoritative sources
    const authoritativeSources = [
      'wikipedia.org',
      'reuters.com',
      'bbc.com',
      'ap.org',
      'npr.org'
    ];

    try {
      const { performWebSearch } = await import('./performWebSearch');
      
      const searchQuery = `site:(${authoritativeSources.join('|')}) "${claim.subject}"`;
      const searchResults = await performWebSearch(searchQuery);

      const sources: VerificationSource[] = [];

      for (const result of searchResults.results?.slice(0, 3) || []) {
        sources.push({
          url: result.url,
          title: result.title,
          snippet: result.snippet || '',
          credibilityScore: 0.95, // High credibility for authoritative sources
          relevanceScore: this.calculateRelevance(claim.text, result.snippet || '')
        });
      }

      return { sources };

    } catch (error) {
      logger.warn('Cross-reference verification failed', {
        claimId: claim.id,
        error: error.message,
        component: 'fact-verification'
      });
      return { sources: [] };
    }
  }

  private aggregateVerificationResults(
    claim: FactClaim,
    ...partialResults: Partial<VerificationResult>[]
  ): VerificationResult {
    const allSources: VerificationSource[] = [];
    const allContradictions: VerificationSource[] = [];

    for (const partial of partialResults) {
      if (partial.sources) allSources.push(...partial.sources);
      if (partial.contradictions) allContradictions.push(...partial.contradictions);
    }

    // Calculate overall confidence
    const supportingEvidence = allSources.filter(s => s.relevanceScore > 0.6);
    const highCredibilitySources = allSources.filter(s => s.credibilityScore > 0.8);
    
    let confidence = 0;
    let isVerified = false;

    if (supportingEvidence.length >= 2 && highCredibilitySources.length >= 1) {
      confidence = Math.min(0.95, 
        (supportingEvidence.length * 0.2 + highCredibilitySources.length * 0.3) / 2
      );
      isVerified = confidence > 0.7;
    } else if (supportingEvidence.length >= 1) {
      confidence = Math.min(0.7, supportingEvidence.length * 0.3);
      isVerified = confidence > 0.5;
    }

    // Reduce confidence if contradictions found
    if (allContradictions.length > 0) {
      confidence *= (1 - allContradictions.length * 0.2);
      if (allContradictions.length >= 2) {
        isVerified = false;
      }
    }

    const reasoning = this.generateReasoning(
      supportingEvidence.length,
      highCredibilitySources.length,
      allContradictions.length
    );

    return {
      claim,
      isVerified,
      confidence: Math.max(0, Math.min(1, confidence)),
      sources: allSources,
      contradictions: allContradictions,
      reasoning
    };
  }

  private getSourceCredibility(url: string): number {
    const domain = new URL(url).hostname.toLowerCase();
    return this.sourceCredibilityDb.get(domain) || 0.5;
  }

  private calculateRelevance(claimText: string, sourceText: string): number {
    const claimWords = claimText.toLowerCase().split(/\s+/);
    const sourceWords = sourceText.toLowerCase().split(/\s+/);
    
    const intersection = claimWords.filter(word => sourceWords.includes(word));
    return intersection.length / claimWords.length;
  }

  private detectContradiction(claim: FactClaim, sourceText: string): boolean {
    const contradictionKeywords = ['not', 'never', 'false', 'incorrect', 'wrong', 'denied'];
    const lowerSourceText = sourceText.toLowerCase();
    const claimLower = claim.text.toLowerCase();
    
    return contradictionKeywords.some(keyword => 
      lowerSourceText.includes(keyword) && 
      lowerSourceText.includes(claim.subject.toLowerCase())
    );
  }

  private generateReasoning(
    supportingCount: number, 
    highCredibilityCount: number, 
    contradictionCount: number
  ): string {
    if (supportingCount === 0) {
      return 'No supporting evidence found from reliable sources.';
    }
    
    if (contradictionCount >= 2) {
      return `Found ${contradictionCount} contradictory sources, verification confidence reduced.`;
    }
    
    if (highCredibilityCount >= 1 && supportingCount >= 2) {
      return `Verified by ${supportingCount} sources including ${highCredibilityCount} high-credibility sources.`;
    }
    
    return `Found ${supportingCount} supporting sources with varying credibility.`;
  }

  private generateCacheKey(claim: FactClaim): string {
    return `${claim.subject}:${claim.predicate}:${claim.object}`.toLowerCase();
  }

  private initializeCredibilityDatabase(): void {
    // Initialize with known credible sources
    const credibleSources = [
      ['wikipedia.org', 0.85],
      ['reuters.com', 0.95],
      ['bbc.com', 0.90],
      ['ap.org', 0.95],
      ['npr.org', 0.85],
      ['wsj.com', 0.85],
      ['ft.com', 0.85],
      ['bloomberg.com', 0.90],
      ['sec.gov', 0.95],
      ['federalreserve.gov', 0.95]
    ] as const;

    for (const [domain, score] of credibleSources) {
      this.sourceCredibilityDb.set(domain, score);
    }
  }
}

export const factVerificationService = new RealTimeFactVerificationService();
