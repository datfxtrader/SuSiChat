
import { describe, it, expect, beforeEach } from 'vitest';
import { ModelConfig, type ModelId, type ModelCategory } from '@/config/models.config';

describe('ModelConfig', () => {
  describe('Model Management', () => {
    it('should return valid model for existing ID', () => {
      const model = ModelConfig.getModel('deepseek-chat');
      expect(model).toBeDefined();
      expect(model.id).toBe('deepseek-chat');
      expect(model.displayName).toBe('DeepSeek Chat');
    });

    it('should return auto model for invalid ID', () => {
      const model = ModelConfig.getModel('invalid-model' as ModelId);
      expect(model).toBeDefined();
      expect(model.id).toBe('auto');
    });

    it('should return all models', () => {
      const models = ModelConfig.getAllModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(model => model.id && model.displayName)).toBe(true);
    });
  });

  describe('Category Management', () => {
    it('should return models for valid category', () => {
      const models = ModelConfig.getModelsForCategory('research');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(model => model.capabilities.research)).toBe(true);
    });

    it('should return all models for invalid category', () => {
      const models = ModelConfig.getModelsForCategory('invalid-category' as ModelCategory);
      const allModels = ModelConfig.getAllModels();
      expect(models.length).toBe(allModels.length);
    });

    it('should return default model for category', () => {
      const model = ModelConfig.getDefaultModel('research');
      expect(model).toBeDefined();
      expect(model.capabilities.research).toBe(true);
    });
  });

  describe('Capability Filtering', () => {
    it('should filter models by capability', () => {
      const vietnameseModels = ModelConfig.getModelsByCapability('vietnamese');
      expect(vietnameseModels.every(model => model.capabilities.vietnamese)).toBe(true);
    });

    it('should filter models by provider', () => {
      const deepseekModels = ModelConfig.getModelsByProvider('deepseek');
      expect(deepseekModels.every(model => model.provider === 'deepseek')).toBe(true);
    });

    it('should validate model for context', () => {
      const isValid = ModelConfig.validateModelForContext('gemini-1.5-flash', 'vietnamese');
      expect(isValid).toBe(true);

      const isInvalid = ModelConfig.validateModelForContext('deepseek-chat', 'vietnamese');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Auto Model Routing', () => {
    it('should route auto model based on depth', () => {
      const depth3Model = ModelConfig.getRoutedModel('auto', { depth: 3 });
      expect(depth3Model.id).toBe('gemini-1.5-flash');

      const depth1Model = ModelConfig.getRoutedModel('auto', { depth: 1 });
      expect(depth1Model.id).toBe('deepseek-chat');
    });

    it('should route auto model based on type', () => {
      const vietnameseModel = ModelConfig.getRoutedModel('auto', { type: 'vietnamese' });
      expect(vietnameseModel.capabilities.vietnamese).toBe(true);
    });

    it('should return same model for non-auto models', () => {
      const model = ModelConfig.getRoutedModel('deepseek-chat', { depth: 3 });
      expect(model.id).toBe('deepseek-chat');
    });
  });

  describe('UI Formatting', () => {
    it('should format model for UI correctly', () => {
      const formatted = ModelConfig.formatModelForUI('gemini-1.5-flash');
      expect(formatted).toHaveProperty('id');
      expect(formatted).toHaveProperty('name');
      expect(formatted).toHaveProperty('description');
      expect(formatted).toHaveProperty('color');
      expect(formatted).toHaveProperty('capabilities');
      expect(Array.isArray(formatted.capabilities)).toBe(true);
    });

    it('should include only enabled capabilities', () => {
      const formatted = ModelConfig.formatModelForUI('deepseek-chat');
      expect(formatted.capabilities).not.toContain('vietnamese');
      expect(formatted.capabilities).toContain('chat');
      expect(formatted.capabilities).toContain('research');
    });
  });

  describe('Model Properties Validation', () => {
    it('should have consistent model structure', () => {
      const models = ModelConfig.getAllModels();
      
      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('displayName');
        expect(model).toHaveProperty('description');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('capabilities');
        expect(model).toHaveProperty('limits');
        expect(model).toHaveProperty('metadata');
        
        // Validate capabilities structure
        expect(typeof model.capabilities.chat).toBe('boolean');
        expect(typeof model.capabilities.research).toBe('boolean');
        expect(typeof model.capabilities.vietnamese).toBe('boolean');
        
        // Validate limits structure
        expect(model.limits).toHaveProperty('maxTokens');
        expect(model.limits).toHaveProperty('contextWindow');
        expect(model.limits).toHaveProperty('rateLimitPerMinute');
        
        // Validate metadata structure
        expect(model.metadata).toHaveProperty('color');
        expect(model.metadata).toHaveProperty('icon');
        expect(model.metadata).toHaveProperty('tier');
      });
    });

    it('should have valid category definitions', () => {
      const categories = ModelConfig.getAllCategories();
      
      categories.forEach(category => {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('models');
        expect(category).toHaveProperty('description');
        expect(Array.isArray(category.models)).toBe(true);
        expect(category.models.length).toBeGreaterThan(0);
        
        // Validate all referenced models exist
        category.models.forEach(modelId => {
          const model = ModelConfig.getModel(modelId);
          expect(model).toBeDefined();
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty or null inputs gracefully', () => {
      expect(() => ModelConfig.getModel('')).not.toThrow();
      expect(() => ModelConfig.getModelsForCategory('')).not.toThrow();
      expect(() => ModelConfig.validateModelForContext('', '')).not.toThrow();
    });

    it('should maintain immutability', () => {
      const model1 = ModelConfig.getModel('deepseek-chat');
      const model2 = ModelConfig.getModel('deepseek-chat');
      
      expect(model1).toEqual(model2);
      
      // Verify we can't modify the config
      expect(() => {
        (model1 as any).displayName = 'Modified';
      }).toThrow();
    });
  });
});
