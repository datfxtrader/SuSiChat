import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Reminder } from "@shared/schema";

export function useSchedule() {
  const queryClient = useQueryClient();
  
  // Get all reminders
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['/api/reminders'],
  });
  
  // Get upcoming reminders
  const { data: upcomingReminders } = useQuery({
    queryKey: ['/api/reminders/upcoming'],
  });
  
  // Create reminder
  const createReminder = useMutation({
    mutationFn: async (reminderData: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'completed'>) => {
      const res = await apiRequest('POST', '/api/reminders', reminderData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/upcoming'] });
    },
  });
  
  // Update reminder
  const updateReminder = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<Reminder>) => {
      const res = await apiRequest('PUT', `/api/reminders/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/upcoming'] });
    },
  });
  
  // Delete reminder
  const deleteReminder = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/reminders/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/upcoming'] });
    },
  });
  
  // Toggle completion status
  const toggleReminder = useMutation({
    mutationFn: async ({ id, completed }: { id: number, completed: boolean }) => {
      const res = await apiRequest('PUT', `/api/reminders/${id}`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/upcoming'] });
    },
  });
  
  return {
    reminders,
    upcomingReminders,
    isLoading,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
  };
}
