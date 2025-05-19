import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import FamilyRoomList from "@/components/family/FamilyRoomList";
import CreateFamilyRoom from "@/components/family/CreateFamilyRoom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const FamilyRoom: React.FC = () => {
  const [creating, setCreating] = useState(false);
  
  const handleCreateClick = () => {
    setCreating(true);
  };
  
  return (
    <MainLayout
      title="Family Rooms"
      subtitle="Connect and chat with your family members"
      headerRight={
        !creating && (
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            New Room
          </Button>
        )
      }
    >
      <div className="flex-1 overflow-auto">
        {creating ? (
          <CreateFamilyRoom onCancel={() => setCreating(false)} />
        ) : (
          <FamilyRoomList onCreateClick={handleCreateClick} />
        )}
      </div>
    </MainLayout>
  );
};

export default FamilyRoom;
