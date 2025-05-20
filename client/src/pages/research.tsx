import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ResearchPanel from '@/components/research/ResearchPanel';

const ResearchPage = () => {
  return (
    <MainLayout>
      <div className="flex flex-col items-center p-4 md:p-8 max-w-5xl mx-auto">
        <div className="w-full mb-6">
          <h1 className="text-3xl font-bold mb-2">Research</h1>
          <p className="text-gray-500">
            Ask research questions and get comprehensive answers with sources
          </p>
        </div>
        
        <ResearchPanel />
      </div>
    </MainLayout>
  );
};

export default ResearchPage;