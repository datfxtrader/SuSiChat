import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeerflow, ResearchResponse } from '@/hooks/useDeerflow';
import { ExternalLink, Search, BookOpen, List, Info, Link2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DeepResearchProps {
  initialQuery?: string;
  onResearchComplete?: (results: string) => void;
  isEmbedded?: boolean; // Whether this component is embedded in another UI
}

export const DeepResearch = ({ initialQuery = '', onResearchComplete, isEmbedded = false }: DeepResearchProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [depth, setDepth] = useState<'basic' | 'standard' | 'deep'>('standard');
  const [activeTab, setActiveTab] = useState('summary');
  
  const {
    isAvailable,
    isCheckingAvailability,
    startResearch,
    isStartingResearch,
    runCompleteResearch,
    isRunningResearch,
    researchStatus,
    isLoadingStatus,
    activeResearchId,
    formatResearchResults,
  } = useDeerflow();

  // Update the query when the initialQuery prop changes
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Auto-send the formatted research results to the parent component when research is complete
  useEffect(() => {
    if (researchStatus?.status === 'completed' && onResearchComplete) {
      const formattedResults = formatResearchResults(researchStatus);
      onResearchComplete(formattedResults);
    }
  }, [researchStatus, onResearchComplete, formatResearchResults]);

  const handleStartResearch = () => {
    if (!query.trim()) return;
    
    startResearch({
      query: query.trim(),
      depth,
      maxSources: depth === 'deep' ? 10 : (depth === 'standard' ? 5 : 3),
      useCache: true
    });
  };

  const handleRunCompleteResearch = () => {
    if (!query.trim()) return;
    
    runCompleteResearch({
      query: query.trim(),
      depth,
      maxSources: depth === 'deep' ? 10 : (depth === 'standard' ? 5 : 3),
      useCache: true
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'analyzing':
        return <Badge className="bg-indigo-500">Analyzing</Badge>;
      case 'synthesizing':
        return <Badge className="bg-purple-500">Synthesizing</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  if (isCheckingAvailability) {
    return (
      <Card className="p-4 flex items-center justify-center">
        <Spinner size="sm" /> 
        <span className="ml-2">Checking research service availability...</span>
      </Card>
    );
  }

  if (!isAvailable && !isEmbedded) {
    return (
      <Card className="p-4">
        <div className="text-center">
          <Info className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Research Service Unavailable</h3>
          <p className="text-muted-foreground mb-4">The deep research service is currently unavailable.</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex items-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${isEmbedded ? 'border-0 shadow-none' : ''}`}>
      <div className="mb-4 flex flex-col space-y-2">
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your research query"
            className="flex-grow"
          />
          <Select value={depth} onValueChange={(value: any) => setDepth(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Depth" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="deep">Deep</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="default"
            onClick={handleStartResearch} 
            disabled={!query.trim() || isStartingResearch || isRunningResearch}
            className="flex-grow flex items-center"
          >
            {isStartingResearch ? <Spinner size="sm" className="mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Start Research
          </Button>
          <Button 
            variant="outline"
            onClick={handleRunCompleteResearch} 
            disabled={!query.trim() || isStartingResearch || isRunningResearch}
            className="flex-grow flex items-center"
          >
            {isRunningResearch ? <Spinner size="sm" className="mr-2" /> : <BookOpen className="h-4 w-4 mr-2" />}
            Complete Research
          </Button>
        </div>
      </div>

      {researchStatus && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Research Results</h3>
            <div className="flex items-center space-x-2">
              {getStatusBadge(researchStatus.status)}
              {(researchStatus.status === 'in_progress' || 
                researchStatus.status === 'analyzing' || 
                researchStatus.status === 'synthesizing') && (
                <Spinner size="sm" />
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="min-h-[200px] max-h-[400px] overflow-y-auto">
              {isLoadingStatus ? (
                <div className="flex items-center justify-center h-40">
                  <Spinner />
                </div>
              ) : (
                <div className="prose max-w-none dark:prose-invert">
                  {researchStatus.summary ? (
                    <ReactMarkdown>{researchStatus.summary}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {researchStatus.status === 'completed' 
                        ? 'No summary available.' 
                        : 'Summary will be available when research is complete.'}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="sources" className="min-h-[200px] max-h-[400px] overflow-y-auto">
              {isLoadingStatus ? (
                <div className="flex items-center justify-center h-40">
                  <Spinner />
                </div>
              ) : (
                <div>
                  {researchStatus.sources && researchStatus.sources.length > 0 ? (
                    <div className="space-y-3">
                      {researchStatus.sources.map((source, index) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm">{source.title}</h4>
                            <a href={source.url} target="_blank" rel="noopener noreferrer" 
                              className="text-blue-500 hover:text-blue-700 flex items-center text-xs">
                              <span className="mr-1">{source.domain}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {source.contentSnippet || "No content snippet available."}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {researchStatus.status === 'completed' 
                        ? 'No sources available.' 
                        : 'Sources will be available when research is complete.'}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="insights" className="min-h-[200px] max-h-[400px] overflow-y-auto">
              {isLoadingStatus ? (
                <div className="flex items-center justify-center h-40">
                  <Spinner />
                </div>
              ) : (
                <div>
                  {researchStatus.insights && researchStatus.insights.length > 0 ? (
                    <ul className="space-y-2">
                      {researchStatus.insights.map((insight, index) => (
                        <li key={index} className="flex">
                          <span className="text-blue-500 mr-2">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {researchStatus.status === 'completed' 
                        ? 'No insights available.' 
                        : 'Insights will be available when research is complete.'}
                    </p>
                  )}

                  {researchStatus.relatedTopics && researchStatus.relatedTopics.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2 flex items-center">
                        <Link2 className="h-4 w-4 mr-1" />
                        Related Topics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {researchStatus.relatedTopics.map((topic, index) => (
                          <Badge key={index} variant="outline" className="cursor-pointer"
                            onClick={() => setQuery(topic)}>
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Card>
  );
};