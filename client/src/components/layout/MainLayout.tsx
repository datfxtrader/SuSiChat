import React, { useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop */}
      <Sidebar className="hidden md:flex md:w-64 lg:w-80 flex-col" />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between p-3">
            <button 
              className="text-neutral-500"
              onClick={() => setShowMobileSidebar(true)}
            >
              <span className="material-icons">menu</span>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                <span className="material-icons text-white text-sm">assistant</span>
              </div>
              <h1 className="font-semibold">Tongkeeper</h1>
            </div>
            <button 
              className="text-neutral-500"
              onClick={() => navigate('/profile')}
            >
              <span className="material-icons">account_circle</span>
            </button>
          </div>
        </div>
        
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
        
        {/* Main content area */}
        {children}
        
        {/* Mobile navigation */}
        <MobileNav />
        
        {/* Mobile sidebar overlay */}
        {showMobileSidebar && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowMobileSidebar(false)}
            ></div>
            <div className="fixed inset-y-0 left-0 w-64 bg-background/95 backdrop-blur-md shadow-lg">
              <Sidebar onItemClick={() => setShowMobileSidebar(false)} />
            </div>
          </div>
        )}
      </div>
      
      <Toaster />
    </div>
  );
};

export default MainLayout;
