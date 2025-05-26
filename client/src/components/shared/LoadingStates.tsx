
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import UIStandards from '@/config/ui-standards.config';

// Skeleton Loading Components
export const MessageSkeleton: React.FC = () => (
  <div className="animate-pulse p-4">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-zinc-800 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-4 bg-zinc-800 rounded w-1/2" />
        <div className="h-4 bg-zinc-800 rounded w-2/3" />
      </div>
    </div>
  </div>
);

export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="animate-pulse p-6 border border-zinc-800 rounded-2xl bg-zinc-900/60">
    <div className="space-y-3">
      <div className="h-6 bg-zinc-800 rounded w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-4 bg-zinc-800 rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }, (_, i) => (
      <div key={i} className="animate-pulse flex items-center gap-3 p-3">
        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
        </div>
        <div className="w-16 h-8 bg-zinc-800 rounded" />
      </div>
    ))}
  </div>
);

// Progress Indicators
interface ResearchProgressProps {
  stage: number;
  progress: number;
  stages?: string[];
  currentStage?: string;
}

export const ResearchProgress: React.FC<ResearchProgressProps> = ({
  stage,
  progress,
  stages = ['Analyzing', 'Searching', 'Processing', 'Finalizing'],
  currentStage
}) => (
  <div className="space-y-4 p-6">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-zinc-200">
        {currentStage || stages[stage] || 'Processing...'}
      </span>
      <span className="text-sm text-zinc-400">
        {Math.round(progress)}%
      </span>
    </div>
    
    <Progress value={progress} className="h-2" />
    
    {/* Stage Indicators */}
    <div className="flex items-center justify-between">
      {stages.map((stageName, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
              i <= stage 
                ? 'bg-blue-600 text-white' 
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {i < stage ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              i + 1
            )}
          </div>
          <span className="text-xs text-zinc-500 text-center">
            {stageName}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Streaming Indicators
export const StreamingDots: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  return (
    <div className="flex gap-1 items-center">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className={`${sizeClasses[size]} bg-zinc-500 rounded-full`}
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  );
};

export const TypewriterCursor: React.FC = () => (
  <motion.span
    className="inline-block w-0.5 h-4 bg-zinc-400 ml-1"
    animate={{ opacity: [1, 0, 1] }}
    transition={{ duration: 1, repeat: Infinity }}
  />
);

// Spinners
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 
      className={`${sizeClasses[size]} animate-spin text-zinc-400 ${className}`}
    />
  );
};

export const PulseLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} bg-blue-600 rounded-full`}
      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  );
};

// Shimmer Effect
export const ShimmerLoader: React.FC<{ 
  width?: string; 
  height?: string; 
  className?: string;
}> = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '' 
}) => (
  <div
    className={`${width} ${height} bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded ${className}`}
  />
);

// Success Animation
interface SuccessAnimationProps {
  onComplete?: () => void;
  message?: string;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ 
  onComplete, 
  message = 'Success!' 
}) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0, opacity: 0 }}
    onAnimationComplete={onComplete}
    className="flex flex-col items-center gap-3 p-6"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
    >
      <CheckCircle className="w-16 h-16 text-green-500" />
    </motion.div>
    <motion.p
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-lg font-medium text-zinc-200"
    >
      {message}
    </motion.p>
  </motion.div>
);

// Loading State Context
interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  stage?: number;
}

export const LoadingStateProvider: React.FC<{
  children: React.ReactNode;
  state: LoadingState;
}> = ({ children, state }) => {
  if (!state.isLoading) return <>{children}</>;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="bg-zinc-800 rounded-2xl p-6 max-w-sm w-full mx-4">
          {state.progress !== undefined ? (
            <ResearchProgress 
              stage={state.stage || 0}
              progress={state.progress}
              currentStage={state.message}
            />
          ) : (
            <div className="flex items-center gap-3">
              <Spinner size="md" />
              <span className="text-sm text-zinc-300">
                {state.message || 'Loading...'}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  );
};

// Export all loading patterns
export const LoadingPatterns = {
  MessageSkeleton,
  CardSkeleton,
  ListSkeleton,
  ResearchProgress,
  StreamingDots,
  TypewriterCursor,
  Spinner,
  PulseLoader,
  ShimmerLoader,
  SuccessAnimation,
  LoadingStateProvider
};

export default LoadingPatterns;
