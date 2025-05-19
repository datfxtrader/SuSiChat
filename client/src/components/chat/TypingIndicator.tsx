import React from "react";

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start space-x-2 max-w-3xl">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
        <span className="material-icons text-white text-sm">assistant</span>
      </div>
      <div className="bg-white dark:bg-neutral-800 px-4 py-3 rounded-lg chat-bubble-ai shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
