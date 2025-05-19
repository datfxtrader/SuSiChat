import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FamilyRoom, FamilyRoomMember, User } from "@shared/schema";
import { useToast } from "./use-toast";

export function useFamilyRoom(roomId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get all family rooms
  const { data: familyRooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['/api/family-rooms'],
  });
  
  // Get a specific room if roomId is provided
  const { data: roomDetails, isLoading: roomDetailsLoading } = useQuery({
    queryKey: roomId ? [`/api/family-rooms/${roomId}`] : null,
    enabled: !!roomId,
  });
  
  // Get room members if roomId is provided
  const { data: roomMembers, isLoading: membersLoading } = useQuery({
    queryKey: roomId ? [`/api/family-rooms/${roomId}/members`] : null,
    enabled: !!roomId,
  });
  
  // Get room messages if roomId is provided
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: roomId ? [`/api/family-rooms/${roomId}/messages`] : null,
    enabled: !!roomId,
  });
  
  // Create a new family room
  const createRoom = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/family-rooms', { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-rooms'] });
      toast({
        title: "Family room created",
        description: "Your new family room has been created successfully.",
      });
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
    mutationFn: async ({ roomId, userId, isAdmin = false }: { roomId: number, userId: string, isAdmin?: boolean }) => {
      const res = await apiRequest('POST', `/api/family-rooms/${roomId}/members`, {
        userId,
        isAdmin,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/family-rooms/${variables.roomId}/members`] 
      });
      toast({
        title: "Member invited",
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
  
  return {
    // Data
    familyRooms,
    roomDetails,
    roomMembers,
    messages,
    
    // Loading states
    isLoading: roomsLoading || (!!roomId && (roomDetailsLoading || membersLoading || messagesLoading)),
    
    // Mutations
    createRoom,
    inviteMember,
  };
}
