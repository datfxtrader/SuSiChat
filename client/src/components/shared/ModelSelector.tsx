
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ModelConfig, type ModelId, type ModelCategory } from '@/config/models.config';
import { UIStandards } from '@/config/ui-standards.config';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  value: ModelId;
  onValueChange: (value: ModelId) => void;
  category?: ModelCategory;
  context?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  disabled?: boolean;
  className?: string;
  showBadges?: boolean;
  showDescriptions?: boolean;
}

export function ModelSelector({
  value,
  onValueChange,
  category,
  context,
  size = 'md',
  variant = 'default',
  disabled = false,
  className,
  showBadges = true,
  showDescriptions = false
}: ModelSelectorProps) {
  const models = category ? 
    ModelConfig.getModelsForCategory(category) : 
    ModelConfig.getAllModels();

  const selectedModel = ModelConfig.getModel(value);
  const modelTheme = UIStandards.models.getModelTheme(value);

  const triggerSizes = {
    sm: 'h-7 text-xs',
    md: 'h-8 text-sm', 
    lg: 'h-10 text-base'
  };

  const validateModel = (modelId: ModelId): boolean => {
    if (!context) return true;
    return ModelConfig.validateModelForContext(modelId, context);
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Select 
        value={value} 
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger 
          className={cn(
            'bg-slate-800/50 border-slate-700/50',
            triggerSizes[size],
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          <div className="flex items-center gap-2">
            {variant !== 'compact' && (
              <div 
                className={cn(
                  'w-2 h-2 rounded-full bg-gradient-to-r',
                  modelTheme.primary
                )}
              />
            )}
            <SelectValue>
              {variant === 'compact' ? selectedModel.name : selectedModel.displayName}
            </SelectValue>
          </div>
        </SelectTrigger>
        
        <SelectContent>
          {models.map((model) => {
            const isValid = validateModel(model.id as ModelId);
            const formattedModel = ModelConfig.formatModelForUI(model.id);
            
            return (
              <SelectItem 
                key={model.id} 
                value={model.id}
                disabled={!isValid}
                className={cn(
                  'cursor-pointer',
                  !isValid && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div 
                      className={cn(
                        'w-3 h-3 rounded-full bg-gradient-to-r',
                        formattedModel.color
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{formattedModel.name}</span>
                      {showDescriptions && variant === 'detailed' && (
                        <span className="text-xs text-muted-foreground">
                          {formattedModel.description}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {showBadges && (
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant={formattedModel.tier === 'premium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {formattedModel.tier}
                      </Badge>
                      {!isValid && (
                        <Badge variant="destructive" className="text-xs">
                          Incompatible
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      {variant === 'detailed' && (
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Context: {selectedModel.limits.contextWindow}</span>
            <span>•</span>
            <span>Max: {selectedModel.limits.maxTokens}</span>
            {selectedModel.pricing && (
              <>
                <span>•</span>
                <span>${selectedModel.pricing.inputTokens}/1k tokens</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
