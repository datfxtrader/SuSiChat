
# UI Theme Specification for FamilyStudy App

## Color System

### CSS Variables (Root Colors)
```css
:root {
  --background: oklch(98.46% 0.002 247.84);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(54.65% 0.246 262.87);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.145 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  
  /* Chart Colors */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  
  /* Sidebar Colors */
  --sidebar: oklch(98.46% 0.002 247.84);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

### Dark Mode Colors
```css
.dark {
  --background: oklch(0.185 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(54.65% 0.246 262.87);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(27.39% 0.005 286.03);
  --accent-foreground: oklch(98.46% 0.002 247.84);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
  --sidebar: oklch(21.03% 0.006 285.89);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);
}
```

## Tailwind Color Classes

### Background Colors
```typescript
const THEME = {
  bg: {
    primary: 'bg-zinc-950',           // Main app background
    secondary: 'bg-zinc-950/95',      // Secondary areas
    tertiary: 'bg-zinc-900/80',       // Cards, panels
    interactive: 'bg-zinc-800/60',    // Buttons, inputs
    hover: 'bg-zinc-700/70',          // Hover states
  },
  text: {
    primary: 'text-zinc-50',          // Main headings
    secondary: 'text-zinc-200',       // Body text
    tertiary: 'text-zinc-400',        // Secondary text
    muted: 'text-zinc-500',           // Placeholder, labels
    disabled: 'text-zinc-600',        // Disabled states
  },
  border: {
    primary: 'border-zinc-800/60',    // Main borders
    secondary: 'border-zinc-700/50',  // Secondary borders
    hover: 'border-zinc-600/60',      // Hover borders
  },
  accent: {
    primary: 'from-blue-600 to-purple-600',
    secondary: 'from-emerald-500 to-teal-600',
  }
};
```

## Component-Specific Colors

### Subject Cards (Homework Page)
```typescript
const SUBJECTS = [
  { id: 'math', name: 'Mathematics', icon: Calculator, color: 'bg-blue-500' },
  { id: 'science', name: 'Science', icon: Microscope, color: 'bg-green-500' },
  { id: 'english', name: 'English', icon: BookOpen, color: 'bg-purple-500' },
  { id: 'history', name: 'History', icon: Globe, color: 'bg-orange-500' },
  { id: 'vietnamese', name: 'Vietnamese', icon: Languages, color: 'bg-red-500' },
  { id: 'polish', name: 'Polish', icon: Languages, color: 'bg-pink-500' },
  { id: 'art', name: 'Art', icon: Palette, color: 'bg-yellow-500' },
  { id: 'music', name: 'Music', icon: Music, color: 'bg-indigo-500' },
  { id: 'other', name: 'Other', icon: Users, color: 'bg-gray-500' }
];
```

### Difficulty Level Colors
```typescript
const DIFFICULTY_LEVELS = [
  { id: 'elementary', name: 'Elementary (K-5)', color: 'bg-green-100 text-green-800' },
  { id: 'middle', name: 'Middle School (6-8)', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'high', name: 'High School (9-12)', color: 'bg-orange-100 text-orange-800' },
  { id: 'college', name: 'College/University', color: 'bg-red-100 text-red-800' }
];
```

## Layout Specifications

### Main Layout Structure
```typescript
// Background gradients for sections
const gradients = {
  learningMode: 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
  sessionProgress: 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20',
  tipSections: {
    specific: 'bg-blue-100 dark:bg-blue-900',
    showWork: 'bg-green-100 dark:bg-green-900',
    practice: 'bg-purple-100 dark:bg-purple-900',
    family: 'bg-orange-100 dark:bg-orange-900'
  }
};
```

### Message Bubbles
```typescript
const messageBubbleColors = {
  user: 'bg-purple-500 text-white',
  assistant: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
};
```

## Animation & Interaction States

### Hover Effects
```css
.hover-glow {
  transition: box-shadow 0.3s ease;
}
.hover-glow:hover {
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
}
```

### Loading Animations
```typescript
const loadingAnimation = {
  dots: 'animate-bounce',
  delays: ['', 'style={{ animationDelay: "0.1s" }}', 'style={{ animationDelay: "0.2s" }}']
};
```

## Typography Scale

### Font Sizes
```typescript
const fontSizes = {
  'xs': '0.75rem',     // 12px
  'sm': '0.875rem',    // 14px
  'base': '1rem',      // 16px
  'lg': '1.125rem',    // 18px
  'xl': '1.25rem',     // 20px
  '2xl': '1.5rem',     // 24px
  '3xl': '1.875rem',   // 30px
  '4xl': '2.25rem',    // 36px
  '5xl': '3rem',       // 48px
};
```

## Border Radius System
```typescript
const borderRadius = {
  'none': '0',
  'sm': '0.125rem',    // 2px
  'md': '0.375rem',    // 6px
  'lg': '0.5rem',      // 8px
  'xl': '0.75rem',     // 12px
  '2xl': '1rem',       // 16px
  '3xl': '1.5rem',     // 24px
  'full': '9999px'
};
```

## Spacing Scale
```typescript
const spacing = {
  '0': '0',
  '1': '0.25rem',      // 4px
  '2': '0.5rem',       // 8px
  '3': '0.75rem',      // 12px
  '4': '1rem',         // 16px
  '5': '1.25rem',      // 20px
  '6': '1.5rem',       // 24px
  '8': '2rem',         // 32px
  '10': '2.5rem',      // 40px
  '12': '3rem',        // 48px
  '16': '4rem',        // 64px
  '20': '5rem',        // 80px
  '24': '6rem',        // 96px
};
```

## Usage Guidelines

### For New Components
1. **Always use CSS variables** for colors: `hsl(var(--primary))`
2. **Dark mode support** is automatic with CSS variables
3. **Consistent spacing** using the spacing scale
4. **Semantic color naming** (primary, secondary, accent, destructive)

### For Interactive Elements
1. **Hover states** should use `hover:` variants
2. **Focus states** should use `focus-visible:` for accessibility
3. **Disabled states** should reduce opacity and pointer events

### For Layout
1. **Main content** should use `max-w-4xl mx-auto` for consistent width
2. **Cards** should use `bg-card text-card-foreground` with proper borders
3. **Sections** should have consistent padding `p-4` or `p-6`

### Example Component Usage
```tsx
// Correct usage
<div className="bg-card text-card-foreground border border-border rounded-lg p-4">
  <h3 className="text-lg font-semibold text-foreground">Title</h3>
  <p className="text-muted-foreground">Description</p>
  <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
    Action
  </button>
</div>
```

This specification ensures consistent theming across all UI components and provides clear guidelines for future development.
