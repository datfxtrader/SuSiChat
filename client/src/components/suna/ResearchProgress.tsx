
import React, { useMemo } from 'react';
import { Search, Sparkles, Database, Zap, TrendingUp } from 'lucide-react';

const STAGE_MESSAGES = [
  "Initializing research...",
  "Searching databases...", 
  "Analyzing sources...",
  "Cross-referencing data...",
  "Synthesizing insights...",
  "Finalizing report..."
];

const STAGE_ICONS = [
  Sparkles,
  Search,
  Database,
  TrendingUp,
  Zap,
  Search
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
  
  const progressColor = useMemo(() => {
    if (progress < 25) return 'from-blue-500 to-blue-600';
    if (progress < 50) return 'from-blue-500 via-purple-500 to-purple-600';
    if (progress < 75) return 'from-purple-500 via-pink-500 to-pink-600';
    return 'from-pink-500 via-orange-500 to-orange-600';
  }, [progress]);
  
  return (
    <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-6 backdrop-blur-sm shadow-xl">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden">
          <StageIcon className="w-4 h-4 text-white animate-pulse relative z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center">
            Researching...
            <div className="ml-2 flex space-x-1">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </h3>
          <p className="text-xs text-zinc-400 truncate">{query}</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-400 font-medium">Stage {stage}/6</span>
          <span className="text-xs text-zinc-400 font-mono">{Math.round(progress)}%</span>
        </div>
        
        <div className="relative">
          <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden relative">
            <div 
              className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-1000 ease-out relative`}
              style={{ width: `${Math.max(progress, 5)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          
          {/* Progress markers */}
          <div className="absolute top-0 left-0 w-full h-2 flex justify-between">
            {[16.67, 33.33, 50, 66.67, 83.33].map((marker, idx) => (
              <div 
                key={idx}
                className={`w-0.5 h-2 rounded-full transition-colors duration-300 ${
                  progress > marker ? 'bg-white/60' : 'bg-zinc-600/40'
                }`}
                style={{ marginLeft: idx === 0 ? `${marker}%` : 'auto' }}
              />
            ))}
          </div>
        </div>
        
        {isActive && (
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-400 animate-fade-in font-medium">
              {stageMessage}
            </span>
            {stage <= 6 && (
              <div className="flex-1 flex justify-end">
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-1 h-1 bg-blue-400/60 rounded-full animate-ping"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Stage progress indicators */}
        <div className="grid grid-cols-6 gap-1 mt-3">
          {STAGE_MESSAGES.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1 rounded-full transition-all duration-500 ${
                idx < stage ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 
                idx === stage - 1 ? 'bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse' :
                'bg-zinc-700/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResearchProgress;
