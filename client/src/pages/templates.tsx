import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import TemplateManager from '@/components/templates/TemplateManager';

const TemplatesPage: React.FC = () => {
  return (
    <MainLayout title="Research Templates">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <TemplateManager />
      </div>
    </MainLayout>
  );
};

export default TemplatesPage;