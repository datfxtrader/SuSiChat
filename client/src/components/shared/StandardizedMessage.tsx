
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Copy, Share2, Bookmark, CheckCircle, Clock } from 'lucide-react';
import { TypewriterText } from '@/components/shared/TypewriterText';
import { TypewriterConfig } from '@/config/typewriter.config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UIStandards, { UITheme } from '@/config/ui-standards.config';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  languages?: string[];
}

interface StandardizedMessageProps {
  message: Message;
  isLatest: boolean;
  theme: UITheme;
  userProfile?: any;
  assistantName?: string;
  assistantIcon?: React.ReactNode;
  showActions?: boolean;
  enableTypewriter?: boolean;
  onCopy?: (content: string) => void;
  onShare?: (message: Message) => void;
  onBookmark?: (message: Message) => void;
}

const StandardizedMessage = memo<StandardizedMessageProps>(({ 
  message, 
  isLatest, 
  theme,
  userProfile,
  assistantName = 'AI Assistant',
  assistantIcon = <Bot className="w-3 h-3" />,
  showActions = true,
  enableTypewriter = true,
  onCopy,
  onShare,
  onBookmark
}) => {
  const [copySuccess, setCopySuccess] = useState('');
  const [typewriterComplete, setTypewriterComplete] = useState(!isLatest || message.role === 'user');

  const themeColors = UIStandards.colors[theme];
  const animations = UIStandards.animations;

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  }, [message.content, onCopy]);

  const handleTypewriterComplete = useCallback(() => {
    setTypewriterComplete(true);
  }, []);

  // Reset typewriter state when isLatest changes
  useEffect(() => {
    if (isLatest && message.role === 'assistant' && message.content && message.content.length > 0) {
      setTypewriterComplete(false);
    } else {
      setTypewriterComplete(true);
    }
  }, [isLatest, message]);

  const contentLength = useMemo(() => message.content.length, [message.content]);
  const estimatedReadTime = useMemo(() => Math.ceil(contentLength / 1000), [contentLength]);

  if (message.role === 'user') {
    return (
      <motion.div
        initial={animations.fadeIn.initial}
        animate={animations.fadeIn.animate}
        exit={animations.fadeIn.exit}
        className="flex justify-end mb-4"
      >
        <div className={UIStandards.utils.combineClasses(
          'group max-w-[80%] rounded-2xl px-4 py-3 shadow-lg transition-all duration-200',
          `bg-gradient-to-br ${themeColors.primary} text-white`,
          UIStandards.states.hover.lift
        )}>
          {showActions && (
            <div className="flex items-center justify-between mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className={UIStandards.utils.combineClasses(
                'flex items-center space-x-2',
                UIStandards.typography.body.muted,
                'text-white/80'
              )}>
                <User className="w-3 h-3" />
                <span>You</span>
                <span>•</span>
                <span>{UIStandards.utils.formatRelativeTime(message.timestamp)}</span>
              </div>
              <Button 
                onClick={handleCopy} 
                className={UIStandards.utils.combineClasses(
                  UIStandards.components.button.base,
                  UIStandards.components.button.sizes.sm,
                  'hover:bg-white/20 bg-transparent border-none text-white/80 hover:text-white'
                )}
              >
                {copySuccess ? <CheckCircle className="w-3 h-3 text-green-300" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          )}
          <div className="whitespace-pre-wrap">
            {UIStandards.utils.formatText(message.content, theme)}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={animations.slideIn.initial}
      animate={animations.slideIn.animate}
      exit={animations.slideIn.exit}
      className="flex justify-start mb-4"
    >
      <div className={UIStandards.utils.combineClasses(
        'group max-w-[80%] rounded-2xl px-4 py-3 shadow-lg transition-all duration-200',
        UIStandards.components.card.variants[theme],
        UIStandards.states.hover.lift
      )}>
        {showActions && (
          <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className={UIStandards.utils.combineClasses(
              'flex items-center space-x-2',
              UIStandards.typography.body.muted
            )}>
              <div className="flex items-center space-x-1">
                <div className={themeColors.accent}>
                  {assistantIcon}
                </div>
                <span>{assistantName}</span>
              </div>
              <span>•</span>
              <span>{UIStandards.utils.formatRelativeTime(message.timestamp)}</span>
              <span>•</span>
              <span>{estimatedReadTime} min read</span>
            </div>
            <div className="flex items-center space-x-1">
              <Button 
                onClick={handleCopy} 
                className={UIStandards.utils.combineClasses(
                  UIStandards.components.button.base,
                  UIStandards.components.button.sizes.sm,
                  UIStandards.components.button.variants.ghost
                )}
              >
                {copySuccess ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </Button>
              {onShare && (
                <Button 
                  onClick={() => onShare(message)}
                  className={UIStandards.utils.combineClasses(
                    UIStandards.components.button.base,
                    UIStandards.components.button.sizes.sm,
                    UIStandards.components.button.variants.ghost
                  )}
                >
                  <Share2 className="w-3 h-3" />
                </Button>
              )}
              {onBookmark && (
                <Button 
                  onClick={() => onBookmark(message)}
                  className={UIStandards.utils.combineClasses(
                    UIStandards.components.button.base,
                    UIStandards.components.button.sizes.sm,
                    UIStandards.components.button.variants.ghost
                  )}
                >
                  <Bookmark className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="prose prose-sm max-w-none">
          {isLatest && !typewriterComplete && enableTypewriter ? (
            <TypewriterText
              text={message.content}
              speed={UIStandards.typewriter.speeds[theme === 'research' ? 'research' : 'chat']}
              renderMarkdown={true}
              onComplete={handleTypewriterComplete}
              enableSound={UIStandards.typewriter.effects.enableSound}
              robust={true}
              showProgress={message.content.length > UIStandards.typewriter.effects.progressThreshold}
              className={UIStandards.typography.body.primary}
            />
          ) : (
            <div className={UIStandards.utils.combineClasses(
              'whitespace-pre-wrap animate-fade-in',
              UIStandards.typography.body.primary
            )}>
              {UIStandards.utils.formatText(message.content, theme)}
            </div>
          )}
        </div>

        {/* Show detected language if code-switching */}
        {message.languages && message.languages.length > 1 && (
          <div className="flex gap-2 mt-3 pt-2 border-t border-current/10">
            <Badge className={UIStandards.components.badge.variants.secondary}>
              Multi-language
            </Badge>
            <div className="flex gap-1">
              {message.languages.map(lang => (
                <span key={lang} className="text-sm">
                  {lang === 'vi' ? '🇻🇳' : lang === 'en' ? '🇺🇸' : '🇵🇱'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

StandardizedMessage.displayName = 'StandardizedMessage';

export default StandardizedMessage;
