import React from 'react';
import { DeepResearch } from '@/components/research/DeepResearch';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, Database, Globe } from 'lucide-react';

const ResearchPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Deep Research Tool</h1>
          <p className="text-muted-foreground">
            Perform comprehensive research on any topic with advanced capabilities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Web Research
              </CardTitle>
              <CardDescription>
                Searches multiple sources across the web
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Utilizes various search engines to find the most relevant and up-to-date information on your topic.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5 text-green-500" />
                Knowledge Synthesis
              </CardTitle>
              <CardDescription>
                Integrates information from multiple sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Combines and processes information from various sources to provide a comprehensive overview of your topic.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                Deep Analysis
              </CardTitle>
              <CardDescription>
                Extracts key insights and related topics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Identifies key insights, patterns, and related topics to provide a deeper understanding of your research query.
              </p>
            </CardContent>
          </Card>
        </div>

        <DeepResearch />
      </div>
    </MainLayout>
  );
};

export default ResearchPage;