import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSchedule } from "@/hooks/useSchedule";
import { formatDateTime } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  onItemClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, onItemClick }) => {
  const { user } = useAuth();
  const [location] = useLocation();
  const { upcomingReminders } = useSchedule();
  
  const { data: familyRooms } = useQuery({
    queryKey: ['/api/family-rooms'],
  });
  
  const navItems = [
    { path: "/", icon: "chat", label: "Chat" },
    { path: "/schedule", icon: "event", label: "Schedule" },
    { path: "/family-room", icon: "groups", label: "Family Room" },
    { path: "/suna-agent", icon: "smart_toy", label: "Suna Agent" },
    { path: "/profile", icon: "school", label: "Homework Help" },
    { path: "/trip", icon: "flight_takeoff", label: "Trip Planning" },
  ];
  
  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onItemClick) {
      onItemClick();
    }
  };
  
  return (
    <div className={cn(
      "border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
      className
    )}>
      {/* App Logo and Title */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="material-icons text-white text-xl">assistant</span>
          </div>
          <h1 className="text-lg font-semibold">Tongkeeper</h1>
        </div>
      </div>
      
      {/* User Profile Section */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
            <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Personal Account
            </div>
          </div>
          <Link href="/profile" onClick={handleItemClick}>
            <a className="ml-auto text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
              <span className="material-icons text-lg">settings</span>
            </a>
          </Link>
        </div>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 auto-overflow">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path} onClick={handleItemClick}>
                <a className={cn(
                  "flex items-center space-x-3 px-4 py-2 rounded-lg",
                  location === item.path
                    ? "bg-primary/10 text-primary dark:bg-primary/20"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                )}>
                  <span className="material-icons">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.path === "/family-room" && (
                    <span className="ml-auto bg-accent text-white text-xs px-2 py-0.5 rounded-full">
                      {familyRooms?.length || 0}
                    </span>
                  )}
                </a>
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Family Chats Section */}
        {familyRooms && familyRooms.length > 0 && (
          <div className="mt-8">
            <div className="px-4 mb-2 flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-medium">
                Family Rooms
              </h2>
              <Link href="/family-room/new" onClick={handleItemClick}>
                <a className="text-primary hover:text-primary-dark">
                  <span className="material-icons text-sm">add</span>
                </a>
              </Link>
            </div>
            
            {familyRooms.map((room) => (
              <Link 
                key={room.id} 
                href={`/family-room/${room.id}`}
                onClick={handleItemClick}
              >
                <a className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 mb-1">
                  <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                    <span className="material-icons text-white text-sm">home</span>
                  </div>
                  <span>{room.name}</span>
                </a>
              </Link>
            ))}
          </div>
        )}
      </nav>
      
      {/* Upcoming Reminders Preview */}
      {upcomingReminders && upcomingReminders.length > 0 && (
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-medium mb-2 flex items-center">
              <span className="material-icons text-accent mr-2 text-sm">notifications_active</span>
              Upcoming Reminders
            </h2>
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 text-sm">
              <div className="flex items-center">
                <span className="material-icons text-primary text-sm mr-2">event</span>
                <div>
                  <div className="font-medium">{upcomingReminders[0].title}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDateTime(upcomingReminders[0].datetime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
