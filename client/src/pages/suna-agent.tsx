import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { ModernSunaChat } from '@/components/suna/ModernSunaChat';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Sparkles, MessageSquare, Zap, Search, FileText } from 'lucide-react';

export default function SunaAgentPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);
  // Remove process.env reference which doesn't work in client code
  const isSunaConfigured = true; // We're always configured either with mock or real Suna

  return (
    <MainLayout 
      title="AI Assistant" 
      subtitle="Your powerful AI companion powered by Tongkeeper"
    >
      <div className="container mx-auto py-4">
        <Card className="w-full h-[85vh] border-none shadow-lg overflow-hidden">
          <CardContent className="p-0 h-full">
            <Tabs defaultValue="suna" className="h-full flex flex-col">
              <div className="px-4 pt-4 bg-muted/30">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                  <TabsTrigger value="suna" className="rounded-full">
                    <Sparkles className="h-4 w-4 mr-2" /> AI Assistant
                  </TabsTrigger>
                  <TabsTrigger value="info" className="rounded-full">
                    <MessageSquare className="h-4 w-4 mr-2" /> About
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="suna" className="flex-1 overflow-hidden m-0 p-0">
                <ModernSunaChat threadId={activeThreadId} />
              </TabsContent>
              
              <TabsContent value="info" className="p-6 overflow-auto">
                <div className="max-w-3xl mx-auto">
                  <div className="flex justify-center mb-8">
                    <div className="bg-gradient-to-r from-violet-300 to-indigo-400 p-5 rounded-full">
                      <Sparkles className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-6 text-center">Your AI Assistant</h2>
                  <p className="text-lg mb-8 text-center text-muted-foreground">
                    Powered by cutting-edge AI technology, your assistant helps you accomplish
                    real-world tasks with ease. Through natural conversation, it becomes your digital
                    companion for research, problem-solving, and everyday challenges.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-muted hover:shadow-md transition-shadow">
                      <div className="bg-primary/10 rounded-full p-3 w-fit mb-4">
                        <Search className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">Intelligent Research</h3>
                      <p className="text-muted-foreground">
                        Analyzes complex information, extracts key insights, and presents findings in a clear, 
                        understandable format.
                      </p>
                    </div>
                    
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-muted hover:shadow-md transition-shadow">
                      <div className="bg-primary/10 rounded-full p-3 w-fit mb-4">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">Creative Problem-Solving</h3>
                      <p className="text-muted-foreground">
                        Approaches challenges from multiple angles, offering innovative solutions and 
                        step-by-step guidance.
                      </p>
                    </div>
                    
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-muted hover:shadow-md transition-shadow">
                      <div className="bg-primary/10 rounded-full p-3 w-fit mb-4">
                        <MessageSquare className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">Natural Conversation</h3>
                      <p className="text-muted-foreground">
                        Engages in human-like dialogue, understands context, and maintains memory of 
                        previous interactions.
                      </p>
                    </div>
                    
                    <div className="bg-card rounded-xl p-6 shadow-sm border border-muted hover:shadow-md transition-shadow">
                      <div className="bg-primary/10 rounded-full p-3 w-fit mb-4">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">Content Creation</h3>
                      <p className="text-muted-foreground">
                        Generates high-quality text for various purposes, from creative writing to 
                        professional documentation.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-semibold mb-4">How to Get the Most from Your Assistant</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="bg-primary/20 text-primary font-medium rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">1</span>
                        <span>Be specific with your questions to get more precise answers</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-primary/20 text-primary font-medium rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">2</span>
                        <span>Break complex tasks into smaller, manageable requests</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-primary/20 text-primary font-medium rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">3</span>
                        <span>Provide feedback to help the assistant better understand your needs</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-primary/20 text-primary font-medium rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">4</span>
                        <span>Use follow-up questions to refine and expand on initial responses</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                    <div className="flex items-center mb-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                      <h4 className="font-semibold text-amber-800">Important Note</h4>
                    </div>
                    <p className="text-amber-700">
                      The AI assistant uses your DeepSeek API key to provide intelligent responses. While it's designed to be helpful,
                      it may occasionally produce inaccurate information. Always verify important facts from trusted sources.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}