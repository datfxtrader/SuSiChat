
import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from '@/hooks/use-mobile';
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2 } from "lucide-react";
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

// Types
interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  headerRight?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  onSidebarToggle?: (isOpen: boolean) => void;
  sidebarDefaultOpen?: boolean;
  maxContentWidth?: string;
  showBreadcrumbs?: boolean;
  breadcrumbs?: BreadcrumbItem[];
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

// Constants
const SIDEBAR_WIDTH = 256; // 16rem
const MOBILE_BREAKPOINT = 1024; // lg breakpoint
const ANIMATION_DURATION = 300;

// Sub-components
const LoadingScreen = memo(() => (
  <div 
    className="flex items-center justify-center min-h-screen bg-background"
    role="status"
    aria-label="Loading application"
  >
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading Tongkeeper...</p>
    </div>
  </div>
));

LoadingScreen.displayName = "LoadingScreen";

const AuthScreen = memo(() => {
  const handleLogin = useCallback(() => {
    window.location.href = "/api/login";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-md w-full p-8 m-4">
        <div className="bg-card rounded-lg shadow-xl p-8 space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
              <span className="material-icons text-white text-4xl">assistant</span>
            </div>
          </div>
          
          {/* Content */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Tongkeeper</h1>
            <p className="text-muted-foreground">
              Your personal AI assistant for the whole family. Log in to get started.
            </p>
          </div>
          
          {/* Login button */}
          <Button 
            className="w-full h-12 text-base" 
            onClick={handleLogin}
            size="lg"
          >
            <LogIn className="mr-2 h-5 w-5" /> 
            Log In with Google
          </Button>
          
          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground">
            By logging in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
});

AuthScreen.displayName = "AuthScreen";

const Header = memo<{
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  className?: string;
  breadcrumbs?: BreadcrumbItem[];
}>(({ title, subtitle, headerRight, className, breadcrumbs }) => (
  <header 
    className={cn(
      "border-b border-border bg-background/80 backdrop-blur-sm",
      "sticky top-0 z-20",
      className
    )}
  >
    <div className="px-4 py-3 lg:px-6 lg:py-4">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-neutral-400">/</span>}
                {crumb.href ? (
                  <a 
                    href={crumb.href}
                    className="hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {crumb.icon}
                    {crumb.label}
                  </a>
                ) : (
                  <span className="flex items-center gap-1 text-foreground">
                    {crumb.icon}
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      
      {/* Main header content */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg lg:text-xl font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerRight && (
          <div className="ml-4 flex items-center gap-2">
            {headerRight}
          </div>
        )}
      </div>
    </div>
  </header>
));

Header.displayName = "Header";

// Custom hooks
const useSidebarState = (defaultOpen = false, isMobile: boolean) => {
  const [isOpen, setIsOpen] = useState(defaultOpen && !isMobile);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggle = useCallback(() => {
    setIsAnimating(true);
    setIsOpen(prev => !prev);
    setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
  }, []);

  const close = useCallback(() => {
    if (isOpen) {
      setIsAnimating(true);
      setIsOpen(false);
      setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isMobile && isOpen) {
      close();
    }
  }, [isMobile, isOpen, close]);

  return { isOpen, isAnimating, toggle, close };
};

// Main component
const MainLayout = memo<MainLayoutProps>(({ 
  children,
  title = "Tongkeeper",
  subtitle,
  showHeader = true,
  headerRight,
  className,
  contentClassName,
  headerClassName,
  onSidebarToggle,
  sidebarDefaultOpen = false,
  maxContentWidth,
  showBreadcrumbs = false,
  breadcrumbs
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
  const mainRef = useRef<HTMLDivElement>(null);
  
  const { isOpen: isSidebarOpen, isAnimating, toggle: toggleSidebar, close: closeSidebar } = 
    useSidebarState(!isMobile || sidebarDefaultOpen, isMobile);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with Cmd/Ctrl + B
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // Toggle sidebar collapse with Cmd/Ctrl + Shift + B
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
      // Close sidebar with Escape on mobile
      if (e.key === 'Escape' && isMobile && isSidebarOpen) {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, closeSidebar, isMobile, isSidebarOpen, sidebarCollapsed]);

  // Notify parent of sidebar state changes
  useEffect(() => {
    onSidebarToggle?.(isSidebarOpen);
  }, [isSidebarOpen, onSidebarToggle]);

  // Focus management
  useEffect(() => {
    if (!isSidebarOpen && mainRef.current) {
      mainRef.current.focus();
    }
  }, [isSidebarOpen]);

  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Auth check
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className={cn("flex h-screen", THEME.bg.primary, className)}>
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-background px-4 py-2 rounded-md"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 h-screen z-40",
          "transition-transform duration-300 ease-in-out",
          "lg:w-auto", // Let sidebar control its own width
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Main navigation"
      >
        <Sidebar 
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          onItemClick={isMobile ? closeSidebar : undefined}
          className="block" // Ensure sidebar is always visible
        />
      </aside>

      {/* Main content area */}
      <div 
        className="flex-1 flex flex-col h-screen overflow-hidden"
        style={{ 
          marginLeft: !isMobile && isSidebarOpen ? 0 : undefined 
        }}
      >
        {/* Mobile header */}
        {isMobile && (
          <MobileNav 
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            title={title}
            notifications={3}
          />
        )}
        
        {/* Desktop header */}
        {showHeader && !isMobile && (
          <Header
            title={title}
            subtitle={subtitle}
            headerRight={
              <div className="flex items-center gap-2">
                {/* Sidebar toggle for desktop */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="lg:inline-flex hidden"
                  aria-label="Toggle sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Button>
                {headerRight}
              </div>
            }
            className={headerClassName}
            breadcrumbs={showBreadcrumbs ? breadcrumbs : undefined}
          />
        )}
        
        {/* Content */}
        <main 
          id="main-content"
          ref={mainRef}
          className={cn(
            "flex-1 overflow-auto focus:outline-none",
            "bg-background",
            contentClassName
          )}
          tabIndex={-1}
          role="main"
          aria-label="Main content"
        >
          <div className={cn(
            "h-full",
            maxContentWidth && "max-w-screen-2xl mx-auto"
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className={cn(
            "fixed inset-0 bg-black/30 backdrop-blur-sm z-30",
            "transition-opacity duration-300",
            isAnimating ? "opacity-100" : "opacity-0"
          )}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
});

MainLayout.displayName = "MainLayout";

// Export sub-components for flexibility
export { LoadingScreen, AuthScreen, Header };
export default MainLayout;
