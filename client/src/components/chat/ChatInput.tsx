
import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizontal, BellPlus, CalendarClock, Users, Plane, Mic, Paperclip, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onScheduleClick?: () => void;
  onFamilyRoomClick?: () => void;
  onAttachment?: (files: FileList) => void;
  onVoiceInput?: () => void;
  onEmojiClick?: () => void;
  placeholder?: string;
  maxLength?: number;
  maxHeight?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  quickActions?: QuickAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  prefillText?: string;
}

// Constants
const DEFAULT_PLACEHOLDER = "Message Tongkeeper...";
const DEFAULT_MAX_HEIGHT = 120;
const DEFAULT_MAX_LENGTH = 5000;
const MIN_HEIGHT = 40;

const DEFAULT_QUICK_ACTIONS: Omit<QuickAction, 'action'>[] = [
  {
    id: 'reminder',
    label: 'Set reminder',
    icon: BellPlus,
    prefillText: 'Remind me to '
  },
  {
    id: 'schedule',
    label: 'Schedule event',
    icon: CalendarClock
  },
  {
    id: 'family',
    label: 'Family chat',
    icon: Users
  },
  {
    id: 'trip',
    label: 'Plan a trip',
    icon: Plane,
    prefillText: 'Help me plan a trip to '
  }
];

// Sub-components
const QuickActionButton = memo<{
  action: QuickAction;
  onClick: () => void;
}>(({ action, onClick }) => (
  <Button
    type="button"
    variant="outline"
    className={cn(
      "bg-neutral-100 dark:bg-neutral-800",
      "hover:bg-neutral-200 dark:hover:bg-neutral-700",
      "px-3 py-1.5 rounded-full whitespace-nowrap",
      "text-neutral-700 dark:text-neutral-300",
      "transition-all hover:scale-105 active:scale-95"
    )}
    onClick={onClick}
    aria-label={action.label}
  >
    <action.icon className="h-4 w-4 mr-1.5" aria-hidden="true" />
    <span className="text-sm">{action.label}</span>
  </Button>
));

QuickActionButton.displayName = "QuickActionButton";

const CharacterCount = memo<{
  current: number;
  max: number;
}>(({ current, max }) => {
  const percentage = (current / max) * 100;
  const isWarning = percentage > 80;
  const isError = percentage > 95;
  
  return (
    <div 
      className={cn(
        "text-xs transition-colors",
        isError && "text-red-500",
        isWarning && !isError && "text-amber-500",
        !isWarning && !isError && "text-neutral-400"
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {current}/{max}
    </div>
  );
});

CharacterCount.displayName = "CharacterCount";

// Custom hooks
const useAutoResize = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  content: string,
  maxHeight: number
) => {
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Store scroll position
    const scrollPos = textarea.scrollTop;
    
    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Set new height
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
    
    // Restore scroll position
    textarea.scrollTop = scrollPos;
  }, [textareaRef, maxHeight]);

  useEffect(() => {
    autoResize();
  }, [content, autoResize]);

  return autoResize;
};

// Main component
const ChatInput = memo<ChatInputProps>(({
  onSendMessage,
  onScheduleClick,
  onFamilyRoomClick,
  onAttachment,
  onVoiceInput,
  onEmojiClick,
  placeholder = DEFAULT_PLACEHOLDER,
  maxLength = DEFAULT_MAX_LENGTH,
  maxHeight = DEFAULT_MAX_HEIGHT,
  disabled = false,
  autoFocus = false,
  className,
  quickActions
}) => {
  const [message, setMessage] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-resize hook
  useAutoResize(textareaRef, message, maxHeight);
  
  // Memoized values
  const isMessageEmpty = useMemo(() => message.trim() === "", [message]);
  const characterCount = useMemo(() => message.length, [message]);
  const showCharCount = useMemo(() => characterCount > maxLength * 0.8, [characterCount, maxLength]);
  
  // Handlers
  const handleSend = useCallback(() => {
    if (isMessageEmpty || disabled || characterCount > maxLength) return;
    
    onSendMessage(message);
    setMessage("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`;
      textareaRef.current.focus();
    }
  }, [message, isMessageEmpty, disabled, characterCount, maxLength, onSendMessage]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend, isComposing]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setMessage(newValue);
    }
  }, [maxLength]);
  
  const handleQuickAction = useCallback((action: QuickAction) => {
    if (action.prefillText) {
      setMessage(action.prefillText);
      textareaRef.current?.focus();
      // Place cursor at end
      const length = action.prefillText.length;
      textareaRef.current?.setSelectionRange(length, length);
    }
    action.action();
  }, []);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAttachment?.(e.target.files);
      // Reset input
      e.target.value = '';
    }
  }, [onAttachment]);
  
  // Build quick actions
  const quickActionsList = useMemo(() => {
    if (quickActions) return quickActions;
    
    return DEFAULT_QUICK_ACTIONS.map(action => ({
      ...action,
      action: () => {
        switch (action.id) {
          case 'schedule':
            onScheduleClick?.();
            break;
          case 'family':
            onFamilyRoomClick?.();
            break;
          default:
            // For actions with prefill text only
            break;
        }
      }
    }));
  }, [quickActions, onScheduleClick, onFamilyRoomClick]);
  
  // Focus on mount if autoFocus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);
  
  return (
    <div className={cn(
      "border-t border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900",
      "p-4",
      className
    )}>
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        {onAttachment && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              aria-label="Attach files"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              aria-label="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </>
        )}
        
        {/* Main input area */}
        <div className="flex-1 relative">
          <div className={cn(
            "bg-neutral-100 dark:bg-neutral-800 rounded-2xl",
            "px-4 py-3 transition-colors",
            "focus-within:ring-2 focus-within:ring-primary/50"
          )}>
            <textarea
              ref={textareaRef}
              className={cn(
                "w-full bg-transparent outline-none resize-none",
                "text-neutral-800 dark:text-neutral-100",
                "placeholder-neutral-500",
                "max-h-32 min-h-[40px]"
              )}
              placeholder={placeholder}
              rows={1}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              disabled={disabled}
              aria-label="Message input"
              aria-describedby={showCharCount ? "char-count" : undefined}
              style={{ minHeight: `${MIN_HEIGHT}px` }}
            />
            
            {/* Character count */}
            {showCharCount && (
              <div id="char-count" className="absolute bottom-1 right-2">
                <CharacterCount current={characterCount} max={maxLength} />
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-1">
          {/* Emoji picker */}
          {onEmojiClick && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
              onClick={onEmojiClick}
              disabled={disabled}
              aria-label="Add emoji"
            >
              <Smile className="h-5 w-5" />
            </Button>
          )}
          
          {/* Voice input */}
          {onVoiceInput && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
              onClick={onVoiceInput}
              disabled={disabled}
              aria-label="Voice input"
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
          
          {/* Send button */}
          <Button
            type="button"
            className={cn(
              "rounded-full p-3 flex-shrink-0",
              "transition-all",
              isMessageEmpty && "opacity-50"
            )}
            onClick={handleSend}
            disabled={isMessageEmpty || disabled || characterCount > maxLength}
            aria-label="Send message"
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div 
        className="flex mt-3 gap-2 overflow-x-auto pb-1 scrollbar-hide"
        role="toolbar"
        aria-label="Quick actions"
      >
        {quickActionsList.map(action => (
          <QuickActionButton
            key={action.id}
            action={action}
            onClick={() => handleQuickAction(action)}
          />
        ))}
      </div>
    </div>
  );
});

ChatInput.displayName = "ChatInput";

// Export sub-components for flexibility
export { QuickActionButton, CharacterCount };
export default ChatInput;
