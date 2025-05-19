import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2Icon, SearchIcon, BookOpenIcon, CheckIcon, AlertCircle } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import useDeerflow, { Source } from '@/hooks/useDeerflow';
import ReactMarkdown from 'react-markdown';

/**
 * DeepResearch component provides an interface for conducting detailed research
 * using DeerFlow's capabilities for web search, content analysis, and synthesis
 */
export function DeepResearch() {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<'basic' | 'standard' | 'deep'>('standard');
  const [showSettings, setShowSettings] = useState(false);
  
  const { 
    startResearch,
    researchStatus,
    isLoadingStatus,
    isServiceAvailable,
    isResearchInProgress,
    isResearchComplete,
    isResearchFailed
  } = useDeerflow();

  const handleStartResearch = () => {
    if (!query.trim()) return;
    
    startResearch.mutate({
      query: query.trim(),
      depth,
      maxSources: depth === 'basic' ? 3 : depth === 'standard' ? 5 : 10,
      useCache: true
    });
  };

  // Add a useEffect to poll the research status
  useEffect(() => {
    // Log the current research status for debugging
    if (researchStatus) {
      console.log('Current research status:', researchStatus);
      
      // If we receive a completed status, make sure to update the UI
      if (researchStatus.status === 'completed') {
        console.log('Research completed:', researchStatus);
      }
    }
  }, [researchStatus]);

  const renderProgressIndicator = () => {
    if (isResearchInProgress || researchStatus?.status === 'analyzing' || researchStatus?.status === 'synthesizing') {
      let stage = 'Searching';
      let progress = 33;
      
      if (researchStatus?.status === 'synthesizing') {
        stage = 'Synthesizing';
        progress = 90;
      } else if (researchStatus?.status === 'analyzing' || 
                (researchStatus?.sources && researchStatus.sources.length > 0)) {
        stage = 'Analyzing';
        progress = 66;
      }
      
      return (
        <div className="space-y-2 my-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{stage} in progress...</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="container mx-auto max-w-4xl py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5" /> 
            <span>Deep Research</span>
          </CardTitle>
          <CardDescription>
            Conduct comprehensive research with search, analysis, and insights powered by DeerFlow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Research query input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="query" className="text-sm font-medium">
                  Research Question
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  {showSettings ? 'Hide Settings' : 'Show Settings'}
                </Button>
              </div>
              <Textarea
                id="query"
                placeholder="Enter your research question..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[100px]"
                disabled={isResearchInProgress || startResearch.isPending}
              />
            </div>
            
            {/* Research settings */}
            {showSettings && (
              <div className="p-4 bg-muted rounded-md">
                <h3 className="text-sm font-medium mb-3">Research Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="depth" className="text-xs font-medium">
                      Research Depth
                    </label>
                    <Select 
                      value={depth} 
                      onValueChange={(value: 'basic' | 'standard' | 'deep') => setDepth(value)}
                      disabled={isResearchInProgress || startResearch.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select depth" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (Quick Results)</SelectItem>
                        <SelectItem value="standard">Standard (Balanced)</SelectItem>
                        <SelectItem value="deep">Deep (Thorough Analysis)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Research progress */}
            {renderProgressIndicator()}
            
            {/* Research results */}
            {isResearchComplete && researchStatus && (
              <div className="space-y-6 mt-6 border-t pt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Research Summary</h3>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{researchStatus.summary}</ReactMarkdown>
                  </div>
                </div>
                
                {researchStatus.insights && researchStatus.insights.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Key Insights</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {researchStatus.insights.map((insight, index) => (
                        <li key={index} className="text-sm">{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {researchStatus.sources && researchStatus.sources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Sources</h3>
                    <div className="space-y-3">
                      {researchStatus.sources.map((source: Source, index: number) => (
                        <div key={index} className="text-sm border rounded-md p-3">
                          <div className="font-medium">{source.title}</div>
                          <a 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(source.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            {source.domain}
                          </a>
                          {source.contentSnippet && (
                            <p className="text-gray-600 mt-1 text-xs">{source.contentSnippet}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Research error */}
            {isResearchFailed && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Research Failed</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {researchStatus?.error || "An unexpected error occurred during research"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Service unavailable warning */}
            {!isServiceAvailable && !isResearchInProgress && !isResearchComplete && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Service Unavailable</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      The DeerFlow research service is currently unavailable. Please try again later.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-xs text-muted-foreground">
            {depth === 'basic' ? 'Quick search with basic analysis' : 
             depth === 'standard' ? 'Balanced research with moderate depth' : 
             'In-depth analysis with comprehensive sources'}
          </div>
          <Button 
            onClick={handleStartResearch}
            disabled={!query.trim() || isResearchInProgress || startResearch.isPending || !isServiceAvailable}
            className={cn(
              "min-w-[120px]",
              isResearchComplete ? "bg-green-600 hover:bg-green-700" : ""
            )}
          >
            {startResearch.isPending || isLoadingStatus ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                <span>Processing</span>
              </>
            ) : isResearchComplete ? (
              <>
                <CheckIcon className="mr-2 h-4 w-4" />
                <span>Complete</span>
              </>
            ) : (
              <>
                <SearchIcon className="mr-2 h-4 w-4" />
                <span>Research</span>
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default DeepResearch;