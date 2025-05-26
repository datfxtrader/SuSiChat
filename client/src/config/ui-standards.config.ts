
export const UIStandards = {
  // ============================================
  // SUSI BRANDING
  // ============================================
  branding: {
    appName: 'SuSi',
    assistantName: 'SuSi',
    chatName: 'SuSi Chat',
    tagline: 'Your AI Assistant Friend'
  },

  // ============================================
  // TYPEWRITER CONFIGURATION
  // ============================================
  typewriter: {
    speeds: {
      fast: 15,
      normal: 30,
      slow: 50,
      research: 25,
      chat: 35
    },
    effects: {
      enableSound: true,
      showProgress: true,
      progressThreshold: 1500,
      completionDelay: 3000
    }
  },

  // ============================================
  // ANIMATION STANDARDS
  // ============================================
  animations: {
    fadeIn: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.3 }
    },
    slideIn: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
      transition: { duration: 0.2 }
    },
    scaleIn: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: 0.2 }
    },
    pulse: {
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 2, repeat: Infinity }
    }
  },

  // ============================================
  // COLOR SCHEMES
  // ============================================
  colors: {
    research: {
      primary: 'from-blue-600 to-purple-600',
      secondary: 'from-emerald-500 to-teal-600',
      accent: 'text-blue-400',
      background: 'bg-zinc-900/60',
      border: 'border-zinc-800/50',
      hover: 'hover:border-zinc-700/60'
    },
    chat: {
      primary: 'from-purple-600 to-purple-700',
      secondary: 'from-pink-500 to-rose-600',
      accent: 'text-purple-400',
      background: 'bg-white/90 dark:bg-slate-800/90',
      border: 'border-slate-200/50 dark:border-slate-700/50',
      hover: 'hover:bg-slate-100 dark:hover:bg-slate-700'
    },
    homework: {
      primary: 'from-green-600 to-emerald-600',
      secondary: 'from-blue-500 to-cyan-600',
      accent: 'text-green-400',
      background: 'bg-emerald-50/80 dark:bg-emerald-900/20',
      border: 'border-emerald-200/50 dark:border-emerald-700/50',
      hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-800/30'
    },
    family: {
      primary: 'from-orange-500 to-red-600',
      secondary: 'from-yellow-500 to-orange-600',
      accent: 'text-orange-400',
      background: 'bg-orange-50/80 dark:bg-orange-900/20',
      border: 'border-orange-200/50 dark:border-orange-700/50',
      hover: 'hover:bg-orange-100 dark:hover:bg-orange-800/30'
    }
  },

  // ============================================
  // TYPOGRAPHY STANDARDS
  // ============================================
  typography: {
    heading: {
      h1: 'text-2xl font-bold text-zinc-100 mb-4 pb-3 border-b border-zinc-700/50',
      h2: 'text-xl font-semibold text-zinc-100 mb-3 mt-8',
      h3: 'text-lg font-medium text-zinc-100 mb-2 mt-6'
    },
    body: {
      primary: 'text-zinc-200 leading-relaxed',
      secondary: 'text-zinc-300 leading-relaxed',
      muted: 'text-zinc-400 text-sm'
    },
    interactive: {
      link: 'text-blue-400 hover:text-blue-300 cursor-pointer transition-colors',
      button: 'font-medium transition-all duration-200'
    }
  },

  // ============================================
  // COMPONENT STANDARDS
  // ============================================
  components: {
    card: {
      base: 'backdrop-blur-sm border rounded-2xl p-6 shadow-lg transition-all duration-200',
      interactive: 'hover:shadow-xl group',
      variants: {
        research: 'bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700/60',
        chat: 'bg-white/90 dark:bg-slate-800/90 border-slate-200/50 dark:border-slate-700/50',
        homework: 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-700/50',
        family: 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-200/50 dark:border-orange-700/50'
      }
    },
    button: {
      base: 'inline-flex items-center justify-center transition-all duration-200 font-medium rounded-xl',
      sizes: {
        sm: 'h-7 w-7 p-0 text-xs',
        md: 'h-8 w-8 p-0 text-sm',
        lg: 'h-10 px-4 py-2 text-base'
      },
      variants: {
        ghost: 'bg-transparent border-none hover:bg-zinc-800/60',
        primary: 'text-white shadow-lg hover:shadow-xl',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
      }
    },
    badge: {
      base: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
      variants: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'bg-green-500/20 text-green-300 border border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        error: 'bg-red-500/20 text-red-300 border border-red-500/30'
      }
    }
  },

  // ============================================
  // LAYOUT STANDARDS
  // ============================================
  layout: {
    spacing: {
      xs: 'space-y-2',
      sm: 'space-y-3',
      md: 'space-y-4',
      lg: 'space-y-6',
      xl: 'space-y-8'
    },
    padding: {
      xs: 'p-2',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8'
    },
    margins: {
      xs: 'm-2',
      sm: 'm-3',
      md: 'm-4',
      lg: 'm-6',
      xl: 'm-8'
    }
  },

  // ============================================
  // INTERACTIVE STATES
  // ============================================
  states: {
    loading: {
      spinner: 'animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full',
      pulse: 'animate-pulse',
      bounce: 'animate-bounce'
    },
    hover: {
      lift: 'hover:translate-y-[-2px] hover:shadow-lg',
      glow: 'hover:shadow-xl hover:shadow-blue-500/25',
      scale: 'hover:scale-105'
    },
    focus: {
      ring: 'focus:ring-2 focus:ring-blue-500/50 focus:outline-none',
      border: 'focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
    }
  },

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  utils: {
    formatRelativeTime: (timestamp: string) => {
      const now = new Date();
      const messageTime = new Date(timestamp);
      const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    },

    formatText: (text: string, theme: 'research' | 'chat' | 'homework' | 'family' = 'research') => {
      const themeClasses = {
        research: 'font-semibold text-zinc-100 bg-zinc-800/40 px-1 rounded',
        chat: 'font-semibold text-purple-100 bg-purple-800/40 px-1 rounded',
        homework: 'font-semibold text-emerald-100 bg-emerald-800/40 px-1 rounded',
        family: 'font-semibold text-orange-100 bg-orange-800/40 px-1 rounded'
      };

      return text.split('**').map((part, i) => 
        i % 2 === 1 ? 
          React.createElement('strong', { key: i, className: themeClasses[theme] }, part) : 
          part
      );
    },

    getThemeClasses: (theme: 'research' | 'chat' | 'homework' | 'family') => {
      return UIStandards.colors[theme];
    },

    combineClasses: (...classes: (string | undefined | null | false)[]) => {
      return classes.filter(Boolean).join(' ');
    }
  }
} as const;

export type UITheme = keyof typeof UIStandards.colors;
export type ComponentVariant = keyof typeof UIStandards.components.card.variants;
export type AnimationType = keyof typeof UIStandards.animations;

export default UIStandards;
