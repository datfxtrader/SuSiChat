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
    { path: "/research-blog", icon: "article", label: "Research Blog" },
    { path: "/profile", icon: "school", label: "Homework Help" },
    { path: "/trip", icon: "flight_takeoff", label: "Trip Planning" },
  ];

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onItemClick) {
      onItemClick();
    }
  };

  const isActive = (path: string) => location === path;

  return (
    <div className={cn(
      "border-r border-border",
      className
    )} style={{ 
      background: 'rgba(15, 23, 42, 0.8)', 
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)'
    }}>
      {/* App Logo and Title */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="material-icons text-white text-xl">assistant</span>
          </div>
          <h1 className="text-lg font-semibold">Tongkeeper</h1>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-border">
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
            <a className="ml-auto text-muted-foreground hover:text-foreground">
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
              <div className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50",
                isActive(item.path) && "bg-muted text-foreground"
              )}>
                <Link href={item.path} onClick={handleItemClick} className="flex items-center gap-3 w-full">
                  <span className="material-icons">{item.icon}</span>
                  {item.label}
                </Link>
              </div>
            </li>
          ))}
        </ul>

        {/* Family Chats Section */}
        {familyRooms && familyRooms.length > 0 && (
          <div className="mt-8">
            <div className="px-4 mb-2 flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
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
                <div className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-muted/50 text-foreground mb-1">
                  <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                    <span className="material-icons text-white text-sm">home</span>
                  </div>
                  <span>{room.name}</span>
                </div>
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