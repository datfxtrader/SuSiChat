
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, Settings, User, MessageSquare } from 'lucide-react';
import { BelgaCatIcon } from './BelgaCatIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UIStandards, { UITheme } from '@/config/ui-standards.config';

interface StandardizedHeaderProps {
  theme: UITheme;
  title?: string;
  subtitle?: string;
  assistantName?: string;
  assistantIcon?: React.ReactNode;
  userProfile?: any;
  mood?: string;
  moodEmojis?: Record<string, string>;
  onMoodChange?: (mood: string) => void;
  onSettings?: () => void;
  showMoodSelector?: boolean;
  showSettings?: boolean;
  status?: 'online' | 'offline' | 'busy';
}

const StandardizedHeader = memo<StandardizedHeaderProps>(({
  theme,
  title,
  subtitle,
  assistantName = 'SuSi',
  assistantIcon = <BelgaCatIcon className="w-5 h-5" />,
  userProfile,
  mood = 'neutral',
  moodEmojis = {
    happy: '😊',
    excited: '🎉',
    thoughtful: '🤔',
    tired: '😴',
    stressed: '😰',
    neutral: '😌'
  },
  onMoodChange,
  onSettings,
  showMoodSelector = false,
  showSettings = true,
  status = 'online'
}) => {
  const themeColors = UIStandards.colors[theme];
  const animations = UIStandards.animations;

  const getGreeting = () => {
    if (title) return title;
    
    const hour = new Date().getHours();
    const name = userProfile?.name || 'Friend';

    if (userProfile?.languages?.includes('vi')) {
      if (hour < 12) return `Chào buổi sáng ${name}! ☀️`;
      if (hour < 18) return `Chào ${name}! Chiều nay thế nào? 😊`;
      return `Chào ${name}! Tối nay vui không? 🌙`;
    }

    if (hour < 12) return `Good morning ${name}! ☀️`;
    if (hour < 18) return `Hey ${name}! How's your afternoon? 😊`;
    return `Evening ${name}! How's it going? 🌙`;
  };

  const getSubtitle = () => {
    if (subtitle) return subtitle;
    
    if (userProfile?.languages?.includes('vi')) {
      return `Tôi ở đây để giúp bạn ${moodEmojis[mood]}`;
    }
    return `I'm here for you ${moodEmojis[mood]}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'busy': return 'bg-yellow-400';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-green-400';
    }
  };

  return (
    <div className={UIStandards.utils.combineClasses(
      UIStandards.components.card.base,
      UIStandards.components.card.variants[theme],
      'p-4 shadow-sm'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={UIStandards.utils.combineClasses(
            'w-10 h-10 rounded-full flex items-center justify-center shadow-md relative',
            `bg-gradient-to-br ${themeColors.primary}`
          )}>
            <div className="text-white">
              {assistantIcon}
            </div>
            <div className={UIStandards.utils.combineClasses(
              'w-2 h-2 rounded-full absolute -bottom-0 -right-0 animate-pulse',
              getStatusColor()
            )} />
          </div>
          
          <div>
            <motion.h2 
              className={UIStandards.utils.combineClasses(
                'text-lg font-semibold flex items-center gap-2',
                UIStandards.typography.heading.h2.replace('mb-3 mt-8', '')
              )}
              initial={animations.fadeIn.initial}
              animate={animations.fadeIn.animate}
            >
              {getGreeting()}
            </motion.h2>
            
            <p className={UIStandards.utils.combineClasses(
              'flex items-center gap-1',
              UIStandards.typography.body.muted
            )}>
              <MessageSquare className="w-3 h-3" />
              {getSubtitle()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mood Selector */}
          {showMoodSelector && onMoodChange && (
            <div className="flex items-center gap-2">
              <span className={UIStandards.typography.body.muted}>Mood:</span>
              <div className="flex gap-1">
                {Object.entries(moodEmojis).map(([moodType, emoji]) => (
                  <button
                    key={moodType}
                    onClick={() => onMoodChange(moodType)}
                    className={UIStandards.utils.combineClasses(
                      'text-xl p-2 rounded-lg transition-all duration-200',
                      UIStandards.states.hover.scale,
                      mood === moodType 
                        ? `${themeColors.background} scale-110 ring-2 ring-current`
                        : UIStandards.states.hover.lift
                    )}
                    title={moodType}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Settings Button */}
          {showSettings && onSettings && (
            <Button
              onClick={onSettings}
              className={UIStandards.utils.combineClasses(
                UIStandards.components.button.base,
                UIStandards.components.button.sizes.md,
                UIStandards.components.button.variants.ghost
              )}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

StandardizedHeader.displayName = 'StandardizedHeader';

export default StandardizedHeader;
