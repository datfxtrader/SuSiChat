import React, { useState } from 'react';
import { ModernSunaChat } from '@/components/suna/ModernSunaChat';

export default function SunaAgentPage() {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);

  return (
    <div className="h-screen w-full overflow-hidden">
      <ModernSunaChat threadId={activeThreadId} />
    </div>
  );
}