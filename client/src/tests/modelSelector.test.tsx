
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSelector } from '@/components/shared/ModelSelector';
import { ModelConfig } from '@/config/models.config';

// Mock the UI components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-mock" data-value={value} onClick={() => onValueChange?.('test-change')}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <div data-testid="select-trigger" className={className}>{children}</div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value, disabled }: any) => (
    <div data-testid="select-item" data-value={value} data-disabled={disabled}>
      {children}
    </div>
  ),
  SelectValue: ({ children }: any) => <div data-testid="select-value">{children}</div>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  )
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

describe('ModelSelector', () => {
  const mockOnValueChange = vi.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
        />
      );

      expect(screen.getByTestId('select-mock')).toBeInTheDocument();
      expect(screen.getByTestId('select-trigger')).toBeInTheDocument();
    });

    it('should display selected model correctly', () => {
      render(
        <ModelSelector
          value="deepseek-chat"
          onValueChange={mockOnValueChange}
        />
      );

      const selectMock = screen.getByTestId('select-mock');
      expect(selectMock).toHaveAttribute('data-value', 'deepseek-chat');
    });

    it('should handle size variants', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
          size="sm"
        />
      );

      const trigger = screen.getByTestId('select-trigger');
      expect(trigger.className).toContain('h-7');
      expect(trigger.className).toContain('text-xs');
    });
  });

  describe('Category Filtering', () => {
    it('should filter models by category', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
          category="research"
        />
      );

      const selectItems = screen.getAllByTestId('select-item');
      expect(selectItems.length).toBeGreaterThan(0);
      
      // Should include research-capable models
      const researchModels = ModelConfig.getModelsForCategory('research');
      expect(selectItems.length).toBe(researchModels.length);
    });

    it('should show all models when no category specified', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
        />
      );

      const selectItems = screen.getAllByTestId('select-item');
      const allModels = ModelConfig.getAllModels();
      expect(selectItems.length).toBe(allModels.length);
    });
  });

  describe('Context Validation', () => {
    it('should disable incompatible models', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
          context="vietnamese"
        />
      );

      const selectItems = screen.getAllByTestId('select-item');
      
      // Check that deepseek-chat is disabled for vietnamese context
      const deepseekItem = selectItems.find(item => 
        item.getAttribute('data-value') === 'deepseek-chat'
      );
      
      if (deepseekItem) {
        expect(deepseekItem).toHaveAttribute('data-disabled', 'true');
      }
    });

    it('should enable compatible models', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
          context="vietnamese"
        />
      );

      const selectItems = screen.getAllByTestId('select-item');
      
      // Check that gemini is enabled for vietnamese context
      const geminiItem = selectItems.find(item => 
        item.getAttribute('data-value') === 'gemini-1.5-flash'
      );
      
      if (geminiItem) {
        expect(geminiItem).toHaveAttribute('data-disabled', 'false');
      }
    });
  });

  describe('UI Variants', () => {
    it('should render compact variant', () => {
      render(
        <ModelSelector
          value="deepseek-chat"
          onValueChange={mockOnValueChange}
          variant="compact"
        />
      );

      expect(screen.getByTestId('select-mock')).toBeInTheDocument();
      // Compact variant should not show color indicators
    });

    it('should render detailed variant with descriptions', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
          variant="detailed"
          showDescriptions={true}
        />
      );

      expect(screen.getByTestId('select-mock')).toBeInTheDocument();
      // Should show additional model information
    });

    it('should show badges when enabled', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
          showBadges={true}
        />
      );

      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Interaction', () => {
    it('should call onValueChange when model is selected', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
        />
      );

      const selectMock = screen.getByTestId('select-mock');
      fireEvent.click(selectMock);

      expect(mockOnValueChange).toHaveBeenCalledWith('test-change');
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <ModelSelector
          value="auto"
          onValueChange={mockOnValueChange}
          disabled={true}
        />
      );

      const trigger = screen.getByTestId('select-trigger');
      expect(trigger.className).toContain('opacity-50');
      expect(trigger.className).toContain('cursor-not-allowed');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model IDs gracefully', () => {
      expect(() => {
        render(
          <ModelSelector
            value={'invalid-model' as any}
            onValueChange={mockOnValueChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle missing context gracefully', () => {
      expect(() => {
        render(
          <ModelSelector
            value="auto"
            onValueChange={mockOnValueChange}
            context="invalid-context"
          />
        );
      }).not.toThrow();
    });
  });
});
