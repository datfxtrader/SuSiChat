import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from "lucide-react";
import MainLayout from '@/components/layout/MainLayout';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

/**
 * Test page for DeerFlow integration
 */
export default function DeerflowTestPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a research query');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await apiRequest(
        'POST',
        '/api/deerflow/research',
        { query }
      );
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.research) {
        setResult(data.research.result);
      } else if (data.error) {
        setError(data.error);
      } else {
        setError('Unexpected response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">DeerFlow Advanced Research Test</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test DeerFlow Integration</CardTitle>
            <CardDescription>
              This page directly tests the DeerFlow research implementation (equivalent to research depth level 3)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="query" className="text-sm font-medium">Research Query</label>
                <Input
                  id="query"
                  placeholder="Enter your research question..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Researching...
                  </>
                ) : (
                  'Perform Advanced Research'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {error && (
          <Card className="mb-8 border-red-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-500">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        )}
        
        {result && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Research Results</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[60vh] overflow-y-auto">
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownRenderer content={result} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}