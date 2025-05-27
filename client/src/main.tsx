/** @jsx React.createElement */
import React from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

import Home from "./pages/home";
import Chat from "./pages/chat";
import FamilyRoom from "./pages/family-room";
import FamilyRoomDetail from "./pages/family-room/[id]";
import Schedule from "./pages/schedule";
import Profile from "./pages/profile";
import NotFound from "./pages/not-found";
import Trip from "./pages/trip";
import Admin from "./pages/admin";
import ResearchAgent from "./pages/research-agent";
import SystemHealth from "./pages/system-health";
import Templates from "./pages/templates";
import Homework from "./pages/homework";
import VietnameseChat from "./pages/vietnamese-chat";
import ResearchBlog from "./pages/research-blog";
import DebugTabPersistence from "./pages/debug-tab-persistence";

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent default browser behavior
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat" component={Chat} />
      <Route path="/family-room" component={FamilyRoom} />
      <Route path="/family-room/:id" component={FamilyRoomDetail} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/profile" component={Profile} />
      <Route path="/trip" component={Trip} />
      <Route path="/admin" component={Admin} />
      <Route path="/research-agent" component={ResearchAgent} />
      <Route path="/system-health" component={SystemHealth} />
      <Route path="/templates" component={Templates} />
      <Route path="/homework" component={Homework} />
      <Route path="/vietnamese-chat" component={VietnameseChat} />
      <Route path="/research-blog" component={ResearchBlog} />
      <Route path="/debug-tab-persistence" component={DebugTabPersistence} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<App />);