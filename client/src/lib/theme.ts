
// Theme constants for consistent styling
export const THEME = {
  // Backgrounds
  bg: {
    primary: 'bg-zinc-950',           // Main app background
    secondary: 'bg-zinc-950/95',      // Secondary areas
    tertiary: 'bg-zinc-900/80',       // Cards, panels
    interactive: 'bg-zinc-800/60',    // Buttons, inputs
    hover: 'bg-zinc-700/70',          // Hover states
  },
  // Text Colors
  text: {
    primary: 'text-zinc-50',          // Main headings
    secondary: 'text-zinc-200',       // Body text
    tertiary: 'text-zinc-400',        // Secondary text
    muted: 'text-zinc-500',           // Placeholder, labels
    disabled: 'text-zinc-600',        // Disabled states
  },
  // Borders
  border: {
    primary: 'border-zinc-800/60',    // Main borders
    secondary: 'border-zinc-700/50',  // Secondary borders
    hover: 'border-zinc-600/60',      // Hover borders
  },
  // Accents (use sparingly)
  accent: {
    primary: 'from-blue-600 to-purple-600',
    secondary: 'from-emerald-500 to-teal-600',
  }
};

export function setInitialTheme() {
  document.documentElement.classList.add('dark');
}

setInitialTheme();
