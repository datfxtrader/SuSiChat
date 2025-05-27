
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface ReplitSignInProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function ReplitSignIn({ onSuccess, onError }: ReplitSignInProps) {
  const { login } = useAuth();

  const handleSignIn = () => {
    try {
      login();
      onSuccess?.();
    } catch (error) {
      console.error('Replit Sign-In error:', error);
      onError?.('Login failed');
    }
  };

  return (
    <div className="w-full flex justify-center">
      <Button onClick={handleSignIn} className="w-full max-w-sm">
        Sign in with Replit
      </Button>
    </div>
  );
}
