import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { THEME } from '@/lib/theme';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  headerRight?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children,
  title = "Tongkeeper",
  subtitle,
  showHeader = true,
  headerRight
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Reset sidebar state when switching between mobile/desktop
    setIsSidebarOpen(false);
  }, [isMobile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-t-2 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="material-icons text-white text-3xl">assistant</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Tongkeeper</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Your personal AI assistant for the whole family. Log in to get started.
          </p>
          <Button className="w-full" onClick={() => window.location.href = "/api/login"}>
            <LogIn className="mr-2 h-4 w-4" /> Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${THEME.bg.primary}`}>
      {/* Sidebar - Fixed position on desktop, absolute on mobile */}
      <div className={`
        fixed lg:relative z-40
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out
      `}>
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-transparent">
        {/* Mobile header */}
        {isMobile && (
          <MobileNav 
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        )}

        {/* Desktop header */}
        {showHeader && (
          <div className="border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4">
              <div>
                <h2 className="font-semibold">{title}</h2>
                {subtitle && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
                )}
              </div>
              {headerRight}
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto bg-transparent">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Toaster />
    </div>
  );
};

export default MainLayout;