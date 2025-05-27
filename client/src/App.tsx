/** @jsxImportSource react */
import React, { useEffect } from "react";
import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useWebsocket } from "@/hooks/useWebsocket";

// Pages
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import Schedule from "@/pages/schedule";
import FamilyRoom from "@/pages/family-room";
import FamilyRoomDetail from "@/pages/family-room/[id]";
import Profile from "@/pages/profile";
import TripPlanning from "@/pages/trip";
import ResearchBlog from "@/pages/research-blog";
import ResearchAgent from "@/pages/research-agent";
import TemplatesPage from "@/pages/templates";
import DebugTabPersistence from "@/pages/debug-tab-persistence";

import NotFound from "@/pages/not-found";
import VietnameseChat from './pages/vietnamese-chat';
import Admin from './pages/admin';

function App() {
  const { user, isAuthenticated } = useAuth();
  const { isConnected } = useWebsocket();

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && !isConnected && user) {
      // WebSocket initialization is handled in useWebsocket hook
      console.log("User authenticated, WebSocket connection established");
    }
  }, [isAuthenticated, isConnected, user]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat" component={Chat} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/family-room" component={FamilyRoom} />
      <Route path="/family-room/:id" component={FamilyRoomDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/research-agent" component={ResearchAgent} />
      <Route path="/system-health" component={() => import('./pages/system-health')} />
      <Route path="/research-blog" component={ResearchBlog} />
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/debug-tab-persistence" component={DebugTabPersistence} />
      <Route path="/trip" component={TripPlanning} />
      <Route path="/homework" component={() => import('./pages/homework')} />
      <Route path="/vietnamese-chat" component={VietnameseChat} />
      <Route path="/admin" component={Admin} />
      <Route path="/:rest*" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;