import React, { useRef, useEffect } from "react";
import { ChatMessage } from "@/lib/types";
import { User } from "@shared/schema";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  currentUser: User;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  isTyping,
  currentUser
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Improved scroll handling with animation frames
  useEffect(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 p-4 auto-overflow bg-neutral-50 dark:bg-neutral-950" id="chat-messages">
      {/* System Welcome Message */}
      {messages.length === 0 && (
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 max-w-sm shadow-sm">
            <div className="text-center">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-icons text-white">assistant</span>
              </div>
              <h3 className="font-semibold mb-1">Welcome to Tongkeeper!</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                I'm your personal AI assistant. I can help with scheduling, homework, trip planning, and much more.
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-sm">
                <button className="bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-200">
                  Set a reminder
                </button>
                <button className="bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-200">
                  Help with homework
                </button>
                <button className="bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-200">
                  Plan a trip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message groups */}
      <div className="space-y-6">
        {messages.map((message) => (
          <ChatBubble 
            key={message.id} 
            message={message} 
            currentUser={currentUser} 
          />
        ))}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}

        {/* Invisible div for scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;
```The useEffect hook in ChatMessages component is modified to use requestAnimationFrame for smoother scrolling.
```

```typescript
import React, { useRef, useEffect } from "react";
import { ChatMessage } from "@/lib/types";
import { User } from "@shared/schema";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  currentUser: User;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ 
  messages, 
  isTyping,
  currentUser
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Improved scroll handling with animation frames
  useEffect(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 p-4 auto-overflow bg-neutral-50 dark:bg-neutral-950" id="chat-messages">
      {/* System Welcome Message */}
      {messages.length === 0 && (
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 max-w-sm shadow-sm">
            <div className="text-center">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-icons text-white">assistant</span>
              </div>
              <h3 className="font-semibold mb-1">Welcome to Tongkeeper!</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                I'm your personal AI assistant. I can help with scheduling, homework, trip planning, and much more.
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-sm">
                <button className="bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-200">
                  Set a reminder
                </button>
                <button className="bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-200">
                  Help with homework
                </button>
                <button className="bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-200">
                  Plan a trip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message groups */}
      <div className="space-y-6">
        {messages.map((message) => (
          <ChatBubble 
            key={message.id} 
            message={message} 
            currentUser={currentUser} 
          />
        ))}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}

        {/* Invisible div for scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;