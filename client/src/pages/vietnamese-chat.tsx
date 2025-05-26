
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { BestFriendChat } from '@/components/chat/BestFriendChat';
import { useAuth } from '@/hooks/useAuth';
import { Heart, Settings } from 'lucide-react';

const VietnameseChat: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null; // Will be redirected by auth system
  }

  return (
    <MainLayout
      title="Best Friend Chat"
      subtitle="Your Vietnamese-aware AI companion"
      headerRight={
        <div className="flex items-center space-x-3">
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
        <BestFriendChat />
      </div>
    </MainLayout>
  );
};

export default VietnameseChat;
