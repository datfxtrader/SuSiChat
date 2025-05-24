import React, { useState } from 'react';
import { ChatGPTStyleChat } from '@/components/suna/ChatGPTStyleChat';

export default function SunaAgentPage() {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="h-screen w-full overflow-hidden">
        <ChatGPTStyleChat threadId={activeThreadId} />
      </div>
    </div>
  );
}