
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

// Ensure React is detected by Vite - this JSX element forces preamble detection
const ReactDetection = () => <div style={{ display: 'none' }}>React JSX Detection</div>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <App />
          <ReactDetection />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
