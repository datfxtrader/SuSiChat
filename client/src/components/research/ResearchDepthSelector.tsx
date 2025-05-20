import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from 'lucide-react';

interface ResearchDepth {
  level: number;
  name: string;
  description: string;
  estimatedTime: string;
}

interface ResearchDepthSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ResearchDepthSelector({ value, onChange, disabled = false }: ResearchDepthSelectorProps) {
  // Fetch research depth info from API
  const { data: depthInfo, isLoading } = useQuery({
    queryKey: ['/api/research/depth-info'],
    retry: false,
  });
  
  const depths: ResearchDepth[] = depthInfo?.depths || [
    // Default values if API hasn't returned yet
    {
      level: 1,
      name: "Basic",
      description: "Quick web search with essential information",
      estimatedTime: "5-15 seconds"
    },
    {
      level: 2,
      name: "Enhanced",
      description: "Comprehensive web search with better processing",
      estimatedTime: "15-30 seconds"
    },
    {
      level: 3,
      name: "Deep",
      description: "In-depth research with comprehensive report generation",
      estimatedTime: "1-2 minutes"
    }
  ];

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(parseInt(val))}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select research depth" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {depths.map((depth) => (
              <SelectItem key={depth.level} value={depth.level.toString()}>
                {depth.name} ({depth.estimatedTime})
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[300px]">
            <div className="space-y-2">
              <h4 className="font-medium">Research Depth Levels</h4>
              <ul className="text-sm space-y-1">
                {depths.map((depth) => (
                  <li key={depth.level} className="pb-1">
                    <span className="font-medium">{depth.name}</span>: {depth.description}
                    <span className="block text-xs text-muted-foreground">
                      Estimated time: {depth.estimatedTime}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}