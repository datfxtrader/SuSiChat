import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BelgaCatIcon } from '@/components/shared/BelgaCatIcon';

export default function GoogleSignIn() {
  const handleGoogleSignIn = () => {
    // This would redirect to your Google OAuth endpoint
    window.location.href = '/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md mx-4 bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-6">
          {/* App Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <BelgaCatIcon className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Title and Description */}
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Welcome to Tongkeeper
            </CardTitle>
            <CardDescription className="text-slate-400 text-base leading-relaxed">
              Your intelligent AI research assistant for the whole family. 
              <br />
              <span className="text-blue-400">Log in to get started.</span>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sign In Button */}
          <Button 
            onClick={handleGoogleSignIn}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Log In with Google
          </Button>

          {/* Features Preview */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-300 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>AI-powered research and learning</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Family-friendly content management</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Personalized study assistance</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            By logging in, you agree to our{" "}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Terms of Service</span>
            {" "}and{" "}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Privacy Policy</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}