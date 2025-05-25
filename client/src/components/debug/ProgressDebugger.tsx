
import React from 'react';

interface ProgressDebuggerProps {
  isResearchInProgress: boolean;
  researchProgress: number;
  researchStage: number;
  currentQuery: string;
  isSending: boolean;
  messagesCount: number;
}

export const ProgressDebugger: React.FC<ProgressDebuggerProps> = ({
  isResearchInProgress,
  researchProgress,
  researchStage,
  currentQuery,
  isSending,
  messagesCount
}) => {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 max-w-xs z-50">
      <div className="font-bold text-blue-400 mb-2">Progress Debug</div>
      <div className="space-y-1">
        <div>In Progress: <span className={isResearchInProgress ? 'text-green-400' : 'text-red-400'}>
          {isResearchInProgress ? 'YES' : 'NO'}
        </span></div>
        <div>Progress: <span className="text-yellow-400">{Math.round(researchProgress)}%</span></div>
        <div>Stage: <span className="text-purple-400">{researchStage}/6</span></div>
        <div>Sending: <span className={isSending ? 'text-orange-400' : 'text-gray-400'}>
          {isSending ? 'YES' : 'NO'}
        </span></div>
        <div>Messages: <span className="text-cyan-400">{messagesCount}</span></div>
        <div className="truncate">Query: <span className="text-zinc-400">
          {currentQuery || 'None'}
        </span></div>
      </div>
    </div>
  );
};
