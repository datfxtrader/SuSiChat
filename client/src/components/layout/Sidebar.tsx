
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

const icons = {
  chat: "💬",
  event: "📅", 
  groups: "👥",
  auto_awesome: "✨",
  article: "📄",
  school: "🎓",
  flight_takeoff: "✈️",
  assistant: "🤖",
  settings: "⚙️",
  add: "➕",
  home: "🏠",
  notifications_active: "🔔"
};

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
    { path: "/research-agent", icon: "auto_awesome", label: "Research Agent" },
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
    <div 
      className={cn(
        "border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl",
        className
      )}
    >
      {/* App Logo and Title */}
      <div className="p-4 border-b border-zinc-800/60">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-xl">{icons.assistant}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Tongkeeper</h1>
            <p className="text-xs text-zinc-400">AI Assistant Platform</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-zinc-800/60">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
            <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-zinc-100 truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-zinc-400 flex items-center">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
              Personal Account
            </div>
          </div>
          <Link href="/profile" onClick={handleItemClick}>
            <a className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-all duration-200">
              <span className="text-lg">{icons.settings}</span>
            </a>
          </Link>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path} onClick={handleItemClick}>
                <a className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full",
                  isActive(item.path)
                    ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30 shadow-lg"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                )}>
                  <span className="text-lg flex-shrink-0">{icons[item.icon]}</span>
                  <span className="truncate">{item.label}</span>
                  {isActive(item.path) && (
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full ml-auto animate-pulse" />
                  )}
                </a>
              </Link>
            </li>
          ))}
        </ul>

        {/* Family Rooms Section */}
        {familyRooms && familyRooms.length > 0 && (
          <div className="mt-8">
            <div className="px-3 mb-3 flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold flex items-center">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-2" />
                Family Rooms
              </h2>
              <Link href="/family-room/new" onClick={handleItemClick}>
                <a className="p-1 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800/50 rounded-md transition-all duration-200">
                  <span className="text-sm">{icons.add}</span>
                </a>
              </Link>
            </div>

            {familyRooms.map((room) => (
              <Link 
                key={room.id} 
                href={`/family-room/${room.id}`}
                onClick={handleItemClick}
              >
                <a className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 hover:text-zinc-200 transition-all duration-200 text-zinc-400 w-full text-left group mb-1">
                  <div className="w-6 h-6 bg-zinc-700/60 group-hover:bg-zinc-600/70 rounded-lg flex items-center justify-center transition-colors">
                    <span className="text-sm">{icons.home}</span>
                  </div>
                  <span className="text-sm truncate">{room.name}</span>
                </a>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Upcoming Reminders Preview */}
      {upcomingReminders && upcomingReminders.length > 0 && (
        <div className="p-4 border-t border-zinc-800/60">
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center text-zinc-300">
              <span className="text-blue-400 mr-2 text-base">{icons.notifications_active}</span>
              Upcoming Reminders
            </h2>
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-3 hover:border-zinc-700/60 transition-all duration-200">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                  <span className="text-blue-400 text-sm">{icons.event}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-200 text-sm truncate">
                    {upcomingReminders[0].title}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {formatDateTime(upcomingReminders[0].datetime)}
                  </div>
                </div>
                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-2 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
