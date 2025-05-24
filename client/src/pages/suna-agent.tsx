import React, { useState } from 'react';
import { ChatGPTStyleChat } from '@/components/suna/ChatGPTStyleChat';

export default function SunaAgentPage() {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);

  return (
    <div className="h-screen w-full overflow-hidden">
      <ChatGPTStyleChat threadId={activeThreadId} />
    </div>
  );
}