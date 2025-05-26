
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  MessageSquare,
  Search,
  BookOpen,
  Bot,
  Home,
  Settings,
  User,
  Calendar,
  FileText,
  Languages,
  Zap,
  Calculator,
  Globe,
  Palette,
  Music,
  Users,
  Star,
  Clock
} from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useResearchState } from '@/hooks/useResearchState';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  group: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createNewChat } = useChat();
  const { startNewResearch } = useResearchState();
  const [searchValue, setSearchValue] = useState('');

  // Recent items from localStorage
  const [recentItems, setRecentItems] = useState<Command[]>([]);

  useEffect(() => {
    const recent = localStorage.getItem('recent-commands');
    if (recent) {
      try {
        const parsed = JSON.parse(recent);
        setRecentItems(parsed.slice(0, 5)); // Keep only 5 recent items
      } catch (error) {
        console.warn('Failed to parse recent commands:', error);
      }
    }
  }, []);

  const addToRecent = useCallback((command: Command) => {
    const newRecent = [
      command,
      ...recentItems.filter(item => item.id !== command.id)
    ].slice(0, 5);
    
    setRecentItems(newRecent);
    localStorage.setItem('recent-commands', JSON.stringify(newRecent));
  }, [recentItems]);

  const commands: Command[] = useMemo(() => [
    // Navigation Commands
    {
      id: 'nav-home',
      label: 'Go to Home',
      icon: Home,
      shortcut: '⌘H',
      group: 'Navigation',
      action: () => navigate('/'),
      keywords: ['home', 'dashboard']
    },
    {
      id: 'nav-chat',
      label: 'Go to Chat',
      icon: MessageSquare,
      shortcut: '⌘1',
      group: 'Navigation',
      action: () => navigate('/chat'),
      keywords: ['chat', 'conversation', 'talk']
    },
    {
      id: 'nav-research',
      label: 'Go to Research',
      icon: Search,
      shortcut: '⌘2',
      group: 'Navigation',
      action: () => navigate('/research-agent'),
      keywords: ['research', 'search', 'investigate']
    },
    {
      id: 'nav-learn',
      label: 'Go to Learning',
      icon: BookOpen,
      shortcut: '⌘3',
      group: 'Navigation',
      action: () => navigate('/homework'),
      keywords: ['learn', 'study', 'homework', 'education']
    },
    {
      id: 'nav-vietnamese',
      label: 'Go to Vietnamese Chat',
      icon: Languages,
      group: 'Navigation',
      action: () => navigate('/vietnamese-chat'),
      keywords: ['vietnamese', 'language', 'tiếng việt']
    },
    {
      id: 'nav-family',
      label: 'Go to Family Room',
      icon: Users,
      group: 'Navigation',
      action: () => navigate('/family-room'),
      keywords: ['family', 'room', 'together']
    },

    // Quick Actions
    {
      id: 'action-new-chat',
      label: 'New Chat',
      description: 'Start a new conversation',
      icon: MessageSquare,
      group: 'Quick Actions',
      action: () => {
        createNewChat();
        navigate('/chat');
      },
      keywords: ['new', 'chat', 'conversation', 'start']
    },
    {
      id: 'action-new-research',
      label: 'Start Research',
      description: 'Begin a new research session',
      icon: Search,
      group: 'Quick Actions',
      action: () => {
        startNewResearch();
        navigate('/research-agent');
      },
      keywords: ['research', 'search', 'investigate', 'new']
    },
    {
      id: 'action-translate',
      label: 'Quick Translate',
      description: 'Open translation tool',
      icon: Languages,
      group: 'Quick Actions',
      action: () => {
        // Implement quick translate modal
        console.log('Quick translate');
      },
      keywords: ['translate', 'language', 'convert']
    },

    // Homework Subjects
    {
      id: 'subject-math',
      label: 'Math Homework',
      description: 'Get help with mathematics',
      icon: Calculator,
      group: 'Subjects',
      action: () => navigate('/homework?subject=math'),
      keywords: ['math', 'mathematics', 'calculation', 'numbers']
    },
    {
      id: 'subject-science',
      label: 'Science Homework',
      description: 'Explore scientific concepts',
      icon: Zap,
      group: 'Subjects',
      action: () => navigate('/homework?subject=science'),
      keywords: ['science', 'physics', 'chemistry', 'biology']
    },
    {
      id: 'subject-english',
      label: 'English Homework',
      description: 'Writing and literature help',
      icon: FileText,
      group: 'Subjects',
      action: () => navigate('/homework?subject=english'),
      keywords: ['english', 'writing', 'literature', 'essay']
    },
    {
      id: 'subject-history',
      label: 'History Homework',
      description: 'Historical research and facts',
      icon: Globe,
      group: 'Subjects',
      action: () => navigate('/homework?subject=history'),
      keywords: ['history', 'historical', 'past', 'events']
    },

    // Settings & Profile
    {
      id: 'settings-profile',
      label: 'Profile Settings',
      icon: User,
      group: 'Settings',
      action: () => navigate('/profile'),
      keywords: ['profile', 'account', 'user', 'personal']
    },
    {
      id: 'settings-schedule',
      label: 'Schedule & Reminders',
      icon: Calendar,
      group: 'Settings',
      action: () => navigate('/schedule'),
      keywords: ['schedule', 'calendar', 'reminders', 'time']
    },
    {
      id: 'settings-preferences',
      label: 'App Settings',
      icon: Settings,
      group: 'Settings',
      action: () => navigate('/profile?tab=settings'),
      keywords: ['settings', 'preferences', 'configuration']
    }
  ], [navigate, createNewChat, startNewResearch]);

  const filteredCommands = useMemo(() => {
    if (!searchValue) return commands;
    
    const searchTerm = searchValue.toLowerCase();
    return commands.filter(command => 
      command.label.toLowerCase().includes(searchTerm) ||
      command.description?.toLowerCase().includes(searchTerm) ||
      command.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm))
    );
  }, [commands, searchValue]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    
    // Add recent items first if no search
    if (!searchValue && recentItems.length > 0) {
      groups['Recent'] = recentItems;
    }
    
    filteredCommands.forEach(command => {
      if (!groups[command.group]) {
        groups[command.group] = [];
      }
      groups[command.group].push(command);
    });
    
    return groups;
  }, [filteredCommands, searchValue, recentItems]);

  const handleCommandSelect = useCallback((command: Command) => {
    addToRecent(command);
    command.action();
    onClose();
  }, [addToRecent, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput
        placeholder="Type a command or search..."
        value={searchValue}
        onValueChange={setSearchValue}
        onKeyDown={handleKeyDown}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {Object.entries(groupedCommands).map(([groupName, groupCommands], groupIndex) => (
          <React.Fragment key={groupName}>
            {groupIndex > 0 && <CommandSeparator />}
            <CommandGroup heading={groupName}>
              {groupCommands.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={() => handleCommandSelect(command)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                >
                  {command.icon && (
                    <command.icon className="w-4 h-4 text-zinc-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{command.label}</div>
                    {command.description && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {command.description}
                      </div>
                    )}
                  </div>
                  {command.shortcut && (
                    <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                      {command.shortcut}
                    </kbd>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

// Global hook for command palette
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    setIsOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
};

export default CommandPalette;
