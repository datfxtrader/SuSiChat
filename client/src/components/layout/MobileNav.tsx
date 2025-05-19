import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const MobileNav: React.FC = () => {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", icon: "chat", label: "Chat" },
    { path: "/schedule", icon: "event", label: "Schedule" },
    { path: "/family-room", icon: "groups", label: "Family" },
    { path: "/profile", icon: "person", label: "Profile" },
  ];
  
  return (
    <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2">
      <div className="flex justify-around">
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
