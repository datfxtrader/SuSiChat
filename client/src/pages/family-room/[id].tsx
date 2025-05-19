import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyRoom } from "@/hooks/useFamilyRoom";
import { useChat } from "@/hooks/useChat";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import FamilyRoomModal from "@/components/modals/FamilyRoomModal";

const FamilyRoomDetail: React.FC = () => {
  const { id } = useParams();
  const roomId = parseInt(id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { roomDetails, isLoading: roomLoading } = useFamilyRoom(roomId);
  const { messages, isTyping, sendMessage } = useChat(roomId);
  const [showMembersModal, setShowMembersModal] = useState(false);
  
  // Redirect if invalid room ID
  useEffect(() => {
    if (!roomLoading && !roomDetails) {
      navigate("/family-room");
    }
  }, [roomLoading, roomDetails, navigate]);
  
  if (roomLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }
  
  if (!roomDetails || !user) {
    return null;
  }
  
  return (
    <MainLayout
      title={roomDetails.name}
      subtitle="Family Chat Room"
      headerRight={
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={() => setShowMembersModal(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Members
          </Button>
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
        />
      </div>
      
      <FamilyRoomModal
        open={showMembersModal}
        onOpenChange={setShowMembersModal}
        roomId={roomId}
      />
    </MainLayout>
  );
};

export default FamilyRoomDetail;
