
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStreamingTypewriter } from '@/hooks/useStreamingTypewriter';
import { TypewriterText } from '@/components/shared/TypewriterText';
import { Loader2 } from 'lucide-react';

interface StreamingChatMessageProps {
  websocketUrl: string;
  onComplete?: () => void;
}

export const StreamingChatMessage: React.FC<StreamingChatMessageProps> = ({
  websocketUrl,
  onComplete
}) => {
  const {
    displayedText,
    fullText,
    isStreaming,
    isTyping,
    skipAll,
    messageType
  } = useStreamingTypewriter(websocketUrl, {
    speed: messageType === 'research' ? 20 : 30,
    bufferSize: 100,
    onComplete
  });

  const [showThinkingIndicator, setShowThinkingIndicator] = useState(true);

  useEffect(() => {
    // Hide thinking indicator when content starts appearing
    if (displayedText.length > 0) {
      setShowThinkingIndicator(false);
    }
  }, [displayedText]);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {showThinkingIndicator && isStreaming && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-gray-500"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </motion.div>
        )}

        {displayedText && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onDoubleClick={skipAll}
          >
            <TypewriterText
              text={displayedText}
              speed={0} // Already handled by streaming hook
              renderMarkdown={true}
              showCursor={isTyping}
              enableSound={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button for long responses */}
      {isTyping && fullText.length > 500 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -bottom-8 left-0 text-xs text-gray-500 hover:text-gray-700"
          onClick={skipAll}
        >
          Skip animation (or double-click)
        </motion.button>
      )}
    </div>
  );
};
