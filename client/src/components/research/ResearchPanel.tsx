import React, { useState } from 'react';
import { ResearchDepthSelector } from './ResearchDepthSelector';
import { useResearch, ResearchDepth } from '@/hooks/useResearch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

interface ResearchPanelProps {
  onResearchComplete?: (report: string) => void;
}

export function ResearchPanel({ onResearchComplete }: ResearchPanelProps) {
  const [query, setQuery] = useState('');
  const [researchDepth, setResearchDepth] = useState<ResearchDepth>(ResearchDepth.Basic);
  const { performResearch, result, isLoading, error, resetResearch } = useResearch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    performResearch({
      query,
      depth: researchDepth,
    });
  };

  const handleUseResults = () => {
    if (result?.report && onResearchComplete) {
      onResearchComplete(result.report);
      resetResearch();
      setQuery('');
    }
  };

  const handleNewSearch = () => {
    resetResearch();
  };

  return (
    <div className="flex flex-col h-full">
      {!result ? (
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Research Assistant</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="query" className="text-sm font-medium">Research Question</label>
                <Textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What would you like to research?"
                  className="min-h-[120px]"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Research Depth</label>
                <ResearchDepthSelector
                  value={researchDepth}
                  onChange={setResearchDepth}
                  disabled={isLoading}
                />
                {researchDepth === ResearchDepth.Deep && (
                  <Alert variant="warning" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Deep research may take 1-2 minutes to complete as it uses the DeerFlow research engine.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={!query.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Research
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Research Results</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="mb-2 text-sm text-muted-foreground">
              Research depth: <span className="font-medium">{
                researchDepth === ResearchDepth.Basic ? 'Basic' :
                researchDepth === ResearchDepth.Enhanced ? 'Enhanced' : 'Deep'
              }</span>
              {result.processingTime && (
                <span className="ml-2">
                  (completed in {(result.processingTime / 1000).toFixed(1)}s)
                </span>
              )}
            </div>
            
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
                {result.report}
              </ReactMarkdown>
              
              {result.sources && result.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2">Sources</h3>
                  <ul className="text-sm space-y-1">
                    {result.sources.map((source, index) => (
                      <li key={index}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {source.title || source.domain}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleNewSearch}>
              New Search
            </Button>
            {onResearchComplete && (
              <Button onClick={handleUseResults}>
                Use Results
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'An error occurred during research'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}