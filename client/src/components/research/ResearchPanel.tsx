import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Sparkles, Database, ArrowUpRight, AlertCircle } from 'lucide-react';
import { useResearch, ResearchDepth, ResearchResult } from '@/hooks/useResearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';

// Format processing time to a human-readable format
const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

// Format date to a human-readable format
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

interface ResearchPanelProps {
  initialQuery?: string;
  defaultDepth?: ResearchDepth;
}

const ResearchPanel: React.FC<ResearchPanelProps> = ({ 
  initialQuery = '', 
  defaultDepth = ResearchDepth.Basic 
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [depth, setDepth] = useState<ResearchDepth>(defaultDepth);
  const { performResearch, result, isLoading, error, resetResearch } = useResearch();
  const { toast } = useToast();

  // Handle research submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: 'Empty Query',
        description: 'Please enter a research question',
        variant: 'destructive',
      });
      return;
    }
    
    performResearch({
      query: query.trim(),
      depth,
    });
  };

  // Get depth label and icon
  const getDepthInfo = (level: ResearchDepth) => {
    switch (level) {
      case ResearchDepth.Basic:
        return { label: 'Basic', icon: <Search className="h-4 w-4 mr-2" /> };
      case ResearchDepth.Enhanced:
        return { label: 'Enhanced', icon: <Sparkles className="h-4 w-4 mr-2" /> };
      case ResearchDepth.Deep:
        return { label: 'Deep', icon: <Database className="h-4 w-4 mr-2" /> };
      default:
        return { label: 'Unknown', icon: <Search className="h-4 w-4 mr-2" /> };
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col space-y-4">
        {/* Research form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <h2 className="text-xl font-semibold">Research</h2>
            <p className="text-sm text-gray-500">
              Ask a research question to get comprehensive information from multiple sources
            </p>
          </div>
          
          {/* Search input and button */}
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Enter your research question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Research
                </>
              )}
            </Button>
          </div>
          
          {/* Research depth selector */}
          <div className="flex items-center space-x-4">
            <span className="text-sm">Research Depth:</span>
            <div className="flex border rounded-md overflow-hidden">
              <Button
                type="button"
                variant="ghost"
                className={`px-3 py-1 h-8 rounded-none ${depth === ResearchDepth.Basic ? 'bg-blue-500 text-white' : ''}`}
                onClick={() => setDepth(ResearchDepth.Basic)}
                disabled={isLoading}
              >
                <Search className="h-3 w-3 mr-1" />1
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`px-3 py-1 h-8 rounded-none ${depth === ResearchDepth.Enhanced ? 'bg-blue-500 text-white' : ''}`}
                onClick={() => setDepth(ResearchDepth.Enhanced)}
                disabled={isLoading}
              >
                <Sparkles className="h-3 w-3 mr-1" />2
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`px-3 py-1 h-8 rounded-none ${depth === ResearchDepth.Deep ? 'bg-blue-500 text-white' : ''}`}
                onClick={() => setDepth(ResearchDepth.Deep)}
                disabled={isLoading}
              >
                <Database className="h-3 w-3 mr-1" />3
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              {depth === ResearchDepth.Basic && '5-15 seconds, basic results'}
              {depth === ResearchDepth.Enhanced && '15-30 seconds, comprehensive analysis'}
              {depth === ResearchDepth.Deep && '1-2 minutes, deep research with DeerFlow'}
            </div>
          </div>
        </form>
        
        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'An error occurred during research'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Research results */}
        {result && (
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Research Results</CardTitle>
                  <CardDescription>
                    {query} 
                    <span className="ml-2">
                      <Badge variant="outline" className="ml-2">
                        <div className="flex items-center">
                          {getDepthInfo(result.depth).icon}
                          {getDepthInfo(result.depth).label} Research
                        </div>
                      </Badge>
                    </span>
                  </CardDescription>
                </div>
                <div className="text-xs text-gray-500">
                  Processed in {formatTime(result.processingTime)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="report">
                <TabsList>
                  <TabsTrigger value="report">Report</TabsTrigger>
                  <TabsTrigger value="sources">Sources ({result.sources.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="report" className="mt-4">
                  <div className="markdown-content prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {result.report}
                    </ReactMarkdown>
                  </div>
                </TabsContent>
                
                <TabsContent value="sources" className="mt-4">
                  {result.sources.length > 0 ? (
                    <div className="space-y-4">
                      {result.sources.map((source, index) => (
                        <div key={index} className="flex border rounded-md p-3">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=64`} alt={source.domain} />
                            <AvatarFallback>{source.domain.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{source.title}</h4>
                            <p className="text-xs text-gray-500">{source.domain}</p>
                            {source.content && (
                              <p className="text-sm mt-1 text-gray-700 line-clamp-2">{source.content}</p>
                            )}
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center"
                            >
                              Visit Source <ArrowUpRight className="ml-1 h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No sources available</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="border-t pt-4 flex justify-between">
              <Button variant="outline" onClick={resetResearch}>
                New Research
              </Button>
              <div className="text-xs text-gray-500">
                Made with ❤️ and ☕
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResearchPanel;