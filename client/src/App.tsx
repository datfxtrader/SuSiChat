import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import HomePage from './pages/home';
import ChatPage from './pages/chat';
import ResearchAgentPage from './pages/research-agent';
import VietnameseChatPage from './pages/vietnamese-chat';
import ProfilePage from './pages/profile';
import AdminPage from './pages/admin';
import SchedulePage from './pages/schedule';
import FamilyRoomPage from './pages/family-room';
import FamilyRoomDetailPage from './pages/family-room/[id]';
import HomeworkPage from './pages/homework';
import TemplatesPage from './pages/templates';
import TripPage from './pages/trip';
import ResearchBlogPage from './pages/research-blog';
import SystemHealthPage from './pages/system-health';
import NotFoundPage from './pages/not-found';
import DebugTabPersistencePage from './pages/debug-tab-persistence';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/research-agent" element={<ResearchAgentPage />} />
        <Route path="/vietnamese-chat" element={<VietnameseChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/family-room" element={<FamilyRoomPage />} />
        <Route path="/family-room/:id" element={<FamilyRoomDetailPage />} />
        <Route path="/homework" element={<HomeworkPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/trip" element={<TripPage />} />
        <Route path="/research-blog" element={<ResearchBlogPage />} />
        <Route path="/system-health" element={<SystemHealthPage />} />
        <Route path="/debug-tab-persistence" element={<DebugTabPersistencePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;