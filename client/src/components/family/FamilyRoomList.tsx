import React from "react";
import { Link } from "wouter";
import { useFamilyRoom } from "@/hooks/useFamilyRoom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Plus, Home, ChevronRight, Users, Loader2 } from "lucide-react";

interface FamilyRoomListProps {
  onCreateClick: () => void;
}

const FamilyRoomList: React.FC<FamilyRoomListProps> = ({ onCreateClick }) => {
  const { familyRooms, isLoading } = useFamilyRoom();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!familyRooms || familyRooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-neutral-500" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Family Rooms</h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4 max-w-md">
          You don't have any family rooms yet. Create one to start chatting with your family!
        </p>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Create Family Room
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-4">
      {/* Create New Room Card */}
      <Card className="border-dashed hover:border-primary/50 transition-colors">
        <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
          <Button variant="ghost" className="h-20 w-20 rounded-full mb-4" onClick={onCreateClick}>
            <Plus className="h-8 w-8 text-primary" />
          </Button>
          <h3 className="text-lg font-medium mb-2">Create New Room</h3>
          <p className="text-center text-neutral-500 dark:text-neutral-400">
            Start a new family room to collaborate and chat
          </p>
        </CardContent>
      </Card>

      {/* Family Room Cards */}
      {familyRooms.map(room => (
        <Card key={room.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mr-2">
                <Home className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">{room.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Family chat room created on {new Date(room.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Link href={`/family-room/${room.id}`} className="w-full">
              <Button variant="outline" className="w-full justify-between">
                Open Room
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default FamilyRoomList;
