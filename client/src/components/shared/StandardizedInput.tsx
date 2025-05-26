
import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Paperclip, Mic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UIStandards, { UITheme } from '@/config/ui-standards.config';

interface StandardizedInputProps {
  theme: UITheme;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  showAttachment?: boolean;
  showVoice?: boolean;
  maxLength?: number;
  userProfile?: any;
  onAttachment?: () => void;
  onVoiceRecord?: () => void;
}

const StandardizedInput = memo<StandardizedInputProps>(({
  theme,
  value,
  onChange,
  onSubmit,
  placeholder,
  isLoading = false,
  disabled = false,
  showAttachment = false,
  showVoice = false,
  maxLength = 2000,
  userProfile,
  onAttachment,
  onVoiceRecord
}) => {
  const themeColors = UIStandards.colors[theme];
  const animations = UIStandards.animations;

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    
    if (userProfile?.languages?.includes('vi')) {
      return 'Nhắn gì đó...';
    }
    return 'Type a message...';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!value.trim() || isLoading || disabled) return;
    onSubmit(value);
  };

  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.8;
  const isOverLimit = charCount > maxLength;

  return (
    <div className={UIStandards.utils.combineClasses(
      UIStandards.components.card.base,
      UIStandards.components.card.variants[theme],
      'p-4'
    )}>
      <div className="flex gap-3 items-end">
        {/* Attachment Button */}
        {showAttachment && onAttachment && (
          <Button
            onClick={onAttachment}
            disabled={isLoading || disabled}
            className={UIStandards.utils.combineClasses(
              UIStandards.components.button.base,
              UIStandards.components.button.sizes.md,
              UIStandards.components.button.variants.ghost
            )}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        )}

        {/* Input Container */}
        <div className="flex-1 relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholder()}
            disabled={isLoading || disabled}
            maxLength={maxLength}
            className={UIStandards.utils.combineClasses(
              'flex-1 rounded-xl px-4 py-3 text-base transition-all duration-200',
              UIStandards.states.focus.ring,
              themeColors.background,
              themeColors.border
            )}
          />
          
          {/* Character Count */}
          <AnimatePresence>
            {(value && (isNearLimit || isOverLimit)) && (
              <motion.div
                initial={animations.scaleIn.initial}
                animate={animations.scaleIn.animate}
                exit={animations.scaleIn.exit}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <Badge 
                  className={UIStandards.utils.combineClasses(
                    UIStandards.components.badge.base,
                    isOverLimit 
                      ? UIStandards.components.badge.variants.error
                      : UIStandards.components.badge.variants.warning
                  )}
                >
                  {charCount}/{maxLength}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Voice Button */}
        {showVoice && onVoiceRecord && (
          <Button
            onClick={onVoiceRecord}
            disabled={isLoading || disabled}
            className={UIStandards.utils.combineClasses(
              UIStandards.components.button.base,
              UIStandards.components.button.sizes.md,
              UIStandards.components.button.variants.ghost
            )}
          >
            <Mic className="w-4 h-4" />
          </Button>
        )}

        {/* Send Button */}
        <Button 
          onClick={handleSubmit}
          disabled={isLoading || disabled || !value.trim() || isOverLimit}
          className={UIStandards.utils.combineClasses(
            UIStandards.components.button.base,
            UIStandards.components.button.sizes.lg,
            `bg-gradient-to-r ${themeColors.primary} text-white shadow-lg transition-all duration-200`,
            UIStandards.states.hover.lift,
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <div className={UIStandards.states.loading.spinner} />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
});

StandardizedInput.displayName = 'StandardizedInput';

export default StandardizedInput;
