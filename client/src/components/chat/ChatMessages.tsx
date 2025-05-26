
import React, { useRef, useEffect, useCallback, memo, useMemo, useState } from "react";
import { ChatMessage } from "@/lib/types";
import { User } from "@shared/schema";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";
import { cn } from "@/lib/utils";
import { Loader2, ArrowDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

// Types
interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  currentUser: User;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  className?: string;
  enableVirtualization?: boolean;
  welcomeMessage?: WelcomeMessageConfig;
  groupByDate?: boolean;
  showScrollToBottom?: boolean;
  onMessageRetry?: (messageId: string) => void;
  onMessageDelete?: (messageId: string) => void;
}

interface WelcomeMessageConfig {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

interface MessageGroup {
  date: string;
  messages: ChatMessage[];
}

// Constants
const SCROLL_THRESHOLD = 100;
const MESSAGES_BATCH_SIZE = 50;
const DEFAULT_WELCOME: WelcomeMessageConfig = {
  title: "Welcome to Tongkeeper!",
  subtitle: "Your intelligent research assistant with enhanced parallel search capabilities.",
  icon: <span className="material-icons text-white">assistant</span>
};

// Utility functions
const formatDateHeader = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
};

const groupMessagesByDate = (messages: ChatMessage[]): MessageGroup[] => {
  const groups: Map<string, ChatMessage[]> = new Map();
  
  messages.forEach(message => {
    const date = new Date(message.createdAt);
    const dateKey = date.toDateString();
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  });
  
  return Array.from(groups.entries()).map(([date, messages]) => ({
    date,
    messages
  }));
};

// Sub-components
const WelcomeMessage = memo<{
  config: WelcomeMessageConfig;
}>(({ config }) => {
  const { 
    title = DEFAULT_WELCOME.title, 
    subtitle = DEFAULT_WELCOME.subtitle,
    icon = DEFAULT_WELCOME.icon,
    suggestions = [],
    onSuggestionClick
  } = config;
  
  return (
    <div className="flex justify-center mb-6">
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            {icon}
          </div>
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            {subtitle}
          </p>
          
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestionClick?.(suggestion)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full",
                      "bg-neutral-100 dark:bg-neutral-700",
                      "hover:bg-neutral-200 dark:hover:bg-neutral-600",
                      "text-neutral-700 dark:text-neutral-300",
                      "transition-colors"
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

WelcomeMessage.displayName = "WelcomeMessage";

const DateDivider = memo<{ date: string }>(({ date }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
      {formatDateHeader(new Date(date))}
    </span>
    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
  </div>
));

DateDivider.displayName = "DateDivider";

const LoadMoreButton = memo<{
  onClick: () => void;
  isLoading: boolean;
}>(({ onClick, isLoading }) => (
  <div className="flex justify-center py-4">
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isLoading}
      className="rounded-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <MessageSquare className="w-4 h-4 mr-2" />
          Load earlier messages
        </>
      )}
    </Button>
  </div>
));

LoadMoreButton.displayName = "LoadMoreButton";

const ScrollToBottomButton = memo<{
  onClick: () => void;
  visible: boolean;
}>(({ onClick, visible }) => (
  <Button
    variant="outline"
    size="icon"
    onClick={onClick}
    className={cn(
      "fixed bottom-24 right-6 rounded-full shadow-lg",
      "bg-white dark:bg-neutral-800",
      "transition-all duration-300",
      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
    )}
    aria-label="Scroll to bottom"
  >
    <ArrowDown className="w-4 h-4" />
  </Button>
));

ScrollToBottomButton.displayName = "ScrollToBottomButton";

// Main component
const ChatMessages = memo<ChatMessagesProps>(({
  messages,
  isTyping,
  currentUser,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  className,
  enableVirtualization = false,
  welcomeMessage = DEFAULT_WELCOME,
  groupByDate = true,
  showScrollToBottom = true,
  onMessageRetry,
  onMessageDelete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  
  // Memoized message groups
  const messageGroups = useMemo(() => {
    if (!groupByDate) return null;
    return groupMessagesByDate(messages);
  }, [messages, groupByDate]);
  
  // Scroll to bottom handler
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto",
        block: "end"
      });
    }
  }, []);
  
  // Check if scrolled near bottom
  const checkIfNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }, []);
  
  // Handle scroll event
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Check if near bottom
    const nearBottom = checkIfNearBottom();
    setIsAutoScrolling(nearBottom);
    setShowScrollButton(!nearBottom && showScrollToBottom);
    
    // Check if scrolled to top for loading more
    if (container.scrollTop === 0 && hasMore && !isLoading && onLoadMore) {
      const previousHeight = container.scrollHeight;
      onLoadMore();
      
      // Maintain scroll position after loading
      requestAnimationFrame(() => {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - previousHeight;
      });
    }
  }, [checkIfNearBottom, hasMore, isLoading, onLoadMore, showScrollToBottom]);
  
  // Auto-scroll effect
  useEffect(() => {
    if (isAutoScrolling) {
      scrollToBottom();
    }
  }, [messages.length, isTyping, isAutoScrolling, scrollToBottom]);
  
  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
  
  // Render message list
  const renderMessages = () => {
    if (messages.length === 0) {
      return <WelcomeMessage config={welcomeMessage} />;
    }
    
    if (groupByDate && messageGroups) {
      return messageGroups.map((group, groupIndex) => (
        <div key={group.date}>
          {groupIndex > 0 && <DateDivider date={group.date} />}
          <div className="space-y-3">
            {group.messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                currentUser={currentUser}
                onRetry={onMessageRetry}
                onDelete={onMessageDelete}
              />
            ))}
          </div>
        </div>
      ));
    }
    
    return (
      <div className="space-y-3">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            currentUser={currentUser}
            onRetry={onMessageRetry}
            onDelete={onMessageDelete}
          />
        ))}
      </div>
    );
  };
  
  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          "bg-neutral-50 dark:bg-neutral-950",
          "scroll-smooth",
          className
        )}
        id="chat-messages"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        <div className="min-h-full p-4">
          {/* Load more button */}
          {hasMore && onLoadMore && (
            <LoadMoreButton onClick={onLoadMore} isLoading={isLoading} />
          )}
          
          {/* Messages */}
          {renderMessages()}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="mt-3">
              <TypingIndicator />
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} className="h-px" />
        </div>
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <ScrollToBottomButton
          onClick={() => scrollToBottom()}
          visible={showScrollButton}
        />
      )}
    </>
  );
});

ChatMessages.displayName = "ChatMessages";

// Export sub-components for flexibility
export { WelcomeMessage, DateDivider, LoadMoreButton, ScrollToBottomButton };
export default ChatMessages;
