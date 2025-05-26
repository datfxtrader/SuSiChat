
import React, { useMemo } from 'react';
import { Search, Clock, CheckCircle, AlertCircle, Zap, Database, TrendingUp } from 'lucide-react';

const STAGE_MESSAGES = [
  "Initializing research...",
  "Searching databases...",
  "Analyzing sources...",
  "Cross-referencing data...",
  "Synthesizing insights...",
  "Finalizing report..."
];

const STAGE_ICONS = [
  Zap,
  Search,
  Database,
  TrendingUp,
  AlertCircle,
  CheckCircle
];

interface ResearchProgressProps {
  stage: number;
  progress: number;
  query: string;
  isActive: boolean;
}

export const ResearchProgress: React.FC<ResearchProgressProps> = ({ 
  stage, 
  progress, 
  query, 
  isActive 
}) => {
  const stageMessage = useMemo(() => 
    STAGE_MESSAGES[Math.min(stage - 1, STAGE_MESSAGES.length - 1)], 
    [stage]
  );
  
  const StageIcon = useMemo(() => 
    STAGE_ICONS[Math.min(stage - 1, STAGE_ICONS.length - 1)], 
    [stage]
  );

  const estimatedTimeRemaining = useMemo(() => {
    if (progress >= 95) return "Almost done...";
    if (progress >= 80) return "~30 seconds";
    if (progress >= 60) return "~1 minute";
    if (progress >= 40) return "~2 minutes";
    return "~3 minutes";
  }, [progress]);

  return (
    <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-6 backdrop-blur-sm shadow-xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
          <StageIcon className="w-4 h-4 text-white animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-100">Researching...</h3>
          <p className="text-xs text-zinc-400 truncate">{query}</p>
        </div>
        <div className="text-xs text-zinc-500 flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {estimatedTimeRemaining}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-400 font-medium">Stage {stage}/6</span>
          <span className="text-xs text-zinc-400">{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${Math.max(progress, 5)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
            <div className="absolute right-0 top-0 h-full w-2 bg-white/40 blur-sm animate-bounce" />
          </div>
        </div>
        
        {isActive && (
          <div className="flex items-center space-x-2 text-xs text-blue-400">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="animate-fade-in">{stageMessage}</span>
          </div>
        )}

        {/* Stage indicators */}
        <div className="flex justify-between items-center mt-4">
          {STAGE_MESSAGES.map((_, index) => {
            const stageNumber = index + 1;
            const isCompleted = stage > stageNumber;
            const isCurrent = stage === stageNumber;
            
            return (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-400 scale-110' 
                    : isCurrent 
                      ? 'bg-blue-400 scale-125 animate-pulse' 
                      : 'bg-zinc-600'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResearchProgress;
