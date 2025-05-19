import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { SunaChat } from '@/components/suna/SunaChat';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

export default function SunaAgentPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);

  return (
    <MainLayout 
      title="Suna AI Agent" 
      subtitle="Your powerful generalist AI assistant"
    >
      <div className="container mx-auto py-6">
        <Card className="w-full h-[80vh]">
          <CardContent className="p-0 h-full">
            <Tabs defaultValue="suna" className="h-full flex flex-col">
              <div className="px-4 pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="suna">Suna Agent</TabsTrigger>
                  <TabsTrigger value="info">About Suna</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="suna" className="flex-1 overflow-hidden m-0 p-0">
                <SunaChat conversationId={activeConversationId} />
              </TabsContent>
              
              <TabsContent value="info" className="p-6 overflow-auto">
                <h2 className="text-2xl font-bold mb-4">About Suna AI Agent</h2>
                <p className="mb-4">
                  Suna is a powerful open-source generalist AI agent designed to help you accomplish 
                  real-world tasks with ease. Through natural conversation, Suna becomes your digital 
                  companion for research, data analysis, and everyday challenges.
                </p>
                
                <h3 className="text-xl font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Browser automation to navigate the web and extract data</li>
                  <li>File management for document creation and editing</li>
                  <li>Web crawling and extended search capabilities</li>
                  <li>Command-line execution for system tasks</li>
                  <li>Integration with various APIs and services</li>
                </ul>
                
                <h3 className="text-xl font-semibold mt-6 mb-3">How to Use Suna</h3>
                <p>
                  Simply chat with Suna as you would with a human assistant. Describe what you need 
                  help with, and Suna will use its toolset to assist you. Try asking Suna to:
                </p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Research a topic and summarize findings</li>
                  <li>Find and analyze data from multiple sources</li>
                  <li>Create and edit documents</li>
                  <li>Automate repetitive tasks</li>
                  <li>Solve complex problems through multi-step reasoning</li>
                </ul>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}