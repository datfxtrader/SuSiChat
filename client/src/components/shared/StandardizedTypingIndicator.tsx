
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import UIStandards, { UITheme } from '@/config/ui-standards.config';

interface StandardizedTypingIndicatorProps {
  theme: UITheme;
  assistantName?: string;
  assistantIcon?: React.ReactNode;
  userProfile?: any;
  customMessage?: string;
}

const StandardizedTypingIndicator = memo<StandardizedTypingIndicatorProps>(({ 
  theme,
  assistantName = 'AI Assistant',
  assistantIcon = <Bot className="w-4 h-4" />,
  userProfile,
  customMessage
}) => {
  const themeColors = UIStandards.colors[theme];
  const animations = UIStandards.animations;

  const getTypingMessage = () => {
    if (customMessage) return customMessage;
    
    if (userProfile?.languages?.includes('vi')) {
      return 'Đang suy nghĩ...';
    }
    return 'Thinking...';
  };

  return (
    <motion.div
      initial={animations.fadeIn.initial}
      animate={animations.fadeIn.animate}
      exit={animations.fadeIn.exit}
      className="flex items-center gap-3 mb-4"
    >
      <div className={UIStandards.utils.combineClasses(
        UIStandards.components.card.base,
        UIStandards.components.card.variants[theme],
        'p-4'
      )}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className={UIStandards.utils.combineClasses(
                  'w-2 h-2 rounded-full',
                  themeColors.accent.replace('text-', 'bg-')
                )}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className={themeColors.accent}>
              {assistantIcon}
            </div>
            <span className={UIStandards.typography.body.muted}>
              {getTypingMessage()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

StandardizedTypingIndicator.displayName = 'StandardizedTypingIndicator';

export default StandardizedTypingIndicator;
