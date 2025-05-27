
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { LogIn, Shield, Users, Brain, Loader2 } from 'lucide-react';
import UIStandards from '@/config/ui-standards.config';

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function GoogleSignIn({ onSuccess, onError }: GoogleSignInProps) {
  const { login } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoaded(true);
      initializeGoogleSignIn();
    };
    
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initializeGoogleSignIn = () => {
    if (window.google && buttonRef.current) {
      window.google.accounts.id.initialize({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
      });

      // Hide the default Google button and create our custom one
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        width: '1',
        height: '1',
      });
      
      // Hide the default button
      if (buttonRef.current?.firstChild) {
        (buttonRef.current.firstChild as HTMLElement).style.opacity = '0';
        (buttonRef.current.firstChild as HTMLElement).style.position = 'absolute';
        (buttonRef.current.firstChild as HTMLElement).style.pointerEvents = 'none';
      }
    }
  };

  const handleCredentialResponse = async (response: any) => {
    setIsSigningIn(true);
    try {
      const success = await login(response.credential);
      
      if (success) {
        onSuccess?.();
      } else {
        onError?.('Login failed');
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      onError?.('Login failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCustomSignIn = () => {
    if (buttonRef.current?.firstChild) {
      (buttonRef.current.firstChild as HTMLElement).click();
    }
  };

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Learning',
      description: 'Personalized AI assistant for the whole family'
    },
    {
      icon: Users,
      title: 'Family Collaboration',
      description: 'Create family rooms and learn together'
    },
    {
      icon: Shield,
      title: 'Safe & Secure',
      description: 'Protected environment for family learning'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-lg"
        >
          <Card className={UIStandards.utils.buildCardClasses('glass', 'lg')}>
            {/* Header Section */}
            <div className="text-center mb-8">
              {/* App Logo/Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Brain className="w-10 h-10 text-white" />
              </motion.div>

              {/* Welcome Text */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h1 className={UIStandards.typography.semantic.headline}>
                  Welcome to Tongkeeper
                </h1>
                <p className={UIStandards.typography.semantic.body + ' mt-3 max-w-md mx-auto'}>
                  Your personal AI assistant for the whole family. Log in to get started.
                </p>
              </motion.div>
            </div>

            {/* Sign In Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-8"
            >
              <Button
                onClick={handleCustomSignIn}
                disabled={!isLoaded || isSigningIn}
                className={UIStandards.utils.combineClasses(
                  'w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl',
                  'transition-all duration-200 shadow-lg hover:shadow-xl',
                  'flex items-center justify-center gap-3',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing In...
                  </>
                ) : !isLoaded ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Log In with Google
                  </>
                )}
              </Button>

              {/* Hidden Google Button */}
              <div ref={buttonRef} className="hidden" />
            </motion.div>

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="space-y-4 mb-8"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-100 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="text-center pt-4 border-t border-zinc-800/50"
            >
              <p className="text-xs text-zinc-500">
                By logging in, you agree to our{' '}
                <button className="text-blue-400 hover:text-blue-300 underline transition-colors">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button className="text-blue-400 hover:text-blue-300 underline transition-colors">
                  Privacy Policy
                </button>
              </p>
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
