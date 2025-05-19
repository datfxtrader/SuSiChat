// Load Material Icons font
const linkElement = document.createElement('link');
linkElement.rel = 'stylesheet';
linkElement.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
document.head.appendChild(linkElement);

// Check for user's preferred theme
export function setInitialTheme() {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  }
}

// Set theme on load
setInitialTheme();

// Listen for changes to color scheme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  if (event.matches) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
});

// Export toggle function for use in components
export const toggleTheme = () => {
  document.documentElement.classList.toggle('dark');
};
