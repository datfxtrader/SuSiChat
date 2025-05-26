import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface MobileNavProps {
  isSidebarOpen?: boolean;
  toggleSidebar?: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", icon: "chat", label: "Chat" },
    { path: "/schedule", icon: "event", label: "Schedule" },
    { path: "/family-room", icon: "groups", label: "Family" },
    { path: "/profile", icon: "person", label: "Profile" },
  ];
  
  return (
    <div className="lg:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      {/* Top bar with hamburger menu */}
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Tongkeeper</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>
      
      {/* Bottom navigation */}
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <Link 
            key={item.path}
            href={item.path}
          >
            <a className={cn(
              "flex flex-col items-center px-4 py-1",
              location === item.path 
                ? "text-primary" 
                : "text-neutral-500"
            )}>
              <span className="material-icons">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
