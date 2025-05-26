
import { logger } from './monitoring/logger';

export interface Entity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  confidence: number;
}

export interface Relationship {
  id: string;
  sourceEntity: string;
  targetEntity: string;
  type: string;
  properties: Record<string, any>;
  confidence: number;
}

export interface KnowledgeGraphNode {
  entity: Entity;
  relationships: Relationship[];
  embeddings?: number[];
}

export class KnowledgeGraphService {
  private entities = new Map<string, Entity>();
  private relationships = new Map<string, Relationship>();
  private graph = new Map<string, KnowledgeGraphNode>();

  async extractEntities(text: string): Promise<Entity[]> {
    // Enhanced entity extraction using multiple approaches
    const entities: Entity[] = [];

    // Named Entity Recognition
    const nerEntities = await this.performNER(text);
    entities.push(...nerEntities);

    // Financial entity detection
    const financialEntities = await this.extractFinancialEntities(text);
    entities.push(...financialEntities);

    // Technical term extraction
    const technicalEntities = await this.extractTechnicalEntities(text);
    entities.push(...technicalEntities);

    return this.deduplicateEntities(entities);
  }

  async extractRelationships(text: string, entities: Entity[]): Promise<Relationship[]> {
    const relationships: Relationship[] = [];

    // Pattern-based relationship extraction
    const patterns = [
      { pattern: /(\w+)\s+is\s+a\s+(\w+)/, type: 'is_a' },
      { pattern: /(\w+)\s+owns\s+(\w+)/, type: 'owns' },
      { pattern: /(\w+)\s+located\s+in\s+(\w+)/, type: 'located_in' },
      { pattern: /(\w+)\s+works\s+at\s+(\w+)/, type: 'works_at' },
      { pattern: /(\w+)\s+compared\s+to\s+(\w+)/, type: 'compared_to' }
    ];

    for (const { pattern, type } of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const sourceEntity = entities.find(e => e.name.toLowerCase() === match[1].toLowerCase());
        const targetEntity = entities.find(e => e.name.toLowerCase() === match[2].toLowerCase());

        if (sourceEntity && targetEntity) {
          relationships.push({
            id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            sourceEntity: sourceEntity.id,
            targetEntity: targetEntity.id,
            type,
            properties: { extractedFrom: 'pattern_matching' },
            confidence: 0.7
          });
        }
      }
    }

    return relationships;
  }

  async buildKnowledgeGraph(text: string): Promise<Map<string, KnowledgeGraphNode>> {
    const entities = await this.extractEntities(text);
    const relationships = await this.extractRelationships(text, entities);

    // Build graph nodes
    for (const entity of entities) {
      const entityRelationships = relationships.filter(
        r => r.sourceEntity === entity.id || r.targetEntity === entity.id
      );

      const node: KnowledgeGraphNode = {
        entity,
        relationships: entityRelationships,
        embeddings: await this.generateEmbeddings(entity.name)
      };

      this.graph.set(entity.id, node);
    }

    logger.info('Knowledge graph built', {
      entitiesCount: entities.length,
      relationshipsCount: relationships.length,
      component: 'knowledge-graph'
    });

    return this.graph;
  }

  async semanticSearch(query: string, limit: number = 10): Promise<Entity[]> {
    const queryEmbedding = await this.generateEmbeddings(query);
    const similarities: Array<{ entity: Entity; similarity: number }> = [];

    for (const [_, node] of this.graph) {
      if (node.embeddings) {
        const similarity = this.cosineSimilarity(queryEmbedding, node.embeddings);
        similarities.push({ entity: node.entity, similarity });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.entity);
  }

  private async performNER(text: string): Promise<Entity[]> {
    // Simple pattern-based NER (can be enhanced with ML models)
    const entities: Entity[] = [];
    
    // Person names (capitalized words)
    const personPattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g;
    const personMatches = text.matchAll(personPattern);
    for (const match of personMatches) {
      entities.push({
        id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'PERSON',
        name: match[1],
        properties: {},
        confidence: 0.8
      });
    }

    // Organizations (Inc, Corp, LLC, etc.)
    const orgPattern = /\b([A-Z][a-zA-Z\s]+ (?:Inc|Corp|LLC|Ltd|Company))\b/g;
    const orgMatches = text.matchAll(orgPattern);
    for (const match of orgMatches) {
      entities.push({
        id: `org_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'ORGANIZATION',
        name: match[1],
        properties: {},
        confidence: 0.8
      });
    }

    // Dates
    const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\w+ \d{1,2}, \d{4})\b/g;
    const dateMatches = text.matchAll(datePattern);
    for (const match of dateMatches) {
      entities.push({
        id: `date_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'DATE',
        name: match[1],
        properties: {},
        confidence: 0.9
      });
    }

    return entities;
  }

  private async extractFinancialEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Stock symbols
    const stockPattern = /\b([A-Z]{1,5})\b(?=\s|$)/g;
    const stockMatches = text.matchAll(stockPattern);
    for (const match of stockMatches) {
      // Simple validation - check if it looks like a stock symbol
      if (match[1].length >= 2 && match[1].length <= 5) {
        entities.push({
          id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'STOCK_SYMBOL',
          name: match[1],
          properties: {},
          confidence: 0.7
        });
      }
    }

    // Currency amounts
    const currencyPattern = /\$([0-9,]+(?:\.[0-9]{2})?)\b/g;
    const currencyMatches = text.matchAll(currencyPattern);
    for (const match of currencyMatches) {
      entities.push({
        id: `currency_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'MONEY',
        name: `$${match[1]}`,
        properties: { amount: parseFloat(match[1].replace(/,/g, '')) },
        confidence: 0.9
      });
    }

    return entities;
  }

  private async extractTechnicalEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Programming languages
    const programmingLanguages = ['JavaScript', 'Python', 'Java', 'TypeScript', 'React', 'Node.js'];
    for (const lang of programmingLanguages) {
      const regex = new RegExp(`\\b${lang}\\b`, 'gi');
      if (regex.test(text)) {
        entities.push({
          id: `tech_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'TECHNOLOGY',
          name: lang,
          properties: { category: 'programming_language' },
          confidence: 0.9
        });
      }
    }

    return entities;
  }

  private deduplicateEntities(entities: Entity[]): Entity[] {
    const seen = new Set<string>();
    const deduplicated: Entity[] = [];

    for (const entity of entities) {
      const key = `${entity.type}:${entity.name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(entity);
      }
    }

    return deduplicated;
  }

  private async generateEmbeddings(text: string): Promise<number[]> {
    // Simple mock embeddings (in production, use actual embedding models)
    const embedding = new Array(384).fill(0);
    for (let i = 0; i < text.length && i < 384; i++) {
      embedding[i] = text.charCodeAt(i) / 1000;
    }
    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getEntityById(id: string): Entity | undefined {
    const node = this.graph.get(id);
    return node?.entity;
  }

  getRelatedEntities(entityId: string): Entity[] {
    const node = this.graph.get(entityId);
    if (!node) return [];

    const relatedIds = new Set<string>();
    for (const rel of node.relationships) {
      if (rel.sourceEntity === entityId) {
        relatedIds.add(rel.targetEntity);
      } else {
        relatedIds.add(rel.sourceEntity);
      }
    }

    return Array.from(relatedIds)
      .map(id => this.getEntityById(id))
      .filter(entity => entity !== undefined) as Entity[];
  }
}

export const knowledgeGraph = new KnowledgeGraphService();
