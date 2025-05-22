import React, { useState, useEffect } from 'react';
import { Search, Database, Sparkles, CheckCircle, Clock, Brain, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResearchProgressProps {
  stage: number;
  progress: number;
  query?: string;
  isActive?: boolean;
}

interface ProgressStage {
  id: number;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  duration: number; // seconds
}

const progressStages: ProgressStage[] = [
  {
    id: 1,
    name: "Analyzing Query",
    description: "Understanding your research question",
    icon: <Brain className="w-4 h-4" />,
    color: "text-blue-500",
    duration: 3
  },
  {
    id: 2,
    name: "Web Search",
    description: "Searching multiple sources for information",
    icon: <Search className="w-4 h-4" />,
    color: "text-green-500",
    duration: 8
  },
  {
    id: 3,
    name: "Deep Analysis",
    description: "Processing and analyzing collected data",
    icon: <Database className="w-4 h-4" />,
    color: "text-purple-500",
    duration: 12
  },
  {
    id: 4,
    name: "AI Synthesis",
    description: "Generating comprehensive research report",
    icon: <Sparkles className="w-4 h-4" />,
    color: "text-orange-500",
    duration: 8
  },
  {
    id: 5,
    name: "Finalizing",
    description: "Preparing results and sources",
    icon: <FileText className="w-4 h-4" />,
    color: "text-indigo-500",
    duration: 3
  }
];

export const ResearchProgress: React.FC<ResearchProgressProps> = ({ 
  stage, 
  progress, 
  query = "",
  isActive = true 
}) => {
  const [currentStage, setCurrentStage] = useState(stage);
  const [currentProgress, setCurrentProgress] = useState(progress);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Simulate realistic progress updates when active
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
      
      // Simulate stage progression based on time
      const totalTime = timeElapsed;
      let newStage = 1;
      let stageProgress = 0;
      let cumulativeTime = 0;
      
      for (const stageInfo of progressStages) {
        if (totalTime >= cumulativeTime && totalTime < cumulativeTime + stageInfo.duration) {
          newStage = stageInfo.id;
          stageProgress = ((totalTime - cumulativeTime) / stageInfo.duration) * 100;
          break;
        }
        cumulativeTime += stageInfo.duration;
        if (totalTime >= cumulativeTime) {
          newStage = Math.min(stageInfo.id + 1, progressStages.length);
        }
      }
      
      setCurrentStage(newStage);
      setCurrentProgress(Math.min(stageProgress, 100));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeElapsed]);

  // Smooth progress animation
  useEffect(() => {
    const targetProgress = currentProgress;
    const diff = targetProgress - animatedProgress;
    
    if (Math.abs(diff) > 1) {
      const step = diff > 0 ? 2 : -2;
      const timer = setTimeout(() => {
        setAnimatedProgress(prev => {
          const next = prev + step;
          return diff > 0 ? Math.min(next, targetProgress) : Math.max(next, targetProgress);
        });
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [currentProgress, animatedProgress]);

  const currentStageInfo = progressStages.find(s => s.id === currentStage) || progressStages[0];
  const isComplete = currentStage > progressStages.length;

  // Extract main topic from query for context
  const getMainTopic = (query: string) => {
    if (!query) return "";
    const words = query.toLowerCase().split(' ').filter(word => 
      word.length > 3 && 
      !['what', 'how', 'why', 'when', 'where', 'about', 'the', 'and', 'or'].includes(word)
    );
    return words.slice(0, 2).join(' ') || 'your topic';
  };

  const mainTopic = getMainTopic(query);

  if (isComplete) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Research Complete</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Current Stage Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={cn("animate-pulse", currentStageInfo.color)}>
            {currentStageInfo.icon}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {currentStageInfo.name}
            </div>
            <div className="text-xs text-gray-500">
              {currentStageInfo.description}
              {mainTopic && ` for ${mainTopic}`}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${animatedProgress}%` }}
        />
      </div>

      {/* Stage Indicators */}
      <div className="flex justify-between">
        {progressStages.map((stageInfo, index) => {
          const isCurrentStage = stageInfo.id === currentStage;
          const isCompleted = stageInfo.id < currentStage;
          const isUpcoming = stageInfo.id > currentStage;

          return (
            <div 
              key={stageInfo.id}
              className={cn(
                "flex flex-col items-center space-y-1 text-xs",
                isCurrentStage && "scale-110",
                "transition-all duration-300"
              )}
            >
              <div 
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-green-500 text-white",
                  isCurrentStage && "bg-blue-500 text-white animate-pulse",
                  isUpcoming && "bg-gray-200 text-gray-400"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <span className="text-xs font-bold">{stageInfo.id}</span>
                )}
              </div>
              <span 
                className={cn(
                  "text-center transition-all duration-300",
                  isCurrentStage && "font-medium text-gray-900",
                  isCompleted && "text-green-600",
                  isUpcoming && "text-gray-400"
                )}
              >
                {stageInfo.name.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Real-time Status */}
      <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 bg-gray-50 rounded-md py-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span>
          {isActive ? 'Researching in real-time...' : 'Research paused'}
        </span>
      </div>
    </div>
  );
};