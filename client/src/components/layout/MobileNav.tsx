
import React, { memo, useCallback, useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  MessageSquare, 
  Calendar, 
  Users, 
  User,
  Home,
  Search,
  Bell,
  X,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface MobileNavProps {
  isSidebarOpen?: boolean;
  toggleSidebar?: () => void;
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showSearch?: boolean;
  onSearchClick?: () => void;
  notifications?: number;
  className?: string;
  variant?: "default" | "floating" | "minimal";
}

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string | number;
  color?: string;
}

// Constants
const NAV_ITEMS: NavItem[] = [
  { 
    path: "/", 
    icon: MessageSquare, 
    label: "Chat",
    color: "text-blue-500"
  },
  { 
    path: "/schedule", 
    icon: Calendar, 
    label: "Schedule",
    color: "text-green-500"
  },
  { 
    path: "/family-room", 
    icon: Users, 
    label: "Family",
    color: "text-purple-500"
  },
  { 
    path: "/profile", 
    icon: User, 
    label: "Profile",
    color: "text-orange-500"
  },
];

// Animation variants
const navItemVariants = {
  inactive: { scale: 1, y: 0 },
  active: { scale: 1.05, y: -2 },
  tap: { scale: 0.95 }
};

const badgeVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 }
};

// Sub-components
const TopBar = memo<{
  isSidebarOpen?: boolean;
  toggleSidebar?: () => void;
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showSearch?: boolean;
  onSearchClick?: () => void;
  notifications?: number;
}>(({ 
  isSidebarOpen, 
  toggleSidebar, 
  title, 
  showBackButton, 
  onBackClick,
  showSearch,
  onSearchClick,
  notifications 
}) => (
  <div className="flex items-center justify-between p-4 backdrop-blur-md bg-white/80 dark:bg-neutral-900/80">
    {/* Left section */}
    <div className="flex items-center gap-2">
      {showBackButton ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBackClick}
          className="rounded-full"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="rounded-full"
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isSidebarOpen ? "close" : "menu"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </motion.div>
          </AnimatePresence>
        </Button>
      )}
    </div>

    {/* Center section */}
    <h1 className="text-lg font-semibold absolute left-1/2 -translate-x-1/2">
      {title}
    </h1>

    {/* Right section */}
    <div className="flex items-center gap-2">
      {showSearch && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchClick}
          className="rounded-full"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full relative"
        aria-label={`Notifications${notifications ? ` (${notifications})` : ''}`}
      >
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {notifications && notifications > 0 && (
            <motion.div
              variants={badgeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute -top-1 -right-1"
            >
              <Badge 
                variant="destructive" 
                className="h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {notifications > 9 ? '9+' : notifications}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </div>
  </div>
));

TopBar.displayName = "TopBar";

const NavItemButton = memo<{
  item: NavItem;
  isActive: boolean;
  hasNotification?: boolean;
}>(({ item, isActive, hasNotification }) => (
  <Link href={item.path}>
    <a className="relative">
      <motion.div
        className={cn(
          "flex flex-col items-center px-4 py-2 rounded-lg transition-colors",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800",
          isActive && "text-primary"
        )}
        variants={navItemVariants}
        initial="inactive"
        animate={isActive ? "active" : "inactive"}
        whileTap="tap"
      >
        <div className="relative">
          <item.icon className={cn(
            "h-5 w-5 transition-all",
            isActive ? "text-primary" : "text-neutral-500 dark:text-neutral-400",
            isActive && "drop-shadow-lg"
          )} />
          <AnimatePresence>
            {hasNotification && (
              <motion.div
                variants={badgeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
              />
            )}
          </AnimatePresence>
        </div>
        <span className={cn(
          "text-xs mt-1 font-medium transition-all",
          isActive ? "text-primary" : "text-neutral-500 dark:text-neutral-400"
        )}>
          {item.label}
        </span>
        {item.badge && (
          <Badge 
            variant="secondary" 
            className="absolute -top-1 -right-1 h-4 text-xs px-1"
          >
            {item.badge}
          </Badge>
        )}
      </motion.div>
      {/* Active indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 bg-primary rounded-full"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 24, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </a>
  </Link>
));

NavItemButton.displayName = "NavItemButton";

const FloatingNav = memo<{
  items: NavItem[];
  currentPath: string;
}>(({ items, currentPath }) => (
  <motion.div 
    className="fixed bottom-4 left-4 right-4 z-50"
    initial={{ y: 100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ type: "spring", damping: 20 }}
  >
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-2">
      <div className="flex justify-around">
        {items.map((item) => (
          <NavItemButton
            key={item.path}
            item={item}
            isActive={currentPath === item.path}
          />
        ))}
      </div>
    </div>
  </motion.div>
));

FloatingNav.displayName = "FloatingNav";

// Main component
const MobileNav = memo<MobileNavProps>(({ 
  isSidebarOpen, 
  toggleSidebar,
  title = "Tongkeeper",
  showBackButton,
  onBackClick,
  showSearch = true,
  onSearchClick,
  notifications,
  className,
  variant = "default"
}) => {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get current page title
  const currentTitle = useMemo(() => {
    const currentItem = NAV_ITEMS.find(item => item.path === location);
    return currentItem?.label || title;
  }, [location, title]);

  // Add badges to nav items (example)
  const navItemsWithBadges = useMemo(() => {
    return NAV_ITEMS.map(item => ({
      ...item,
      badge: item.path === "/family-room" ? 3 : undefined
    }));
  }, []);

  if (variant === "floating") {
    return (
      <>
        <div className="h-16 lg:hidden" /> {/* Spacer */}
        <FloatingNav items={navItemsWithBadges} currentPath={location} />
      </>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-40",
        "border-b border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-900",
        scrolled && "shadow-md",
        className
      )}>
        <TopBar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          title={currentTitle}
          showBackButton={showBackButton}
          onBackClick={onBackClick}
          showSearch={showSearch}
          onSearchClick={onSearchClick}
          notifications={notifications}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "lg:hidden sticky top-0 z-40",
      "border-b border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900",
      scrolled && "shadow-md",
      className
    )}>
      {/* Top bar */}
      <TopBar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        title={currentTitle}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
        showSearch={showSearch}
        onSearchClick={onSearchClick}
        notifications={notifications}
      />
      
      {/* Bottom navigation */}
      <nav 
        className="flex justify-around py-2 border-t border-neutral-100 dark:border-neutral-800"
        role="navigation"
        aria-label="Main navigation"
      >
        {navItemsWithBadges.map((item) => (
          <NavItemButton
            key={item.path}
            item={item}
            isActive={location === item.path}
            hasNotification={item.path === "/schedule" && notifications ? true : false}
          />
        ))}
      </nav>
    </div>
  );
});

MobileNav.displayName = "MobileNav";

// Export variants
export const FloatingMobileNav = memo<Omit<MobileNavProps, 'variant'>>(
  (props) => <MobileNav {...props} variant="floating" />
);

export const MinimalMobileNav = memo<Omit<MobileNavProps, 'variant'>>(
  (props) => <MobileNav {...props} variant="minimal" />
);

FloatingMobileNav.displayName = "FloatingMobileNav";
MinimalMobileNav.displayName = "MinimalMobileNav";

export default MobileNav;
