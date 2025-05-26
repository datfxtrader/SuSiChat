
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TypewriterErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Typewriter error:', error, errorInfo);
    
    // Send to error tracking service if available
    if ((window as any).errorTracking) {
      (window as any).errorTracking.captureException(error, {
        tags: {
          component: 'typewriter',
          errorBoundary: true
        },
        extra: errorInfo
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            An error occurred while displaying this message. 
            The content has been shown without animation.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
