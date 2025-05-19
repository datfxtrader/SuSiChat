import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFamilyRoom } from "@/hooks/useFamilyRoom";
import { ArrowLeft, Loader2 } from "lucide-react";

interface CreateFamilyRoomProps {
  onCancel: () => void;
}

const CreateFamilyRoom: React.FC<CreateFamilyRoomProps> = ({ onCancel }) => {
  const [name, setName] = useState("");
  const [, navigate] = useLocation();
  const { createRoom } = useFamilyRoom();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createRoom.mutate(name, {
      onSuccess: (newRoom) => {
        navigate(`/family-room/${newRoom.id}`);
      }
    });
  };
  
  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 mr-2" 
              onClick={onCancel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Create Family Room</CardTitle>
          </div>
          <CardDescription>
            Create a space for your family to chat and collaborate with Tongkeeper.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                placeholder="e.g. Johnson Family"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                This will create a shared space where your family can:
              </p>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 list-disc pl-5 mt-2 space-y-1">
                <li>Chat with Tongkeeper as a group</li>
                <li>Collaborate on family plans</li>
                <li>Share homework help</li>
                <li>Plan trips together</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full"
              disabled={!name.trim() || createRoom.isPending}
            >
              {createRoom.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Family Room
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateFamilyRoom;
