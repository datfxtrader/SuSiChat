import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import ScheduleModal from "@/components/modals/ScheduleModal";
import FamilyRoomModal from "@/components/modals/FamilyRoomModal";
import { Settings, CalendarDays } from "lucide-react";

const Chat: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { messages, isLoading, isTyping, sendMessage } = useChat();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showFamilyRoomModal, setShowFamilyRoomModal] = useState(false);

  if (!isAuthenticated || !user) {
    return null; // Will be redirected by auth system
  }

  return (
    <MainLayout
      title="Personal Chat"
      subtitle="Chat with Tongkeeper"
      headerRight={
        <div className="flex items-center space-x-3">
          <button 
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300" 
            title="Schedule View"
            onClick={() => setShowScheduleModal(true)}
          >
            <CalendarDays className="h-5 w-5" />
          </button>
          <button 
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300" 
            title="Chat Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatMessages 
          messages={messages} 
          isTyping={isTyping}
          currentUser={user}
        />
        
        <ChatInput 
          onSendMessage={sendMessage}
          onScheduleClick={() => setShowScheduleModal(true)}
          onFamilyRoomClick={() => setShowFamilyRoomModal(true)}
        />
      </div>

      {/* Modals */}
      <ScheduleModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
      />
      
      <FamilyRoomModal
        open={showFamilyRoomModal}
        onOpenChange={setShowFamilyRoomModal}
      />
    </MainLayout>
  );
};

export default Chat;
