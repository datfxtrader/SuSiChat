
import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Smile, Coffee, Music, TrendingUp, Send, Bot, User, Settings, Clock, CheckCircle, Copy, Share2, Bookmark, MessageSquare, Loader2 } from 'lucide-react';
import { TypewriterText } from '@/components/shared/TypewriterText';
import { TypewriterConfig } from '@/config/typewriter.config';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
            <div className="flex items-center space-x-1">
              <Bot className="w-3 h-3 text-purple-500" />
              <span>Best Friend AI</span>
            </div>
            <span>•</span>
            <span>{formatRelativeTime(message.timestamp)}</span>
            <span>•</span>
            <span>{estimatedReadTime} min read</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              onClick={handleCopy} 
              className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 bg-transparent border-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {copySuccess ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </Button>
            <Button className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 bg-transparent border-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Share2 className="w-3 h-3" />
            </Button>
            <Button className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 bg-transparent border-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Bookmark className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-slate-900 dark:text-slate-100">
          {isLatest && !typewriterComplete ? (
            <TypewriterText
              text={message.content}
              speed={TypewriterConfig.responseTypes.chat.speed}
              renderMarkdown={true}
              onComplete={handleTypewriterComplete}
              enableSound={true}
              robust={true}
              showProgress={message.content.length > 500}
              className="leading-relaxed"
            />
          ) : (
            <div className="whitespace-pre-wrap leading-relaxed animate-fade-in">
              {formatText(message.content)}
            </div>
          )}
        </div>

        {/* Show detected language if code-switching */}
        {message.languages && message.languages.length > 1 && (
          <div className="flex gap-2 mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
            <Badge variant="secondary" className="text-xs">
              <MessageSquare className="w-3 h-3 mr-1" />
              Multi-language
            </Badge>
            <div className="flex gap-1">
              {message.languages.map(lang => (
                <span key={lang} className="text-sm">
                  {lang === 'vi' ? '🇻🇳' : lang === 'en' ? '🇺🇸' : '🇵🇱'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ============================================
// ENHANCED TYPING INDICATOR
// ============================================
const EnhancedTypingIndicator = memo(({ userProfile }: { userProfile: UserProfile | null }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-3 mb-4"
  >
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-purple-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {userProfile?.languages.includes('vi') 
            ? 'Đang suy nghĩ...' 
            : 'Thinking...'
          }
        </span>
      </div>
    </div>
  </motion.div>
));

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
      {/* Enhanced Header */}
      <div className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {userProfile ? getGreeting() : 'Hello Friend! 👋'}
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                I'm here for you {moodEmojis[mood]}
              </p>
            </div>
          </div>

          {/* Enhanced Mood selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Mood:</span>
            <div className="flex gap-1">
              {Object.entries(moodEmojis).map(([moodType, emoji]) => (
                <button
                  key={moodType}
                  onClick={() => setMood(moodType)}
                  className={`
                    text-xl p-2 rounded-lg transition-all duration-200 hover:scale-110
                    ${mood === moodType 
                      ? 'bg-purple-100 dark:bg-purple-900 scale-110 ring-2 ring-purple-300 dark:ring-purple-700' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                  title={moodType}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

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
            <EnhancedMessage
              key={message.id}
              message={message}
              isLatest={index === messages.length - 1}
              userProfile={userProfile}
            />
          ))}
        </AnimatePresence>

        {/* Enhanced Typing indicator */}
        {isTyping && (
          <EnhancedTypingIndicator userProfile={userProfile} />
        )}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>

      {/* Enhanced Input area */}
      <div className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
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
              className="flex-1 bg-gray-50/80 dark:bg-slate-700/80 backdrop-blur-sm border-gray-200/60 dark:border-slate-600/60 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 dark:focus:border-purple-600 transition-all duration-200"
            />
            {inputMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <Badge variant="secondary" className="text-xs">
                  {inputMessage.length}
                </Badge>
              </motion.div>
            )}
          </div>
          <Button 
            onClick={() => {
              sendMessage(inputMessage);
              setTimeout(() => scrollToBottom(), 50);
            }}
            disabled={isTyping || !inputMessage.trim()}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
