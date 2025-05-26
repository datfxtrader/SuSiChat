import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart, Smile, Coffee, Music, TrendingUp, User, Settings, Clock, CheckCircle, Copy, Share2, Bookmark, MessageSquare, Loader2 } from 'lucide-react';
import { TypewriterText } from '@/components/shared/TypewriterText';
import { TypewriterConfig } from '@/config/typewriter.config';
import StandardizedMessage from '@/components/shared/StandardizedMessage';
import StandardizedTypingIndicator from '@/components/shared/StandardizedTypingIndicator';
import StandardizedInput from '@/components/shared/StandardizedInput';
import StandardizedHeader from '@/components/shared/StandardizedHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import UIStandards from '@/config/ui-standards.config';

// New component for Belga Cat icon
const BelgaCatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4C9.79086 4 8 5.79086 8 8V12H16V8C16 5.79086 14.2091 4 12 4Z" fill="currentColor"/>
    <path d="M5 14H19C19.5523 14 20 14.4477 20 15C20 15.5523 19.5523 16 19 16H5C4.44772 16 4 15.5523 4 15C4 14.4477 4.44772 14 5 14Z" fill="currentColor"/>
    <path d="M5 17H19C19.5523 17 20 17.4477 20 18C20 18.5523 19.5523 19 19 19H5C4.44772 19 4 18.5523 4 18C4 17.4477 4.44772 17 5 17Z" fill="currentColor"/>
    <path d="M10 20H14C14.5523 20 15 20.4477 15 21C15 21.5523 14.5523 22 14 22H10C9.44772 22 9 21.5523 9 21C9 20.4477 9.44772 20 10 20Z" fill="currentColor"/>
  </svg>
);

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  languages?: string[];
}

interface UserProfile {
  name: string;
  languages: string[];
  interests: string[];
  culturalBackground?: string;
}

interface SuggestedTopic {
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

const formatText = (text: string) => {
  return text.split('**').map((part, i) => 
    i % 2 === 1 ? 
      <strong key={i} className="font-semibold text-purple-100 bg-purple-800/40 px-1 rounded">{part}</strong> : 
      part
  );
};

// ============================================
// ENHANCED MESSAGE COMPONENT
// ============================================
const EnhancedMessage = memo(({ message, isLatest, userProfile }: { 
  message: Message; 
  isLatest: boolean; 
  userProfile: UserProfile | null; 
}) => {
  const [copySuccess, setCopySuccess] = useState('');
  const [typewriterComplete, setTypewriterComplete] = useState(!isLatest || message.role === 'user');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  }, [message.content]);

  const handleTypewriterComplete = useCallback(() => {
    setTypewriterComplete(true);
  }, []);

  // Reset typewriter state when isLatest changes
  useEffect(() => {
    if (isLatest && message.role === 'assistant' && message.content && message.content.length > 0) {
      setTypewriterComplete(false);
    } else {
      setTypewriterComplete(true);
    }
  }, [isLatest, message]);

  const contentLength = useMemo(() => message.content.length, [message.content]);
  const estimatedReadTime = useMemo(() => Math.ceil(contentLength / 1000), [contentLength]);

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex justify-end mb-4"
      >
        <div className="group max-w-[80%] bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-2xl px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center space-x-2 text-xs text-purple-100">
              <User className="w-3 h-3" />
              <span>You</span>
              <span>•</span>
              <span>{formatRelativeTime(message.timestamp)}</span>
            </div>
            <Button 
              onClick={handleCopy} 
              className="h-6 w-6 p-0 hover:bg-purple-500/20 bg-transparent border-none text-purple-100 hover:text-white"
            >
              {copySuccess ? <CheckCircle className="w-3 h-3 text-green-300" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <div className="whitespace-pre-wrap">
            {formatText(message.content)}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex justify-start mb-4"
    >
      <div className="group max-w-[80%] bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200 border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <BelgaCatIcon className="w-3 h-3 text-purple-500" />
            <span>SuSi</span>
            <span>•</span>
            <span>{estimatedReadTime}m read</span>
            <span>•</span>
            <span>{formatRelativeTime(message.timestamp)}</span>
          </div>
          <div className="space-x-2">
            <Button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message.content)}`, '_blank')} className="h-6 w-6 p-0 hover:bg-purple-500/20 bg-transparent border-none text-slate-500 dark:text-slate-400 hover:text-purple-300">
              <Share2 className="w-3 h-3" />
            </Button>
            <Button className="h-6 w-6 p-0 hover:bg-purple-500/20 bg-transparent border-none text-slate-500 dark:text-slate-400 hover:text-purple-300">
              <Bookmark className="w-3 h-3" />
            </Button>
            <Button 
              onClick={handleCopy} 
              className="h-6 w-6 p-0 hover:bg-purple-500/20 bg-transparent border-none text-slate-500 dark:text-slate-400 hover:text-purple-300"
            >
              {copySuccess ? <CheckCircle className="w-3 h-3 text-green-300" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>
        {isLatest && message.role === 'assistant' && message.content && message.content.length > 0 ? (
          <TypewriterText 
            text={message.content} 
            config={TypewriterConfig}
            onComplete={handleTypewriterComplete}
          />
        ) : (
          <div className="whitespace-pre-wrap">
            {formatText(message.content)}
          </div>
        )}

        {message.languages && message.languages.length > 0 && (
          <div className="mt-2">
            {message.languages.map((lang, index) => (
              <Badge key={index} variant="secondary" className="mr-1">{lang}</Badge>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

import { BelgaCatIcon } from '@/components/shared/BelgaCatIcon';

// ============================================
// MAIN COMPONENT
// ============================================
export const BestFriendChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mood, setMood] = useState<string>('neutral');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  // Refs for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabledRef = useRef(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data.success) {
        setUserProfile(data.profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/chat/vietnamese', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          mood,
          context: {
            recentMessages: messages.slice(-5)
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          languages: data.detectedLanguages
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to get response',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Greeting based on time and language
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = userProfile?.name || 'Friend';

    if (userProfile?.languages.includes('vi')) {
      if (hour < 12) return `Chào buổi sáng ${name}! ☀️`;
      if (hour < 18) return `Chào ${name}! Chiều nay thế nào? 😊`;
      return `Chào ${name}! Tối nay vui không? 🌙`;
    }

    if (hour < 12) return `Good morning ${name}! ☀️`;
    if (hour < 18) return `Hey ${name}! How's your afternoon? 😊`;
    return `Evening ${name}! How's it going? 🌙`;
  };

  const moodEmojis = {
    happy: '😊',
    excited: '🎉',
    thoughtful: '🤔',
    tired: '😴',
    stressed: '😰',
    neutral: '😌'
  };

  const getSuggestedTopics = (): SuggestedTopic[] => {
    const isVietnamese = userProfile?.languages.includes('vi');

    return [
      {
        label: isVietnamese ? '☕ Uống cà phê không?' : '☕ Coffee chat?',
        prompt: isVietnamese ? 'Mình đang uống cà phê, bạn có muốn nói chuyện không?' : 'I\'m having coffee, want to chat?',
        icon: <Coffee className="w-4 h-4" />
      },
      {
        label: isVietnamese ? '🎵 Nhạc gì hay?' : '🎵 What\'s good music?',
        prompt: isVietnamese ? 'Gần đây có nghe nhạc gì hay không?' : 'Any good music lately?',
        icon: <Music className="w-4 h-4" />
      },
      {
        label: isVietnamese ? '💭 Tâm sự' : '💭 Share feelings',
        prompt: isVietnamese ? 'Hôm nay cảm thấy thế nào?' : 'How are you feeling today?',
        icon: <Heart className="w-4 h-4" />
      },
      {
        label: isVietnamese ? '📈 Tin tức' : '📈 What\'s trending',
        prompt: isVietnamese ? 'Có gì mới không?' : 'What\'s new today?',
        icon: <TrendingUp className="w-4 h-4" />
      }
    ];
  };

  // Smooth auto-scroll function
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    if (isAutoScrollEnabledRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior,
        block: 'end',
        inline: 'nearest'
      });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // Detect manual scrolling to disable auto-scroll temporarily
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    isAutoScrollEnabledRef.current = isNearBottom;
  }, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-slate-900 dark:to-slate-800">
      {/* Standardized Header */}
      <StandardizedHeader
        theme="chat"
        assistantName="SuSi"
        assistantIcon={<BelgaCatIcon />}
        userProfile={userProfile}
        mood={mood}
        moodEmojis={moodEmojis}
        onMoodChange={setMood}
        onSettings={() => console.log('Settings clicked')}
        showMoodSelector={true}
        showSettings={true}
        status="online"
      />

      {/* Enhanced Messages */}
      <div 
        ref={scrollAreaRef} 
        className="flex-1 overflow-y-auto p-4 space-y-4" 
        onScrollCapture={handleScroll}
      >
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                {userProfile?.languages.includes('vi') 
                  ? 'Mình có thể nói chuyện về bất cứ điều gì bạn muốn! 💬'
                  : 'We can talk about anything you want! 💬'
                }
              </p>

              {/* Enhanced Topic suggestions */}
              {showSuggestions && (
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  {getSuggestedTopics().map((topic, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => {
                        sendMessage(topic.prompt);
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-gray-700 dark:text-gray-300 border border-slate-200/50 dark:border-slate-700/50 hover:border-purple-300 dark:hover:border-purple-600 group"
                    >
                      <div className="text-purple-500 group-hover:scale-110 transition-transform duration-200">
                        {topic.icon}
                      </div>
                      <span className="font-medium">{topic.label}</span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((message, index) => (
            <StandardizedMessage
              key={message.id}
              message={message}
              isLatest={index === messages.length - 1}
              theme="chat"
              userProfile={userProfile}
              assistantName="SuSi"
              assistantIcon={<BelgaCatIcon className="w-3 h-3 text-purple-500" />}
              showActions={true}
              enableTypewriter={true}
            />
          ))}
        </AnimatePresence>

        {/* Standardized Typing indicator */}
        {isTyping && (
          <StandardizedTypingIndicator 
            theme="chat"
            assistantName="SuSi"
            assistantIcon={<BelgaCatIcon className="w-4 h-4 text-purple-500" />}
            userProfile={userProfile}
          />
        )}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>

      {/* Standardized Input */}
      <StandardizedInput
        theme="chat"
        value={inputMessage}
        onChange={setInputMessage}
        onSubmit={(message) => {
          sendMessage(message);
          setTimeout(() => scrollToBottom(), 50);
        }}
        isLoading={isTyping}
        userProfile={userProfile}
        showAttachment={false}
        showVoice={false}
        maxLength={2000}
      />
    </div>
  );
};