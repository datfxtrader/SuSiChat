import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface FamilyRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId?: number;
}

const FamilyRoomModal: React.FC<FamilyRoomModalProps> = ({ 
  open, 
  onOpenChange,
  roomId
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  
  // Fetch room data if roomId provided
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: roomId ? [`/api/family-rooms/${roomId}`] : null,
    enabled: !!roomId,
  });
  
  // Fetch room members if roomId provided
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: roomId ? [`/api/family-rooms/${roomId}/members`] : null,
    enabled: !!roomId,
  });
  
  // Create new family room
  const createRoom = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/family-rooms', { name });
      return res.json();
    },
    onSuccess: (newRoom) => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-rooms'] });
      toast({
        title: "Family room created",
        description: "Your new family room has been created successfully.",
      });
      onOpenChange(false);
      // Navigate to the new room
      navigate(`/family-room/${newRoom.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create family room",
        description: error.toString(),
        variant: "destructive",
      });
    },
  });
  
  // Invite a member to the room
  const inviteMember = useMutation({
    mutationFn: async ({ roomId, userId }: { roomId: number, userId: string }) => {
      const res = await apiRequest('POST', `/api/family-rooms/${roomId}/members`, {
        userId,
        isAdmin: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/family-rooms/${roomId}/members`] 
      });
      setEmail("");
      toast({
        title: "Invitation sent",
        description: "The user has been invited to the family room.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to invite member",
        description: error.toString(),
        variant: "destructive",
      });
    },
  });
  
  // Helper function to handle sending invites
  const handleInvite = async () => {
    if (!email.trim() || !roomId) return;
    
    // In a real application, you would need to find or create the user by email
    // For this example, we'll assume the user exists and has the same ID as the current user
    inviteMember.mutate({ roomId, userId: user.id });
  };
  
  // Helper function to handle creating new room
  const handleCreateRoom = async () => {
    if (!email.trim()) return;
    createRoom.mutate(email);
  };
  
  // Helper function to navigate to the family chat
  const goToFamilyChat = () => {
    if (roomId) {
      onOpenChange(false);
      navigate(`/family-room/${roomId}`);
    }
  };
  
  // Show different content based on whether viewing or creating a room
  const isCreating = !roomId;
  const isLoading = roomLoading || membersLoading;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? "Create Family Room" : "Family Room"}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isCreating ? (
          // Create new room UI
          <div className="py-4">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">
                Family Room Name
              </label>
              <Input
                placeholder="Enter family room name"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Create a name for your family room. You'll be able to invite members after creation.
              </p>
            </div>
          </div>
        ) : (
          // View existing room UI
          <div className="py-4">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">{room?.name}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Family chat room with {members?.length || 0} members
              </p>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
                Members
              </h3>
              
              <div className="space-y-3">
                {members?.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center space-x-3 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                  >
                    <Avatar>
                      <AvatarImage src={member.profileImageUrl || ""} alt={member.firstName || "User"} />
                      <AvatarFallback>{member.firstName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {member.id === user.id ? "You" : ""} 
                        {member.isAdmin ? " (Admin)" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
                Invite New Member
              </h3>
              <div className="flex">
                <Input
                  type="email"
                  className="rounded-r-none"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button 
                  className="rounded-l-none"
                  onClick={handleInvite}
                  disabled={!email.trim() || inviteMember.isPending}
                >
                  {inviteMember.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Invite"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {isCreating ? "Cancel" : "Close"}
          </Button>
          
          {isCreating ? (
            <Button 
              onClick={handleCreateRoom}
              disabled={!email.trim() || createRoom.isPending}
            >
              {createRoom.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Create Room
            </Button>
          ) : (
            <Button onClick={goToFamilyChat}>
              Open Chat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FamilyRoomModal;
