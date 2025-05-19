import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ExternalLink, Search, BookOpen, FileText, AlertTriangle, 
  CheckCircle, Loader2, Brain, Lightbulb, List
} from 'lucide-react';
import useDeerflow, { ResearchResponse } from '@/hooks/useDeerflow';

interface DeepResearchProps {
  onResultsReady?: (results: ResearchResponse) => void;
  initialQuery?: string;
  autoStart?: boolean;
  embedded?: boolean;
}

export function DeepResearch({ 
  onResultsReady, 
  initialQuery = '', 
  autoStart = false,
  embedded = false
}: DeepResearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [researchStarted, setResearchStarted] = useState(autoStart);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const {
    useServiceHealth,
    useStartResearch,
    useResearchStatus,
    useCompleteResearch,
    activeTaskId,
    resetActiveTask
  } = useDeerflow();
  
  // Check DeerFlow service availability
  const { 
    data: healthData,
    isLoading: isCheckingHealth,
    isError: healthCheckFailed
  } = useServiceHealth();

  // Start research mutation
  const {
    mutate: startResearch,
    isPending: isStartingResearch
  } = useStartResearch();
  
  // Complete research mutation (for direct completion)
  const {
    mutate: runCompleteResearch,
    isPending: isRunningCompleteResearch,
    data: completeResearchData
  } = useCompleteResearch();
  
  // Research status for polling
  const {
    data: researchStatus,
    isLoading: isLoadingStatus
  } = useResearchStatus(activeTaskId);
  
  // Combine results from either source
  const results = completeResearchData || researchStatus;
  
  // Determine overall loading state
  const isLoading = isStartingResearch || isRunningCompleteResearch || isLoadingStatus;
  
  // Calculate progress for in-progress research
  const getProgressValue = () => {
    if (!results) return 0;
    
    switch (results.status) {
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      case 'analyzing':
        return 40;
      case 'synthesizing':
        return 75;
      case 'in_progress':
      default:
        return 20;
    }
  };
  
  // Get status message
  const getStatusMessage = () => {
    if (!results) return 'Preparing research...';
    
    switch (results.status) {
      case 'completed':
        return 'Research complete';
      case 'failed':
        return `Research failed: ${results.error || 'Unknown error'}`;
      case 'analyzing':
        return 'Analyzing sources...';
      case 'synthesizing':
        return 'Synthesizing insights...';
      case 'in_progress':
      default:
        return 'Research in progress...';
    }
  };
  
  // Start or restart research
  const handleSearch = () => {
    if (!query.trim()) return;
    
    setResearchStarted(true);
    setIsSearching(true);
    
    // Direct approach - complete in one call
    runCompleteResearch({
      query: query.trim(),
      depth: 'standard',
      maxSources: 6,
      useCache: true
    });
  };
  
  // Reset research
  const handleReset = () => {
    resetActiveTask();
    setResearchStarted(false);
    setIsSearching(false);
  };
  
  // Call the callback when results are ready
  React.useEffect(() => {
    if (results && results.status === 'completed' && onResultsReady) {
      onResultsReady(results);
    }
  }, [results, onResultsReady]);
  
  // Auto-start research if autoStart is true
  React.useEffect(() => {
    if (autoStart && initialQuery && !researchStarted) {
      setQuery(initialQuery);
      handleSearch();
    }
  }, [autoStart, initialQuery]);
  
  // Service health check
  if (isCheckingHealth) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking research service...</AlertTitle>
        <AlertDescription>
          Please wait while we connect to the research service.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (healthCheckFailed) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Research Service Unavailable</AlertTitle>
        <AlertDescription>
          The deep research service is currently unavailable. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className={embedded ? 'p-0' : 'p-4'}>
      <Card className="w-full">
        <CardHeader className={embedded ? 'pb-2' : 'pb-6'}>
          <CardTitle className="flex items-center gap-2">
            <Brain size={24} />
            {embedded ? 'Research Results' : 'Deep Research'}
          </CardTitle>
          {!embedded && (
            <CardDescription>
              Perform comprehensive research on any topic with our enhanced research capabilities.
            </CardDescription>
          )}
        </CardHeader>
        
        {!embedded && (
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter your research query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isSearching}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={!query.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Researching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" /> Research
                  </>
                )}
              </Button>
            </div>
            
            {isSearching && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{getStatusMessage()}</span>
                  <span>{getProgressValue()}%</span>
                </div>
                <Progress value={getProgressValue()} className="h-2" />
              </div>
            )}
          </CardContent>
        )}
        
        {results && (
          <CardContent className={embedded ? 'pt-0' : ''}>
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 mt-4">
                {results.summary && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" /> Summary
                    </h3>
                    <p className="text-sm">{results.summary}</p>
                  </div>
                )}
                
                {results.relatedTopics && results.relatedTopics.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <List className="h-5 w-5" /> Related Topics
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {results.relatedTopics.map((topic, index) => (
                        <Badge key={index} variant="secondary">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="sources" className="space-y-4 mt-4">
                {results.sources.length > 0 ? (
                  <div className="space-y-4">
                    {results.sources.map((source, index) => (
                      <Card key={index}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-md flex items-center justify-between">
                            <span className="truncate flex-1">{source.title}</span>
                            <Badge variant="outline" className="ml-2">
                              {source.domain}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        {source.contentSnippet && (
                          <CardContent className="py-2">
                            <p className="text-sm text-muted-foreground">
                              {source.contentSnippet.substring(0, 150)}
                              {source.contentSnippet.length > 150 && '...'}
                            </p>
                          </CardContent>
                        )}
                        <CardFooter className="pt-1 pb-3 flex justify-between">
                          <Badge variant="secondary">
                            Source {index + 1}
                          </Badge>
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                          >
                            Visit <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BookOpen className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">No sources found</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-4 mt-4">
                {results.insights.length > 0 ? (
                  <div className="space-y-4">
                    {results.insights.map((insight, index) => (
                      <Card key={index}>
                        <CardContent className="py-4">
                          <div className="flex">
                            <Lightbulb className="h-5 w-5 mr-3 flex-shrink-0 text-amber-500" />
                            <p className="text-sm">{insight}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">No insights found</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
        
        <CardFooter className={`${embedded ? 'pt-0' : 'pt-2'} flex justify-between`}>
          {results && results.status === 'completed' && !embedded && (
            <Button variant="outline" onClick={handleReset}>
              New Research
            </Button>
          )}
          
          {results && results.status === 'failed' && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Research Failed</AlertTitle>
              <AlertDescription>
                {results.error || 'An unknown error occurred during research.'}
              </AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default DeepResearch;