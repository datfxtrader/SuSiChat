import React from 'react';
import ReactDOM from 'react-dom/client';

// Rest of your imports...
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

// Ensure single root creation
const rootElement = document.getElementById('root') as HTMLElement
let root: ReactDOM.Root

if (!rootElement.hasAttribute('data-root-created')) {
  root = ReactDOM.createRoot(rootElement)
  rootElement.setAttribute('data-root-created', 'true')
} else {
  // If root already exists, get it from the element
  root = (rootElement as any)._reactRoot || ReactDOM.createRoot(rootElement)
}

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <App />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);