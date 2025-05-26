
import { llmService } from './llm';
import { factVerificationEngine, VerificationReport } from './advanced-fact-verification';

export interface QualityMetric {
  name: string;
  score: number;
  maxScore: number;
  details: any;
  suggestions: string[];
}

export interface QualityReport {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  meetsThreshold: boolean;
  metrics: QualityMetric[];
  recommendations: string[];
  improvementPlan: string[];
}

export interface QualityAssessmentOptions {
  requireCitations: boolean;
  minWordCount: number;
  maxWordCount: number;
  requiredTopics: string[];
  biasCheck: boolean;
  readabilityTarget: 'academic' | 'general' | 'simple';
}

export class AdvancedQualityAssurance {
  private qualityThreshold = 0.75;
  private weights = {
    completeness: 0.25,
    accuracy: 0.25,
    coherence: 0.15,
    citationQuality: 0.15,
    bias: 0.1,
    readability: 0.1
  };

  async assessResponseQuality(
    response: string,
    originalQuery: string,
    sources: any[],
    options: Partial<QualityAssessmentOptions> = {}
  ): Promise<QualityReport> {
    
    // Parallel quality assessments
    const assessmentPromises = [
      this.assessCompleteness(response, originalQuery, sources),
      this.assessAccuracy(response, sources),
      this.assessCoherence(response),
      this.assessCitationQuality(response, sources),
      this.assessBias(response),
      this.assessReadability(response, options.readabilityTarget || 'general')
    ];

    const metrics = await Promise.all(assessmentPromises);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics);
    
    // Determine grade
    const grade = this.calculateGrade(overallScore);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics);
    
    // Create improvement plan
    const improvementPlan = this.createImprovementPlan(metrics);
    
    return {
      overallScore,
      grade,
      meetsThreshold: overallScore >= this.qualityThreshold,
      metrics,
      recommendations,
      improvementPlan
    };
  }

  private async assessCompleteness(
    response: string,
    originalQuery: string,
    sources: any[]
  ): Promise<QualityMetric> {
    
    // Extract sub-questions from the original query
    const subQuestions = await this.extractSubQuestions(originalQuery);
    
    // Check coverage of each sub-question
    let answeredQuestions = 0;
    const questionCoverage: any[] = [];
    
    for (const question of subQuestions) {
      const isAnswered = await this.isQuestionAnswered(question, response);
      if (isAnswered) answeredQuestions++;
      
      questionCoverage.push({
        question,
        answered: isAnswered,
        coverage: await this.assessQuestionCoverage(question, response)
      });
    }
    
    // Check key information coverage from sources
    const keyInformation = await this.extractKeyInformation(sources);
    let informationCovered = 0;
    
    for (const info of keyInformation) {
      if (await this.isInformationIncluded(info, response)) {
        informationCovered++;
      }
    }
    
    // Calculate completeness score
    const questionScore = subQuestions.length > 0 ? answeredQuestions / subQuestions.length : 1;
    const informationScore = keyInformation.length > 0 ? informationCovered / keyInformation.length : 1;
    const lengthScore = this.assessResponseLength(response);
    
    const score = (questionScore * 0.5 + informationScore * 0.3 + lengthScore * 0.2) * 100;
    
    return {
      name: 'Completeness',
      score,
      maxScore: 100,
      details: {
        questionCoverage: questionScore * 100,
        informationCoverage: informationScore * 100,
        lengthScore: lengthScore * 100,
        answeredQuestions: `${answeredQuestions}/${subQuestions.length}`,
        coveredInformation: `${informationCovered}/${keyInformation.length}`,
        wordCount: response.split(/\s+/).length
      },
      suggestions: this.generateCompletenessSuggestions(questionCoverage, informationCovered, keyInformation.length)
    };
  }

  private async assessAccuracy(
    response: string,
    sources: any[]
  ): Promise<QualityMetric> {
    
    // Use fact verification engine
    const verificationReport = await factVerificationEngine.verifyResponse(
      response,
      '', // originalQuery not needed for this
      sources
    );
    
    // Calculate accuracy score
    const verificationRate = verificationReport.verifiedClaims / Math.max(1, verificationReport.totalClaims);
    const confidenceScore = verificationReport.overallConfidence;
    const qualityScore = verificationReport.qualityScore / 100;
    
    const score = (verificationRate * 0.4 + confidenceScore * 0.4 + qualityScore * 0.2) * 100;
    
    return {
      name: 'Accuracy',
      score,
      maxScore: 100,
      details: {
        totalClaims: verificationReport.totalClaims,
        verifiedClaims: verificationReport.verifiedClaims,
        verificationRate: verificationRate * 100,
        overallConfidence: confidenceScore * 100,
        qualityScore: verificationReport.qualityScore
      },
      suggestions: verificationReport.recommendations
    };
  }

  private async assessCoherence(response: string): Promise<QualityMetric> {
    const coherencePrompt = `Assess the coherence and logical flow of this response:

"${response}"

Evaluate:
1. Logical structure and organization
2. Smooth transitions between ideas
3. Consistency in arguments
4. Clear introduction and conclusion
5. Paragraph organization

Provide scores (0-100) for each aspect and an overall coherence score.
Return as JSON: {"structure": score, "transitions": score, "consistency": score, "clarity": score, "organization": score, "overall": score, "suggestions": ["suggestion1", "suggestion2"]}`;

    try {
      const evaluation = await llmService.generateResponse([
        { role: 'user', content: coherencePrompt }
      ], 0.1);

      const result = JSON.parse(evaluation.message);
      
      return {
        name: 'Coherence',
        score: result.overall,
        maxScore: 100,
        details: {
          structure: result.structure,
          transitions: result.transitions,
          consistency: result.consistency,
          clarity: result.clarity,
          organization: result.organization
        },
        suggestions: result.suggestions || []
      };
    } catch (error) {
      // Fallback assessment
      return this.fallbackCoherenceAssessment(response);
    }
  }

  private async assessCitationQuality(
    response: string,
    sources: any[]
  ): Promise<QualityMetric> {
    
    // Count citations in response
    const citations = this.extractCitations(response);
    const citationCount = citations.length;
    
    // Check if sources are properly referenced
    let properlyReferenced = 0;
    for (const source of sources) {
      if (this.isSourceReferenced(source, response)) {
        properlyReferenced++;
      }
    }
    
    // Assess citation format
    const properFormatCount = citations.filter(c => this.isProperCitationFormat(c)).length;
    
    // Calculate scores
    const coverageScore = sources.length > 0 ? properlyReferenced / sources.length : 1;
    const formatScore = citationCount > 0 ? properFormatCount / citationCount : 1;
    const frequencyScore = Math.min(1, citationCount / Math.max(1, response.split(/\s+/).length / 200)); // ~1 citation per 200 words
    
    const score = (coverageScore * 0.5 + formatScore * 0.3 + frequencyScore * 0.2) * 100;
    
    return {
      name: 'Citation Quality',
      score,
      maxScore: 100,
      details: {
        totalSources: sources.length,
        referencedSources: properlyReferenced,
        citationCount,
        properlyFormatted: properFormatCount,
        coverageRate: coverageScore * 100,
        formatRate: formatScore * 100
      },
      suggestions: this.generateCitationSuggestions(coverageScore, formatScore, citationCount)
    };
  }

  private async assessBias(response: string): Promise<QualityMetric> {
    const biasPrompt = `Analyze this response for potential bias:

"${response}"

Check for:
1. Political bias (left/right leaning statements)
2. Cultural bias (Western-centric, assumptions about cultures)
3. Gender bias (gendered language, assumptions)
4. Confirmation bias (cherry-picking evidence)
5. Recency bias (overemphasis on recent events)
6. Source bias (relying on biased sources)

For each type, provide a bias score (0-100, where 0 is highly biased, 100 is neutral).
Return as JSON: {"political": score, "cultural": score, "gender": score, "confirmation": score, "recency": score, "source": score, "overall": score, "issues": ["issue1", "issue2"]}`;

    try {
      const evaluation = await llmService.generateResponse([
        { role: 'user', content: biasPrompt }
      ], 0.1);

      const result = JSON.parse(evaluation.message);
      
      return {
        name: 'Bias Assessment',
        score: result.overall,
        maxScore: 100,
        details: {
          political: result.political,
          cultural: result.cultural,
          gender: result.gender,
          confirmation: result.confirmation,
          recency: result.recency,
          source: result.source,
          identifiedIssues: result.issues || []
        },
        suggestions: this.generateBiasSuggestions(result)
      };
    } catch (error) {
      // Conservative fallback
      return {
        name: 'Bias Assessment',
        score: 70,
        maxScore: 100,
        details: { error: 'Assessment failed' },
        suggestions: ['Manually review response for potential bias']
      };
    }
  }

  private async assessReadability(
    response: string,
    target: 'academic' | 'general' | 'simple'
  ): Promise<QualityMetric> {
    
    // Calculate readability metrics
    const metrics = this.calculateReadabilityMetrics(response);
    
    // Target scores for different audiences
    const targets = {
      academic: { fleschKincaid: 16, avgSentenceLength: 20, avgSyllables: 2.5 },
      general: { fleschKincaid: 12, avgSentenceLength: 15, avgSyllables: 2.0 },
      simple: { fleschKincaid: 8, avgSentenceLength: 12, avgSyllables: 1.5 }
    };
    
    const targetMetrics = targets[target];
    
    // Score based on how close to target
    const gradeScore = this.scoreProximity(metrics.fleschKincaid, targetMetrics.fleschKincaid, 4);
    const sentenceScore = this.scoreProximity(metrics.avgSentenceLength, targetMetrics.avgSentenceLength, 5);
    const syllableScore = this.scoreProximity(metrics.avgSyllables, targetMetrics.avgSyllables, 0.5);
    
    const score = (gradeScore * 0.4 + sentenceScore * 0.3 + syllableScore * 0.3) * 100;
    
    return {
      name: 'Readability',
      score,
      maxScore: 100,
      details: {
        target,
        fleschKincaidGrade: metrics.fleschKincaid,
        averageSentenceLength: metrics.avgSentenceLength,
        averageSyllablesPerWord: metrics.avgSyllables,
        targetGrade: targetMetrics.fleschKincaid,
        gradeScore: gradeScore * 100,
        sentenceScore: sentenceScore * 100,
        syllableScore: syllableScore * 100
      },
      suggestions: this.generateReadabilitySuggestions(metrics, targetMetrics, target)
    };
  }

  private calculateOverallScore(metrics: QualityMetric[]): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const metric of metrics) {
      const weight = this.weights[metric.name.toLowerCase().replace(' ', '')] || 0.1;
      totalScore += (metric.score / metric.maxScore) * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  }

  private generateRecommendations(metrics: QualityMetric[]): string[] {
    const recommendations: string[] = [];
    
    for (const metric of metrics) {
      if (metric.score < 70) {
        recommendations.push(`Improve ${metric.name}: ${metric.suggestions.join(', ')}`);
      }
    }
    
    // Overall recommendations
    const overallScore = this.calculateOverallScore(metrics);
    if (overallScore < 0.7) {
      recommendations.push('Consider revising the response to address the identified quality issues');
    }
    
    return recommendations;
  }

  private createImprovementPlan(metrics: QualityMetric[]): string[] {
    const plan: string[] = [];
    
    // Prioritize by lowest scores
    const sortedMetrics = [...metrics].sort((a, b) => a.score - b.score);
    
    for (let i = 0; i < Math.min(3, sortedMetrics.length); i++) {
      const metric = sortedMetrics[i];
      if (metric.score < 80) {
        plan.push(`Priority ${i + 1}: Focus on ${metric.name} - ${metric.suggestions[0] || 'Review and improve'}`);
      }
    }
    
    return plan;
  }

  // Helper methods for specific assessments
  private async extractSubQuestions(query: string): Promise<string[]> {
    const prompt = `Break down this research query into specific sub-questions that should be addressed:

"${query}"

Return as JSON array of strings.`;

    try {
      const response = await llmService.generateResponse([
        { role: 'user', content: prompt }
      ], 0.2);
      
      return JSON.parse(response.message);
    } catch {
      return [query]; // Fallback
    }
  }

  private async isQuestionAnswered(question: string, response: string): Promise<boolean> {
    const prompt = `Is this question adequately answered in the response?

Question: "${question}"
Response: "${response.slice(0, 1000)}"

Answer with only "yes" or "no".`;

    try {
      const result = await llmService.generateResponse([
        { role: 'user', content: prompt }
      ], 0.1);
      
      return result.message.toLowerCase().trim() === 'yes';
    } catch {
      return false;
    }
  }

  private async extractKeyInformation(sources: any[]): Promise<string[]> {
    const keyInfo: string[] = [];
    
    for (const source of sources.slice(0, 5)) { // Limit to first 5 sources
      if (source.facts && Array.isArray(source.facts)) {
        keyInfo.push(...source.facts.map((f: any) => f.statement || f.fact || f));
      }
    }
    
    return [...new Set(keyInfo)]; // Remove duplicates
  }

  private async isInformationIncluded(info: string, response: string): Promise<boolean> {
    const similarity = await this.calculateSimilarity(info, response);
    return similarity > 0.3;
  }

  private async calculateSimilarity(text1: string, text2: string): Promise<number> {
    // Simple word overlap similarity
    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private assessResponseLength(response: string): number {
    const wordCount = response.split(/\s+/).length;
    
    // Ideal range: 200-2000 words
    if (wordCount < 100) return 0.3;
    if (wordCount < 200) return 0.7;
    if (wordCount <= 2000) return 1.0;
    if (wordCount <= 3000) return 0.8;
    return 0.6; // Too long
  }

  private extractCitations(response: string): string[] {
    // Look for citation patterns
    const patterns = [
      /\[(\d+)\]/g, // [1], [2], etc.
      /\(([^)]+\d{4}[^)]*)\)/g, // (Author 2024)
      /\bhttps?:\/\/[^\s]+/g, // URLs
      /\[([^\]]+)\]\([^)]+\)/g // Markdown links
    ];
    
    const citations: string[] = [];
    
    for (const pattern of patterns) {
      const matches = response.match(pattern);
      if (matches) {
        citations.push(...matches);
      }
    }
    
    return citations;
  }

  private isSourceReferenced(source: any, response: string): boolean {
    const sourceIndicators = [
      source.url,
      source.title,
      source.domain,
      source.source
    ].filter(Boolean);
    
    return sourceIndicators.some(indicator => 
      response.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private isProperCitationFormat(citation: string): boolean {
    // Check for proper citation formats
    const formats = [
      /^\[\d+\]$/, // [1]
      /^\([^)]+\d{4}[^)]*\)$/, // (Author 2024)
      /^https?:\/\/[^\s]+$/, // URLs
      /^\[[^\]]+\]\([^)]+\)$/ // Markdown links
    ];
    
    return formats.some(format => format.test(citation));
  }

  private generateCompletenessSuggestions(questionCoverage: any[], informationCovered: number, totalInformation: number): string[] {
    const suggestions: string[] = [];
    
    const unansweredQuestions = questionCoverage.filter(q => !q.answered);
    if (unansweredQuestions.length > 0) {
      suggestions.push(`Address ${unansweredQuestions.length} unanswered questions`);
    }
    
    if (informationCovered < totalInformation * 0.7) {
      suggestions.push('Include more key information from sources');
    }
    
    return suggestions;
  }

  private generateCitationSuggestions(coverageScore: number, formatScore: number, citationCount: number): string[] {
    const suggestions: string[] = [];
    
    if (coverageScore < 0.8) {
      suggestions.push('Reference more of the provided sources');
    }
    
    if (formatScore < 0.8) {
      suggestions.push('Use proper citation format');
    }
    
    if (citationCount < 3) {
      suggestions.push('Add more citations to support claims');
    }
    
    return suggestions;
  }

  private generateBiasSuggestions(biasResult: any): string[] {
    const suggestions: string[] = [];
    
    if (biasResult.political < 70) {
      suggestions.push('Use more neutral language and present multiple viewpoints');
    }
    
    if (biasResult.cultural < 70) {
      suggestions.push('Consider diverse cultural perspectives');
    }
    
    if (biasResult.gender < 70) {
      suggestions.push('Use gender-neutral language where appropriate');
    }
    
    return suggestions;
  }

  private fallbackCoherenceAssessment(response: string): QualityMetric {
    // Simple coherence assessment
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = response.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const avgSentenceLength = response.length / sentences.length;
    const paragraphCount = paragraphs.length;
    
    let score = 70; // Base score
    
    // Penalize very short or very long sentences
    if (avgSentenceLength < 30 || avgSentenceLength > 150) {
      score -= 10;
    }
    
    // Reward good paragraph structure
    if (paragraphCount >= 3 && paragraphCount <= 8) {
      score += 10;
    }
    
    return {
      name: 'Coherence',
      score,
      maxScore: 100,
      details: { fallbackAssessment: true },
      suggestions: ['Manual review recommended']
    };
  }

  private calculateReadabilityMetrics(text: string): {
    fleschKincaid: number;
    avgSentenceLength: number;
    avgSyllables: number;
  } {
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((total, word) => total + this.countSyllables(word), 0);
    
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllables = syllables / words.length;
    
    // Flesch-Kincaid Grade Level
    const fleschKincaid = 0.39 * avgSentenceLength + 11.8 * avgSyllables - 15.59;
    
    return {
      fleschKincaid: Math.max(0, fleschKincaid),
      avgSentenceLength,
      avgSyllables
    };
  }

  private countSyllables(word: string): number {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanWord.length === 0) return 0;
    if (cleanWord.length <= 3) return 1;
    
    const vowels = cleanWord.match(/[aeiouy]+/g);
    let syllableCount = vowels ? vowels.length : 1;
    
    // Adjust for silent 'e'
    if (cleanWord.endsWith('e') && syllableCount > 1) {
      syllableCount--;
    }
    
    return Math.max(1, syllableCount);
  }

  private scoreProximity(actual: number, target: number, tolerance: number): number {
    const difference = Math.abs(actual - target);
    return Math.max(0, 1 - difference / tolerance);
  }

  private generateReadabilitySuggestions(metrics: any, targets: any, target: string): string[] {
    const suggestions: string[] = [];
    
    if (Math.abs(metrics.fleschKincaid - targets.fleschKincaid) > 2) {
      if (metrics.fleschKincaid > targets.fleschKincaid) {
        suggestions.push(`Simplify language for ${target} audience`);
      } else {
        suggestions.push(`Use more sophisticated language for ${target} audience`);
      }
    }
    
    if (metrics.avgSentenceLength > targets.avgSentenceLength + 3) {
      suggestions.push('Use shorter sentences');
    } else if (metrics.avgSentenceLength < targets.avgSentenceLength - 3) {
      suggestions.push('Consider combining short sentences for better flow');
    }
    
    return suggestions;
  }

  private async assessQuestionCoverage(question: string, response: string): Promise<number> {
    // Basic coverage assessment
    const questionWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const responseWords = new Set(response.toLowerCase().split(/\W+/));
    
    const coverage = questionWords.filter(word => responseWords.has(word)).length / questionWords.length;
    return coverage;
  }
}

export const qualityAssurance = new AdvancedQualityAssurance();
