import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Smile, Coffee, Music, TrendingUp, Send } from 'lucide-react';
import { TypewriterText } from '@/components/shared/TypewriterText';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {userProfile ? getGreeting() : 'Hello Friend! 👋'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              I'm here for you {moodEmojis[mood]}
            </p>
          </div>

          {/* Mood selector */}
          <div className="flex gap-2">
            {Object.entries(moodEmojis).map(([moodType, emoji]) => (
              <button
                key={moodType}
                onClick={() => setMood(moodType)}
                className={`
                  text-2xl p-1 rounded-lg transition-all
                  ${mood === moodType 
                    ? 'bg-purple-100 dark:bg-purple-900 scale-110' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                title={moodType}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4" onScrollCapture={handleScroll}>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {userProfile?.languages.includes('vi') 
                ? 'Mình có thể nói chuyện về bất cứ điều gì bạn muốn! 💬'
                : 'We can talk about anything you want! 💬'
              }
            </p>

            {/* Topic suggestions */}
            {showSuggestions && (
              <div className="flex flex-wrap justify-center gap-2">
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
                    className="px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:shadow-md transition-shadow flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    {topic.icon}
                    <span>{topic.label}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`
                max-w-[80%] rounded-2xl px-4 py-3
                ${message.role === 'user' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white dark:bg-slate-800 shadow-sm text-gray-900 dark:text-gray-100'
                }
              `}>
                {message.role === 'assistant' && index === messages.length - 1 ? (
                  <TypewriterText
                    text={message.content}
                    speed={20}
                    renderMarkdown={true}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}

                {/* Show detected language if code-switching */}
                {message.languages && message.languages.length > 1 && (
                  <div className="flex gap-1 mt-2 opacity-60">
                    {message.languages.map(lang => (
                      <span key={lang} className="text-xs">
                        {lang === 'vi' ? '🇻🇳' : lang === 'en' ? '🇺🇸' : '🇵🇱'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="bg-white dark:bg-slate-800 rounded-full p-3 shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {userProfile?.languages.includes('vi') 
                ? 'Đang suy nghĩ...' 
                : 'Thinking...'
              }
            </span>
          </motion.div>
        )}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>

      {/* Input area */}
      <div className="p-4 bg-white dark:bg-slate-800 border-t">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
             onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage(inputMessage);
                  }
                }}
            placeholder={
              userProfile?.languages.includes('vi')
                ? 'Nhắn gì đó...'
                : 'Say something...'
            }
            disabled={isTyping}
            className="flex-1 bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600"
          />
          <Button 
            onClick={() => {
              sendMessage(inputMessage);
              // Small delay to ensure auto-scroll works properly
              setTimeout(() => scrollToBottom(), 50);
            }}
            disabled={isTyping || !inputMessage.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};