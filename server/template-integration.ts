/**
 * Template Integration API for DeerFlow Research Service
 * 
 * This module handles communication between the frontend and the Template Agent,
 * providing endpoints for template creation, management, and AI-powered suggestions.
 */

import { Request, Response } from 'express';
import axios from 'axios';

interface TemplateVariable {
  name: string;
  description: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  required: boolean;
}

interface ResearchTemplate {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  category: string;
  icon: string;
  variables: string[];
  created_by: string;
  created_at: string;
  usage_count: number;
  effectiveness_score: number;
  tags: string[];
  is_public: boolean;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: string[];
}

class TemplateService {
  private deerflowBaseUrl: string;

  constructor() {
    this.deerflowBaseUrl = process.env.DEERFLOW_SERVICE_URL || 'http://localhost:8000';
  }

  async getTemplateCategories(): Promise<TemplateCategory[]> {
    try {
      const response = await axios.get(`${this.deerflowBaseUrl}/api/templates/categories`);
      return response.data.categories || [];
    } catch (error) {
      console.error('Error fetching template categories:', error);
      return this.getDefaultCategories();
    }
  }

  async getTemplatesByCategory(category: string): Promise<ResearchTemplate[]> {
    try {
      const response = await axios.get(`${this.deerflowBaseUrl}/api/templates/category/${category}`);
      return response.data.templates || [];
    } catch (error) {
      console.error('Error fetching templates by category:', error);
      return [];
    }
  }

  async getUserTemplates(userId: string): Promise<ResearchTemplate[]> {
    try {
      const response = await axios.get(`${this.deerflowBaseUrl}/api/templates/user/${userId}`);
      return response.data.templates || [];
    } catch (error) {
      console.error('Error fetching user templates:', error);
      return [];
    }
  }

  async createTemplate(templateData: {
    name: string;
    description: string;
    prompt_template: string;
    category: string;
    icon: string;
    tags: string[];
    user_id: string;
  }): Promise<{ success: boolean; template?: ResearchTemplate; error?: string; suggestions?: string[] }> {
    try {
      const response = await axios.post(`${this.deerflowBaseUrl}/api/templates/create`, templateData);
      return response.data;
    } catch (error) {
      console.error('Error creating template:', error);
      return {
        success: false,
        error: 'Failed to create template. Please try again.'
      };
    }
  }

  async generateTemplateFromQuery(userId: string, query: string): Promise<{
    success: boolean;
    suggested_template?: any;
    confidence?: number;
    message?: string;
    reason?: string;
  }> {
    try {
      const response = await axios.post(`${this.deerflowBaseUrl}/api/templates/generate`, {
        user_id: userId,
        query: query
      });
      return response.data;
    } catch (error) {
      console.error('Error generating template from query:', error);
      return {
        success: false,
        message: 'Failed to generate template from query'
      };
    }
  }

  async getTemplateImprovements(templateId: string): Promise<{
    template_id: string;
    current_performance: any;
    suggestions: any[];
  }> {
    try {
      const response = await axios.get(`${this.deerflowBaseUrl}/api/templates/${templateId}/improvements`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template improvements:', error);
      return {
        template_id: templateId,
        current_performance: {},
        suggestions: []
      };
    }
  }

  async searchTemplates(query: string, category?: string): Promise<ResearchTemplate[]> {
    try {
      const params = new URLSearchParams({ query });
      if (category) params.append('category', category);
      
      const response = await axios.get(`${this.deerflowBaseUrl}/api/templates/search?${params}`);
      return response.data.templates || [];
    } catch (error) {
      console.error('Error searching templates:', error);
      return [];
    }
  }

  async trackTemplateUsage(templateId: string, effectivenessScore?: number): Promise<void> {
    try {
      await axios.post(`${this.deerflowBaseUrl}/api/templates/${templateId}/usage`, {
        effectiveness_score: effectivenessScore
      });
    } catch (error) {
      console.error('Error tracking template usage:', error);
    }
  }

  async getPopularTemplates(limit: number = 10): Promise<ResearchTemplate[]> {
    try {
      const response = await axios.get(`${this.deerflowBaseUrl}/api/templates/popular?limit=${limit}`);
      return response.data.templates || [];
    } catch (error) {
      console.error('Error fetching popular templates:', error);
      return [];
    }
  }

  private getDefaultCategories(): TemplateCategory[] {
    return [
      {
        id: 'financial',
        name: 'Financial Analysis',
        description: 'Templates for market analysis, investment research, and financial reporting',
        icon: 'TrendingUp',
        templates: []
      },
      {
        id: 'competitive',
        name: 'Competitive Intelligence',
        description: 'Templates for competitor analysis and market positioning',
        icon: 'Search',
        templates: []
      },
      {
        id: 'risk',
        name: 'Risk Assessment',
        description: 'Templates for risk analysis and opportunity evaluation',
        icon: 'AlertCircle',
        templates: []
      },
      {
        id: 'industry',
        name: 'Industry Research',
        description: 'Templates for sector analysis and industry insights',
        icon: 'Database',
        templates: []
      },
      {
        id: 'technology',
        name: 'Technology Analysis',
        description: 'Templates for tech trends, innovation, and digital transformation',
        icon: 'Sparkles',
        templates: []
      },
      {
        id: 'custom',
        name: 'Custom Templates',
        description: 'User-created personalized research templates',
        icon: 'Settings',
        templates: []
      }
    ];
  }

  fillTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  }
}

const templateService = new TemplateService();

// API Routes
export async function getTemplateCategories(req: Request, res: Response) {
  try {
    const categories = await templateService.getTemplateCategories();
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error in getTemplateCategories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template categories' });
  }
}

export async function getTemplatesByCategory(req: Request, res: Response) {
  try {
    const { category } = req.params;
    const templates = await templateService.getTemplatesByCategory(category);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error in getTemplatesByCategory:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
}

export async function getUserTemplates(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const templates = await templateService.getUserTemplates(userId);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error in getUserTemplates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user templates' });
  }
}

export async function createTemplate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { name, description, prompt_template, category, icon, tags } = req.body;

    if (!name || !description || !prompt_template) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, description, and prompt template are required' 
      });
    }

    const result = await templateService.createTemplate({
      name,
      description,
      prompt_template,
      category: category || 'custom',
      icon: icon || 'FileText',
      tags: tags || [],
      user_id: userId
    });

    res.json(result);
  } catch (error) {
    console.error('Error in createTemplate:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
}

export async function generateTemplateFromQuery(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const result = await templateService.generateTemplateFromQuery(userId, query);
    res.json(result);
  } catch (error) {
    console.error('Error in generateTemplateFromQuery:', error);
    res.status(500).json({ success: false, error: 'Failed to generate template' });
  }
}

export async function getTemplateImprovements(req: Request, res: Response) {
  try {
    const { templateId } = req.params;
    const improvements = await templateService.getTemplateImprovements(templateId);
    res.json({ success: true, improvements });
  } catch (error) {
    console.error('Error in getTemplateImprovements:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template improvements' });
  }
}

export async function searchTemplates(req: Request, res: Response) {
  try {
    const { query, category } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const templates = await templateService.searchTemplates(
      query as string, 
      category as string
    );
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error in searchTemplates:', error);
    res.status(500).json({ success: false, error: 'Failed to search templates' });
  }
}

export async function trackTemplateUsage(req: Request, res: Response) {
  try {
    const { templateId } = req.params;
    const { effectiveness_score } = req.body;

    await templateService.trackTemplateUsage(templateId, effectiveness_score);
    res.json({ success: true, message: 'Template usage tracked' });
  } catch (error) {
    console.error('Error in trackTemplateUsage:', error);
    res.status(500).json({ success: false, error: 'Failed to track template usage' });
  }
}

export async function getPopularTemplates(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const templates = await templateService.getPopularTemplates(limit);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error in getPopularTemplates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch popular templates' });
  }
}

export async function fillTemplate(req: Request, res: Response) {
  try {
    const { template, variables } = req.body;
    if (!template || !variables) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template and variables are required' 
      });
    }

    const filledTemplate = templateService.fillTemplate(template, variables);
    res.json({ success: true, filled_template: filledTemplate });
  } catch (error) {
    console.error('Error in fillTemplate:', error);
    res.status(500).json({ success: false, error: 'Failed to fill template' });
  }
}

export { templateService };