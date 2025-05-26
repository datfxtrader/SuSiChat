
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, BookOpen, Calculator, Microscope, Globe, Palette, Music, Users, 
  Lightbulb, MessageCircle, Star, Clock, HelpCircle, Trophy, Languages,
  CheckCircle, AlertCircle, Brain, Heart, Zap, Target, X, Loader2, 
  Volume2, VolumeX, Settings, RotateCcw, Save
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/layout/MainLayout';

// Optimized Type definitions
interface StudyMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  subject?: string;
  difficulty?: string;
  learningMode?: LearningMode;
  corrections?: Correction[];
  learningInsights?: string;
  suggestedFollowUp?: string;
  culturalNotes?: string[];
  isTyping?: boolean;
}

interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  type: 'grammar' | 'vocabulary' | 'pronunciation';
}

interface LearningMode {
  type: 'study' | 'practice' | 'immersive' | 'family';
  targetLanguage: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focus: 'grammar' | 'vocabulary' | 'conversation' | 'culture' | 'homework';
}

interface SessionInsights {
  accuracy: number;
  newConcepts: number;
  timeSpent: number;
  comprehensionScore: number;
  streakCount: number;
  totalMessages: number;
}

// Optimized Constants with memoization
const SUBJECTS = Object.freeze([
  { id: 'math', name: 'Mathematics', icon: Calculator, color: 'from-blue-600 to-blue-500', emoji: '🔢' },
  { id: 'science', name: 'Science', icon: Microscope, color: 'from-green-600 to-green-500', emoji: '🔬' },
  { id: 'english', name: 'English', icon: BookOpen, color: 'from-purple-600 to-purple-500', emoji: '📖' },
  { id: 'history', name: 'History', icon: Globe, color: 'from-orange-600 to-orange-500', emoji: '🌍' },
  { id: 'vietnamese', name: 'Vietnamese', icon: Languages, color: 'from-red-600 to-red-500', emoji: '🇻🇳' },
  { id: 'polish', name: 'Polish', icon: Languages, color: 'from-pink-600 to-pink-500', emoji: '🇵🇱' },
  { id: 'art', name: 'Art', icon: Palette, color: 'from-yellow-600 to-yellow-500', emoji: '🎨' },
  { id: 'music', name: 'Music', icon: Music, color: 'from-indigo-600 to-indigo-500', emoji: '🎵' },
  { id: 'other', name: 'Other', icon: Users, color: 'from-gray-600 to-gray-500', emoji: '📚' }
]);

const DIFFICULTY_LEVELS = Object.freeze([
  { id: 'elementary', name: 'Elementary (K-5)', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  { id: 'middle', name: 'Middle School (6-8)', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  { id: 'high', name: 'High School (9-12)', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  { id: 'college', name: 'College/University', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' }
]);

const LANGUAGES = Object.freeze([
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' }
]);

// Optimized Quick Phrases with better structure
const QUICK_PHRASES = Object.freeze({
  vi: [
    { text: "Xin chào!", translation: "Hello!", category: "greeting" },
    { text: "Cảm ơn bạn", translation: "Thank you", category: "courtesy" },
    { text: "Hôm nay thế nào?", translation: "How's today?", category: "conversation" },
    { text: "Tôi cần giúp đỡ", translation: "I need help", category: "study" }
  ],
  pl: [
    { text: "Dzień dobry!", translation: "Good day!", category: "greeting" },
    { text: "Dziękuję", translation: "Thank you", category: "courtesy" },
    { text: "Jak się masz?", translation: "How are you?", category: "conversation" },
    { text: "Potrzebuję pomocy", translation: "I need help", category: "study" }
  ],
  zh: [
    { text: "你好!", translation: "Hello!", category: "greeting" },
    { text: "谢谢", translation: "Thank you", category: "courtesy" },
    { text: "今天怎么样?", translation: "How's today?", category: "conversation" },
    { text: "我需要帮助", translation: "I need help", category: "study" }
  ]
});

// Performance optimized components with memo
const StudyTips = memo(() => (
  <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-2 mb-3">
        <Lightbulb className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Study Tips</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, title: "Be Specific", desc: "Include details about what you're studying", color: "blue" },
          { icon: Heart, title: "Show Your Work", desc: "Share what you've tried for better guidance", color: "green" },
          { icon: Languages, title: "Practice Languages", desc: "Switch to practice mode for language learning", color: "purple" },
          { icon: Users, title: "Family Mode", desc: "Study together with family members", color: "orange" }
        ].map(({ icon: Icon, title, desc, color }, idx) => (
          <div key={idx} className="flex items-start space-x-3">
            <div className={`w-8 h-8 bg-${color}-100 dark:bg-${color}-900 rounded-lg flex items-center justify-center`}>
              <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

const SubjectCard = memo(({ subject, onClick, isSelected }: { 
  subject: typeof SUBJECTS[0], 
  onClick: () => void,
  isSelected: boolean 
}) => {
  const IconComponent = subject.icon;
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative bg-white dark:bg-gray-800 border rounded-xl cursor-pointer group overflow-hidden transition-all duration-300",
        isSelected 
          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/20" 
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      )}
      onClick={onClick}
    >
      <div className="p-4 text-center">
        <div className={cn(
          "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center mx-auto mb-2 transition-transform duration-300",
          subject.color,
          "group-hover:scale-110"
        )}>
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {subject.name}
        </h4>
        <span className="text-lg">{subject.emoji}</span>
      </div>
    </motion.div>
  );
});

const TypewriterText = memo(({ text, speed = 30 }: { text: string; speed?: number }) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayText}
      {!isComplete && <span className="animate-pulse">▋</span>}
    </span>
  );
});

const MessageBubble = memo(({ 
  message, 
  getSubjectInfo, 
  getDifficultyInfo, 
  onFollowUp,
  isLatest 
}: {
  message: StudyMessage;
  getSubjectInfo: (id: string) => typeof SUBJECTS[0] | undefined;
  getDifficultyInfo: (id: string) => typeof DIFFICULTY_LEVELS[0] | undefined;
  onFollowUp: (text: string) => void;
  isLatest: boolean;
}) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={cn("flex", message.isUser ? "justify-end" : "justify-start")}
  >
    <div className={cn(
      "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl",
      message.isUser 
        ? "bg-blue-600 text-white shadow-lg" 
        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
    )}>
      {!message.isUser && (
        <div className="flex items-center space-x-2 mb-2 flex-wrap">
          {message.subject && (
            <Badge variant="secondary" className="text-xs">
              {getSubjectInfo(message.subject)?.emoji} {getSubjectInfo(message.subject)?.name}
            </Badge>
          )}
          {message.difficulty && (
            <Badge variant="outline" className={cn("text-xs", getDifficultyInfo(message.difficulty)?.color)}>
              {getDifficultyInfo(message.difficulty)?.name}
            </Badge>
          )}
        </div>
      )}
      
      <div className="whitespace-pre-wrap break-words">
        {!message.isUser && isLatest && !message.isTyping ? (
          <TypewriterText text={message.content} />
        ) : (
          message.content
        )}
      </div>
      
      {message.learningInsights && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 text-xs opacity-80">
            <Zap className="w-3 h-3" />
            {message.learningInsights}
          </div>
        </div>
      )}
      
      {message.corrections && message.corrections.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs space-y-1">
            {message.corrections.map((correction, idx) => (
              <div key={idx} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div>
                  <span className="line-through text-red-500">{correction.original}</span>
                  <span className="text-green-600 ml-2">→ {correction.corrected}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{correction.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {message.suggestedFollowUp && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFollowUp(message.suggestedFollowUp!)}
          className="mt-2 text-xs underline opacity-70 hover:opacity-100 h-auto p-1"
        >
          Try: "{message.suggestedFollowUp}"
        </Button>
      )}
      
      <p className={cn(
        "text-xs mt-2 opacity-70",
        message.isUser ? "text-white" : "text-gray-500 dark:text-gray-400"
      )}>
        {message.timestamp.toLocaleTimeString()}
      </p>
    </div>
  </motion.div>
));

const SessionProgress = memo(({ insights }: { insights: SessionInsights | null }) => {
  if (!insights) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-green-500" />
          Session Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{insights.accuracy}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{insights.newConcepts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">New Concepts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{insights.timeSpent}min</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Time Focused</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{insights.comprehensionScore}/5</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Understanding</div>
          </div>
        </div>
        
        {insights.streakCount > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-yellow-600">
            <Trophy className="w-4 h-4" />
            {insights.streakCount} day learning streak!
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Main Study component with optimization
const Study: React.FC = () => {
  // Core state
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Learning state
  const [learningMode, setLearningMode] = useState<LearningMode>({
    type: 'study',
    targetLanguage: 'en',
    difficulty: 'beginner',
    focus: 'homework'
  });

  // Session state
  const [sessionInsights, setSessionInsights] = useState<SessionInsights | null>(null);
  const [sessionStartTime] = useState(() => Date.now());
  
  // UI state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Memoized values for performance
  const subjectMap = useMemo(() => new Map(SUBJECTS.map(s => [s.id, s])), []);
  const difficultyMap = useMemo(() => new Map(DIFFICULTY_LEVELS.map(d => [d.id, d])), []);
  const quickPhrases = useMemo(() => QUICK_PHRASES[learningMode.targetLanguage] || [], [learningMode.targetLanguage]);
  
  const getSubjectInfo = useCallback((id: string) => subjectMap.get(id), [subjectMap]);
  const getDifficultyInfo = useCallback((id: string) => difficultyMap.get(id), [difficultyMap]);

  const placeholder = useMemo(() => {
    switch (learningMode.focus) {
      case 'homework':
        return "Ask your homework question here... Be specific about what you need help with!";
      case 'conversation':
        const lang = LANGUAGES.find(l => l.code === learningMode.targetLanguage);
        return `Practice conversation in ${lang?.name || learningMode.targetLanguage}...`;
      case 'grammar':
        return "Ask about grammar rules, sentence structure, or language patterns...";
      case 'vocabulary':
        return "Learn new words, phrases, or ask about meanings...";
      case 'culture':
        return "Explore cultural topics, traditions, and customs...";
      default:
        return "What would you like to study today?";
    }
  }, [learningMode]);

  // Auto-scroll optimization
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // Enhanced API simulation with better responses
  const simulateAPIResponse = useCallback(async (message: string): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    
    const responses = {
      homework: `I'll help you with your ${selectedSubject ? getSubjectInfo(selectedSubject)?.name : 'homework'} question about "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}". Let me break this down step by step:\n\n1. First, let's understand what we're looking for\n2. Then we'll work through the solution method\n3. Finally, we'll verify our answer\n\nWhat specific part would you like me to explain in more detail?`,
      conversation: `Great! Let's practice conversation. You said: "${message}". That's a wonderful topic to discuss! In ${LANGUAGES.find(l => l.code === learningMode.targetLanguage)?.name}, we can expand on this by discussing related topics and practicing different sentence structures.`,
      grammar: `Excellent grammar question about "${message}"! Let me explain the rules and patterns involved here. This is a common area where students need clarification, so you're asking exactly the right questions.`,
      vocabulary: `Perfect vocabulary practice! The word/phrase "${message}" has some interesting meanings and uses. Let me show you different contexts and help you understand when and how to use it effectively.`,
      culture: `What a fascinating cultural topic: "${message}"! Understanding culture is so important for language learning. Let me share some insights about this aspect of the culture and how it connects to daily life.`
    };
    
    const response = responses[learningMode.focus] || responses.homework;
    
    // Generate contextual corrections for language practice
    const corrections = (learningMode.type === 'practice' && learningMode.targetLanguage !== 'en') ? [
      {
        original: message.split(' ')[0] || '',
        corrected: message.split(' ')[0] + ' (enhanced)',
        explanation: `In ${LANGUAGES.find(l => l.code === learningMode.targetLanguage)?.name}, this can be expressed more naturally this way.`,
        type: 'grammar' as const
      }
    ] : [];
    
    return {
      success: true,
      response,
      corrections,
      learningInsights: learningMode.type === 'practice' 
        ? 'Great language practice! You\'re improving your fluency.' 
        : 'You\'re asking excellent questions. Keep this curiosity!',
      suggestedFollowUp: learningMode.focus === 'homework' 
        ? 'Can you show me what you\'ve tried so far?' 
        : 'What else would you like to explore about this topic?',
      culturalNotes: learningMode.focus === 'culture' 
        ? ['This tradition has deep historical roots in the community.'] 
        : [],
      sessionInsights: {
        accuracy: Math.floor(85 + Math.random() * 15),
        newConcepts: Math.floor(1 + Math.random() * 3),
        timeSpent: Math.floor((Date.now() - sessionStartTime) / 60000),
        comprehensionScore: Math.floor(3 + Math.random() * 3),
        streakCount: Math.floor(Math.random() * 7),
        totalMessages: messages.length + 1
      }
    };
  }, [selectedSubject, learningMode, getSubjectInfo, sessionStartTime, messages.length]);

  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter your question or study topic.",
        variant: "destructive"
      });
      return;
    }

    if (learningMode.focus === 'homework' && (!selectedSubject || !selectedDifficulty)) {
      toast({
        title: "Subject and Grade Required",
        description: "Please select both subject and grade level for homework help.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: StudyMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      isUser: true,
      timestamp: new Date(),
      subject: selectedSubject,
      difficulty: selectedDifficulty,
      learningMode
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const data = await simulateAPIResponse(currentMessage);

      if (data.success) {
        // Update session insights
        if (data.sessionInsights) {
          setSessionInsights(data.sessionInsights);
        }

        const aiMessage: StudyMessage = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          isUser: false,
          timestamp: new Date(),
          subject: selectedSubject,
          difficulty: selectedDifficulty,
          learningMode,
          corrections: data.corrections,
          learningInsights: data.learningInsights,
          suggestedFollowUp: data.suggestedFollowUp,
          culturalNotes: data.culturalNotes
        };

        setMessages(prev => [...prev, aiMessage]);

        // Success feedback
        if (soundEnabled) {
          // Play success sound (placeholder for actual sound)
          console.log('🔊 Success sound would play here');
        }

        toast({
          title: "Response Ready!",
          description: "Your study assistant has responded.",
        });
      }
    } catch (error) {
      console.error('Study error:', error);
      toast({
        title: "Study Error",
        description: "Failed to get study help. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, selectedSubject, selectedDifficulty, learningMode, toast, soundEnabled, simulateAPIResponse]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleSubjectSelect = useCallback((subjectId: string) => {
    setSelectedSubject(subjectId);
    if (!currentMessage) {
      setCurrentMessage(`I need help with ${subjectMap.get(subjectId)?.name}`);
    }
  }, [subjectMap, currentMessage]);

  const handleClearSession = useCallback(() => {
    setMessages([]);
    setSessionInsights(null);
    setCurrentMessage('');
    setSelectedSubject('');
    setSelectedDifficulty('');
    toast({
      title: "Session Cleared",
      description: "Starting fresh! Your study session has been reset.",
    });
  }, [toast]);

  // Learning mode selector component
  const renderLearningModeSelector = useMemo(() => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          Study Mode Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(['study', 'practice', 'immersive', 'family'] as const).map(mode => (
            <Button
              key={mode}
              variant={learningMode.type === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLearningMode(prev => ({ ...prev, type: mode }))}
              className="transition-all duration-200"
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Focus Area</label>
            <Select 
              value={learningMode.focus} 
              onValueChange={(value) => setLearningMode(prev => ({ ...prev, focus: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homework">📚 Homework Help</SelectItem>
                <SelectItem value="conversation">💬 Conversation</SelectItem>
                <SelectItem value="grammar">📝 Grammar</SelectItem>
                <SelectItem value="vocabulary">📖 Vocabulary</SelectItem>
                <SelectItem value="culture">🌍 Culture</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Language</label>
            <Select 
              value={learningMode.targetLanguage} 
              onValueChange={(value) => setLearningMode(prev => ({ ...prev, targetLanguage: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Level</label>
            <Select 
              value={learningMode.difficulty} 
              onValueChange={(value) => setLearningMode(prev => ({ ...prev, difficulty: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">🌱 Beginner</SelectItem>
                <SelectItem value="intermediate">🌿 Intermediate</SelectItem>
                <SelectItem value="advanced">🌳 Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  ), [learningMode]);

  return (
    <MainLayout 
      title="Study Assistant" 
      subtitle="Personalized learning help with AI tutoring"
      showHeader={true}
      showSidebar={true}
    >
      <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        <StudyTips />

        <div className="flex-1 overflow-hidden p-4">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {renderLearningModeSelector}

            {/* Messages Area */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Ready to Help with Your Studies!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Choose your study mode and ask your questions below.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
                      {SUBJECTS.map((subject) => (
                        <SubjectCard 
                          key={subject.id} 
                          subject={subject} 
                          onClick={() => handleSubjectSelect(subject.id)}
                          isSelected={selectedSubject === subject.id}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {messages.map((message, index) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        getSubjectInfo={getSubjectInfo}
                        getDifficultyInfo={getDifficultyInfo}
                        onFollowUp={setCurrentMessage}
                        isLatest={index === messages.length - 1}
                      />
                    ))}
                  </AnimatePresence>
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            <SessionProgress insights={sessionInsights} />
            
            {/* Input Area */}
            <Card className="mt-4">
              <CardContent className="p-4 space-y-4">
                {/* Subject and Difficulty Selectors for Homework */}
                {learningMode.focus === 'homework' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Subject</label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.emoji} {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Grade Level</label>
                      <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose grade level" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIFFICULTY_LEVELS.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Quick phrases for language practice */}
                {(learningMode.type === 'practice' || learningMode.type === 'immersive') && 
                 learningMode.targetLanguage !== 'en' && 
                 quickPhrases.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Quick Phrases</label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {quickPhrases.map((phrase, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentMessage(phrase.text)}
                          className="whitespace-nowrap"
                          title={phrase.translation}
                        >
                          {phrase.text}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className="flex gap-2">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    className="min-h-[80px] resize-none"
                    disabled={isLoading}
                  />
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={handleSendMessage}
                      disabled={isLoading || !currentMessage.trim()}
                      className="h-12"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      title={soundEnabled ? "Disable sounds" : "Enable sounds"}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearSession}
                      title="Clear session"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Session stats */}
                {messages.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
                    <span>{messages.length} messages in this session</span>
                    <span>Study time: {Math.floor((Date.now() - sessionStartTime) / 60000)} minutes</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Study;
