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

  useEffect(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 p-4 auto-overflow bg-neutral-50 dark:bg-neutral-950" id="chat-messages">
      {messages.length === 0 && (
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 max-w-sm shadow-sm">
            <div className="text-center">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-icons text-white">assistant</span>
              </div>
              <h3 className="font-semibold mb-1">Welcome to Tongkeeper!</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                Your intelligent research assistant with enhanced parallel search capabilities.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            currentUser={currentUser}
          />
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;