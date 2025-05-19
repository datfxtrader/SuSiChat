import React from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChatMessage } from "@/lib/types";
import { User } from "@shared/schema";

interface ChatBubbleProps {
  message: ChatMessage;
  currentUser: User;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, currentUser }) => {
  const isCurrentUser = message.userId === currentUser.id;
  const isAI = message.isAiResponse;
  
  return (
    <div className={cn(
      "flex items-start space-x-2 max-w-3xl",
      isCurrentUser && "justify-end ml-auto"
    )}>
      {!isCurrentUser && !isAI && (
        <Avatar className="flex-shrink-0 w-8 h-8">
          <AvatarImage 
            src={message.user?.profileImageUrl || ""} 
            alt={message.user?.firstName || "User"} 
          />
          <AvatarFallback>
            {message.user?.firstName?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
      )}
      
      {isAI && (
        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="material-icons text-white text-sm">assistant</span>
        </div>
      )}
      
      <div className={cn(
        "px-4 py-3 rounded-lg shadow-sm",
        isCurrentUser 
          ? "bg-primary text-white chat-bubble-user" 
          : isAI 
            ? "bg-white dark:bg-neutral-800 chat-bubble-ai" 
            : "bg-neutral-200 dark:bg-neutral-700 rounded-lg"
      )}>
        {!isCurrentUser && !isAI && message.user && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            {message.user.firstName || "Unknown user"}
          </div>
        )}
        
        <p className={cn(
          isCurrentUser 
            ? "text-white" 
            : "text-neutral-800 dark:text-neutral-100"
        )}>
          {message.content}
        </p>
        
        <div className={cn(
          "text-xs mt-1",
          isCurrentUser 
            ? "text-white/70 text-right" 
            : "text-neutral-500 dark:text-neutral-400"
        )}>
          {formatRelativeTime(message.createdAt)}
        </div>
      </div>
      
      {isCurrentUser && (
        <Avatar className="flex-shrink-0 w-8 h-8">
          <AvatarImage 
            src={currentUser.profileImageUrl || ""} 
            alt={currentUser.firstName || "You"} 
          />
          <AvatarFallback>
            {currentUser.firstName?.[0] || "Y"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatBubble;
