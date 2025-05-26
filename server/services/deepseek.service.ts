
// services/deepseek.service.ts
import axios, { AxiosInstance } from 'axios';
import pRetry from 'p-retry';
import pTimeout from 'p-timeout';

export class DeepSeekService {
  private client: AxiosInstance;
  private readonly timeout = 25000;
  private readonly maxRetries = 2;

  constructor(private apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.deepseek.com/v1',
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
  }

  async generateAnalysis(
    query: string, 
    depth: number,
    options?: any
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(options);
    const userPrompt = this.buildUserPrompt(query, depth, options);

    try {
      const response = await pTimeout(
        pRetry(
          () => this.makeRequest(systemPrompt, userPrompt, depth),
          {
            retries: this.maxRetries,
            onFailedAttempt: (error) => {
              console.log(`DeepSeek attempt ${error.attemptNumber} failed:`, error.message);
            }
          }
        ),
        this.timeout,
        'DeepSeek API request timed out'
      );

      return response;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw new Error('Failed to generate analysis');
    }
  }

  private async makeRequest(
    systemPrompt: string, 
    userPrompt: string,
    depth: number
  ): Promise<string> {
    const response = await this.client.post('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: this.getMaxTokens(depth),
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response format');
    }

    return response.data.choices[0].message.content;
  }

  private buildSystemPrompt(options?: any): string {
    const basePrompt = 'You are an expert financial analyst with over 15 years of experience in forex, commodities, and equity markets.';
    
    if (options?.analysisType === 'technical') {
      return `${basePrompt} Focus on technical analysis, chart patterns, indicators, and price action.`;
    } else if (options?.analysisType === 'fundamental') {
      return `${basePrompt} Focus on fundamental analysis, economic indicators, and macroeconomic factors.`;
    }
    
    return `${basePrompt} Provide comprehensive analysis combining both technical and fundamental perspectives.`;
  }

  private buildUserPrompt(query: string, depth: number, options?: any): string {
    const sections = this.getSectionsForDepth(depth);
    const timeframe = options?.timeframe || 'medium';
    const date = new Date().toISOString().split('T')[0];

    return `Create a ${this.getDepthDescription(depth)} financial analysis for "${query}".

Include the following sections:
${sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Requirements:
- Current date: ${date}
- Focus on ${timeframe}-term perspective
- Use clear markdown formatting with ## for section headers
- Include specific price levels, percentages, and numerical data
- Provide actionable insights and specific levels to watch
- Be precise and data-driven in your analysis
${options?.includeCharts ? '- Mention relevant chart patterns and formations' : ''}`;
  }

  private getSectionsForDepth(depth: number): string[] {
    const depthSections: Record<number, string[]> = {
      1: [
        'Executive Summary',
        'Current Market Status',
        'Key Takeaways'
      ],
      2: [
        'Executive Summary',
        'Current Market Status',
        'Technical Overview',
        'Key Levels to Watch',
        'Market Outlook'
      ],
      3: [
        'Executive Summary',
        'Current Market Status with Price Action',
        'Technical Analysis with Indicators',
        'Fundamental Factors',
        'Market Sentiment',
        'Trading Recommendations',
        'Risk Factors'
      ],
      4: [
        'Executive Summary',
        'Detailed Market Status',
        'Comprehensive Technical Analysis',
        'Fundamental Analysis',
        'Correlation Analysis',
        'Market Sentiment & Positioning',
        'Trading Strategy',
        'Risk Management',
        'Alternative Scenarios'
      ],
      5: [
        'Executive Summary',
        'In-Depth Market Analysis',
        'Advanced Technical Analysis',
        'Comprehensive Fundamental Analysis',
        'Intermarket Analysis',
        'Sentiment & Positioning Data',
        'Multiple Trading Strategies',
        'Risk/Reward Analysis',
        'Scenario Planning',
        'Long-term Outlook'
      ]
    };

    return depthSections[depth] || depthSections[3];
  }

  private getDepthDescription(depth: number): string {
    const descriptions: Record<number, string> = {
      1: 'concise',
      2: 'standard',
      3: 'comprehensive',
      4: 'detailed',
      5: 'expert-level'
    };
    return descriptions[depth] || 'comprehensive';
  }

  private getMaxTokens(depth: number): number {
    const tokenMap: Record<number, number> = {
      1: 1000,
      2: 2000,
      3: 3000,
      4: 4000,
      5: 5000
    };
    return tokenMap[depth] || 3000;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
