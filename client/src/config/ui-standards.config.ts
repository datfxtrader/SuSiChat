
import { ModelConfig } from './models.config';
import React from 'react';

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
  // DESIGN SYSTEM FOUNDATION
  // ============================================
  designPrinciples: {
    consistency: 'Unified experience across all features',
    clarity: 'Clear visual hierarchy and purpose',
    efficiency: 'Minimize cognitive load and clicks',
    delight: 'Smooth animations and micro-interactions',
    adaptability: 'Personalized to user preferences',
    accessibility: 'Usable by everyone'
  },

  // ============================================
  // ENHANCED SPACING SYSTEM (8px base)
  // ============================================
  spacing: {
    '0': '0',
    '1': '0.25rem',    // 4px
    '2': '0.5rem',     // 8px
    '3': '0.75rem',    // 12px
    '4': '1rem',       // 16px
    '5': '1.25rem',    // 20px
    '6': '1.5rem',     // 24px
    '7': '1.75rem',    // 28px
    '8': '2rem',       // 32px
    '10': '2.5rem',    // 40px
    '12': '3rem',      // 48px
    '16': '4rem',      // 64px
    '20': '5rem',      // 80px
    '24': '6rem',      // 96px
    '32': '8rem',      // 128px
    
    // Semantic spacing
    xs: 'var(--space-1)',
    sm: 'var(--space-2)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
    xl: 'var(--space-8)',
    '2xl': 'var(--space-12)',
    '3xl': 'var(--space-16)',
  },

  // ============================================
  // COMPREHENSIVE BREAKPOINT SYSTEM
  // ============================================
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
    ultrawide: '1536px'
  },

  // ============================================
  // ENHANCED COLOR SYSTEM
  // ============================================
  colors: {
    // Core Design Tokens
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },

    // Background Layers
    background: {
      base: '#09090b',      // zinc-950
      surface: '#18181b',   // zinc-900
      elevated: '#27272a',  // zinc-800
      overlay: '#3f3f46',   // zinc-700
      glass: 'rgba(24, 24, 27, 0.8)'
    },

    // Text Colors
    text: {
      primary: '#fafafa',   // zinc-50
      secondary: '#e4e4e7', // zinc-200
      tertiary: '#a1a1aa',  // zinc-400
      muted: '#71717a',     // zinc-500
      disabled: '#52525b',  // zinc-600
      inverse: '#09090b'    // zinc-950
    },

    // Semantic Colors
    semantic: {
      success: '#10b981',   // emerald-500
      warning: '#f59e0b',   // amber-500
      error: '#ef4444',     // red-500
      info: '#3b82f6',      // blue-500
      destructive: '#dc2626' // red-600
    },

    // Feature-specific Colors
    features: {
      chat: {
        user: '#3b82f6',      // blue-500
        assistant: '#8b5cf6', // purple-500
        system: '#6b7280'     // gray-500
      },
      research: '#06b6d4',    // cyan-500
      learning: '#10b981',    // emerald-500
      homework: '#f59e0b',    // amber-500
      family: '#f97316'       // orange-500
    },

    // Legacy theme colors for backward compatibility
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
  // ENHANCED TYPOGRAPHY SYSTEM
  // ============================================
  typography: {
    // Font Families
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      learning: ['Noto Sans', 'system-ui', 'sans-serif']
    },

    // Font Sizes (Type Scale)
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
      '7xl': '4.5rem',    // 72px
    },

    // Line Heights
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2'
    },

    // Font Weights
    fontWeight: {
      thin: '100',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    },

    // Semantic Typography
    semantic: {
      display: 'text-4xl font-bold text-zinc-100 mb-4 pb-3 border-b border-zinc-700/50',
      headline: 'text-3xl font-bold text-zinc-100 mb-3',
      title: 'text-2xl font-semibold text-zinc-100 mb-3',
      subtitle: 'text-xl font-medium text-zinc-100 mb-2',
      body: 'text-base text-zinc-200 leading-relaxed',
      bodyLarge: 'text-lg text-zinc-200 leading-relaxed',
      bodySmall: 'text-sm text-zinc-300 leading-relaxed',
      caption: 'text-xs text-zinc-400',
      overline: 'text-xs text-zinc-500 uppercase tracking-wide'
    },

    // Legacy typography for backward compatibility
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
  // COMPREHENSIVE ANIMATION SYSTEM
  // ============================================
  animations: {
    // Timing Functions
    timing: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '750ms'
    },

    // Easing Functions
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },

    // Standard Animations
    fadeIn: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    slideIn: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    scaleIn: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: 0.2, ease: 'spring' }
    },
    slideUp: {
      initial: { opacity: 0, y: 100 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 100 },
      transition: { duration: 0.3, ease: 'spring' }
    },
    pulse: {
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    },

    // Micro-interactions
    buttonPress: {
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.98 },
      transition: { duration: 0.1 }
    },
    hoverLift: {
      whileHover: { y: -2 },
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    cardHover: {
      whileHover: { 
        y: -4, 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
      },
      transition: { duration: 0.2, ease: 'easeOut' }
    }
  },

  // ============================================
  // LOADING STATES SYSTEM
  // ============================================
  loadingStates: {
    skeleton: {
      base: 'animate-pulse bg-zinc-800 rounded',
      text: 'h-4 bg-zinc-800 rounded',
      avatar: 'w-8 h-8 bg-zinc-800 rounded-full',
      button: 'h-10 bg-zinc-800 rounded-lg'
    },
    spinner: {
      sm: 'w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin',
      md: 'w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin',
      lg: 'w-8 h-8 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin'
    },
    dots: {
      base: 'inline-flex space-x-1',
      dot: 'w-2 h-2 bg-zinc-500 rounded-full animate-bounce'
    },
    progress: {
      bar: 'w-full bg-zinc-800 rounded-full h-2 overflow-hidden',
      fill: 'h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300'
    }
  },

  // ============================================
  // ACCESSIBILITY FEATURES
  // ============================================
  accessibility: {
    focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
    skipLinks: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50',
    screenReaderOnly: 'sr-only',
    reducedMotion: 'motion-reduce:transition-none motion-reduce:animate-none',
    highContrast: 'contrast-more:border-white contrast-more:text-white',
    
    // ARIA labels
    aria: {
      expandedTrue: 'aria-expanded="true"',
      expandedFalse: 'aria-expanded="false"',
      hasPopup: 'aria-haspopup="true"',
      live: 'aria-live="polite"',
      atomic: 'aria-atomic="true"'
    }
  },

  // ============================================
  // MODEL INTEGRATION (existing)
  // ============================================
  models: {
    getStandardModelSelector: (category?: string) => {
      const models = category ? ModelConfig.getModelsForCategory(category) : ModelConfig.getAllModels();
      return models.map(model => ({
        value: model.id,
        label: model.displayName,
        description: model.description,
        color: model.metadata.color,
        icon: model.metadata.icon,
        disabled: false
      }));
    },

    getModelTheme: (modelId: string) => {
      const model = ModelConfig.getModel(modelId);
      return {
        primary: model.metadata.color,
        icon: model.metadata.icon,
        tier: model.metadata.tier
      };
    },

    formatModelBadge: (modelId: string) => {
      const model = ModelConfig.getModel(modelId);
      return {
        text: model.displayName,
        className: `bg-gradient-to-r ${model.metadata.color} text-white`,
        icon: model.metadata.icon
      };
    }
  },

  // ============================================
  // TYPEWRITER CONFIGURATION (existing)
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
  // ENHANCED COMPONENT STANDARDS
  // ============================================
  components: {
    card: {
      base: 'backdrop-blur-sm border rounded-2xl shadow-lg transition-all duration-200',
      interactive: 'hover:shadow-xl group cursor-pointer',
      sizes: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
      },
      variants: {
        default: 'bg-zinc-900/60 border-zinc-800/50',
        elevated: 'bg-zinc-800/80 border-zinc-700/50',
        glass: 'bg-zinc-900/40 backdrop-blur-xl border-zinc-800/30',
        research: 'bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700/60',
        chat: 'bg-white/90 dark:bg-slate-800/90 border-slate-200/50 dark:border-slate-700/50',
        homework: 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-700/50',
        family: 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-200/50 dark:border-orange-700/50'
      }
    },

    button: {
      base: 'inline-flex items-center justify-center transition-all duration-200 font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
      sizes: {
        xs: 'h-6 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: {
          xs: 'h-6 w-6 p-0',
          sm: 'h-8 w-8 p-0',
          md: 'h-10 w-10 p-0',
          lg: 'h-12 w-12 p-0'
        }
      },
      variants: {
        default: 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 focus:ring-zinc-300',
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300',
        secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 focus:ring-zinc-300',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
        outline: 'border border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-50 focus:ring-zinc-300',
        ghost: 'text-zinc-100 hover:bg-zinc-800 hover:text-zinc-50 focus:ring-zinc-300',
        link: 'text-blue-400 underline-offset-4 hover:underline focus:ring-blue-300'
      }
    },

    input: {
      base: 'flex w-full rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      variants: {
        default: 'border-zinc-700 focus:border-zinc-600 focus:ring-zinc-300',
        error: 'border-red-500 focus:border-red-400 focus:ring-red-300',
        success: 'border-green-500 focus:border-green-400 focus:ring-green-300'
      },
      sizes: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base'
      }
    },

    badge: {
      base: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
      variants: {
        default: 'border-transparent bg-zinc-800 text-zinc-100',
        primary: 'border-transparent bg-blue-600 text-white',
        secondary: 'border-transparent bg-zinc-700 text-zinc-100',
        success: 'bg-green-500/20 text-green-300 border border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        error: 'bg-red-500/20 text-red-300 border border-red-500/30',
        outline: 'border-zinc-700 text-zinc-100'
      }
    },

    modal: {
      overlay: 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      content: 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-zinc-900 p-6 shadow-lg duration-200 rounded-2xl border-zinc-800',
      header: 'flex flex-col space-y-1.5 text-center sm:text-left',
      title: 'text-lg font-semibold leading-none tracking-tight',
      description: 'text-sm text-zinc-400',
      footer: 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2'
    }
  },

  // ============================================
  // LAYOUT STANDARDS (enhanced)
  // ============================================
  layout: {
    container: {
      center: 'mx-auto',
      padding: 'px-4 sm:px-6 lg:px-8',
      maxWidth: {
        sm: 'max-w-screen-sm',
        md: 'max-w-screen-md',
        lg: 'max-w-screen-lg',
        xl: 'max-w-screen-xl',
        '2xl': 'max-w-screen-2xl'
      }
    },
    grid: {
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        6: 'grid-cols-6',
        12: 'grid-cols-12'
      },
      gap: {
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8'
      }
    },
    flex: {
      center: 'flex items-center justify-center',
      between: 'flex items-center justify-between',
      start: 'flex items-center justify-start',
      end: 'flex items-center justify-end',
      col: 'flex flex-col',
      colCenter: 'flex flex-col items-center justify-center'
    },
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
  // INTERACTIVE STATES (enhanced)
  // ============================================
  states: {
    loading: {
      spinner: 'animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full',
      pulse: 'animate-pulse',
      bounce: 'animate-bounce',
      shimmer: 'bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:1000px_100%] animate-[shimmer_2s_infinite]'
    },
    hover: {
      lift: 'hover:translate-y-[-2px] hover:shadow-lg transition-all duration-200',
      glow: 'hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-200',
      scale: 'hover:scale-105 transition-transform duration-200',
      brightness: 'hover:brightness-110 transition-all duration-200'
    },
    focus: {
      ring: 'focus:ring-2 focus:ring-blue-500/50 focus:outline-none',
      border: 'focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
      visible: 'focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none'
    },
    active: {
      scale: 'active:scale-95 transition-transform duration-75',
      brightness: 'active:brightness-90 transition-all duration-75'
    },
    disabled: {
      opacity: 'disabled:opacity-50',
      cursor: 'disabled:cursor-not-allowed',
      events: 'disabled:pointer-events-none'
    }
  },

  // ============================================
  // SLIDING PANEL CONFIGURATION (existing)
  // ============================================
  slidingPanel: {
    animations: {
      panel: {
        base: 'transform transition-all duration-300 ease-in-out',
        hidden: 'translate-x-full',
        visible: 'translate-x-0',
        overlay: 'fixed inset-0 bg-black/50 z-30 md:hidden'
      },
      content: {
        base: 'transition-all duration-300 ease-in-out',
        pushed: 'md:mr-[600px] lg:mr-[700px] md:scale-[0.98] origin-left'
      }
    },
    
    widths: {
      sm: 'w-full md:w-[400px]',
      md: 'w-full md:w-[600px]',
      lg: 'w-full md:w-[700px]',
      xl: 'w-full md:w-[800px]',
      full: 'w-full'
    },
    
    theme: {
      dark: {
        background: 'bg-zinc-900/95 backdrop-blur-xl',
        border: 'border-l border-zinc-800/60',
        shadow: 'shadow-2xl shadow-black/50',
        header: {
          background: 'bg-zinc-900/80',
          border: 'border-b border-zinc-800/60',
          text: 'text-zinc-100'
        },
        content: {
          background: 'bg-transparent',
          text: 'text-zinc-200'
        },
        interactive: {
          hover: 'hover:bg-zinc-800/60',
          active: 'bg-zinc-800/80',
          focus: 'focus:ring-2 focus:ring-blue-500/50'
        }
      },
      light: {
        background: 'bg-white/95 backdrop-blur-xl',
        border: 'border-l border-gray-200/60',
        shadow: 'shadow-2xl shadow-gray-500/20',
        header: {
          background: 'bg-white/80',
          border: 'border-b border-gray-200/60',
          text: 'text-gray-900'
        },
        content: {
          background: 'bg-transparent',
          text: 'text-gray-700'
        },
        interactive: {
          hover: 'hover:bg-gray-100/60',
          active: 'bg-gray-100/80',
          focus: 'focus:ring-2 focus:ring-blue-500/50'
        }
      }
    },
    
    zIndices: {
      overlay: 'z-30',
      panel: 'z-40',
      nested: 'z-50'
    },
    
    responsive: {
      mobile: {
        width: '100vw',
        overlay: true,
        pushContent: false
      },
      tablet: {
        width: '70vw',
        overlay: true,
        pushContent: true
      },
      desktop: {
        width: '600px',
        overlay: false,
        pushContent: true
      }
    }
  },

  // ============================================
  // UTILITY FUNCTIONS (enhanced)
  // ============================================
  utils: {
    // Existing utilities
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
    },

    // New utility functions
    getBreakpoint: () => {
      if (typeof window === 'undefined') return 'desktop';
      const width = window.innerWidth;
      if (width < 640) return 'mobile';
      if (width < 768) return 'tablet';
      if (width < 1024) return 'desktop';
      return 'wide';
    },

    createVariant: (base: string, variant: string) => {
      return `${base} ${variant}`;
    },

    getSemanticColor: (type: 'success' | 'warning' | 'error' | 'info') => {
      return UIStandards.colors.semantic[type];
    },

    generateSkeletonLoader: (lines: number = 3) => {
      return Array.from({ length: lines }, (_, i) => ({
        key: i,
        width: Math.random() * 40 + 60, // 60-100% width
        delay: i * 0.1
      }));
    },

    // Enhanced sliding panel utilities
    getSlidingPanelClasses: (
      isOpen: boolean,
      width: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md',
      theme: 'dark' | 'light' = 'dark'
    ) => {
      const config = UIStandards.slidingPanel;
      const themeConfig = config.theme[theme];
      
      return {
        panel: UIStandards.utils.combineClasses(
          'fixed right-0 top-0 h-full',
          config.animations.panel.base,
          isOpen ? config.animations.panel.visible : config.animations.panel.hidden,
          config.widths[width],
          themeConfig.background,
          themeConfig.border,
          themeConfig.shadow,
          config.zIndices.panel
        ),
        overlay: UIStandards.utils.combineClasses(
          config.animations.panel.overlay,
          isOpen ? 'block' : 'hidden'
        ),
        header: UIStandards.utils.combineClasses(
          'flex items-center justify-between p-6',
          themeConfig.header.background,
          themeConfig.header.border
        ),
        content: UIStandards.utils.combineClasses(
          'flex-1 overflow-y-auto p-6',
          themeConfig.content.background
        ),
        mainContent: UIStandards.utils.combineClasses(
          config.animations.content.base,
          isOpen ? config.animations.content.pushed : ''
        ),
        closeButton: UIStandards.utils.combineClasses(
          'p-2 rounded-lg transition-colors',
          themeConfig.interactive.hover,
          themeConfig.interactive.focus
        )
      };
    },

    getSlidingPanelTheme: (theme: 'dark' | 'light' = 'dark') => {
      return UIStandards.slidingPanel.theme[theme];
    },

    // Animation utilities
    getAnimationClasses: (animation: keyof typeof UIStandards.animations) => {
      const config = UIStandards.animations[animation];
      return {
        initial: config.initial,
        animate: config.animate,
        exit: config.exit,
        transition: config.transition
      };
    },

    // Component builder utilities
    buildButtonClasses: (variant: string = 'default', size: string = 'md') => {
      const { button } = UIStandards.components;
      return UIStandards.utils.combineClasses(
        button.base,
        button.sizes[size as keyof typeof button.sizes],
        button.variants[variant as keyof typeof button.variants]
      );
    },

    buildCardClasses: (variant: string = 'default', size: string = 'md', interactive: boolean = false) => {
      const { card } = UIStandards.components;
      return UIStandards.utils.combineClasses(
        card.base,
        card.sizes[size as keyof typeof card.sizes],
        card.variants[variant as keyof typeof card.variants],
        interactive ? card.interactive : ''
      );
    }
  }
} as const;

// Type definitions for better TypeScript support
export type UITheme = keyof typeof UIStandards.colors;
export type ComponentVariant = keyof typeof UIStandards.components.card.variants;
export type AnimationType = keyof typeof UIStandards.animations;
export type SlidingPanelWidth = keyof typeof UIStandards.slidingPanel.widths;
export type SlidingPanelTheme = keyof typeof UIStandards.slidingPanel.theme;
export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SemanticColorType = 'success' | 'warning' | 'error' | 'info';

export default UIStandards;
