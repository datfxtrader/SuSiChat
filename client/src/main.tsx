
/** @jsxImportSource react */
import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Eager load critical routes
import ResearchAgent from "./pages/research-agent";
import NotFound from "./pages/not-found";

// Lazy load non-critical routes
const Home = lazy(() => import("./pages/home"));
const Chat = lazy(() => import("./pages/chat"));
const FamilyRoom = lazy(() => import("./pages/family-room"));
const FamilyRoomDetail = lazy(() => import("./pages/family-room/[id]"));
const Schedule = lazy(() => import("./pages/schedule"));
const Profile = lazy(() => import("./pages/profile"));
const Trip = lazy(() => import("./pages/trip"));
const Admin = lazy(() => import("./pages/admin"));
const SystemHealth = lazy(() => import("./pages/system-health"));
const Templates = lazy(() => import("./pages/templates"));
const Homework = lazy(() => import("./pages/homework"));
const VietnameseChat = lazy(() => import("./pages/vietnamese-chat"));
const ResearchBlog = lazy(() => import("./pages/research-blog"));
const DebugTabPersistence = lazy(() => import("./pages/debug-tab-persistence"));

// Global error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component for suspense
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Setup global error handlers
const setupErrorHandlers = () => {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
};

// Route configuration
const routes = [
  { path: "/", component: ResearchAgent },
  { path: "/home", component: Home },
  { path: "/chat", component: Chat },
  { path: "/family-room", component: FamilyRoom },
  { path: "/family-room/:id", component: FamilyRoomDetail },
  { path: "/schedule", component: Schedule },
  { path: "/profile", component: Profile },
  { path: "/trip", component: Trip },
  { path: "/admin", component: Admin },
  { path: "/research-agent", component: ResearchAgent },
  { path: "/system-health", component: SystemHealth },
  { path: "/templates", component: Templates },
  { path: "/homework", component: Homework },
  { path: "/vietnamese-chat", component: VietnameseChat },
  { path: "/research-blog", component: ResearchBlog },
  { path: "/debug-tab-persistence", component: DebugTabPersistence },
];

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {routes.map(({ path, component: Component }) => (
          <Route key={path} path={path} component={Component} />
        ))}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Initialize app
const initApp = () => {
  setupErrorHandlers();
  
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Start the app
initApp();
