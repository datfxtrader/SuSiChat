import React, { useState } from 'react';
import { useDeerflowResearch } from '@/hooks/useDeerflowResearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  AlertCircle, 
  Search, 
  Loader2, 
  ExternalLink, 
  Check,
  Brain
} from 'lucide-react';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Enhanced Research Panel component using DeerFlow capabilities
 */
export function ResearchPanel() {
  const [query, setQuery] = useState('');
  const {
    isServiceAvailable,
    checkingStatus,
    performResearch,
    isResearching,
    researchError,
    researchResult,
    resetResearch
  } = useDeerflowResearch();

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    performResearch({
      query,
      max_plan_iterations: 1,
      max_step_num: 3,
      enable_background_investigation: true
    });
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Advanced Research</h2>
        
        {/* Service Status Indicator */}
        {checkingStatus ? (
          <div className="flex items-center text-gray-500">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Checking service...
          </div>
        ) : isServiceAvailable ? (
          <div className="flex items-center text-green-500">
            <Check className="h-4 w-4 mr-2" />
            Research service ready
          </div>
        ) : (
          <div className="flex items-center text-red-500">
            <AlertCircle className="h-4 w-4 mr-2" />
            Research service unavailable
          </div>
        )}
      </div>

      {/* Research Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your research query..."
            disabled={isResearching || !isServiceAvailable}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={isResearching || !isServiceAvailable || !query.trim()}
          >
            {isResearching ? (
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
        </div>
      </form>

      {/* Service Unavailable Alert */}
      {!isServiceAvailable && !checkingStatus && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Service Unavailable</AlertTitle>
          <AlertDescription>
            The advanced research service is currently unavailable. 
            Please try again later or contact support.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {researchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {researchError instanceof Error 
              ? researchError.message 
              : 'An unknown error occurred during research'}
          </AlertDescription>
        </Alert>
      )}

      {/* Research Results */}
      {researchResult && !researchError && (
        <div className="space-y-4 mt-4">
          <h3 className="text-xl font-semibold">
            Results for: {researchResult.query}
          </h3>
          
          <Tabs defaultValue="results">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="sources">
                Sources {researchResult.sources?.length > 0 && `(${researchResult.sources.length})`}
              </TabsTrigger>
              <TabsTrigger value="plan">Research Plan</TabsTrigger>
            </TabsList>
            
            {/* Results Tab */}
            <TabsContent value="results" className="space-y-4">
              <Card className="p-4">
                <div className="prose max-w-none">
                  {researchResult.result ? (
                    <div dangerouslySetInnerHTML={{ __html: researchResult.result.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <div className="text-gray-500 italic">No results available</div>
                  )}
                </div>
              </Card>
            </TabsContent>
            
            {/* Sources Tab */}
            <TabsContent value="sources">
              <Card className="p-4">
                {researchResult.sources && researchResult.sources.length > 0 ? (
                  <div className="space-y-2">
                    {researchResult.sources.map((source, index) => (
                      <div key={index} className="flex items-start p-2 border-b last:border-b-0">
                        <div className="mr-2">{index + 1}.</div>
                        <div className="flex-1">
                          <div className="font-medium">{source.title || 'Unnamed Source'}</div>
                          <div className="text-sm text-blue-600 flex items-center">
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center"
                            >
                              {source.url}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No sources available</div>
                )}
              </Card>
            </TabsContent>
            
            {/* Research Plan Tab */}
            <TabsContent value="plan">
              <Card className="p-4">
                {researchResult.plan && Object.keys(researchResult.plan).length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="plan">
                      <AccordionTrigger>
                        <div className="flex items-center">
                          <Brain className="h-4 w-4 mr-2" />
                          Research Plan
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                          {JSON.stringify(researchResult.plan, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                    
                    {researchResult.observations && researchResult.observations.length > 0 && (
                      <AccordionItem value="observations">
                        <AccordionTrigger>
                          <div className="flex items-center">
                            <Search className="h-4 w-4 mr-2" />
                            Observations ({researchResult.observations.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {researchResult.observations.map((obs, index) => (
                              <div key={index} className="p-2 bg-gray-50 rounded">
                                <div className="font-medium">Observation {index + 1}</div>
                                <div className="text-sm">{obs}</div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                ) : (
                  <div className="text-gray-500 italic">No research plan available</div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => resetResearch()}>
              Clear Results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}