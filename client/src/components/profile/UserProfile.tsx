import React, { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [preference, setPreference] = useState({ key: "", value: "" });
  
  // Get user preferences
  const { data: preferences } = useQuery({
    queryKey: ["/api/preferences"],
  });
  
  // Add/update a preference
  const savePreference = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      const res = await apiRequest("POST", "/api/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      setPreference({ key: "", value: "" });
      toast({
        title: "Preference saved",
        description: "Your preference has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save preference",
        description: error.toString(),
        variant: "destructive",
      });
    },
  });
  
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };
  
  const handleSavePreference = () => {
    if (!preference.key.trim() || !preference.value.trim()) return;
    savePreference.mutate(preference);
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
            <AvatarFallback className="text-lg">
              {getInitials(`${user?.firstName || ''} ${user?.lastName || ''}`)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              {user?.email}
            </p>
            
            <div className="mt-4">
              <Button 
                variant="outline"
                className="mr-2"
                onClick={handleLogout}
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Personal Preferences</h3>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
          Tongkeeper uses these preferences to personalize your experience. Add details about yourself that you want the AI to remember.
        </p>
        
        <div className="space-y-4">
          {preferences?.map((pref) => (
            <div 
              key={pref.id}
              className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg"
            >
              <div className="font-medium">{pref.key}</div>
              <div className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                {pref.value}
              </div>
            </div>
          ))}
          
          {(!preferences || preferences.length === 0) && (
            <div className="text-center p-4 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
              <p className="text-neutral-500 dark:text-neutral-400">
                No preferences set yet. Add some below!
              </p>
            </div>
          )}
          
          <div className="flex flex-col gap-3 mt-6">
            <Input
              placeholder="Preference (e.g. favorite color, pet name)"
              value={preference.key}
              onChange={(e) => setPreference({ ...preference, key: e.target.value })}
            />
            <Input
              placeholder="Value (e.g. blue, Rex)"
              value={preference.value}
              onChange={(e) => setPreference({ ...preference, value: e.target.value })}
            />
            <Button 
              onClick={handleSavePreference}
              disabled={!preference.key.trim() || !preference.value.trim() || savePreference.isPending}
            >
              {savePreference.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Preference
            </Button>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-2">About Tongkeeper</h3>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm">
          Tongkeeper is a personal AI assistant built on the Suna AI framework using DeepSeek's LLM. 
          It helps with scheduling, family communication, homework, and more.
        </p>
      </div>
    </div>
  );
};

export default UserProfile;
