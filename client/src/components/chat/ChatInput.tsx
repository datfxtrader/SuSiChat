import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizontal, BellPlus, CalendarClock, Users, Plane } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onScheduleClick?: () => void;
  onFamilyRoomClick?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage,
  onScheduleClick,
  onFamilyRoomClick
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };
  
  useEffect(() => {
    autoResize();
  }, [message]);
  
  const handleSend = () => {
    if (message.trim() === "") return;
    onSendMessage(message);
    setMessage("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-end">
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent outline-none resize-none text-neutral-800 dark:text-neutral-100 placeholder-neutral-500 max-h-32"
            placeholder="Message Tongkeeper..."
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button 
          className="ml-2 rounded-full p-3 flex-shrink-0" 
          onClick={handleSend}
          disabled={message.trim() === ""}
        >
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Quick Actions */}
      <div className="flex mt-2 overflow-x-auto space-x-2 pb-1 text-sm">
        <Button 
          variant="outline"
          className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
          onClick={() => {
            setMessage("Remind me to ");
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }}
        >
          <BellPlus className="h-4 w-4 mr-1" /> Set reminder
        </Button>
        <Button 
          variant="outline"
          className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
          onClick={onScheduleClick}
        >
          <CalendarClock className="h-4 w-4 mr-1" /> Schedule event
        </Button>
        <Button 
          variant="outline"
          className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
          onClick={onFamilyRoomClick}
        >
          <Users className="h-4 w-4 mr-1" /> Family chat
        </Button>
        <Button 
          variant="outline"
          className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-full text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
          onClick={() => {
            setMessage("Help me plan a trip to ");
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }}
        >
          <Plane className="h-4 w-4 mr-1" /> Plan a trip
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
